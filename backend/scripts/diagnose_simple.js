require('dotenv').config();
const db = require('../src/db');
const fs = require('fs');

async function diagnosticReport() {
    const client = await db.pool.connect();
    let report = [];

    try {
        report.push('PNG CCETS DATABASE DIAGNOSTIC REPORT');
        report.push('Expected: 4 Regions, 22 Provinces');
        report.push('=' + '='.repeat(60));
        report.push('');

        // REGIONS
        report.push('REGIONS:');
        report.push('-'.repeat(60));
        const regions = await client.query(`
            SELECT region_id, region_name
            FROM regions
            ORDER BY region_id
        `);

        report.push(`Total Regions: ${regions.rows.length} (Expected: 4)`);
        report.push('');

        regions.rows.forEach((r, i) => {
            report.push(`${i + 1}. ${r.region_name || 'NULL'} (ID: ${r.region_id})`);
        });

        report.push('');
        report.push('PROVINCES:');
        report.push('-'.repeat(60));
        const provinces = await client.query(`
            SELECT p.province_id, p.province_name, p.region_id, r.region_name as region
            FROM provinces p
            LEFT JOIN regions r ON p.region_id = r.region_id
            ORDER BY p.province_id
        `);

        report.push(`Total Provinces: ${provinces.rows.length} (Expected: 22)`);
        report.push('');

        provinces.rows.forEach((p, i) => {
            report.push(`${i + 1}. ${p.province_name || 'NULL'} (ID: ${p.province_id}, Region: ${p.region || 'NULL'})`);
        });

        // ISSUES
        report.push('');
        report.push('ISSUES FOUND:');
        report.push('-'.repeat(60));

        const issues = [];

        if (regions.rows.length !== 4) {
            issues.push(`Region count is ${regions.rows.length}, should be 4`);
        }

        if (provinces.rows.length !== 22) {
            issues.push(`Province count is ${provinces.rows.length}, should be 22`);
        }

        // Check for duplicates
        const regionNames = {};
        regions.rows.forEach(r => {
            const name = r.region_name || 'NULL';
            if (!regionNames[name]) regionNames[name] = [];
            regionNames[name].push(r.region_id);
        });

        Object.keys(regionNames).forEach(name => {
            if (regionNames[name].length > 1) {
                issues.push(`Duplicate region "${name}": IDs ${regionNames[name].join(', ')}`);
            }
        });

        const provinceNames = {};
        provinces.rows.forEach(p => {
            const name = p.province_name || 'NULL';
            if (!provinceNames[name]) provinceNames[name] = [];
            provinceNames[name].push(p.province_id);
        });

        Object.keys(provinceNames).forEach(name => {
            if (provinceNames[name].length > 1) {
                issues.push(`Duplicate province "${name}": IDs ${provinceNames[name].join(', ')}`);
            }
        });

        // Provinces without regions
        const orphans = provinces.rows.filter(p => !p.region_id);
        if (orphans.length > 0) {
            issues.push(`${orphans.length} province(s) without region: ${orphans.map(p => p.province_name).join(', ')}`);
        }

        if (issues.length === 0) {
            report.push('No issues found! Database is clean.');
        } else {
            report.push(`Found ${issues.length} issue(s):`);
            issues.forEach((issue, i) => report.push(`${i + 1}. ${issue}`));
        }

        report.push('');
        report.push('SUMMARY:');
        report.push(`Regions: ${regions.rows.length} (Expected: 4)`);
        report.push(`Provinces: ${provinces.rows.length} (Expected: 22)`);
        report.push(`Issues: ${issues.length}`);

        const output = report.join('\n');
        console.log(output);
        fs.writeFileSync('diagnosis_simple.txt', output, 'utf8');

    } catch (error) {
        console.error('Error:', error.message);
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
