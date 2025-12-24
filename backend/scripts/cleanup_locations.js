require('dotenv').config();
const db = require('../src/db');

async function cleanupDuplicates() {
    const client = await db.pool.connect();

    try {
        await client.query('BEGIN');

        console.log('\n=== PNG Location Data Cleanup ===\n');
        console.log('PNG has exactly 4 regions and 22 provinces.\n');

        // Check current counts
        const regionCount = await client.query('SELECT COUNT(*) FROM regions');
        const provinceCount = await client.query('SELECT COUNT(*) FROM provinces');

        console.log(`Current: ${regionCount.rows[0].count} regions, ${provinceCount.rows[0].count} provinces`);

        // List all regions
        const regions = await client.query('SELECT region_id, region_name FROM regions ORDER BY region_name');
        console.log('\nCurrent Regions:');
        regions.rows.forEach(r => console.log(`  - ${r.region_name} (ID: ${r.region_id})`));

        // List all provinces
        const provinces = await client.query('SELECT province_id, province_name, region_id FROM provinces ORDER BY province_name');
        console.log('\nCurrent Provinces:');
        provinces.rows.forEach(p => console.log(`  - ${p.province_name} (ID: ${p.province_id}, Region: ${p.region_id || 'NULL'})`));

        // Find and delete duplicate/invalid regions
        console.log('\n--- Cleaning Regions ---');
        const invalidRegions = await client.query(`
            SELECT region_id, region_name 
            FROM regions 
            WHERE region_name IN ('Unknown', 'UNKNOWN', 'None', 'N/A', '', 'null')
               OR region_name IS NULL
        `);

        if (invalidRegions.rows.length > 0) {
            console.log('Removing invalid regions:');
            invalidRegions.rows.forEach(r => console.log(`  - ${r.region_name || 'NULL'} (ID: ${r.region_id})`));

            for (const region of invalidRegions.rows) {
                // Update provinces to remove reference
                await client.query('UPDATE provinces SET region_id = NULL WHERE region_id = $1', [region.region_id]);
                // Delete region
                await client.query('DELETE FROM regions WHERE region_id = $1', [region.region_id]);
            }
        } else {
            console.log('No invalid regions found.');
        }

        // Find and delete duplicate/invalid provinces
        console.log('\n--- Cleaning Provinces ---');
        const invalidProvinces = await client.query(`
            SELECT province_id, province_name 
            FROM provinces 
            WHERE province_name IN ('Unknown', 'UNKNOWN', 'None', 'N/A', '', 'null')
               OR province_name IS NULL
               OR region_id IS NULL
        `);

        if (invalidProvinces.rows.length > 0) {
            console.log('Removing invalid provinces:');
            invalidProvinces.rows.forEach(p => console.log(`  - ${p.province_name || 'NULL'} (ID: ${p.province_id})`));

            for (const province of invalidProvinces.rows) {
                // Update facilities and districts
                await client.query('UPDATE facilities SET province_id = NULL WHERE province_id = $1', [province.province_id]);
                await client.query('UPDATE districts SET province_id = NULL WHERE province_id = $1', [province.province_id]);
                // Delete province
                await client.query('DELETE FROM provinces WHERE province_id = $1', [province.province_id]);
            }
        } else {
            console.log('No invalid provinces found.');
        }

        // Final counts
        const finalRegionCount = await client.query('SELECT COUNT(*) FROM regions');
        const finalProvinceCount = await client.query('SELECT COUNT(*) FROM provinces');

        console.log('\n=== Final Counts ===');
        console.log(`Regions: ${finalRegionCount.rows[0].count} (should be 4)`);
        console.log(`Provinces: ${finalProvinceCount.rows[0].count} (should be 22)`);

        if (finalRegionCount.rows[0].count !== '4' || finalProvinceCount.rows[0].count !== '22') {
            console.log('\n⚠️  Warning: Counts do not match expected values!');
            console.log('You may need to review the data manually to identify other duplicates.');
        }

        await client.query('COMMIT');
        console.log('\n✅ Cleanup completed successfully!\n');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('\n❌ Error during cleanup:', error.message);
        throw error;
    } finally {
        client.release();
        await db.pool.end();
    }
}

cleanupDuplicates()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
