require('dotenv').config();
const db = require('../src/db');

async function fixDuplicates() {
    const client = await db.pool.connect();

    try {
        await client.query('BEGIN');

        console.log('\n=== FIXING DUPLICATE PROVINCES ===\n');

        // Step 1: Get all provinces
        const provinces = await client.query(`
            SELECT province_id, province_name, region_id
            FROM provinces 
            ORDER BY province_name, province_id
        `);

        console.log(`Total provinces in database: ${provinces.rows.length}\n`);

        // Step 2: Identify duplicates
        const provinceMap = new Map();
        const duplicates = [];

        provinces.rows.forEach(p => {
            if (provinceMap.has(p.province_name)) {
                // This is a duplicate - keep the first, mark this for deletion
                duplicates.push({
                    keep_id: provinceMap.get(p.province_name),
                    delete_id: p.province_id,
                    name: p.province_name
                });
            } else {
                provinceMap.set(p.province_name, p.province_id);
            }
        });

        console.log(`Found ${duplicates.length} duplicate provinces:\n`);
        duplicates.forEach(d => {
            console.log(`  "${d.name}": Keeping ID ${d.keep_id}, Deleting ID ${d.delete_id}`);
        });

        if (duplicates.length === 0) {
            console.log('\n✅ No duplicates found!\n');
            await client.query('COMMIT');
            return;
        }

        console.log('\n--- Updating References ---\n');

        // Step 3: Update all references to point to the kept province
        for (const dup of duplicates) {
            // Update facilities
            const facilitiesResult = await client.query(`
                UPDATE facilities 
                SET province_id = $1 
                WHERE province_id = $2
                RETURNING facility_id
            `, [dup.keep_id, dup.delete_id]);

            // Update districts
            const districtsResult = await client.query(`
                UPDATE districts 
                SET province_id = $1 
                WHERE province_id = $2
                RETURNING district_id
            `, [dup.keep_id, dup.delete_id]);

            // Update user_location_scopes - remove the duplicate and ensure the kept ID is present
            const userScopesResult = await client.query(`
                UPDATE user_location_scopes 
                SET province_ids = array_remove(province_ids, $1)
                WHERE $1 = ANY(province_ids)
                RETURNING user_id
            `, [dup.delete_id]);

            // Ensure the kept ID is in the array
            await client.query(`
                UPDATE user_location_scopes 
                SET province_ids = array_append(province_ids, $1)
                WHERE NOT ($1 = ANY(province_ids))
                  AND array_length(province_ids, 1) > 0
            `, [dup.keep_id]);

            console.log(`  Updated "${dup.name}":`);
            console.log(`    - Facilities: ${facilitiesResult.rowCount}`);
            console.log(`    - Districts: ${districtsResult.rowCount}`);
            console.log(`    - User scopes: ${userScopesResult.rowCount}`);
        }

        console.log('\n--- Deleting Duplicates ---\n');

        // Step 4: Delete the duplicate provinces
        for (const dup of duplicates) {
            await client.query('DELETE FROM provinces WHERE province_id = $1', [dup.delete_id]);
            console.log(`  Deleted province ID ${dup.delete_id} ("${dup.name}")`);
        }

        // Step 5: Verify
        const final = await client.query('SELECT COUNT(*) FROM provinces');
        const finalRegions = await client.query('SELECT COUNT(*) FROM regions');

        console.log('\n=== FINAL COUNTS ===');
        console.log(`Regions: ${finalRegions.rows[0].count} (Expected: 4)`);
        console.log(`Provinces: ${final.rows[0].count} (Expected: 22)`);

        if (final.rows[0].count === '22' && finalRegions.rows[0].count === '4') {
            console.log('\n✅ SUCCESS! Database is now clean!\n');
        } else {
            console.log('\n⚠️  WARNING: Counts still dont match expected values.\n');
        }

        await client.query('COMMIT');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('\n❌ Error:', error.message);
        console.error(error);
        throw error;
    } finally {
        client.release();
        await db.pool.end();
    }
}

fixDuplicates()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
