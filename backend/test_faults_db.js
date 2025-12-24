const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });
const db = require('./src/db');

async function testFaults() {
    try {
        console.log('Testing fault categories...');

        // Check tables
        const tables = await db.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_name IN ('fault_categories', 'fault_issues', 'ticket_fault_issues')
        `);
        console.log('Found tables:', tables.rows.map(t => t.table_name));

        // Test query from controller
        console.log('\nTesting main query...');
        const query = `
            SELECT 
                fc.category_id,
                fc.category_name,
                json_agg(
                    json_build_object(
                        'issue_id', fi.issue_id,
                        'issue_name', fi.issue_name
                    )
                ) as issues
            FROM fault_categories fc
            LEFT JOIN fault_issues fi ON fc.category_id = fi.category_id
            GROUP BY fc.category_id, fc.category_name
            LIMIT 2
        `;

        try {
            const res = await db.query(query);
            console.log('✅ Query successful!');
            console.log('Result samples:', JSON.stringify(res.rows, null, 2));
        } catch (err) {
            console.error('❌ Query failed:', err.message);
        }

        // Test enum
        console.log('\nTesting enum...');
        const enumRes = await db.query(`
            SELECT enumlabel 
            FROM pg_enum 
            WHERE enumtypid = 'equipment_functional_status'::regtype
        `);
        console.log('Enum values:', enumRes.rows.map(r => r.enumlabel));

    } catch (e) {
        console.error('ERROR:', e);
    } finally {
        process.exit();
    }
}
testFaults();
