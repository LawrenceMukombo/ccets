const db = require('../db');
const bcrypt = require('bcryptjs');

const seed = async () => {
    try {
        console.log('Seeding database...');

        // 1. Roles
        console.log('Seeding roles...');
        const roles = [
            'national_admin', 'regional_manager', 'provincial_staff',
            'field_technician', 'facility_manager', 'inventory_manager'
        ];

        for (const role of roles) {
            try {
                // Check if exists first to avoid ON CONFLICT issues if constraint missing
                const check = await db.query("SELECT role_id FROM roles WHERE role_name = $1", [role]);
                if (check.rows.length === 0) {
                    await db.query(`
                        INSERT INTO roles (role_name, description) 
                        VALUES ($1, $2)
                     `, [role, `Role for ${role.replace('_', ' ')}`]);
                    console.log(`Inserted role: ${role}`);
                } else {
                    console.log(`Role exists: ${role}`);
                }
            } catch (e) {
                console.error(`Failed role ${role}:`, e.message);
                throw e;
            }
        }

        // 2. Locations
        console.log('Seeding locations...');
        let provinceId;
        const pCheck = await db.query("SELECT province_id FROM provinces WHERE province_name = 'Western Province'");
        if (pCheck.rows.length > 0) {
            provinceId = pCheck.rows[0].province_id;
        } else {
            const pRes = await db.query(`
                INSERT INTO provinces (province_name, region_id) 
                VALUES ('Western Province', 1) 
                RETURNING province_id
            `);
            provinceId = pRes.rows[0].province_id;
        }

        let districtId;
        const dCheck = await db.query("SELECT district_id FROM districts WHERE district_name = 'Central District'");
        if (dCheck.rows.length > 0) {
            districtId = dCheck.rows[0].district_id;
        } else {
            const dRes = await db.query(`
                INSERT INTO districts (district_name, province_id) 
                VALUES ('Central District', $1) 
                RETURNING district_id
            `, [provinceId]);
            districtId = dRes.rows[0].district_id;
        }

        // 3. Facilities
        console.log('Seeding facilities...');
        const facilities = [
            { name: 'Central District Hospital', code: 'CDH-001', type: 'Hospital', lat: -6.31, lng: 143.95, functioning: true },
            { name: 'Community Clinic North', code: 'CCN-002', type: 'Clinic', lat: -6.4, lng: 144.0, functioning: true }
        ];

        for (const fac of facilities) {
            const fCheck = await db.query("SELECT facility_id FROM facilities WHERE facility_code = $1", [fac.code]);
            if (fCheck.rows.length === 0) {
                await db.query(`
                    INSERT INTO facilities (
                        facility_name, facility_code, type, 
                        province_id, district_id, gps_coordinates, is_functioning
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                `, [
                    fac.name, fac.code, fac.type,
                    provinceId, districtId,
                    `(${fac.lat},${fac.lng})`,
                    fac.functioning
                ]);
            }
        }

        // 4. Users
        console.log('Seeding users...');
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash('Admin@2025', salt);

        const roleRes = await db.query("SELECT role_id FROM roles WHERE role_name = 'national_admin'");
        if (roleRes.rows.length > 0) {
            const adminRoleId = roleRes.rows[0].role_id;
            const uCheck = await db.query("SELECT user_id FROM users WHERE email = 'admin@ccets.gov.pg'");
            if (uCheck.rows.length === 0) {
                await db.query(`
                    INSERT INTO users (username, email, password_hash, role_id)
                    VALUES ('admin', 'admin@ccets.gov.pg', $1, $2)
                `, [hash, adminRoleId]);
                console.log('Created admin user');
            }
        }

        console.log('Seeding completed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Seeding failed:', error);
        console.error('Error details:', error.message);
        process.exit(1);
    }
};

seed();
