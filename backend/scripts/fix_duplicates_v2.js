require('dotenv').config();
const db = require('../src/db');

async function fixDuplicates() {
    const client = await db.pool.connect();

    try {
        await client.query('BEGIN');

        console.log('\n=== FIXING DUPLICATE PROVINCES ===\n');

        // Get all provinces
        const provinces = await client.query(`
            SELECT province_id, province_name, region_id
            FROM provinces 
            ORDER BY province_name, province_id
        `);

        console.log(`Total provinces in database: ${provinces.rows.length}\n`);

        // Identify duplicates
        const provinceMap = new Map();
        const duplicates = [];

        provinces.rows.forEach(p => {
            if (provinceMap.has(p.province_name)) {
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

        console.log('\n--- Updating All References ---\n');

        for (const dup of duplicates) {
            console.log(`\nProcessing "${dup.name}" (Keep: ${dup.keep_id}, Delete: ${dup.delete_id}):`);

            // Update facilities
            const fac = await client.query(`UPDATE facilities SET province_id = $1 WHERE province_id = $2`, [dup.keep_id, dup.delete_id]);
            console.log(`  - Facilities: ${fac.rowCount}`);

            // Update districts
            const dist = await client.query(`UPDATE districts SET province_id = $1 WHERE province_id = $2`, [dup.keep_id, dup.delete_id]);
            console.log(`  - Districts: ${dist.rowCount}`);

            // Update user_location_scopes (if exists)
            try {
                const scope = await client.query(`UPDATE user_location_scopes SET province_ids = array_remove(province_ids, $1) WHERE $1 = ANY(province_ids)`, [dup.delete_id]);
                console.log(`  - User scopes: ${scope.rowCount}`);
            } catch (e) {
                console.log(`  - User scopes: table may not exist or no province_ids column`);
            }

            // Try to delete now
            try {
                await client.query('DELETE FROM provinces WHERE province_id = $1', [dup.delete_id]);
                console.log(`  ✅ Deleted duplicate province ID ${dup.delete_id}`);
            } catch (deleteError) {
                console.log(`  ❌ Could not delete: ${deleteError.message}`);
                console.log(`     Trying to find remaining references...`);

                // Check all table references
                const tables = ['facilities', 'districts', 'user_location_scopes', 'tickets', 'equipment'];
                for (const table of tables) {
                    try {
                        const check = await client.query(`SELECT COUNT(*) FROM ${table} WHERE province_id = $1`, [dup.delete_id]);
                        if (check.rows[0].count > 0) {
                            console.log(`     - ${table}: ${check.rows[0].count} references found`);
                        }
                    } catch (e) {
                        // Table or column doesn't exist, skip
                    }
                }
            }
        }

        const final = await client.query('SELECT COUNT(*) FROM provinces');
        const finalRegions = await client.query('SELECT COUNT(*) FROM regions');

        console.log('\n=== FINAL COUNTS ===');
        console.log(`Regions: ${finalRegions.rows[0].count} (Expected: 4)`);
        console.log(`Provinces: ${final.rows[0].count} (Expected: 22)`);

        if (final.rows[0].count === '22') {
            console.log('\n✅ SUCCESS!\n');
        } else {
            console.log(`\n⚠️  Still have ${final.rows[0].count} provinces instead of 22\n`);
        }

        await client.query('COMMIT');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('\n❌ Error:', error.message);
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
