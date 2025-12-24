const fs = require('fs');
const readline = require('readline');

async function restoreFacilities() {
    const fileStream = fs.createReadStream('init.sql');
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    let capturing = false;
    let sourceColumns = [];
    let rows = [];

    // Target columns in the database (order must match our values array later)
    const targetColumns = [
        'facility_id', 'facility_name', 'facility_code', 'type',
        'is_functioning', 'gps_coordinates', 'province_id',
        'district_id', 'created_at', 'updated_at'
    ];

    for await (const line of rl) {
        if (line.startsWith('COPY public.facilities')) {
            capturing = true;
            const colMatch = line.match(/\((.*)\)/);
            if (colMatch) {
                sourceColumns = colMatch[1].split(',').map(c => c.trim());
            }
            continue;
        }

        if (capturing) {
            if (line === '\\.') {
                capturing = false;
                break;
            }

            const parts = line.split('\t');
            if (parts.length < sourceColumns.length) continue;

            const rowData = {};
            sourceColumns.forEach((col, index) => {
                rowData[col] = parts[index];
            });

            // GPS Conversion: LatLng(-6.347,145.557) -> (-6.347,145.557)
            let gps = rowData['gps_coordinates'];
            if (gps && gps.startsWith('LatLng')) {
                gps = gps.replace('LatLng', '').trim();
            }

            // Map source data to target database structure
            const values = [
                rowData['facility_id'],
                rowData['facility_name'],
                rowData['facility_code'],
                rowData['type'],
                rowData['is_functioning'] === 't' ? 'true' : (rowData['is_functioning'] === 'f' ? 'false' : 'true'),
                gps, // Now in point format (A,B)
                rowData['province_id'] === '\\N' ? 'NULL' : rowData['province_id'],
                rowData['district_id'] === '\\N' ? 'NULL' : rowData['district_id'],
                rowData['created_at'],
                rowData['updated_at']
            ];

            const csvLine = values.map(val => {
                if (val === '\\N' || val === 'NULL' || val === undefined) return '\\N';
                let s = val.toString().replace(/"/g, '""');
                return `"${s}"`;
            }).join(',');

            rows.push(csvLine);
        }
    }

    const header = `COPY public.facilities (${targetColumns.join(', ')}) FROM stdin WITH (FORMAT CSV, DELIMITER ',', NULL '\\N', QUOTE '"', ESCAPE '"');`;
    const content = [header, ...rows, '\\.'].join('\n');

    fs.writeFileSync('restore_facilities_mapped.sql', content, { encoding: 'utf8', flag: 'w' });
    console.log(`Prepared ${rows.length} records with correct point format and schema mapping.`);
}

restoreFacilities();
