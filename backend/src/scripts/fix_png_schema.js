/**
 * fix_png_schema.js
 * 1. Deduplicates PNG provinces and districts
 * 2. Enriches PNG facilities with coordinates from OCHA shapefile
 * 3. Adds additional facilities from OCHA that don't already exist
 *
 * Usage: node fix_png_schema.js
 */
const { Pool } = require('pg');
const shapefile = require('shapefile');

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'png_ccets',
    password: 'S@mund3ng0',
    port: 5432,
});

const SCHEMA = 'png';
const OCHA_SHP = 'c:/ccets_all/png_ocha/png_hltfacp_2000_nso_edit.shp';

async function readAllFeatures(shpPath) {
    const features = [];
    const source = await shapefile.open(shpPath);
    while (true) {
        const result = await source.read();
        if (result.done) break;
        features.push(result.value);
    }
    return features;
}

// Normalize province name from OCHA (all caps) → Title Case matching PNG DB
function normalizeProvinceName(name) {
    // Map OCHA province names to DB province names
    const map = {
        'NATIONAL CAPITAL': 'National Capital District',
        'CENTRAL': 'Central',
        'CHIMBU': 'Chimbu',
        'EASTERN HIGHLANDS': 'Eastern Highlands',
        'ENGA': 'Enga',
        'GULF': 'Gulf',
        'HELA': 'Hela',
        'JIWAKA': 'Jiwaka',
        'MADANG': 'Madang',
        'MANUS': 'Manus',
        'MILNE BAY': 'Milne Bay',
        'MOROBE': 'Morobe',
        'NEW IRELAND': 'New Ireland',
        'BOUGAINVILLE': 'Bougainville',
        'NORTH SOLOMONS': 'Bougainville',
        'NORTHERN': 'Northern Oro',
        'ORO': 'Northern Oro',
        'SANDAUN': 'West Sepik',
        'WEST SEPIK': 'West Sepik',
        'EAST SEPIK': 'East Sepik',
        'SOUTHERN HIGHLANDS': 'Southern Highlands',
        'WESTERN': 'Western',
        'WESTERN HIGHLANDS': 'Western Highlands',
        'WEST NEW BRITAIN': 'West New Britain',
        'EAST NEW BRITAIN': 'East New Britain',
    };
    const key = (name || '').toUpperCase().trim();
    // Try exact match first
    if (map[key]) return map[key];
    // Try partial match
    for (const [k, v] of Object.entries(map)) {
        if (key.includes(k) || k.includes(key)) return v;
    }
    // Title case fallback
    return name.split(' ').map(w => w[0]?.toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}

async function fix() {
    const client = await pool.connect();
    try {
        console.log('=== Fix PNG Schema ===\n');
        await client.query('BEGIN');
        await client.query(`SET LOCAL search_path TO ${SCHEMA}, public`);

        // ── Step 1: Remove duplicate provinces ─────────────────────────────
        console.log('Step 1: Removing duplicate provinces...');
        // Disable FK constraints temporarily
        await client.query(`SET session_replication_role = replica`);
        // Find duplicates (keep the lowest province_id for each name)
        const dupsRes = await client.query(`
            SELECT province_name, array_agg(province_id ORDER BY province_id) as ids
            FROM ${SCHEMA}.provinces
            GROUP BY province_name
            HAVING count(*) > 1
        `);

        for (const row of dupsRes.rows) {
            const keepId = row.ids[0];
            const removeIds = row.ids.slice(1);
            console.log(`  Merging "${row.province_name}": keep ${keepId}, remove ${removeIds.join(',')}`);

            // Re-point districts to the kept province
            await client.query(
                `UPDATE ${SCHEMA}.districts SET province_id = $1 WHERE province_id = ANY($2)`,
                [keepId, removeIds]
            );
            // Re-point facilities
            await client.query(
                `UPDATE ${SCHEMA}.facilities SET province_id = $1 WHERE province_id = ANY($2)`,
                [keepId, removeIds]
            );
            // Re-point tickets
            await client.query(
                `UPDATE ${SCHEMA}.tickets SET province_id = $1 WHERE province_id = ANY($2)`,
                [keepId, removeIds]
            );
            // Re-point users
            await client.query(
                `UPDATE ${SCHEMA}.users SET assigned_province_id = $1 WHERE assigned_province_id = ANY($2)`,
                [keepId, removeIds]
            );
            // Delete duplicates
            await client.query(
                `DELETE FROM ${SCHEMA}.provinces WHERE province_id = ANY($1)`,
                [removeIds]
            );
        }
        console.log(`  ✓ Provinces deduplicated\n`);

        // ── Step 2: Remove duplicate districts ─────────────────────────────
        console.log('Step 2: Removing duplicate districts...');

        const distDupsRes = await client.query(`
            SELECT district_name, province_id, array_agg(district_id ORDER BY district_id) as ids
            FROM ${SCHEMA}.districts
            GROUP BY district_name, province_id
            HAVING count(*) > 1
        `);

        for (const row of distDupsRes.rows) {
            const keepId = row.ids[0];
            const removeIds = row.ids.slice(1);
            // Re-point facilities
            await client.query(
                `UPDATE ${SCHEMA}.facilities SET district_id = $1 WHERE district_id = ANY($2)`,
                [keepId, removeIds]
            );
            await client.query(
                `UPDATE ${SCHEMA}.users SET assigned_district_id = $1 WHERE assigned_district_id = ANY($2)`,
                [keepId, removeIds]
            );
            await client.query(
                `DELETE FROM ${SCHEMA}.districts WHERE district_id = ANY($1)`,
                [removeIds]
            );
        }
        console.log(`  ✓ Districts deduplicated\n`);

        // Re-enable FK constraints
        await client.query(`SET session_replication_role = DEFAULT`);

        // ── Step 3: Get current DB state ────────────────────────────────────
        const provRes = await client.query(`SELECT province_id, province_name FROM ${SCHEMA}.provinces`);
        const provinceByName = {};
        for (const r of provRes.rows) {
            provinceByName[r.province_name.toLowerCase()] = r.province_id;
        }

        const distRes = await client.query(`SELECT district_id, district_name, province_id FROM ${SCHEMA}.districts`);
        const districtByNameProvince = {};
        for (const r of distRes.rows) {
            const k = `${r.district_name.toLowerCase()}|${r.province_id}`;
            districtByNameProvince[k] = r.district_id;
        }

        // ── Step 4: Load OCHA shapefile ─────────────────────────────────────
        console.log('Step 3: Loading OCHA PNG health facilities shapefile...');
        const features = await readAllFeatures(OCHA_SHP);
        console.log(`  Found ${features.length} features\n`);

        // Build a lookup: facility_name (normalized) → coords
        const ochaByName = {};
        for (const feat of features) {
            const p = feat.properties;
            let lng = null, lat = null;
            if (feat.geometry?.type === 'Point') {
                [lng, lat] = feat.geometry.coordinates;
            } else if (feat.geometry?.type === 'MultiPoint') {
                [lng, lat] = feat.geometry.coordinates[0];
            }
            if (!lng || !lat) continue;

            const key = (p.HLTFAC_NAM || '').trim().toUpperCase();
            if (!ochaByName[key]) {
                ochaByName[key] = { lat, lng, provinceName: normalizeProvinceName(p.ADM1_NAME), districtName: p.ADM2_NAME, type: p.HLTFAC_TYP };
            }
        }

        // ── Step 5: Enrich existing PNG facilities with OCHA coordinates ────
        console.log('Step 4: Enriching existing facilities with OCHA coordinates...');
        const facilRes = await client.query(
            `SELECT facility_id, facility_name FROM ${SCHEMA}.facilities WHERE latitude IS NULL OR longitude IS NULL`
        );
        
        let coordsAdded = 0;
        for (const fac of facilRes.rows) {
            const key = (fac.facility_name || '').trim().toUpperCase();
            const match = ochaByName[key];
            if (match) {
                await client.query(
                    `UPDATE ${SCHEMA}.facilities SET latitude=$1, longitude=$2 WHERE facility_id=$3`,
                    [match.lat, match.lng, fac.facility_id]
                );
                coordsAdded++;
            }
        }
        console.log(`  ✓ Added coordinates to ${coordsAdded} facilities\n`);

        // ── Step 6: Insert new OCHA facilities not in DB ───────────────────────
        console.log('Step 5: Inserting new facilities from OCHA...');
        // Reset sequence to avoid PK conflicts
        await client.query(`SELECT setval('${SCHEMA}.facilities_facility_id_seq', (SELECT MAX(facility_id) FROM ${SCHEMA}.facilities))`);
        const existingNames = new Set(
            (await client.query(`SELECT upper(trim(facility_name)) as name FROM ${SCHEMA}.facilities`))
            .rows.map(r => r.name)
        );

        let newFacInserted = 0;
        for (const feat of features) {
            const p = feat.properties;
            const name = (p.HLTFAC_NAM || '').trim();
            if (!name || existingNames.has(name.toUpperCase())) continue;

            let lng = null, lat = null;
            if (feat.geometry?.type === 'Point') {
                [lng, lat] = feat.geometry.coordinates;
            } else if (feat.geometry?.type === 'MultiPoint') {
                [lng, lat] = feat.geometry.coordinates[0];
            }

            const provName = normalizeProvinceName(p.ADM1_NAME);
            const provinceId = provinceByName[provName.toLowerCase()];
            if (!provinceId) continue; // skip if province not found

            // Try to match district
            const distName = (p.ADM2_NAME || '').trim();
            // Normalize district name to Title Case
            const distNameNorm = distName.split('/').map(part =>
                part.trim().split(' ').map(w => w[0]?.toUpperCase() + w.slice(1).toLowerCase()).join(' ')
            ).join('/');

            const distKey = `${distNameNorm.toLowerCase()}|${provinceId}`;
            let districtId = districtByNameProvince[distKey];

            // If district not found, try partial match
            if (!districtId) {
                for (const [k, v] of Object.entries(districtByNameProvince)) {
                    if (k.startsWith(distNameNorm.toLowerCase())) { districtId = v; break; }
                }
            }

            // Map OCHA type
            const typeMap = {
                'Aidpost': 'Community Health Post (CHP) - L2',
                'Health Sub-Centre': 'Health Center (HC) - L3',
                'Health Centre': 'Health Center (HC) - L3',
                'Hospital': 'District Hospital (DH) - L4',
                'Urban Clinic': 'Urban Clinic (UC) - L3',
            };
            const facilType = typeMap[p.HLTFAC_TYP] || p.HLTFAC_TYP;

            await client.query(
                `INSERT INTO ${SCHEMA}.facilities
                 (facility_name, type, district_id, province_id, latitude, longitude, is_functioning)
                 VALUES ($1,$2,$3,$4,$5,$6,true)`,
                [name, facilType, districtId || null, provinceId, lat, lng]
            );
            existingNames.add(name.toUpperCase());
            newFacInserted++;
        }
        console.log(`  ✓ Inserted ${newFacInserted} new facilities from OCHA\n`);

        await client.query('COMMIT');

        // Final counts
        const finalCounts = await client.query(`
            SELECT
                (SELECT count(*) FROM ${SCHEMA}.regions) as regions,
                (SELECT count(*) FROM ${SCHEMA}.provinces) as provinces,
                (SELECT count(*) FROM ${SCHEMA}.districts) as districts,
                (SELECT count(*) FROM ${SCHEMA}.facilities) as facilities,
                (SELECT count(*) FROM ${SCHEMA}.facilities WHERE latitude IS NOT NULL) as with_coords
        `);
        const c = finalCounts.rows[0];
        
        console.log('=============================');
        console.log('✅  PNG Schema Fixed!');
        console.log(`   Regions:       ${c.regions}`);
        console.log(`   Provinces:     ${c.provinces}`);
        console.log(`   Districts:     ${c.districts}`);
        console.log(`   Facilities:    ${c.facilities} total`);
        console.log(`   With coords:   ${c.with_coords}`);
        console.log('=============================\n');

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('\n❌ FAILED:', err.message);
        console.error(err.stack);
        process.exit(1);
    } finally {
        client.release();
        pool.end();
    }
}

fix();
