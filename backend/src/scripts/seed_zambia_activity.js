/**
 * seed_zambia_activity.js
 * Seeds ALL zambia facilities with realistic equipment and tickets.
 *
 * Usage: node src/scripts/seed_zambia_activity.js
 *
 * This script is ADDITIVE — it will not delete existing data.
 * It only inserts equipment and tickets for facilities that have none yet.
 */
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'png_ccets',
    password: process.env.DB_PASSWORD || 'password_change_me_in_prod',
    port: parseInt(process.env.DB_PORT || '5432'),
});

const SCHEMA = 'zambia';

// ── Realistic cold chain equipment models ─────────────────────────────────
const EQUIPMENT_MODELS = [
    { class: 'CC', type: 'Refrigerator',       manufacturer: 'B Medical Systems',  model: 'SP500' },
    { class: 'CC', type: 'Refrigerator',       manufacturer: 'Vestfrost',           model: 'MK 144' },
    { class: 'CC', type: 'Refrigerator',       manufacturer: 'Sure Chill',          model: 'C 90' },
    { class: 'CC', type: 'Solar Refrigerator', manufacturer: 'SunDanzer',           model: 'DCR 225' },
    { class: 'CC', type: 'Solar Refrigerator', manufacturer: 'Dulas',               model: 'VC 150' },
    { class: 'CC', type: 'Freezer',            manufacturer: 'Dometic',             model: 'TCW 3000' },
    { class: 'CC', type: 'Freezer',            manufacturer: 'B Medical Systems',  model: 'TCW 2000 SDD' },
    { class: 'CC', type: 'Ice Pack Freezer',   manufacturer: 'Sibir',               model: 'EG 150' },
    { class: 'VC', type: 'Vaccine Carrier',    manufacturer: 'AOKI',                model: 'Long Range' },
    { class: 'VC', type: 'Cold Box',           manufacturer: 'Aucouturier',         model: 'RFCB 25' },
];

// ── Fault descriptions by fault type ─────────────────────────────────────
const FAULTS = [
    { desc: 'Compressor not starting — unit fails to cool',        priority: 'Critical' },
    { desc: 'Temperature alarm triggered — readings above +8°C',   priority: 'Critical' },
    { desc: 'Solar panel damaged — charging failure',              priority: 'High' },
    { desc: 'Battery not holding charge — unit cuts off at night', priority: 'High' },
    { desc: 'Door seal broken — cold air escaping',                priority: 'High' },
    { desc: 'Ice buildup on evaporator — defrost required',        priority: 'Medium' },
    { desc: 'Strange vibration noise from compressor',             priority: 'Medium' },
    { desc: 'Display panel blank — control board fault',           priority: 'Medium' },
    { desc: 'Thermostat reading inaccurate',                       priority: 'Medium' },
    { desc: 'Condenser coils dusty — overheating risk',            priority: 'Low' },
    { desc: 'Lid hinge loose — requires replacement',              priority: 'Low' },
    { desc: 'Routine preventive maintenance due',                  priority: 'Low' },
];

const TICKET_STATUSES = ['New', 'In Progress', 'Resolved', 'Closed'];
const EQUIP_STATUSES = [
    'Functional (Working Normally)',
    'Functional but at Risk',
    'Partially Functional',
    'Non-Functional',
];

// Weighted random: more facilities should be functional
function pickEquipStatus() {
    const r = Math.random();
    if (r < 0.50) return 'Functional (Working Normally)';
    if (r < 0.72) return 'Functional but at Risk';
    if (r < 0.88) return 'Partially Functional';
    return 'Non-Functional';
}

// Weighted ticket status: most issues still open for realistic dashboard
function pickTicketStatus() {
    const r = Math.random();
    if (r < 0.40) return 'New';
    if (r < 0.65) return 'In Progress';
    if (r < 0.80) return 'Resolved';
    return 'Closed';
}

function rand(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

// Spread created_at dates over last 12 months for realistic trend charts
function randomPastDate(maxDaysAgo = 365) {
    const d = new Date();
    d.setDate(d.getDate() - Math.floor(Math.random() * maxDaysAgo));
    return d;
}

async function seed() {
    const client = await pool.connect();
    try {
        console.log('=== Zambia Full Activity Seed ===\n');
        await client.query(`SET search_path TO ${SCHEMA}, public`);

        // ── Get admin user ID ──────────────────────────────────────────────
        const userRes = await client.query(`SELECT user_id FROM users ORDER BY user_id LIMIT 1`);
        if (userRes.rows.length === 0) {
            console.error('❌ No users found in zambia schema. Cannot set created_by.');
            return;
        }
        const userId = userRes.rows[0].user_id;
        console.log(`Using user_id: ${userId} as creator for all tickets.\n`);

        // ── Fetch ALL facilities ───────────────────────────────────────────
        console.log('Fetching all facilities...');
        const facRes = await client.query(
            `SELECT facility_id, facility_name, district_id, province_id, region_id FROM facilities ORDER BY facility_id`
        );
        const facilities = facRes.rows;
        console.log(`Found ${facilities.length} facilities.\n`);

        if (facilities.length === 0) {
            console.error('No facilities found. Run seed_zambia.js first.');
            return;
        }

        let equipCount = 0;
        let ticketCount = 0;
        const BATCH = 100;

        // Disable the auto-reference trigger to prevent timestamp collisions during bulk insert
        console.log('Disabling ticket reference trigger for bulk insert...');
        await client.query(`ALTER TABLE tickets DISABLE TRIGGER trg_generate_ticket_reference`);

        console.log('Seeding equipment and tickets...');

        for (let i = 0; i < facilities.length; i++) {
            const fac = facilities[i];

            // Each facility gets 1–3 cold chain equipment items
            const numEquip = Math.floor(Math.random() * 3) + 1;

            for (let e = 0; e < numEquip; e++) {
                const modelData = rand(EQUIPMENT_MODELS);
                const status    = pickEquipStatus();
                const isFunctional = status === 'Functional (Working Normally)' || status === 'Functional but at Risk';
                const installedYear = 2012 + Math.floor(Math.random() * 11); // 2012–2022

                const equipRes = await client.query(
                    `INSERT INTO equipment (
                        facility_id, item_class, item_type, manufacturer, model,
                        serial_number, is_functioning,
                        year_installed,
                        created_at, updated_at
                    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),NOW())
                    RETURNING equipment_id`,
                    [
                        fac.facility_id,
                        modelData.class,
                        modelData.type,
                        modelData.manufacturer,
                        modelData.model,
                        'ZMB-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
                        isFunctional,
                        installedYear,
                    ]
                );
                const equipmentId = equipRes.rows[0].equipment_id;
                equipCount++;

                // Non-functional or at-risk equipment always gets a ticket
                // Functional equipment has a 30% chance of a routine/minor ticket
                const shouldTicket = !isFunctional || status === 'Functional but at Risk' || Math.random() < 0.30;

                if (shouldTicket) {
                    const fault       = rand(FAULTS);
                    const ticketStatus = pickTicketStatus();
                    const createdAt   = randomPastDate(365);
                    const updatedAt   = new Date(createdAt.getTime() + Math.random() * 7 * 24 * 3600 * 1000);

                    // Generate a unique reference: ZMB-<timestamp_ms>-<random> to avoid trigger collisions
                    const refNum = `ZMB-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
                    await client.query(
                        `INSERT INTO tickets (
                            facility_id, selected_equipment_id, fault_description,
                            ticket_status, priority, created_by,
                            district_id, province_id, region_id,
                            ticket_reference_number,
                            created_at, updated_at
                        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
                        [
                            fac.facility_id,
                            equipmentId,
                            fault.desc,
                            ticketStatus,
                            fault.priority,
                            userId,
                            fac.district_id,
                            fac.province_id,
                            fac.region_id,
                            refNum,
                            createdAt,
                            updatedAt,
                        ]
                    );
                    ticketCount++;
                }
            }

            // Progress indicator every 100 facilities
            if ((i + 1) % BATCH === 0 || i + 1 === facilities.length) {
                process.stdout.write(`  ... ${i + 1}/${facilities.length} facilities processed\r`);
            }
        }

        // Re-enable the trigger
        await client.query(`ALTER TABLE tickets ENABLE TRIGGER trg_generate_ticket_reference`);
        console.log('\nTicket reference trigger re-enabled.');

        console.log('\n');
        console.log('=============================');
        console.log('✅  Activity seeding complete!');
        console.log(`   Facilities processed: ${facilities.length}`);
        console.log(`   Equipment inserted:   ${equipCount}`);
        console.log(`   Tickets inserted:     ${ticketCount}`);
        console.log('=============================\n');

    } catch (err) {
        console.error('\n❌ Seeding FAILED:', err.message);
        console.error(err.stack);
        process.exit(1);
    } finally {
        client.release();
        pool.end();
    }
}

seed();
