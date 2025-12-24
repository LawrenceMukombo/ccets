const { Client } = require('pg');
const fs = require('fs');

const client = new Client({
    host: 'localhost',
    port: 5433,
    database: 'png_ccets',
    user: 'postgres',
    password: 'password_change_me_in_prod'
});

async function run() {
    try {
        await client.connect();
        const res = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'tickets';
        `);
        const dbCols = res.rows.map(r => r.column_name);
        const targetCols = [
            'facility_id',
            'selected_equipment_id',
            'priority',
            'fault_description',
            'created_by',
            'ticket_status',
            'status',
            'region_id',
            'province_id',
            'district_id'
        ];

        const output = targetCols.map(col => {
            const exists = dbCols.includes(col);
            return `${col}: ${exists ? 'EXISTS' : 'MISSING'}`;
        }).join('\n');

        fs.writeFileSync('cols.txt', output);
        console.log('Done writing cols.txt');

    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}
run();
