require('dotenv').config();
const db = require('../src/db');

async function diagnosticReport() {
    const client = await db.pool.connect();

    try {
        console.log('\n╔════════════════════════════════════════════════════════╗');
        console.log('║     PNG CCETS DATABASE DIAGNOSTIC REPORT             ║');
        console.log('║     Expected: 4 Regions, 22 Provinces                ║');
        console.log('╚════════════════════════════════════════════════════════╝\n');

        // ==================== REGIONS ====================
        console.log('━━━━━━━━━━━━━━━━━━━━ REGIONS ━━━━━━━━━━━━━━━━━━━━');
        const regions = await client.query(`
            SELECT region_id, region_name, 
                   (SELECT COUNT(*) FROM provinces WHERE region_id = r.region_id) as province_count
            FROM regions r
            ORDER BY region_id
        `);

        console.log(`\nTotal Regions: ${regions.rows.length} (Expected: 4)\n`);

        regions.rows.forEach((r, i) => {
            console.log(`${i + 1}. ${r.region_name}`);
            console.log(`   ID: ${r.region_id}`);
            console.log(`   Provinces: ${r.province_count}`);
            console.log('');
        });

        // ==================== PROVINCES ====================
        console.log('\n━━━━━━━━━━━━━━━━━━━ PROVINCES ━━━━━━━━━━━━━━━━━━━');
        const provinces = await client.query(`
            SELECT p.province_id, p.province_name, p.region_id, r.region_name,
                   (SELECT COUNT(*) FROM facilities WHERE province_id = p.province_id) as facility_count
            FROM provinces p
            LEFT JOIN regions r ON p.region_id = r.region_id
            ORDER BY r.region_name, p.province_name
        `);

        console.log(`\nTotal Provinces: ${provinces.rows.length} (Expected: 22)\n`);

        let currentRegion = null;
        provinces.rows.forEach((p, i) => {
            if (p.region_name !== currentRegion) {
                currentRegion = p.region_name;
                console.log(`\n【${currentRegion || 'NO REGION'}】`);
            }
            console.log(`  ${i + 1}. ${p.province_name} (ID: ${p.province_id}, Facilities: ${p.facility_count})`);
        });

        // ==================== ISSUES ====================
        console.log('\n\n━━━━━━━━━━━━━━━━━━━ ISSUES FOUND ━━━━━━━━━━━━━━━━━━');

        const issues = [];

        // Check for NULL region names
        const nullRegions = regions.rows.filter(r => !r.region_name || r.region_name.trim() === '');
        if (nullRegions.length > 0) {
            issues.push(`❌ ${nullRegions.length} region(s) with NULL/empty names`);
            nullRegions.forEach(r => console.log(`   - Region ID ${r.region_id}: "${r.region_name}"`));
        }

        // Check for duplicate region names
        const regionNames = {};
        regions.rows.forEach(r => {
            if (regionNames[r.region_name]) {
                regionNames[r.region_name].push(r.region_id);
            } else {
                regionNames[r.region_name] = [r.region_id];
            }
        });

        Object.keys(regionNames).forEach(name => {
            if (regionNames[name].length > 1) {
                issues.push(`❌ Duplicate region name "${name}": IDs ${regionNames[name].join(', ')}`);
            }
        });

        // Check for NULL province names
        const nullProvinces = provinces.rows.filter(p => !p.province_name || p.province_name.trim() === '');
        if (nullProvinces.length > 0) {
            issues.push(`❌ ${nullProvinces.length} province(s) with NULL/empty names`);
            nullProvinces.forEach(p => console.log(`   - Province ID ${p.province_id}: "${p.province_name}"`));
        }

        // Check for provinces without regions
        const orphanProvinces = provinces.rows.filter(p => !p.region_id);
        if (orphanProvinces.length > 0) {
            issues.push(`❌ ${orphanProvinces.length} province(s) without region assignment`);
            orphanProvinces.forEach(p => console.log(`   - ${p.province_name} (ID: ${p.province_id})`));
        }

        // Check for duplicate province names
        const provinceNames = {};
        provinces.rows.forEach(p => {
            if (provinceNames[p.province_name]) {
                provinceNames[p.province_name].push(p.province_id);
            } else {
                provinceNames[p.province_name] = [p.province_id];
            }
        });

        Object.keys(provinceNames).forEach(name => {
            if (provinceNames[name].length > 1) {
                issues.push(`❌ Duplicate province name "${name}": IDs ${provinceNames[name].join(', ')}`);
            }
        });

        // Check counts
        if (regions.rows.length !== 4) {
            issues.push(`❌ Region count is ${regions.rows.length}, should be 4`);
        }

        if (provinces.rows.length !== 22) {
            issues.push(`❌ Province count is ${provinces.rows.length}, should be 22`);
        }

        // Display issues
        if (issues.length === 0) {
            console.log('\n✅ No issues found! Database is clean.\n');
        } else {
            console.log(`\n❌ Found ${issues.length} issue(s):\n`);
            issues.forEach((issue, i) => console.log(`${i + 1}. ${issue}`));
        }

        // ==================== SUMMARY ====================
        console.log('\n\n╔════════════════════════════════════════════════════════╗');
        console.log('║                    SUMMARY                            ║');
        console.log('╠════════════════════════════════════════════════════════╣');
        console.log(`║  Regions:    ${regions.rows.length.toString().padEnd(3)} (Expected: 4)                         ║`);
        console.log(`║  Provinces:  ${provinces.rows.length.toString().padEnd(3)} (Expected: 22)                        ║`);
        console.log(`║  Issues:     ${issues.length.toString().padEnd(3)}                                       ║`);
        console.log('╚════════════════════════════════════════════════════════╝\n');

    } catch (error) {
        console.error('\n❌ Error running diagnostic:', error.message);
        throw error;
    } finally {
        client.release();
        await db.pool.end();
    }
}

diagnosticReport()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
