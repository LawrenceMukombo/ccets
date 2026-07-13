/**
 * seed_zambia.js
 * Seeds the zambia schema with real Zambia data:
 *  1. Regions   (mapped from province groups)
 *  2. Provinces (admin1) from zmb_admin1.shp
 *  3. Districts (admin2) from zmb_admin2.shp
 *  4. Facilities from "Zambian Health Facilities.xlsx"
 *
 * Usage: node seed_zambia.js
 */
const { Pool } = require('pg');
const xlsx = require('xlsx');
const shapefile = require('shapefile');

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'png_ccets',
    password: process.env.DB_PASSWORD || 'password_change_me_in_prod',
    port: parseInt(process.env.DB_PORT || '5433'),
});

const SCHEMA = 'zambia';

// ── Paths ─────────────────────────────────────────────────────────────────
const XLSX_PATH = 'c:/CCETS_Project/Zambian Health Facilities.xlsx';
const SHP_ADMIN1 = 'c:/CCETS_Project/zmb_admin_boundaries.shp/zmb_admin1.shp';
const SHP_ADMIN2 = 'c:/CCETS_Project/zmb_admin_boundaries.shp/zmb_admin2.shp';

// ── Helpers ───────────────────────────────────────────────────────────────
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

function parseXlsx(path) {
    const wb = xlsx.readFile(path);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rawRows = xlsx.utils.sheet_to_json(ws, { header: 1 });

    // Row 0 is a single comma-separated header string
    const headers = rawRows[0][0].split(',');
    return rawRows.slice(1)
        .filter(r => r[0])
        .map(r => {
            const vals = r[0].split(',');
            const obj = {};
            headers.forEach((h, i) => { obj[h.trim()] = (vals[i] || '').trim(); });
            return obj;
        });
}

// ── Province → Region grouping (standard Zambia zones) ───────────────────
const PROVINCE_TO_REGION = {
    'Central':       'Central',
    'Copperbelt':    'Copperbelt',
    'Eastern':       'Eastern',
    'Luapula':       'Northern',
    'Lusaka':        'Lusaka',
    'Muchinga':      'Northern',
    'Northern':      'Northern',
    'North-Western': 'Western',
    'Southern':      'Southern',
    'Western':       'Western',
};

// ── District name normalization (XLSX uses different spellings from shapefile) ──
const DISTRICT_ALIASES = {
    'kapiri-mposhi':  'kapiri mposhi',
    'lavushi manda':  'lavushimanda',
    'mushindano':     'mushindamo',
    "shang'ombo":     'shangombo',
};

function normalizeDistrict(name) {
    const lower = (name || '').trim().toLowerCase();
    return DISTRICT_ALIASES[lower] || lower;
}

function facilityLevel(type) {
    const t = (type || '').toLowerCase();
    if (t.includes('tertiary') || t.includes('university') || t.includes('teaching')) return 4;
    if (t.includes('general hospital') || t.includes('provincial')) return 3;
    if (t.includes('district hospital') || t.includes('hospital')) return 2;
    if (t.includes('rural health centre') || t.includes('urban health centre') || t.includes('health centre')) return 1;
    return 0; // Health Post / other
}

// ── Main ──────────────────────────────────────────────────────────────────
async function seed() {
    const client = await pool.connect();
    try {
        console.log('=== Zambia Seed Script ===\n');

        await client.query('BEGIN');
        await client.query(`SET LOCAL search_path TO ${SCHEMA}, public`);

        // ── Step 0: Fix sequences to be owned by zambia schema ─────────────
        console.log('Fixing sequences...');
        // Create independent sequences in zambia schema if they don't exist
        await client.query(`
            CREATE SEQUENCE IF NOT EXISTS ${SCHEMA}.regions_region_id_seq START 1;
            CREATE SEQUENCE IF NOT EXISTS ${SCHEMA}.provinces_province_id_seq START 1;
            CREATE SEQUENCE IF NOT EXISTS ${SCHEMA}.districts_district_id_seq START 1;
            CREATE SEQUENCE IF NOT EXISTS ${SCHEMA}.facilities_facility_id_seq START 1;
        `);
        // Point table defaults to zambia-owned sequences
        await client.query(`ALTER TABLE ${SCHEMA}.regions ALTER COLUMN region_id SET DEFAULT nextval('${SCHEMA}.regions_region_id_seq')`);
        await client.query(`ALTER TABLE ${SCHEMA}.provinces ALTER COLUMN province_id SET DEFAULT nextval('${SCHEMA}.provinces_province_id_seq')`);
        await client.query(`ALTER TABLE ${SCHEMA}.districts ALTER COLUMN district_id SET DEFAULT nextval('${SCHEMA}.districts_district_id_seq')`);
        await client.query(`ALTER TABLE ${SCHEMA}.facilities ALTER COLUMN facility_id SET DEFAULT nextval('${SCHEMA}.facilities_facility_id_seq')`);
        console.log('  ✓ Sequences fixed\n');

        // ── Step 1: Clear existing data ────────────────────────────────────
        console.log('Clearing existing zambia data...');
        // Must delete in reverse FK dependency order
        await client.query(`ALTER TABLE ${SCHEMA}.tickets DISABLE TRIGGER ALL`);
        await client.query(`ALTER TABLE ${SCHEMA}.facilities DISABLE TRIGGER ALL`);
        await client.query(`DELETE FROM ${SCHEMA}.repairs`);
        await client.query(`DELETE FROM ${SCHEMA}.tickets`);
        await client.query(`DELETE FROM ${SCHEMA}.equipment`);
        await client.query(`DELETE FROM ${SCHEMA}.role_location_access`);
        await client.query(`DELETE FROM ${SCHEMA}.user_scopes`);
        // Null out FK columns on users rather than deleting users
        await client.query(`UPDATE ${SCHEMA}.users SET assigned_facility_id=NULL, assigned_district_id=NULL, assigned_province_id=NULL, assigned_region_id=NULL`);
        await client.query(`DELETE FROM ${SCHEMA}.facilities`);
        await client.query(`DELETE FROM ${SCHEMA}.districts`);
        await client.query(`DELETE FROM ${SCHEMA}.provinces`);
        await client.query(`DELETE FROM ${SCHEMA}.regions`);
        await client.query(`ALTER TABLE ${SCHEMA}.tickets ENABLE TRIGGER ALL`);
        await client.query(`ALTER TABLE ${SCHEMA}.facilities ENABLE TRIGGER ALL`);
        // Reset sequences
        await client.query(`ALTER SEQUENCE ${SCHEMA}.regions_region_id_seq RESTART WITH 1`);
        await client.query(`ALTER SEQUENCE ${SCHEMA}.provinces_province_id_seq RESTART WITH 1`);
        await client.query(`ALTER SEQUENCE ${SCHEMA}.districts_district_id_seq RESTART WITH 1`);
        await client.query(`ALTER SEQUENCE ${SCHEMA}.facilities_facility_id_seq RESTART WITH 1`);
        console.log('  ✓ Data cleared\n');

        // ── Step 2: Regions ────────────────────────────────────────────────
        console.log('Seeding regions...');
        const uniqueRegions = [...new Set(Object.values(PROVINCE_TO_REGION))].sort();
        const regionIdMap = {};
        for (const rname of uniqueRegions) {
            const res = await client.query(
                `INSERT INTO ${SCHEMA}.regions (region_name) VALUES ($1) RETURNING region_id`,
                [rname]
            );
            regionIdMap[rname] = res.rows[0].region_id;
        }
        console.log(`  ✓ ${uniqueRegions.length} regions inserted\n`);

        // ── Step 3: Provinces from shapefile ──────────────────────────────
        console.log('Reading admin1 shapefile (provinces)...');
        const admin1Features = await readAllFeatures(SHP_ADMIN1);
        const provinceIdMap = {};
        for (const feat of admin1Features) {
            const p = feat.properties;
            const name = p.adm1_name;
            const regionName = PROVINCE_TO_REGION[name] || 'Central';
            const res = await client.query(
                `INSERT INTO ${SCHEMA}.provinces (province_name, region_id)
                 VALUES ($1, $2) RETURNING province_id`,
                [name, regionIdMap[regionName]]
            );
            provinceIdMap[name] = res.rows[0].province_id;
            provinceIdMap[name.toLowerCase()] = res.rows[0].province_id;
        }
        console.log(`  ✓ ${admin1Features.length} provinces inserted\n`);

        // ── Step 4: Districts from shapefile ──────────────────────────────
        console.log('Reading admin2 shapefile (districts)...');
        const admin2Features = await readAllFeatures(SHP_ADMIN2);
        const districtIdMap = {}; // lowercase district name → id
        let districtInserted = 0;
        for (const feat of admin2Features) {
            const p = feat.properties;
            const distName = p.adm2_name;
            const provName = p.adm1_name;
            const provinceId = provinceIdMap[provName];

            if (!provinceId) {
                console.warn(`  WARNING: Province "${provName}" not found for district "${distName}"`);
                continue;
            }
            const res = await client.query(
                `INSERT INTO ${SCHEMA}.districts (district_name, province_id)
                 VALUES ($1, $2) RETURNING district_id`,
                [distName, provinceId]
            );
            districtIdMap[distName.toLowerCase()] = {
                district_id: res.rows[0].district_id,
                province_id: provinceId,
                region_id: regionIdMap[PROVINCE_TO_REGION[provName] || 'Central'],
            };
            districtInserted++;
        }
        console.log(`  ✓ ${districtInserted} districts inserted\n`);

        // ── Step 5: Facilities from XLSX ───────────────────────────────────
        console.log('Reading Excel file...');
        const facilities = parseXlsx(XLSX_PATH);
        console.log(`  Found ${facilities.length} facilities\n`);

        let facInserted = 0;
        let facSkipped = 0;
        const missingDistricts = new Map(); // name → count

        for (const fac of facilities) {
            const distKey = normalizeDistrict(fac.district);
            const distInfo = districtIdMap[distKey];

            if (!distInfo) {
                missingDistricts.set(fac.district, (missingDistricts.get(fac.district) || 0) + 1);
                facSkipped++;
                continue;
            }

            const lat = parseFloat(fac.latitude) || null;
            const lng = parseFloat(fac.longitude) || null;
            const isOperational = (fac.operation_status || '').toLowerCase().includes('operational');
            const level = facilityLevel(fac.facility_type);

            await client.query(
                `INSERT INTO ${SCHEMA}.facilities
                 (facility_name, facility_code, type, level, district_id, province_id, region_id,
                  latitude, longitude, is_functioning, ownership,
                  population_number)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
                [
                    fac.name,
                    fac.HMIS_code || null,
                    fac.facility_type || null,
                    level,
                    distInfo.district_id,
                    distInfo.province_id,
                    distInfo.region_id,
                    lat,
                    lng,
                    isOperational,
                    fac.ownership || null,
                    parseInt(fac.catchment_population_head_count) || null,
                ]
            );
            facInserted++;

            if (facInserted % 500 === 0) process.stdout.write(`  ... ${facInserted} inserted\r`);
        }

        if (missingDistricts.size > 0) {
            console.log(`\n  Districts in XLSX not matched in shapefile (${missingDistricts.size}):`);
            [...missingDistricts.entries()].sort().forEach(([d, c]) =>
                console.log(`    - "${d}" (${c} facilities skipped)`)
            );
        }

        await client.query('COMMIT');

        console.log('\n=============================');
        console.log('✅  Seeding complete!');
        console.log(`   Regions:    ${uniqueRegions.length}`);
        console.log(`   Provinces:  ${admin1Features.length}`);
        console.log(`   Districts:  ${districtInserted}`);
        console.log(`   Facilities: ${facInserted} inserted, ${facSkipped} skipped`);
        console.log('=============================\n');

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('\n❌ Seeding FAILED:', err.message);
        console.error(err.stack);
        process.exit(1);
    } finally {
        client.release();
        pool.end();
    }
}

seed();
