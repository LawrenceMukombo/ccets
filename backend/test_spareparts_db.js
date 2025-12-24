const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '.env') });

const db = require('./src/db');

async function testSpareParts() {
    console.log('Testing connection to database...');
    console.log(`DB_HOST: ${process.env.DB_HOST}`);
    console.log(`DB_USER: ${process.env.DB_USER}`);
    console.log(`DB_NAME: ${process.env.DB_NAME}`);

    try {
        // Test 1: Simple connection test
        console.log('\nTest 1: Simple SELECT 1');
        const res1 = await db.query('SELECT 1 as val');
        console.log('✅ Connection successful:', res1.rows[0]);

        // Test 2: Check schema for tables matching 'spare'
        console.log('\nTest 2: Check tables matching "spare"');
        const res2 = await db.query(`
            SELECT table_schema, table_name 
            FROM information_schema.tables 
            WHERE table_name LIKE '%spare%'
        `);
        if (res2.rows.length === 0) {
            console.log('❌ No tables found matching "spare"');
        } else {
            console.log('✅ Found tables:');
            console.table(res2.rows);
        }

        // Test 3: Get all columns
        console.log('\nTest 3: Get table columns');
        const res3 = await db.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'spareparts'
        `);
        console.table(res3.rows);

    } catch (error) {
        console.error('\n❌ ERROR OCCURRED:');
        console.error(error);
    } finally {
        process.exit();
    }
}

testSpareParts();
