/**
 * provision_malawi.js
 * 1. Clones the png schema DDL to create the malawi schema
 * 2. Seeds malawi with data from MHFR_Facilities.xlsx
 *    (Malawi Health Facility Registry - 1928 facilities, 28 districts, 5 zones)
 *
 * Usage: node provision_malawi.js
 */
const { Pool } = require('pg');
const xlsx = require('xlsx');
const fs = require('fs');
const { execSync } = require('child_process');

const DB = {
    user: 'postgres',
    host: 'localhost',
    database: 'png_ccets',
    password: 'S@mund3ng0',
    port: 5432,
};

const pool = new Pool(DB);
const SCHEMA = 'malawi';
const XLSX_PATH = 'c:/ccets_all/MHFR_Facilities.xlsx';

// ── Malawi district → province mapping ──────────────────────────────────────
// Malawi has 3 regions (North, Centre, South) and 28 districts
const DISTRICT_TO_PROVINCE = {
    // Northern Region
    'Chitipa':    'Northern Region',
    'Karonga':    'Northern Region',
    'Rumphi':     'Northern Region',
    'Nkhata Bay': 'Northern Region',
    'Likoma':     'Northern Region',
    'Mzimba':     'Northern Region',
    'Mzuzu Central': 'Northern Region',  // Mzuzu is a city, technically Mzimba district
    // Central Region
    'Kasungu':    'Central Region',
    'Nkhotakota': 'Central Region',
    'Ntchisi':    'Central Region',
    'Dowa':       'Central Region',
    'Salima':     'Central Region',
    'Mchinji':    'Central Region',
    'Lilongwe':   'Central Region',
    'Dedza':      'Central Region',
    'Ntcheu':     'Central Region',
    // Southern Region
    'Mangochi':   'Southern Region',
    'Machinga':   'Southern Region',
    'Zomba':      'Southern Region',
    'Chiradzulu': 'Southern Region',
    'Blantyre':   'Southern Region',
    'Mwanza':     'Southern Region',
    'Thyolo':     'Southern Region',
    'Mulanje':    'Southern Region',
    'Phalombe':   'Southern Region',
    'Chikwawa':   'Southern Region',
    'Nsanje':     'Southern Region',
    'Balaka':     'Southern Region',
    'Neno':       'Southern Region',
};

// Zone → region mapping (5 zones → 3 regions)
const ZONE_TO_REGION = {
    'North Zone':        'Northern Region',
    'Central East Zone': 'Central Region',
    'Centrals West Zone':'Central Region',
    'South East Zone':   'Southern Region',
    'South West Zone':   'Southern Region',
};

// ── Facility type normalizer ─────────────────────────────────────────────────
function normalizeType(t) {
    const s = (t || '').toLowerCase();
    if (s.includes('central hospital')) return 'Central Hospital';
    if (s.includes('district hospital')) return 'District Hospital (DH) - L4';
    if (s.includes('hospital')) return 'District Hospital (DH) - L4';
    if (s.includes('health centre')) return 'Health Center (HC) - L3';
    if (s.includes('health post')) return 'Community Health Post (CHP) - L2';
    if (s.includes('dispensary')) return 'Community Health Post (CHP) - L2';
    if (s.includes('clinic')) return 'Urban Clinic (UC) - L3';
    return t || 'Other';
}

function facilityLevel(type) {
    const t = (type || '').toLowerCase();
    if (t.includes('central')) return 5;
    if (t.includes('district hospital') || t.includes('dh -')) return 4;
    if (t.includes('health center') || t.includes('hc -')) return 3;
    if (t.includes('urban clinic')) return 3;
    if (t.includes('chp -') || t.includes('health post') || t.includes('dispensary')) return 2;
    return 1;
}

// ── Parse MHFR Excel ─────────────────────────────────────────────────────────
function parseMHFR(path) {
    const wb = xlsx.readFile(path);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json(ws, { header: 1 });
    // Row 0: headers, Row 1: example row (skip), rows 2+: data
    return rows.slice(2)
        .filter(r => r[1] && r[1] !== 'Facility Name')
        .map(r => {
            let lat = r[9] ? parseFloat(r[9]) : null;
            let lon = r[10] ? parseFloat(r[10]) : null;
            // Validate range and round to 8 decimal places to fit numeric(10,8)/numeric(11,8)
            if (lat !== null && (isNaN(lat) || lat < -90 || lat > 90)) lat = null;
            if (lon !== null && (isNaN(lon) || lon < -180 || lon > 180)) lon = null;
            if (lat !== null) lat = Math.round(lat * 1e8) / 1e8;
            if (lon !== null) lon = Math.round(lon * 1e8) / 1e8;
            return {
                code:      (r[0] || '').toString().trim(),
                name:      (r[1] || '').toString().trim(),
                ownership: (r[3] || '').toString().trim(),
                type:      (r[4] || '').toString().trim(),
                status:    (r[5] || '').toString().trim(),
                zone:      (r[6] || '').toString().trim(),
                district:  (r[7] || '').toString().trim(),
                latitude:  lat,
                longitude: lon,
            };
        });
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function provision() {
    const client = await pool.connect();
    try {
        console.log('=== Provision Malawi Tenant ===\n');

        // ── Step 1: Clone PNG schema structure to malawi ─────────────────────
        console.log('Step 1: Cloning PNG schema to malawi...');
        const schemaCheck = await client.query(
            `SELECT schema_name FROM information_schema.schemata WHERE schema_name = $1`, [SCHEMA]
        );

        if (schemaCheck.rows.length > 0) {
            console.log('  Schema already exists — skipping clone, going straight to seed\n');
        } else {
            // Dump png schema (schema-only for structure, we'll seed data ourselves)
            execSync(`pg_dump -U postgres -h localhost -d png_ccets -n png --schema-only -f temp_malawi_struct.sql`, {
                env: { ...process.env, PGPASSWORD: 'S@mund3ng0' },
                stdio: 'pipe'
            });

            let ddl = fs.readFileSync('temp_malawi_struct.sql', 'utf8');
            // Replace all schema references
            ddl = ddl.replace(/CREATE SCHEMA png;/g, `CREATE SCHEMA ${SCHEMA};`);
            ddl = ddl.replace(/ALTER SCHEMA png/g, `ALTER SCHEMA ${SCHEMA}`);
            ddl = ddl.replace(/Schema: png;/g, `Schema: ${SCHEMA};`);
            ddl = ddl.replace(/ png\./g, ` ${SCHEMA}.`);
            ddl = ddl.replace(/\(png\./g, `(${SCHEMA}.`);
            ddl = ddl.replace(/'png\./g, `'${SCHEMA}.`);
            ddl = ddl.replace(/SCHEMA png /g, `SCHEMA ${SCHEMA} `);

            fs.writeFileSync('temp_malawi_struct.sql', ddl);
            execSync(`psql -U postgres -h localhost -d png_ccets -f temp_malawi_struct.sql`, {
                env: { ...process.env, PGPASSWORD: 'S@mund3ng0' },
                stdio: 'pipe'
            });
            fs.unlinkSync('temp_malawi_struct.sql');
            console.log('  ✓ Schema cloned\n');
        }

        await client.query('BEGIN');
        await client.query(`SET LOCAL search_path TO ${SCHEMA}, public`);

        // ── Step 2: Register tenant ─────────────────────────────────────────
        await client.query(`
            INSERT INTO public.tenants (code, name, schema_name)
            VALUES ($1, 'Malawi', $1)
            ON CONFLICT (code) DO NOTHING
        `, [SCHEMA]);

        // ── Step 3: Fix sequences ────────────────────────────────────────────
        console.log('Step 2: Fixing sequences...');
        for (const seq of ['regions_region_id_seq','provinces_province_id_seq','districts_district_id_seq','facilities_facility_id_seq']) {
            await client.query(`CREATE SEQUENCE IF NOT EXISTS ${SCHEMA}.${seq} START 1`);
        }
        await client.query(`ALTER TABLE ${SCHEMA}.regions   ALTER COLUMN region_id   SET DEFAULT nextval('${SCHEMA}.regions_region_id_seq')`);
        await client.query(`ALTER TABLE ${SCHEMA}.provinces ALTER COLUMN province_id SET DEFAULT nextval('${SCHEMA}.provinces_province_id_seq')`);
        await client.query(`ALTER TABLE ${SCHEMA}.districts ALTER COLUMN district_id SET DEFAULT nextval('${SCHEMA}.districts_district_id_seq')`);
        await client.query(`ALTER TABLE ${SCHEMA}.facilities ALTER COLUMN facility_id SET DEFAULT nextval('${SCHEMA}.facilities_facility_id_seq')`);
        console.log('  ✓ Sequences fixed\n');

        // ── Step 4: Clear any existing data ─────────────────────────────────
        console.log('Step 3: Clearing any existing data...');
        await client.query(`SET session_replication_role = replica`);
        await client.query(`DELETE FROM ${SCHEMA}.repairs`);
        await client.query(`DELETE FROM ${SCHEMA}.tickets`);
        await client.query(`DELETE FROM ${SCHEMA}.equipment`);
        await client.query(`DELETE FROM ${SCHEMA}.role_location_access`);
        await client.query(`DELETE FROM ${SCHEMA}.user_scopes`);
        await client.query(`UPDATE ${SCHEMA}.users SET assigned_facility_id=NULL, assigned_district_id=NULL, assigned_province_id=NULL, assigned_region_id=NULL`);
        await client.query(`DELETE FROM ${SCHEMA}.facilities`);
        await client.query(`DELETE FROM ${SCHEMA}.districts`);
        await client.query(`DELETE FROM ${SCHEMA}.provinces`);
        await client.query(`DELETE FROM ${SCHEMA}.regions`);
        await client.query(`SET session_replication_role = DEFAULT`);
        // Reset sequences
        for (const seq of ['regions_region_id_seq','provinces_province_id_seq','districts_district_id_seq','facilities_facility_id_seq']) {
            await client.query(`ALTER SEQUENCE ${SCHEMA}.${seq} RESTART WITH 1`);
        }
        console.log('  ✓ Cleared\n');

        // ── Step 5: Seed Regions (3 Malawi regions) ──────────────────────────
        console.log('Step 4: Seeding regions...');
        const uniqueRegions = [...new Set(Object.values(DISTRICT_TO_PROVINCE))].sort();
        const regionIdMap = {};
        for (const rname of uniqueRegions) {
            const res = await client.query(
                `INSERT INTO ${SCHEMA}.regions (region_name) VALUES ($1) RETURNING region_id`, [rname]
            );
            regionIdMap[rname] = res.rows[0].region_id;
        }
        console.log(`  ✓ ${uniqueRegions.length} regions inserted\n`);

        // ── Step 6: Seed Provinces (28 Malawi districts → 3 provinces) ──────
        // Malawi's "provinces" are its 3 administrative regions; districts are level 2
        console.log('Step 5: Seeding provinces (3 Malawi regions as provinces)...');
        const provIdMap = {};
        for (const [regName, regionId] of Object.entries(regionIdMap)) {
            const res = await client.query(
                `INSERT INTO ${SCHEMA}.provinces (province_name, region_id) VALUES ($1, $2) RETURNING province_id`,
                [regName, regionId]
            );
            provIdMap[regName] = res.rows[0].province_id;
        }
        console.log(`  ✓ ${Object.keys(provIdMap).length} provinces inserted\n`);

        // ── Step 7: Seed Districts (28 Malawi districts) ─────────────────────
        console.log('Step 6: Seeding districts...');
        const distIdMap = {};
        const uniqueDistricts = [...new Set(Object.keys(DISTRICT_TO_PROVINCE))].sort();
        for (const distName of uniqueDistricts) {
            const provName = DISTRICT_TO_PROVINCE[distName];
            const provinceId = provIdMap[provName];
            const res = await client.query(
                `INSERT INTO ${SCHEMA}.districts (district_name, province_id) VALUES ($1, $2) RETURNING district_id`,
                [distName, provinceId]
            );
            distIdMap[distName.toLowerCase()] = { district_id: res.rows[0].district_id, province_id: provinceId, region_id: regionIdMap[provName] };
        }
        console.log(`  ✓ ${uniqueDistricts.length} districts inserted\n`);

        // ── Step 8: Seed Facilities from MHFR ───────────────────────────────
        console.log('Step 7: Seeding facilities from MHFR...');
        const facilities = parseMHFR(XLSX_PATH);
        console.log(`  Found ${facilities.length} facilities\n`);

        let inserted = 0;
        let skipped = 0;
        const missingDistricts = new Map();

        for (const fac of facilities) {
            const distKey = fac.district.toLowerCase();
            const distInfo = distIdMap[distKey];

            if (!distInfo) {
                missingDistricts.set(fac.district, (missingDistricts.get(fac.district) || 0) + 1);
                skipped++;
                continue;
            }

            const isOperational = (fac.status || '').toLowerCase().startsWith('functional');
            const facType = normalizeType(fac.type);
            const level = facilityLevel(facType);

            await client.query(
                `INSERT INTO ${SCHEMA}.facilities
                 (facility_name, facility_code, type, level, district_id, province_id, region_id,
                  latitude, longitude, is_functioning, ownership)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
                [
                    fac.name,
                    fac.code || null,
                    facType,
                    level,
                    distInfo.district_id,
                    distInfo.province_id,
                    distInfo.region_id,
                    fac.latitude,
                    fac.longitude,
                    isOperational,
                    fac.ownership || null,
                ]
            );
            inserted++;
            if (inserted % 500 === 0) process.stdout.write(`  ... ${inserted} inserted\r`);
        }

        if (missingDistricts.size > 0) {
            console.log(`\n  Unmatched districts (${missingDistricts.size}):`);
            [...missingDistricts.entries()].sort().forEach(([d, c]) =>
                console.log(`    - "${d}" (${c} skipped)`)
            );
        }

        await client.query('COMMIT');

        const c = (await client.query(`
            SELECT
                (SELECT count(*) FROM ${SCHEMA}.regions) as regions,
                (SELECT count(*) FROM ${SCHEMA}.provinces) as provinces,
                (SELECT count(*) FROM ${SCHEMA}.districts) as districts,
                (SELECT count(*) FROM ${SCHEMA}.facilities) as facilities,
                (SELECT count(*) FROM ${SCHEMA}.facilities WHERE latitude IS NOT NULL) as with_coords
        `)).rows[0];

        console.log('\n=============================');
        console.log('✅  Malawi Provisioned!');
        console.log(`   Regions:    ${c.regions}`);
        console.log(`   Provinces:  ${c.provinces}`);
        console.log(`   Districts:  ${c.districts}`);
        console.log(`   Facilities: ${c.facilities} inserted, ${skipped} skipped`);
        console.log(`   With GPS:   ${c.with_coords}`);
        console.log('=============================\n');

    } catch (err) {
        await client.query('ROLLBACK').catch(() => {});
        console.error('\n❌ FAILED:', err.message);
        console.error(err.stack);
        process.exit(1);
    } finally {
        client.release();
        pool.end();
    }
}

provision();
