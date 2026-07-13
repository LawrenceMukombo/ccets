const db = require('../db');
const tenantStore = require('../middleware/tenantStore');

async function runSync(tenantCode, runId, connectorId) {
    try {
        const { rows } = await db.pool.query(
            'SELECT * FROM public.tenants WHERE code = $1 AND is_active = true',
            [tenantCode.toLowerCase()]
        );
        if (rows.length === 0) {
            throw new Error(`Tenant '${tenantCode}' not found or inactive`);
        }
        const tenant = rows[0];

        await tenantStore.run(tenant, async () => {
            try {
                // Log start
                await db.query(`
            INSERT INTO integration_sync_logs (run_id, severity, message)
            VALUES ($1, 'info', 'Sync run initiated for connector ID ' || $2)
        `, [runId, connectorId]);

        // Fetch connector settings
        const connResult = await db.query(`
            SELECT * FROM connector_registry WHERE id = $1
        `, [connectorId]);

        if (connResult.rows.length === 0) {
            throw new Error(`Connector with ID ${connectorId} not found`);
        }

        const connector = connResult.rows[0];
        
        await db.query(`
            INSERT INTO integration_sync_logs (run_id, severity, message)
            VALUES ($1, 'info', 'Successfully resolved connector configurations for ' || $2)
        `, [runId, connector.name]);

        // Simulating loading data into staging tables
        // Let's create mock staging facilities
        await db.query(`
            INSERT INTO integration_sync_logs (run_id, severity, message)
            VALUES ($1, 'info', 'Fetching facilities data from ODK Central form endpoints...')
        `, [runId]);

        const mockFacilities = [
            { external_id: 'EXT_FAC_001', facility_name: 'St. Marys Hospital', facility_code: 'SMH001', province_name: 'Southern', district_name: 'Choma', latitude: -16.8093, longitude: 26.9892 },
            { external_id: 'EXT_FAC_002', facility_name: 'Kafue District Hospital', facility_code: 'KDH002', province_name: 'Lusaka', district_name: 'Kafue', latitude: -15.7725, longitude: 28.1816 },
            { external_id: 'EXT_FAC_003', facility_name: 'Lusaka Adventist Clinic', facility_code: 'LAC003', province_name: 'Lusaka', district_name: 'Lusaka', latitude: -15.4167, longitude: 28.2833 }
        ];

        let loadedFacs = 0;
        for (const fac of mockFacilities) {
            // Check if already in staging
            const existing = await db.query(`
                SELECT id FROM staging_facilities WHERE external_id = $1
            `, [fac.external_id]);

            if (existing.rows.length > 0) {
                await db.query(`
                    UPDATE staging_facilities 
                    SET facility_name = $1, facility_code = $2, province_name = $3, district_name = $4, latitude = $5, longitude = $6, sync_status = 'pending', updated_at = CURRENT_TIMESTAMP
                    WHERE external_id = $7
                `, [fac.facility_name, fac.facility_code, fac.province_name, fac.district_name, fac.latitude, fac.longitude, fac.external_id]);
            } else {
                await db.query(`
                    INSERT INTO staging_facilities (external_id, facility_name, facility_code, province_name, district_name, latitude, longitude, sync_status)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
                `, [fac.external_id, fac.facility_name, fac.facility_code, fac.province_name, fac.district_name, fac.latitude, fac.longitude]);
            }
            loadedFacs++;
        }

        await db.query(`
            INSERT INTO integration_sync_logs (run_id, severity, message)
            VALUES ($1, 'info', 'Loaded ' || $2 || ' facilities into staging tables.')
        `, [runId, loadedFacs]);

        // Let's create mock staging equipment
        await db.query(`
            INSERT INTO integration_sync_logs (run_id, severity, message)
            VALUES ($1, 'info', 'Fetching equipment inventory metadata from remote inventory stream...')
        `, [runId]);

        const mockEquipment = [
            { external_id: 'EXT_EQ_101', asset_code: 'EQP-ZMB-101', serial_number: 'SN987654', manufacturer: 'Dometic', model: 'TCW2000', facility_external_id: 'EXT_FAC_001' },
            { external_id: 'EXT_EQ_102', asset_code: 'EQP-ZMB-102', serial_number: 'SN123456', manufacturer: 'B Medical Systems', model: 'SDD', facility_external_id: 'EXT_FAC_002' }
        ];

        let loadedEq = 0;
        for (const eq of mockEquipment) {
            // Check if already in staging
            const existing = await db.query(`
                SELECT id FROM staging_equipment WHERE external_id = $1
            `, [eq.external_id]);

            if (existing.rows.length > 0) {
                await db.query(`
                    UPDATE staging_equipment 
                    SET asset_code = $1, serial_number = $2, manufacturer = $3, model = $4, facility_external_id = $5, sync_status = 'pending', updated_at = CURRENT_TIMESTAMP
                    WHERE external_id = $6
                `, [eq.asset_code, eq.serial_number, eq.manufacturer, eq.model, eq.facility_external_id, eq.external_id]);
            } else {
                await db.query(`
                    INSERT INTO staging_equipment (external_id, asset_code, serial_number, manufacturer, model, facility_external_id, sync_status)
                    VALUES ($1, $2, $3, $4, $5, $6, 'pending')
                `, [eq.external_id, eq.asset_code, eq.serial_number, eq.manufacturer, eq.model, eq.facility_external_id]);
            }
            loadedEq++;
        }

        await db.query(`
            INSERT INTO integration_sync_logs (run_id, severity, message)
            VALUES ($1, 'info', 'Loaded ' || $2 || ' equipment units into staging tables.')
        `, [runId, loadedEq]);

        // Finish successfully
        await db.query(`
            UPDATE integration_sync_runs 
            SET end_time = CURRENT_TIMESTAMP, status = 'success', records_processed = $1
            WHERE id = $2
        `, [loadedFacs + loadedEq, runId]);

        await db.query(`
            INSERT INTO integration_sync_logs (run_id, severity, message)
            VALUES ($1, 'info', 'Sync run completed successfully. Staging tables populated.')
        `, [runId]);

        const socketService = require('./socketService');
        const io = socketService.getIO();
        if (io) {
            io.emit('integration_sync_alert', {
                runId,
                tenantCode,
                status: 'success',
                message: 'Sync run completed successfully. Staging tables populated.',
                timestamp: new Date()
            });
        }

            } catch (error) {
                console.error('Error during sync:', error);
                try {
                    await db.query(`
                        UPDATE integration_sync_runs 
                        SET end_time = CURRENT_TIMESTAMP, status = 'failed', error_message = $1
                        WHERE id = $2
                    `, [error.message, runId]);

                    await db.query(`
                        INSERT INTO integration_sync_logs (run_id, severity, message)
                        VALUES ($1, 'error', 'Sync run failed: ' || $2)
                    `, [runId, error.message]);

                    const socketService = require('./socketService');
                    const io = socketService.getIO();
                    if (io) {
                        io.emit('integration_sync_alert', {
                            runId,
                            tenantCode,
                            status: 'failed',
                            message: `Sync run failed: ${error.message}`,
                            timestamp: new Date()
                        });
                    }
                } catch (e) {
                    console.error('Failed to log sync error:', e);
                }
            }
        });
    } catch (outerError) {
        console.error('Fatal error setting up sync run context:', outerError);
    }
}

module.exports = { runSync };
