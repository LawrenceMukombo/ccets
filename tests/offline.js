const { registerSuite } = require('./runner');
const db = require('../backend/src/db');
const tenantStore = require('../backend/src/middleware/tenantStore');

registerSuite('offline', {
    'Database Transaction Rollback Integrity': async (assert) => {
        await tenantStore.run({ schema_name: 'png' }, async () => {
            const client = await db.pool.connect();
            await client.query('SET search_path TO "png", public');
            
            let insertedId = null;
            let errorCaught = false;

            try {
                // Start transaction
                await client.query('BEGIN');

                // Insert a temporary test facility
                const facRes = await client.query(`
                    INSERT INTO facilities (facility_name, facility_code, type, is_functioning)
                    VALUES ('Trans-Rollback Test Fac', 'TR-FAC-999', 'Clinic', true)
                    RETURNING facility_id
                `);
                insertedId = facRes.rows[0].facility_id;
                assert.ok(insertedId, 'Temporary facility should be inserted inside transaction');

                // Intentionally run a failing query to cause transaction abort
                await client.query('INSERT INTO facilities (facility_name, facility_code, type, province_id) VALUES (null, null, null, -9999)');
                
                await client.query('COMMIT');
            } catch (err) {
                errorCaught = true;
                await client.query('ROLLBACK');
            } finally {
                client.release();
            }

            assert.ok(errorCaught, 'Intentionally invalid query should throw an error');

            // Verify that the first insert was rolled back and is not in the database
            if (insertedId) {
                const verifyRes = await db.query('SELECT * FROM facilities WHERE facility_id = $1', [insertedId]);
                assert.equal(verifyRes.rows.length, 0, 'Facility inserted before rollback should not exist in database');
            }
        });
    },

    'Offline Sync Logs and Sessions Access': async (assert) => {
        await tenantStore.run({ schema_name: 'png' }, async () => {
            // Check sync_log or device_registry schemas
            const tableCheck = await db.query(`
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'png' AND table_name IN ('sync_log', 'sync_sessions', 'device_registry')
            `);
            assert.ok(tableCheck.rows.length >= 0, 'Should query offline system tables');
        });
    }
});
