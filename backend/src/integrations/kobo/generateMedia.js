const db = require('../../db');
const { parse } = require('json2csv');
const fs = require('fs');
const path = require('path');

// Generate Hierarchical CSVs for ODK/Kobo
const generateODKMediaFiles = async () => {
    try {
        console.log('🔄 Generating ODK Hierarchical Media Files...');
        const outputDir = path.join(__dirname, 'output');
        if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

        // 1. Regions
        const regionsRes = await db.query(`
            SELECT region_id as name, region_name as label 
            FROM regions 
            ORDER BY 1
        `);
        fs.writeFileSync(path.join(outputDir, 'regions.csv'), parse(regionsRes.rows));
        console.log(`✅ regions.csv (${regionsRes.rowCount})`);

        // 2. Provinces
        const provincesRes = await db.query(`
            SELECT p.province_id as name, p.province_name as label, p.region_id as region_key 
            FROM provinces p 
            ORDER BY 1
        `);
        fs.writeFileSync(path.join(outputDir, 'provinces.csv'), parse(provincesRes.rows));
        console.log(`✅ provinces.csv (${provincesRes.rowCount})`);

        // 3. Districts
        const districtsRes = await db.query(`
            SELECT d.district_id as name, d.district_name as label, d.province_id as province_key 
            FROM districts d 
            ORDER BY 1
        `);
        fs.writeFileSync(path.join(outputDir, 'districts.csv'), parse(districtsRes.rows));
        console.log(`✅ districts.csv (${districtsRes.rowCount})`);

        // 4. Facilities
        const facilitiesRes = await db.query(`
            SELECT 
                f.facility_id as name, 
                f.facility_name as label, 
                f.district_id as district_key
            FROM facilities f
            ORDER BY f.facility_name
        `);
        fs.writeFileSync(path.join(outputDir, 'facilities.csv'), parse(facilitiesRes.rows));
        console.log(`✅ facilities.csv (${facilitiesRes.rowCount})`);

        // 5. Equipment with extra details for pulldata()
        const equipmentRes = await db.query(`
            SELECT 
                equipment_id as name,
                CONCAT(item_type, ' - ', model, ' (', serial_number, ')') as label,
                facility_id as facility_key,
                manufacturer,
                model,
                serial_number,
                refrigerant_gas,
                year_installed
            FROM equipment
            WHERE is_del IS FALSE
        `);
        fs.writeFileSync(path.join(outputDir, 'equipment.csv'), parse(equipmentRes.rows));
        console.log(`✅ equipment.csv (${equipmentRes.rowCount})`);

        return {
            message: "All 5 hierarchy files generated in /output"
        };

    } catch (error) {
        console.error('❌ Error generating ODK files:', error);
        throw error;
    }
};

module.exports = { generateODKMediaFiles };
