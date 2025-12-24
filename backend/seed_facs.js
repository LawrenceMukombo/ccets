const { Pool } = require('pg');
const fs = require('fs');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5433,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password_change_me_in_prod',
    database: process.env.DB_NAME || 'png_ccets',
});

async function run() {
    console.log('Connecting to DB...');
    try {
        const sqlContent = fs.readFileSync('populate_facilities.sql', 'utf8');
        const lines = sqlContent.split(/\r?\n/);

        const copyLine = lines.find(l => l.startsWith('COPY public.facilities'));
        if (!copyLine) throw new Error('COPY line not found');

        const columns = copyLine.match(/\((.*?)\)/)[1].split(',').map(s => s.trim());
        const idIdx = columns.indexOf('facility_id');
        const gpsIdx = columns.indexOf('gps_coordinates');
        const latIdx = columns.indexOf('latitude');
        const lonIdx = columns.indexOf('longitude');

        console.log(`Indices: ID=${idIdx}, GPS=${gpsIdx}, Lat=${latIdx}, Lon=${lonIdx}`);

        let start = false;
        let inserted = 0;

        for (const line of lines) {
            if (line.startsWith('COPY')) { start = true; continue; }
            if (line.trim() === '\\.') break;
            if (!start || !line.trim()) continue;

            const values = line.split('\t').map(v => {
                if (v === '\\N') return null;
                return v;
            });

            // Only update if we have coordinates
            if (values[gpsIdx] || (values[latIdx] && values[lonIdx])) {
                const query = `
                    UPDATE facilities 
                    SET gps_coordinates = $1, latitude = $2, longitude = $3
                    WHERE facility_id = $4
                `;

                try {
                    const res = await pool.query(query, [values[gpsIdx], values[latIdx], values[lonIdx], values[idIdx]]);
                    if (res.rowCount > 0) {
                        inserted++;
                        if (inserted % 100 === 0) console.log(`Updated ${inserted} rows...`);
                    }
                } catch (err) {
                    console.error(`Error row update:`, err.message);
                }
            }
        }
        console.log(`Finished. Updated ${inserted} facilities with coordinates.`);
    } catch (err) {
        console.error('Fatal:', err);
    } finally {
        pool.end();
    }
}

run();
