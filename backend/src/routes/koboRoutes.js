const express = require('express');
const router = express.Router({ mergeParams: true });
const db = require('../db');
const { generateODKMediaFiles } = require('../integrations/kobo/generateMedia');

// Webhook for Kobo/ODK to submit new reports (routes to staging area)
router.post('/submission', async (req, res) => {
    try {
        const payload = req.body;
        console.log('📥 /api/hooks/kobo/submission received payload');

        // Extract ID
        const koboId = payload['_id'] || payload['meta/instanceID'] || payload['uuid'] || `kobo_${Date.now()}`;
        
        // Extract key validation parameters
        const facilityId = payload['facility_id'];
        const equipmentId = payload['equipment_id'];
        const faultDescription = payload['fault_description'] || payload['description'];

        // Basic check for duplicate webhook invocations (idempotency)
        const existing = await db.query('SELECT id, status FROM staging_odk_submissions WHERE kobo_id = $1', [koboId]);
        if (existing.rows.length > 0) {
            console.log(`ℹ️ ODK Webhook: Duplicate submission intercepted for ID ${koboId}`);
            return res.status(200).json({ 
                success: true, 
                message: 'Submission already received (idempotent)', 
                submissionId: existing.rows[0].id,
                status: existing.rows[0].status 
            });
        }

        // 1. Validate facility
        let facilityExists = false;
        let resolvedFacilityId = null;
        if (facilityId) {
            const isInt = /^\d+$/.test(facilityId);
            let facRes;
            if (isInt) {
                facRes = await db.query('SELECT facility_id FROM facilities WHERE facility_id = $1', [parseInt(facilityId)]);
            } else {
                facRes = await db.query('SELECT facility_id FROM facilities WHERE external_id = $1', [facilityId]);
            }
            if (facRes.rows.length > 0) {
                facilityExists = true;
                resolvedFacilityId = facRes.rows[0].facility_id;
            }
        }

        // 2. Validate equipment
        let equipmentExists = false;
        let resolvedEquipmentId = null;
        let equipmentBelongsToFacility = false;
        if (equipmentId) {
            const isInt = /^\d+$/.test(equipmentId);
            let equipRes;
            if (isInt) {
                equipRes = await db.query('SELECT equipment_id, facility_id FROM equipment WHERE equipment_id = $1', [parseInt(equipmentId)]);
            } else {
                equipRes = await db.query('SELECT equipment_id, facility_id FROM equipment WHERE external_id = $1', [equipmentId]);
            }
            if (equipRes.rows.length > 0) {
                equipmentExists = true;
                resolvedEquipmentId = equipRes.rows[0].equipment_id;
                if (resolvedFacilityId && equipRes.rows[0].facility_id === resolvedFacilityId) {
                    equipmentBelongsToFacility = true;
                }
            }
        }

        // Assemble validation error list
        const errors = [];
        if (!facilityId) {
            errors.push('Missing facility_id field');
        } else if (!facilityExists) {
            errors.push(`Facility with ID ${facilityId} not found in CCETS production table`);
        }

        if (equipmentId) {
            if (!equipmentExists) {
                errors.push(`Equipment with ID ${equipmentId} not found in CCETS production table`);
            } else if (facilityExists && !equipmentBelongsToFacility) {
                errors.push(`Equipment with ID ${equipmentId} exists, but is not located at Facility ${facilityId}`);
            }
        }

        if (!faultDescription) {
            errors.push('Missing fault_description field');
        }

        // Write to staging area
        const insertRes = await db.query(
            `INSERT INTO staging_odk_submissions (kobo_id, payload, status, validation_errors)
             VALUES ($1, $2, 'pending', $3)
             RETURNING id`,
            [koboId, JSON.stringify(payload), JSON.stringify(errors)]
        );

        console.log(`✅ ODK Submission written to staging: ID ${insertRes.rows[0].id} (Errors: ${errors.length})`);

        // Emit Socket.io notification for real-time updates in Settings dashboard
        const io = req.app.get('io');
        if (io) {
            io.emit('odk_submission_received', { 
                id: insertRes.rows[0].id, 
                kobo_id: koboId,
                errors: errors
            });
        }

        res.status(201).json({ 
            success: true, 
            message: 'ODK submission received and staged successfully', 
            submissionId: insertRes.rows[0].id,
            validationErrors: errors
        });

    } catch (error) {
        console.error('❌ ODK Staging Webhook Error:', error);
        res.status(500).json({ success: false, message: 'Error processing submission staging' });
    }
});

// Admin endpoint to trigger CSV generation
router.get('/generate-media', async (req, res) => {
    try {
        await generateODKMediaFiles();
        res.json({ success: true, message: 'CSV files generated in backend/src/integrations/kobo/output' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
