const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const auth = require('../middleware/auth');

const router = express.Router({ mergeParams: true });

const adminOnly = (req, res, next) => {
    if (req.user && (req.user.roleId === 1 || req.user.role === 'Admin' || req.user.role === 'SuperAdmin' || req.user.role_name === 'Administrator' || req.user.role_name === 'National Manager' || req.user.is_admin)) {
        next();
    } else {
        res.status(403).json({ success: false, message: 'Access denied. Administrator or Manager role required.' });
    }
};

const templates = {
    facilities: [
        'facility_name', 'facility_code', 'type', 'region_id', 'province_id', 'district_id',
        'latitude', 'longitude', 'gps_coordinates', 'is_functioning', 'external_id', 'source_system'
    ],
    equipment: [
        'facility_id', 'facility_code', 'item_class', 'item_type', 'manufacturer', 'model',
        'serial_number', 'asset_code', 'year_installed', 'energy_source', 'is_functioning',
        'external_id', 'source_system'
    ],
    users: [
        'username', 'email', 'password', 'first_name', 'last_name', 'phone_number',
        'role_name', 'role_id', 'is_national_access'
    ]
};

const sampleRows = {
    facilities: ['Juba National Cold Store', 'SSD-JUB-001', 'National Store', '', '', '', '4.8594', '31.5713', '4.8594,31.5713', 'true', 'moh-ssd-001', 'CSV'],
    equipment: ['', 'SSD-JUB-001', 'Cold Chain', 'Refrigerator', 'Vestfrost', 'MK304', 'SN-001', 'ASSET-001', '2024', 'Electric', 'true', 'eq-001', 'CSV'],
    users: ['state.admin@ssd.ccets', 'state.admin@ssd.ccets', 'ChangeMe123!', 'State', 'Admin', '+211...', 'Administrator', '', 'true']
};

const normalizeHeader = (header) => String(header || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
const present = (value) => value !== undefined && value !== null && String(value).trim() !== '';
const nullable = (value) => present(value) ? String(value).trim() : null;
const intOrNull = (value) => present(value) ? parseInt(value, 10) : null;
const numberOrNull = (value) => present(value) ? Number(value) : null;
const boolOrDefault = (value, fallback = true) => {
    if (!present(value)) return fallback;
    return ['true', '1', 'yes', 'y', 'active', 'functioning'].includes(String(value).trim().toLowerCase());
};

const csvEscape = (value) => {
    const text = String(value ?? '');
    return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const parseCsv = (csvText) => {
    const rows = [];
    let row = [];
    let field = '';
    let inQuotes = false;

    for (let i = 0; i < csvText.length; i++) {
        const char = csvText[i];
        const next = csvText[i + 1];

        if (char === '"') {
            if (inQuotes && next === '"') {
                field += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            row.push(field);
            field = '';
        } else if ((char === '\n' || char === '\r') && !inQuotes) {
            if (char === '\r' && next === '\n') i++;
            row.push(field);
            if (row.some(cell => String(cell).trim() !== '')) rows.push(row);
            row = [];
            field = '';
        } else {
            field += char;
        }
    }

    row.push(field);
    if (row.some(cell => String(cell).trim() !== '')) rows.push(row);

    if (rows.length === 0) return [];
    const headers = rows[0].map(normalizeHeader);
    return rows.slice(1).map(raw => {
        const record = {};
        headers.forEach((header, index) => {
            record[header] = raw[index] !== undefined ? String(raw[index]).trim() : '';
        });
        return record;
    });
};

const resolveFacilityId = async (record) => {
    if (present(record.facility_id)) return intOrNull(record.facility_id);
    if (present(record.facility_code)) {
        const result = await db.query('SELECT facility_id FROM facilities WHERE facility_code = $1 LIMIT 1', [record.facility_code.trim()]);
        if (result.rows.length > 0) return result.rows[0].facility_id;
    }
    return null;
};

const importFacility = async (record) => {
    if (!present(record.facility_name)) return { status: 'failed', message: 'facility_name is required' };

    if (present(record.facility_code)) {
        const duplicate = await db.query('SELECT facility_id FROM facilities WHERE facility_code = $1 LIMIT 1', [record.facility_code.trim()]);
        if (duplicate.rows.length > 0) return { status: 'skipped', message: 'facility_code already exists' };
    }

    if (present(record.external_id)) {
        const duplicate = await db.query('SELECT facility_id FROM facilities WHERE external_id = $1 LIMIT 1', [record.external_id.trim()]);
        if (duplicate.rows.length > 0) return { status: 'skipped', message: 'external_id already exists' };
    }

    await db.query(`
        INSERT INTO facilities (
            facility_name, facility_code, type, region_id, province_id, district_id,
            latitude, longitude, gps_coordinates, is_functioning, external_id, source_system
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `, [
        record.facility_name.trim(),
        nullable(record.facility_code),
        nullable(record.type),
        intOrNull(record.region_id),
        intOrNull(record.province_id),
        intOrNull(record.district_id),
        numberOrNull(record.latitude),
        numberOrNull(record.longitude),
        nullable(record.gps_coordinates),
        boolOrDefault(record.is_functioning, true),
        nullable(record.external_id),
        nullable(record.source_system) || 'CSV'
    ]);

    return { status: 'imported' };
};

const importEquipment = async (record) => {
    const facilityId = await resolveFacilityId(record);
    if (!facilityId) return { status: 'failed', message: 'facility_id or matching facility_code is required' };

    if (present(record.serial_number)) {
        const duplicate = await db.query('SELECT equipment_id FROM equipment WHERE serial_number = $1 AND is_del = false LIMIT 1', [record.serial_number.trim()]);
        if (duplicate.rows.length > 0) return { status: 'skipped', message: 'serial_number already exists' };
    }

    if (present(record.asset_code)) {
        const duplicate = await db.query('SELECT equipment_id FROM equipment WHERE asset_code = $1 AND is_del = false LIMIT 1', [record.asset_code.trim()]);
        if (duplicate.rows.length > 0) return { status: 'skipped', message: 'asset_code already exists' };
    }

    await db.query(`
        INSERT INTO equipment (
            facility_id, item_class, item_type, manufacturer, model, serial_number,
            asset_code, year_installed, energy_source, is_functioning, external_id, source_system
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `, [
        facilityId,
        nullable(record.item_class),
        nullable(record.item_type),
        nullable(record.manufacturer),
        nullable(record.model),
        nullable(record.serial_number),
        nullable(record.asset_code),
        intOrNull(record.year_installed),
        nullable(record.energy_source),
        boolOrDefault(record.is_functioning, true),
        nullable(record.external_id),
        nullable(record.source_system) || 'CSV'
    ]);

    return { status: 'imported' };
};

const importUser = async (record) => {
    if (!present(record.username)) return { status: 'failed', message: 'username is required' };
    if (!present(record.email)) return { status: 'failed', message: 'email is required' };
    if (!present(record.password)) return { status: 'failed', message: 'password is required' };

    const duplicate = await db.query('SELECT user_id FROM users WHERE username = $1 OR email = $2 LIMIT 1', [record.username.trim(), record.email.trim()]);
    if (duplicate.rows.length > 0) return { status: 'skipped', message: 'username or email already exists' };

    let roleId = intOrNull(record.role_id);
    if (!roleId && present(record.role_name)) {
        const role = await db.query('SELECT role_id FROM roles WHERE LOWER(role_name) = LOWER($1) LIMIT 1', [record.role_name.trim()]);
        if (role.rows.length > 0) roleId = role.rows[0].role_id;
    }
    if (!roleId) return { status: 'failed', message: 'role_id or matching role_name is required' };

    const passwordHash = await bcrypt.hash(record.password, 10);
    await db.query(`
        INSERT INTO users (
            username, email, password_hash, first_name, last_name, phone_number,
            role_id, is_active, is_national_access, must_change_password
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8, true)
    `, [
        record.username.trim(),
        record.email.trim(),
        passwordHash,
        nullable(record.first_name),
        nullable(record.last_name),
        nullable(record.phone_number),
        roleId,
        boolOrDefault(record.is_national_access, false)
    ]);

    return { status: 'imported' };
};

router.get('/template/:type', auth, adminOnly, (req, res) => {
    const { type } = req.params;
    if (!templates[type]) return res.status(404).json({ success: false, message: 'Unknown template type.' });

    const csv = `${templates[type].map(csvEscape).join(',')}\n${sampleRows[type].map(csvEscape).join(',')}\n`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="ccets_${type}_template.csv"`);
    res.send(csv);
});

router.post('/:type', auth, adminOnly, async (req, res) => {
    try {
        const { type } = req.params;
        const { csv } = req.body;
        if (!templates[type]) return res.status(404).json({ success: false, message: 'Unknown import type.' });
        if (!present(csv)) return res.status(400).json({ success: false, message: 'CSV content is required.' });

        const records = parseCsv(csv);
        if (records.length === 0) return res.status(400).json({ success: false, message: 'CSV has no data rows.' });
        if (records.length > 5000) return res.status(400).json({ success: false, message: 'CSV imports are limited to 5000 rows at a time.' });

        const results = [];
        for (let i = 0; i < records.length; i++) {
            try {
                const result = type === 'facilities'
                    ? await importFacility(records[i])
                    : type === 'equipment'
                        ? await importEquipment(records[i])
                        : await importUser(records[i]);
                results.push({ row: i + 2, ...result });
            } catch (error) {
                console.error(`CSV ${type} import row ${i + 2} failed:`, error);
                results.push({ row: i + 2, status: 'failed', message: error.message });
            }
        }

        const summary = results.reduce((acc, row) => {
            acc[row.status] = (acc[row.status] || 0) + 1;
            return acc;
        }, { imported: 0, skipped: 0, failed: 0 });

        res.json({ success: summary.imported > 0 || summary.skipped > 0, summary, results: results.slice(0, 200) });
    } catch (error) {
        console.error('CSV import failed:', error);
        res.status(500).json({ success: false, message: 'CSV import failed', error: error.message });
    }
});

module.exports = router;