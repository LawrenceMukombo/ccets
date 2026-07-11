const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'png_ccets',
    password: process.env.DB_PASSWORD || 'S@mund3ng0',
    port: process.env.DB_PORT || 5432,
});

const randomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// Generate a random date in the past N days
const randomDate = (daysAgo) => {
    const d = new Date();
    d.setDate(d.getDate() - randomInt(0, daysAgo));
    d.setHours(randomInt(8, 17), randomInt(0, 59), 0, 0);
    return d;
};

const statuses = ['New', 'Assigned', 'In Progress', 'Escalated', 'Resolved', 'Closed', 'On Hold'];
const priorities = ['Low', 'Medium', 'High', 'Critical'];
const issues = [
    'Fridge not cooling',
    'Temperature alarm triggered',
    'Power supply issue',
    'Door seal broken',
    'Solar panel damaged',
    'Battery not holding charge',
    'Compressor making noise'
];

async function seed() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query('SET search_path TO "zambia", public');

        console.log('Fetching districts and facilities...');
        
        // Get up to 3 facilities with coordinates from EVERY district
        const { rows: facilities } = await client.query(`
            WITH RankedFacilities AS (
                SELECT 
                    f.facility_id, 
                    f.district_id,
                    ROW_NUMBER() OVER(PARTITION BY f.district_id ORDER BY random()) as rk
                FROM facilities f
                WHERE f.latitude IS NOT NULL AND f.longitude IS NOT NULL
            )
            SELECT facility_id, district_id 
            FROM RankedFacilities 
            WHERE rk <= 3
        `);

        console.log(`Found ${facilities.length} facilities across all districts.`);

        // Get some users to assign tickets to (Optional, but good for workload)
        const { rows: users } = await client.query('SELECT user_id, first_name || \' \' || last_name as name FROM users WHERE is_active = true LIMIT 10');
        const userNames = users.map(u => u.name);

        let totalInserted = 0;

        for (const fac of facilities) {
            const numTickets = randomInt(1, 4); // 1 to 4 tickets per facility

            for (let i = 0; i < numTickets; i++) {
                const createdAt = randomDate(90); // within last 90 days
                const status = randomElement(statuses);
                const priority = randomElement(priorities);
                
                let resolvedAt = null;
                if (status === 'Resolved' || status === 'Closed') {
                    resolvedAt = new Date(createdAt);
                    resolvedAt.setDate(resolvedAt.getDate() + randomInt(1, 10)); // Resolved 1-10 days later
                    if (resolvedAt > new Date()) resolvedAt = new Date(); // Don't resolve in future
                }

                const assignedTo = userNames.length > 0 ? randomElement([...userNames, null]) : null;

                // Simple insert query that triggers the reference generator
                const insertQuery = `
                    INSERT INTO tickets (
                        facility_id, 
                        fault_description, 
                        ticket_status, 
                        priority, 
                        created_at, 
                        date_resolved,
                        assigned_to_name,
                        reported_by_name,
                        reported_by_phone
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'System Seeder', '555-0000')
                `;
                
                // Note: Triggers on zambia.tickets handles generating 'ticket_reference' and 'updated_at'
                await client.query(insertQuery, [
                    fac.facility_id,
                    randomElement(issues),
                    status,
                    priority,
                    createdAt,
                    resolvedAt,
                    assignedTo
                ]);
                totalInserted++;
            }
        }

        await client.query('COMMIT');
        console.log(`Successfully seeded ${totalInserted} dummy tickets!`);

    } catch (e) {
        await client.query('ROLLBACK');
        console.error('Error seeding data:', e);
    } finally {
        client.release();
        await pool.end();
    }
}

seed();
