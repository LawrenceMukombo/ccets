/**
 * enrich_png_geocoded.js
 * Enriches the PNG schema with the official geocoded health facilities CSV.
 *
 * Strategy:
 *  1. For each row in the CSV, try to find a matching facility in png.facilities by name.
 *     If found and coords are NULL → update with CSV coords.
 *  2. For unmatched facilities in the CSV (new), insert them with province/district lookup.
 *
 * Usage: node enrich_png_geocoded.js
 */
const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'png_ccets',
    password: 'S@mund3ng0',
    port: 5432,
});

const SCHEMA = 'png';
const CSV_PATH = 'c:/ccets_all/png_health_facilities_geocoded.csv';

// ── Parse CSV ────────────────────────────────────────────────────────────────
function parseCSV(path) {
    const raw = fs.readFileSync(path, 'utf8').replace(/^\uFEFF/, ''); // strip BOM
    const lines = raw.split('\n').filter(l => l.trim());
    const headers = lines[0].split(',').map(h => h.trim());
    return lines.slice(1).map(line => {
        const vals = line.split(',');
        const obj = {};
        headers.forEach((h, i) => { obj[h] = (vals[i] || '').trim(); });
        return obj;
    });
}

// ── Province name mapping (CSV long name → DB short name) ───────────────────
const PROV_MAP = {
    'Western Province':                      'Western',
    'National Capital District':             'National Capital District',
    'Central Province':                      'Central',
    'Milne Bay Province':                    'Milne Bay',
    'Northern (Oro) Province':               'Northern Oro',
    'Southern Highlands Province':           'Southern Highlands',
    'Enga Province':                         'Enga',
    'Western Highlands Province':            'Western Highlands',
    'Chimbu (Simbu) Province':               'Chimbu',
    'Eastern Highlands Province':            'Eastern Highlands',
    'Morobe Province':                       'Morobe',
    'Madang Province':                       'Madang',
    'East Sepik Province':                   'East Sepik',
    'West Sepik (Sandaun) Province':         'West Sepik',
    'Manus Province':                        'Manus',
    'New Ireland Province':                  'New Ireland',
    'East New Britain Province':             'East New Britain',
    'West New Britain Province':             'West New Britain',
    'Autonomous Region of Bougainville':     'Bougainville',
    'Gulf Province':                         'Gulf',
    'Hela Province':                         'Hela',
    'Jiwaka Province':                       'Jiwaka',
};

// ── Normalize facility type ──────────────────────────────────────────────────
function normalizeType(t) {
    const s = (t || '').trim().toLowerCase();
    if (s.includes('aidpost') || s.includes('aid post') || s === '0' || s === '1') return 'Community Health Post (CHP) - L2';
    if (s.includes('sub centre') || s.includes('sub center') || s.includes('sub health')) return 'Health Center (HC) - L3';
    if (s.includes('health centre') || s.includes('health center') || s.includes('health sub')) return 'Health Center (HC) - L3';
    if (s.includes('urban clinic')) return 'Urban Clinic (UC) - L3';
    if (s.includes('clinic')) return 'Urban Clinic (UC) - L3';
    if (s.includes('district hosp')) return 'District Hospital (DH) - L4';
    if (s.includes('hospital')) return 'District Hospital (DH) - L4';
    return 'Community Health Post (CHP) - L2'; // default
}

// ── Strip district suffix noise ──────────────────────────────────────────────
function normalizeDistrict(d) {
    return (d || '').replace(/\s+district$/i, '').replace(/\s+rural$/i, '').trim();
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function enrich() {
    const client = await pool.connect();
    try {
        console.log('=== Enrich PNG with Geocoded CSV ===\n');
        await client.query('BEGIN');
        await client.query(`SET LOCAL search_path TO ${SCHEMA}, public`);

        // Load province/district lookups
        const provRes = await client.query(`SELECT province_id, province_name FROM ${SCHEMA}.provinces`);
        const provByName = {};
        for (const r of provRes.rows) provByName[r.province_name.toLowerCase()] = r.province_id;

        const distRes = await client.query(`SELECT district_id, district_name, province_id FROM ${SCHEMA}.districts`);
        const distByKey = {}; // `name|province_id` → district_id
        const distByName = {}; // name only → district_id (fallback)
        for (const r of distRes.rows) {
            const normName = r.district_name.replace(/\s+district$/i,'').replace(/\s+rural$/i,'').trim().toLowerCase();
            distByKey[`${normName}|${r.province_id}`] = r.district_id;
            if (!distByName[normName]) distByName[normName] = r.district_id;
        }

        // Build name→facility_id lookup (for matching)
        const facRes = await client.query(`SELECT facility_id, facility_name, latitude FROM ${SCHEMA}.facilities`);
        const facByName = {};
        for (const r of facRes.rows) {
            const k = (r.facility_name || '').trim().toUpperCase();
            if (!facByName[k]) facByName[k] = r;
        }

        // Parse CSV
        const rows = parseCSV(CSV_PATH).filter(r => r.NAME && r.X && r.Y);
        console.log(`CSV: ${rows.length} geocoded facilities\n`);

        let coordsUpdated = 0;
        let newInserted = 0;
        let skipped = 0;
        const missingProvinces = new Set();

        for (const row of rows) {
            const lng = parseFloat(row.X);
            const lat = parseFloat(row.Y);
            if (isNaN(lat) || isNaN(lng)) { skipped++; continue; }

            const nameKey = row.NAME.trim().toUpperCase();
            const csvProvName = PROV_MAP[row.Prov_name] || row.Prov_name;
            const provinceId = provByName[csvProvName.toLowerCase()];

            // ── Try to enrich existing facility ──
            const existing = facByName[nameKey];
            if (existing) {
                if (!existing.latitude) {
                    await client.query(
                        `UPDATE ${SCHEMA}.facilities SET latitude=$1, longitude=$2 WHERE facility_id=$3`,
                        [lat, lng, existing.facility_id]
                    );
                    coordsUpdated++;
                }
                continue; // don't duplicate
            }

            // ── Insert as new facility ──
            if (!provinceId) {
                missingProvinces.add(row.Prov_name);
                skipped++;
                continue;
            }

            // Find district
            const rawDist = normalizeDistrict(row.District_Name);
            const distKey = `${rawDist.toLowerCase()}|${provinceId}`;
            let districtId = distByKey[distKey] || distByName[rawDist.toLowerCase()];

            const facType = normalizeType(row.TYPE);

            await client.query(
                `INSERT INTO ${SCHEMA}.facilities
                 (facility_name, type, district_id, province_id, latitude, longitude, is_functioning)
                 VALUES ($1,$2,$3,$4,$5,$6,true)`,
                [row.NAME.trim(), facType, districtId || null, provinceId, lat, lng]
            );
            facByName[nameKey] = { facility_id: -1, latitude: lat }; // prevent duplicates within batch
            newInserted++;
        }

        if (missingProvinces.size > 0) {
            console.log(`Unmatched province names (${missingProvinces.size}):`);
            [...missingProvinces].sort().forEach(p => console.log(`  - "${p}"`));
        }

        await client.query('COMMIT');

        const finalRes = await client.query(
            `SELECT count(*) as total, count(CASE WHEN latitude IS NOT NULL THEN 1 END) as with_coords FROM ${SCHEMA}.facilities`
        );
        const f = finalRes.rows[0];

        console.log('\n=============================');
        console.log('✅  PNG Enrichment complete!');
        console.log(`   Coords added:  ${coordsUpdated}`);
        console.log(`   New inserted:  ${newInserted}`);
        console.log(`   Skipped:       ${skipped}`);
        console.log(`   Total fac:     ${f.total}`);
        console.log(`   With coords:   ${f.with_coords}`);
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

enrich();
