const fs = require('fs');

const content = fs.readFileSync('populate_facilities.sql', 'utf8');
const lines = content.split(/\r?\n/);

const copyLine = lines.find(l => l.startsWith('COPY public.facilities'));
if (!copyLine) { console.error('No COPY line'); process.exit(1); }

// Extract expected FILE columns
const fileCols = copyLine.match(/\((.*?)\)/)[1].split(',').map(s => s.trim());
const colMap = {};
fileCols.forEach((c, i) => colMap[c] = i);

// Known DB columns logic
const dbColumns = new Set([
    'facility_id', 'facility_name', 'facility_code', 'type', 'is_functioning',
    'province_id', 'district_id'
]);

const sqlLines = [];
// sqlLines.push('BEGIN;');

let count = 0;
for (const line of lines) {
    if (line.startsWith('COPY') || line.startsWith('\\.')) continue;
    if (!line.trim()) continue;

    const vals = line.split('\t');
    if (vals.length < fileCols.length) continue;

    // Extract Lat/Lon from gps_coordinates
    let lat = 'NULL';
    let lon = 'NULL';
    const gpsIdx = colMap['gps_coordinates'];
    const latIdx = colMap['latitude'];
    const lonIdx = colMap['longitude'];

    const gpsVal = vals[gpsIdx];

    if (gpsVal && gpsVal !== '\\N') {
        if (gpsVal.startsWith('LatLng(')) {
            const parts = gpsVal.replace('LatLng(', '').replace(')', '').split(',');
            if (parts.length === 2) {
                lat = parts[0].trim();
                lon = parts[1].trim();
            }
        }
    }

    // Fallback to explicit columns
    if ((lat === 'NULL' || lon === 'NULL') && latIdx !== undefined && lonIdx !== undefined) {
        const fileLat = vals[latIdx];
        const fileLon = vals[lonIdx];
        if (fileLat && fileLat !== '\\N') lat = fileLat;
        if (fileLon && fileLon !== '\\N') lon = fileLon;
    }

    // Build values object
    const rowVals = {};
    fileCols.forEach((c, i) => {
        let v = vals[i];
        if (v === '\\N') v = 'NULL';
        else v = "'" + v.replace(/'/g, "''") + "'";
        rowVals[c] = v;
    });

    // Construct INSERT
    const insertCols = [];
    const insertVals = [];

    // Add standard columns
    Object.keys(rowVals).forEach(c => {
        if (dbColumns.has(c)) {
            insertCols.push(c);
            insertVals.push(rowVals[c]);
        }
    });

    // Add manual lat/lon
    insertCols.push('latitude');
    insertVals.push(lat);
    insertCols.push('longitude');
    insertVals.push(lon);

    // Handle gps_coordinates point type
    if (lat !== 'NULL' && lon !== 'NULL') {
        insertCols.push('gps_coordinates');
        insertVals.push(`'(${lat},${lon})'`);
    }

    const query = `INSERT INTO facilities (${insertCols.join(', ')}) VALUES (${insertVals.join(', ')}) ON CONFLICT (facility_id) DO UPDATE SET latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude, gps_coordinates = EXCLUDED.gps_coordinates, type = EXCLUDED.type, province_id = EXCLUDED.province_id, district_id = EXCLUDED.district_id, facility_name = EXCLUDED.facility_name, facility_code = EXCLUDED.facility_code;`;

    sqlLines.push(query);
    count++;
}
// sqlLines.push('COMMIT;');

fs.writeFileSync('full_restore.sql', sqlLines.join('\n'));
console.log(`Generated ${count} inserts.`);
