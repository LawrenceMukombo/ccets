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

function normalize(str) {
    if (!str) return '';
    return str.toUpperCase().trim();
}

async function run() {
    try {
        console.log('Reading file...');
        const sqlContent = fs.readFileSync('populate_facilities.sql', 'utf8');
        const lines = sqlContent.split(/\r?\n/);
        const mapNameCoords = new Map();

        // Dynamic indices
        const copyLine = lines.find(l => l.startsWith('COPY public.facilities'));
        const columns = copyLine.match(/\((.*?)\)/)[1].split(',').map(s => s.trim());
        const nameIdx = columns.indexOf('facility_name');
        const gpsIdx = columns.indexOf('gps_coordinates');
        const latIdx = columns.indexOf('latitude');
        const lonIdx = columns.indexOf('longitude');
        const codeIdx = columns.indexOf('facility_code');

        for (const line of lines) {
            if (line.startsWith('COPY') || line.startsWith('\\.')) continue;
            const vals = line.split('\t');
            if (vals.length < columns.length) continue;

            const name = normalize(vals[nameIdx]);
            const code = normalize(vals[codeIdx]);
            const gps = vals[gpsIdx];
            let lat = vals[latIdx];
            let lon = vals[lonIdx];

            let hasCoords = false;
            let finalLat = null;
            let finalLon = null;
            let finalGps = null;

            if (gps && gps !== '\\N') {
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
                if (name) mapNameCoords.set(name, { lat: finalLat, lon: finalLon, gps: finalGps });
                if (code && code !== '\\N') mapNameCoords.set(code, { lat: finalLat, lon: finalLon, gps: finalGps });

                // Fuzzy keys?
                if (name && name.includes('/')) {
                    const parts = name.split('/');
                    parts.forEach(p => mapNameCoords.set(normalize(p), { lat: finalLat, lon: finalLon, gps: finalGps }));
                }
            }
        }
        console.log(`Loaded ${mapNameCoords.size} coordinate reference keys.`);

        // Get ALL facilities
        const res = await pool.query('SELECT facility_id, facility_name, facility_code FROM facilities');
        console.log(`Checking ${res.rowCount} facilities in DB...`);

        let updated = 0;
        for (const row of res.rows) {
            const dbName = normalize(row.facility_name);
            const dbCode = normalize(row.facility_code);

            let match = mapNameCoords.get(dbName) || mapNameCoords.get(dbCode);

            // Try DB Name split
            if (!match && dbName.includes('(')) {
                // e.g. "Boram (Hospital)" -> "Boram"
                const simple = normalize(dbName.split('(')[0]);
                match = mapNameCoords.get(simple);
            }

            if (match) {
                await pool.query(`
                    UPDATE facilities 
                    SET latitude = $1, longitude = $2, gps_coordinates = $3 
                    WHERE facility_id = $4
                `, [match.lat, match.lon, match.gps, row.facility_id]);
                updated++;
            }
        }
        console.log(`Updated ${updated} facilities total.`);

    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}
run();
