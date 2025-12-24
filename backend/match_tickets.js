const fs = require('fs');
const { Pool } = require('pg');
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
        // 1. Get facilities with coords from file
        const sqlContent = fs.readFileSync('populate_facilities.sql', 'utf8');
        const lines = sqlContent.split(/\r?\n/);
        const mapNameCoords = new Map();

        // Assume indices from previous debug: Name=1, GPS=6
        // Better: dynamically find them
        const copyLine = lines.find(l => l.startsWith('COPY public.facilities'));
        const columns = copyLine.match(/\((.*?)\)/)[1].split(',').map(s => s.trim());
        const nameIdx = columns.indexOf('facility_name');
        const gpsIdx = columns.indexOf('gps_coordinates');
        const latIdx = columns.indexOf('latitude');
        const lonIdx = columns.indexOf('longitude');
        const codeIdx = columns.indexOf('facility_code'); // Try code matching too

        console.log(`Indices: Name=${nameIdx}, GPS=${gpsIdx}`);

        for (const line of lines) {
            if (line.startsWith('COPY') || line.startsWith('\\.')) continue;
            const vals = line.split('\t');
            if (vals.length < columns.length) continue;

            const name = vals[nameIdx];
            const gps = vals[gpsIdx];
            const code = vals[codeIdx];
            let lat = vals[latIdx];
            let lon = vals[lonIdx];

            let hasCoords = false;
            let finalLat = null;
            let finalLon = null;
            let finalGps = null;

            if (gps && gps !== '\\N') {
                // Try parse LatLng(x,y)
                if (gps.startsWith('LatLng(')) {
                    const parts = gps.replace('LatLng(', '').replace(')', '').split(',');
                    if (parts.length === 2) {
                        finalLat = parts[0];
                        finalLon = parts[1];
                        finalGps = `${finalLat},${finalLon}`;
                        hasCoords = true;
                    }
                }
            } else if (lat && lat !== '\\N' && lon && lon !== '\\N') {
                finalLat = lat;
                finalLon = lon;
                finalGps = `${lat},${lon}`;
                hasCoords = true;
            }

            if (hasCoords) {
                if (name) mapNameCoords.set(name.toUpperCase(), { lat: finalLat, lon: finalLon, gps: finalGps });
                if (code && code !== '\\N') mapNameCoords.set(code.toUpperCase(), { lat: finalLat, lon: finalLon, gps: finalGps });
            }
        }
        console.log(`Found ${mapNameCoords.size} facility names/codes with coordinates in file.`);

        const fileNames = Array.from(mapNameCoords.keys()).sort().join('\n');
        fs.writeFileSync('file_coords_names.txt', fileNames);

        // 2. Get facilities with tickets from DB
        const res = await pool.query(`
            SELECT DISTINCT f.facility_id, f.facility_name, f.facility_code 
            FROM tickets t 
            JOIN facilities f ON t.facility_id = f.facility_id
        `);
        console.log(`Found ${res.rowCount} facilities with tickets.`);

        const ticketNames = res.rows.map(r => `${r.facility_name}|${r.facility_code}`).sort().join('\n');
        fs.writeFileSync('ticket_names.txt', ticketNames);

        // 3. Match and Update
        let matched = 0;
        for (const row of res.rows) {
            const dbName = row.facility_name ? row.facility_name.toUpperCase() : '';
            const dbCode = row.facility_code ? row.facility_code.toUpperCase() : '';

            let match = mapNameCoords.get(dbName) || mapNameCoords.get(dbCode);

            if (match) {
                // Update DB
                await pool.query(`
                    UPDATE facilities 
                    SET latitude = $1, longitude = $2, gps_coordinates = $3 
                    WHERE facility_id = $4
                `, [match.lat, match.lon, match.gps, row.facility_id]);
                matched++;
            } else {
                console.log(`No match for Ticketed Facility: "${row.facility_name}" (Code: ${row.facility_code})`);
            }
        }
        console.log(`Updated ${matched} facilities linked to tickets.`);
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}
run();
