/**
 * seed_dummy_activity.js
 * Seeds the zambia schema with dummy equipment and tickets.
 * 
 * Usage: node seed_dummy_activity.js
 */
const { Pool } = require('pg');
require('dotenv').config({ path: '../../.env' });

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'png_ccets',
    password: process.env.DB_PASSWORD || 'S@mund3ng0',
    port: process.env.DB_PORT || 5432,
});

const SCHEMA = 'zambia';
const USER_ID = 21; // Lawrence.Mukombo.Technician

const EQUIPMENT_MODELS = [
    { class: 'CC', type: 'Refrigerator', manufacturer: 'B Medical Systems', model: 'TCW 2000 SDD' },
    { class: 'CC', type: 'Freezer', manufacturer: 'Dometic', model: 'TCW 3000' },
    { class: 'CC', type: 'Refrigerator', manufacturer: 'Sure Chill', model: 'GVR 50' },
    { class: 'CC', type: 'Solar Refrigerator', manufacturer: 'Vestfrost', model: 'VLS 054 SDD' },
    { class: 'VC', type: 'Vaccine Carrier', manufacturer: 'AOKI', model: 'Long Range' },
];

const TICKET_TITLES = [
    'Compressor not starting',
    'Temperature too high',
    'Door seal broken',
    'Strange noise from back',
    'Solar panel damaged',
    'Battery not charging',
    'Display panel blank',
    'Ice buildup in freezer',
];

const EQUIP_STATUSES = [
    'Functional (Working Normally)',
    'Functional but at Risk',
    'Partially Functional',
    'Non-Functional'
];

const TICKET_STATUSES = [
    'New',
    'In Progress',
    'Resolved',
    'Closed'
];

const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];

async function seed() {
    const client = await pool.connect();
    try {
        console.log(`=== Zambia Dummy Activity Seed ===\n`);
        
        // Ensure we are in the right schema
        await client.query(`SET search_path TO ${SCHEMA}, public`);

        // 1. Get some facilities
        console.log('Fetching facilities...');
        const facRes = await client.query(`SELECT facility_id, facility_name, district_id, province_id, region_id FROM facilities LIMIT 100`);
        const facilities = facRes.rows;
        console.log(`Found ${facilities.length} facilities to seed data for.`);

        if (facilities.length === 0) {
            console.error('No facilities found in zambia schema. Please run seed_zambia.js first.');
            return;
        }

        console.log('Inserting dummy equipment and tickets...');
        let equipCount = 0;
        let ticketCount = 0;

        for (const fac of facilities) {
            // Create 1-3 equipment items
            const numEquip = Math.floor(Math.random() * 3) + 1;
            
            for (let i = 0; i < numEquip; i++) {
                const modelData = EQUIPMENT_MODELS[Math.floor(Math.random() * EQUIPMENT_MODELS.length)];
                const status = EQUIP_STATUSES[Math.floor(Math.random() * EQUIP_STATUSES.length)];
                
                const equipRes = await client.query(
                    `INSERT INTO equipment (
                        facility_id, item_class, item_type, manufacturer, model, 
                        serial_number, working_condition, is_functioning, 
                        year_installed, created_at, updated_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW()) 
                    RETURNING equipment_id`,
                    [
                        fac.facility_id,
                        modelData.class,
                        modelData.type,
                        modelData.manufacturer,
                        modelData.model,
                        'SN-' + Math.random().toString(36).substring(2, 10).toUpperCase(),
                        status,
                        status.includes('Functional'),
                        2015 + Math.floor(Math.random() * 8)
                    ]
                );
                
                const equipmentId = equipRes.rows[0].equipment_id;
                equipCount++;

                // 50% chance of a ticket for this equipment
                if (Math.random() > 0.5) {
                    const title = TICKET_TITLES[Math.floor(Math.random() * TICKET_TITLES.length)];
                    const ticketStatus = TICKET_STATUSES[Math.floor(Math.random() * TICKET_STATUSES.length)];
                    const priority = PRIORITIES[Math.floor(Math.random() * PRIORITIES.length)];
                    
                    await client.query(
                        `INSERT INTO tickets (
                            facility_id, selected_equipment_id, fault_description, 
                            ticket_status, priority, created_by, 
                            district_id, province_id, region_id,
                            created_at, updated_at
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())`,
                        [
                            fac.facility_id,
                            equipmentId,
                            title, // Using the "title" variable as fault_description
                            ticketStatus,
                            priority,
                            USER_ID,
                            fac.district_id,
                            fac.province_id,
                            fac.region_id
                        ]
                    );
                    ticketCount++;
                }
            }
        }

        console.log(`\n✅ Seeding complete!`);
        console.log(`   Equipment inserted: ${equipCount}`);
        console.log(`   Tickets inserted:   ${ticketCount}`);
        console.log(`=============================\n`);

    } catch (err) {
        console.error('\n❌ Seeding FAILED:', err.message);
        console.error(err.stack);
    } finally {
        client.release();
        pool.end();
    }
}

seed();
