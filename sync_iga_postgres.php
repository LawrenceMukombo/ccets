<?php
/**
 * sync_iga_postgres.php
 * Synchronizes facilities and equipment from IGA API to PostgreSQL.
 * Handles missing Province/District metadata by creating placeholder records.
 */

require_once 'config_iga.php';
$config = include('config_iga.php');

// Setup Database Connection
try {
    $dsn = "pgsql:host={$config['db']['host']};dbname={$config['db']['dbname']}";
    $pdo = new PDO($dsn, $config['db']['user'], $config['db']['password']);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    echo "Connected to database.\n";

    // Reset sequences to avoid unique violations
    echo "Resetting sequences...\n";
    $pdo->exec("SELECT setval('districts_district_id_seq', COALESCE((SELECT MAX(district_id) FROM districts), 1))");
    $pdo->exec("SELECT setval('provinces_province_id_seq', COALESCE((SELECT MAX(province_id) FROM provinces), 1))");

} catch (PDOException $e) {
    die("Database connection failed: " . $e->getMessage() . "\n");
}

$apiBaseUrl = $config['iga_api']['base_url'];
$token = $config['iga_api']['token'];
$headers = [
    "Authorization: Bearer $token",
    "Content-Type: application/json"
];

// Helper function to make API requests
function fetchUrl($url, $headers)
{
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode !== 200) {
        echo "Error fetching $url. HTTP: $httpCode\n";
        return null;
    }
    return json_decode($response, true);
}

// Helper to get or insert Province
function getOrInsertProvince($pdo, $provinceId)
{
    if (!$provinceId)
        return null;

    // Check if exists
    $stmt = $pdo->prepare("SELECT province_id FROM provinces WHERE province_id = ?");
    $stmt->execute([$provinceId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($row) {
        return $row['province_id'];
    }

    // Insert placeholder
    echo "Creating placeholder for Province ID $provinceId\n";
    $stmt = $pdo->prepare("INSERT INTO provinces (province_id, province_name) VALUES (?, ?)");
    try {
        $stmt->execute([$provinceId, "Province " . $provinceId]);
        return $provinceId;
    } catch (PDOException $e) {
        echo "Error inserting province $provinceId: " . $e->getMessage() . "\n";
        return null;
    }
}

// Helper to get or insert District
function getOrInsertDistrict($pdo, $districtName, $provinceId)
{
    if (!$districtName || !$provinceId)
        return null;

    // Check if exists (by name AND province)
    $stmt = $pdo->prepare("SELECT district_id FROM districts WHERE district_name = ? AND province_id = ?");
    $stmt->execute([$districtName, $provinceId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($row) {
        return $row['district_id'];
    }

    // Insert
    echo "Creating district '$districtName' for Province $provinceId\n";
    $stmt = $pdo->prepare("INSERT INTO districts (district_name, province_id) VALUES (?, ?) RETURNING district_id");
    try {
        $stmt->execute([$districtName, $provinceId]);
        return $stmt->fetchColumn();
    } catch (PDOException $e) {
        echo "Error inserting district '$districtName': " . $e->getMessage() . "\n";
        return null;
    }
}

// ==================================================================================
// 1. Facilities Sync (Cascade)
// ==================================================================================
echo "Starting Facilities Sync...\n";
$queue = [1]; // Start with ID 1
$visited = [];
$totalFacilities = 0;

while (!empty($queue)) {
    $parentId = array_shift($queue);
    if (isset($visited[$parentId]))
        continue;
    $visited[$parentId] = true;

    $url = $apiBaseUrl . "/facilities/parent?id=" . $parentId;
    echo "Fetching children of $parentId...\n";
    $children = fetchUrl($url, $headers);

    if (!is_array($children))
        continue;

    foreach ($children as $facility) {
        $id = $facility['id'];

        // Process Province/District
        $provId = isset($facility['province']) ? intval($facility['province']) : null;
        $distName = $facility['district'] ?? null;

        $dbProvId = getOrInsertProvince($pdo, $provId);
        $dbDistId = getOrInsertDistrict($pdo, $distName, $dbProvId);

        // Upsert Facility
        // Note: Using columns present in init.sql facilities table
        $sql = "INSERT INTO facilities (
            facility_id, facility_name, facility_code, 
            province_id, district_id, 
            gps_coordinates, level, type, is_functioning, 
            ownership, population_number, children_number, 
            transport_mode, power_source, updated_at
        ) VALUES (
            :id, :name, :code, 
            :prov_id, :dist_id, 
            :gps, :level, :type, :func, 
            :own, :pop, :child, 
            :trans, :power, NOW()
        ) ON CONFLICT (facility_id) DO UPDATE SET
            facility_name = EXCLUDED.facility_name,
            facility_code = EXCLUDED.facility_code,
            province_id = EXCLUDED.province_id,
            district_id = EXCLUDED.district_id,
            gps_coordinates = EXCLUDED.gps_coordinates,
            level = EXCLUDED.level,
            type = EXCLUDED.type,
            is_functioning = EXCLUDED.is_functioning,
            ownership = EXCLUDED.ownership,
            population_number = EXCLUDED.population_number,
            children_number = EXCLUDED.children_number,
            transport_mode = EXCLUDED.transport_mode,
            power_source = EXCLUDED.power_source,
            updated_at = NOW()";

        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            ':id' => $id,
            ':name' => $facility['name'],
            ':code' => $facility['code'] ?? null,
            ':prov_id' => $dbProvId,
            ':dist_id' => $dbDistId,
            ':gps' => $facility['gpsCordinate'] ?? null,
            ':level' => intval($facility['level'] ?? 0),
            ':type' => $facility['type'] ?? null,
            ':func' => isset($facility['is_functioning']) ? ($facility['is_functioning'] ? 't' : 'f') : 't',
            ':own' => $facility['ownership'] ?? null,
            ':pop' => intval($facility['populationnumber'] ?? 0),
            ':child' => intval($facility['childrennumber'] ?? 0),
            ':trans' => $facility['transport_mode'] ?? null,
            ':power' => $facility['powersource'] ?? null,
        ]);

        $totalFacilities++;

        // Add to queue if not visited
        if (!isset($visited[$id])) {
            $queue[] = $id;
        }
    }
}
echo "Facilities Sync Complete. Processed $totalFacilities facilities.\n";

// ==================================================================================
// 2. Equipment Sync
// ==================================================================================
echo "Starting Equipment Sync...\n";
$nextUrl = $apiBaseUrl . "/item/";
$totalItems = 0;

while ($nextUrl) {
    echo "Fetching items from $nextUrl...\n";
    $data = fetchUrl($nextUrl, $headers);

    if (!$data || !isset($data['results']))
        break;

    $nextUrl = $data['next'];

    foreach ($data['results'] as $item) {
        $equipId = intval($item['id']);
        $facId = intval($item['facility'] ?? 0);

        // Verify facility exists
        $stmt = $pdo->prepare("SELECT 1 FROM facilities WHERE facility_id = ?");
        $stmt->execute([$facId]);
        if (!$stmt->fetchColumn()) {
            // echo "Skipping item $equipId: Facility $facId not found.\n";
            continue;
        }

        // Upsert Equipment
        // Mapping fields based on init.sql
        $sql = "INSERT INTO equipment (
            equipment_id, facility_id, 
            item_class, item_type, manufacturer, model, serial_number,
            year_installed, is_functioning, item_code, is_deleted,
            updated_at
        ) VALUES (
            :id, :fac_id,
            :class, :type, :manuf, :model, :serial,
            :year, :func, :code, :del,
            NOW()
        ) ON CONFLICT (equipment_id) DO UPDATE SET
            facility_id = EXCLUDED.facility_id,
            item_class = EXCLUDED.item_class,
            item_type = EXCLUDED.item_type,
            manufacturer = EXCLUDED.manufacturer,
            model = EXCLUDED.model,
            serial_number = EXCLUDED.serial_number,
            year_installed = EXCLUDED.year_installed,
            is_functioning = EXCLUDED.is_functioning,
            item_code = EXCLUDED.item_code,
            is_deleted = EXCLUDED.is_deleted,
            updated_at = NOW()";

        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            ':id' => $equipId,
            ':fac_id' => $facId,
            ':class' => $item['item_class'] ?? null,
            ':type' => $item['item_type'] ?? null,
            ':manuf' => $item['Manufacturer'] ?? null,
            ':model' => $item['Model'] ?? null,
            ':serial' => $item['SerialNumber'] ?? null,
            ':year' => isset($item['YearInstalled']) ? intval($item['YearInstalled']) : null,
            ':func' => isset($item['IsItFunctioning']) ? ($item['IsItFunctioning'] ? 't' : 'f') : 't',
            ':code' => $item['code'] ?? null,
            ':del' => isset($item['isDel']) ? ($item['isDel'] ? 't' : 'f') : 'f',
        ]);
        $totalItems++;
    }
}
echo "Equipment Sync Complete. Processed $totalItems items.\n";
?>