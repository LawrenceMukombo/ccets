const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');
const { generateODKMediaFiles } = require('../integrations/kobo/generateMedia');

// Webhook for Kobo/ODK to submit new tickets
// Kobo sends a JSON payload when a form is submitted
router.post('/submission', async (req, res) => {
    try {
        const payload = req.body;
        console.log('📥/api/hooks/kobo/submission received');

        // Extract key data from Kobo JSON structure
        // Note: Field names depend on your XLSForm design
        // Example assumes user mapped fields to: facility_id, equipment_id, issue_desc

        const facilityId = payload['facility_id'];
        const equipmentId = payload['equipment_id'];
        const faultDescription = payload['fault_description'] || payload['description'];
        const priority = payload['priority'] || 'Medium'; // Default to Medium if missing

        // Reporter Details
        const reportedByName = payload['reported_by_name'];
        const reportedByPhone = payload['reported_by_phone'];
        const reportedByEmail = payload['reported_by_email'];

        const koboId = payload['_id'];

        // Basic Validation
        if (!facilityId || !faultDescription) {
            return res.status(400).json({ message: 'Missing required fields (facility_id, fault_description)' });
        }

        const db = require('../db');

        // Fetch Equipment Snapshot if provided
        let manufacturer = null, model = null, serial = null, gas = null;
        if (equipmentId) {
            const equipRes = await db.query(
                `SELECT manufacturer, model, serial_number, refrigerant_gas 
                 FROM equipment WHERE equipment_id = $1`,
                [equipmentId]
            );
            if (equipRes.rows.length > 0) {
                const e = equipRes.rows[0];
                manufacturer = e.manufacturer;
                model = e.model;
                serial = e.serial_number;
                gas = e.refrigerant_gas;
            }
        }

        const { rows } = await db.query(
            `INSERT INTO tickets 
            (facility_id, selected_equipment_id, created_by, ticket_status, priority, fault_description, 
             created_at, reported_by_name, reported_by_phone, reported_by_email,
             equipment_manufacturer, equipment_model, equipment_serial_number, equipment_refrigerant_gas)
            VALUES ($1, $2, $3, 'New', $4, $5, NOW(), $6, $7, $8, $9, $10, $11, $12)
            RETURNING ticket_id`,
            [
                facilityId,
                equipmentId || null,
                1, // System fallback
                priority,
                `${faultDescription} [Source: ODK]`,
                reportedByName || null,
                reportedByPhone || null,
                reportedByEmail || null,
                manufacturer,
                model,
                serial,
                gas
            ]
        );

        console.log(`✅ ODK Ticket Created: ID ${rows[0].ticket_id}`);
        res.status(201).json({ message: 'Ticket created', ticketId: rows[0].ticket_id });

    } catch (error) {
        console.error('❌ ODK Webhook Error:', error);
        res.status(500).json({ message: 'Error processing submission' });
    }
});

// Admin endpoint to trigger CSV generation
router.get('/generate-media', async (req, res) => {
    try {
        await generateODKMediaFiles();
        res.json({ message: 'CSV files generated in backend/src/integrations/kobo/output' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
