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
    try {
        console.log('Reading file...');
        const sqlContent = fs.readFileSync('populate_facilities.sql', 'utf8');
        const lines = sqlContent.split(/\r?\n/);

        const copyLine = lines.find(l => l.startsWith('COPY public.facilities'));
        if (!copyLine) throw new Error('COPY line not found');
        const columns = copyLine.match(/\((.*?)\)/)[1].split(',').map(s => s.trim());
        const nameIdx = columns.indexOf('facility_name');
        const gpsIdx = columns.indexOf('gps_coordinates');
        const latIdx = columns.indexOf('latitude');
        const lonIdx = columns.indexOf('longitude');

        console.log('Starting Update by Name...');
        let updated = 0;
        let examined = 0;

        for (const line of lines) {
            if (line.startsWith('COPY') || line.startsWith('\\.')) continue;

            const values = line.split('\t');
            if (values.length < columns.length) continue;

            const name = values[nameIdx];
            let gps = values[gpsIdx] === '\\N' ? null : values[gpsIdx];
            let lat = values[latIdx] === '\\N' ? null : values[latIdx];
            let lon = values[lonIdx] === '\\N' ? null : values[lonIdx];

            // Normalize GPS string "LatLng(x, y)" -> "x, y"
            if (gps && gps.startsWith('LatLng(')) {
                gps = gps.replace('LatLng(', '').replace(')', '');
            }
            // Derive lat/lon if missing but gps is present
            if ((!lat || !lon) && gps && gps.includes(',')) {
                const parts = gps.split(',');
                if (parts.length >= 2) {
                    lat = parts[0].trim();
                    lon = parts[1].trim();
                }
            }

            if (name && lat && lon) {
                examined++;
                // Perform Update
                try {
                    const res = await pool.query(
                        `UPDATE facilities SET latitude = $1, longitude = $2, gps_coordinates = $3 WHERE UPPER(facility_name) = UPPER($4)`,
                        [lat, lon, gps, name]
                    );
                    if (res.rowCount > 0) {
                        updated++;
                        if (updated % 50 === 0) console.log(`Updated ${updated} so far...`);
                    }
                } catch (e) {
                    console.error('Update error:', e.message);
                }
            }
        }
        console.log(`Examined ${examined} valid lines. Updated ${updated} facilities in DB.`);
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}
run();
