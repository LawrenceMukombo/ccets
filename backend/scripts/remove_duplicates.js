require('dotenv').config();
const db = require('../src/db');

async function removeDuplicates() {
    const client = await db.pool.connect();

    try {
        await client.query('BEGIN');

        console.log('\nRemoving duplicate provinces...\n');

        // Find all provinces with their IDs
        const provinces = await client.query(`
            SELECT province_id, province_name 
            FROM provinces 
            ORDER BY province_name, province_id
        `);

        const seen = new Set();
        const toDelete = [];

        provinces.rows.forEach(p => {
            if (seen.has(p.province_name)) {
                toDelete.push(p.province_id);
                console.log(`Marking for deletion: ${p.province_name} (ID: ${p.province_id}) - DUPLICATE`);
            } else {
                seen.add(p.province_name);
                console.log(`Keeping: ${p.province_name} (ID: ${p.province_id})`);
            }
        });

        console.log(`\nFound ${toDelete.length} duplicate provinces to delete.\n`);

        for (const id of toDelete) {
            // Update facilities and districts to remove references
            await client.query('UPDATE facilities SET province_id = NULL WHERE province_id = $1', [id]);
            await client.query('UPDATE districts SET province_id = NULL WHERE province_id = $1', [id]);
            // Delete the duplicate province
            await client.query('DELETE FROM provinces WHERE province_id = $1', [id]);
            console.log(`Deleted province ID: ${id}`);
        }

        const final = await client.query('SELECT COUNT(*) FROM provinces');
        console.log(`\nFinal province count: ${final.rows[0].count} (Expected: 22)`);

        await client.query('COMMIT');
        console.log('\n✅ Duplicates removed successfully!\n');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error:', error.message);
        throw error;
    } finally {
        client.release();
        await db.pool.end();
    }
}

removeDuplicates()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
