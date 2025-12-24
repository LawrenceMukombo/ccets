const fs = require('fs');
const readline = require('readline');
const path = require('path');
const { pool } = require('../db/index');

async function restore() {
    console.log('Starting facilities restoration...');

    // We need to read init.sql from the root. Since this runs in the container,
    // we need to make sure the file is available.
    // I'll assume init.sql is at /app/init.sql (via volume or copy)
    const initSqlPath = path.join(__dirname, '../../../init.sql');

    if (!fs.existsSync(initSqlPath)) {
        console.error('init.sql not found at ' + initSqlPath);
        process.exit(1);
    }

    const fileStream = fs.createReadStream(initSqlPath);
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    let capturing = false;
    let sourceColumns = [];
    let rowsData = [];

    console.log('Extracting data from init.sql...');
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
            rowsData.push(rowData);
        }
    }
    console.log(`Extracted ${rowsData.length} records.`);

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        console.log('Cleaning up existing mock data...');
        // We handle associations to mock data (1 and 2) by pointing them to 9999
        // This was already done in previous steps, but we'll ensure ID 1 and 2 are gone.
        await client.query('DELETE FROM facilities WHERE facility_id IN (1, 2)');

        console.log('Inserting real facility data...');
        for (const row of rowsData) {
            // GPS Conversion
            let gps = row['gps_coordinates'];
            if (gps && gps.startsWith('LatLng')) {
                gps = gps.replace('LatLng', '').trim();
            } else if (gps === '\\N' || !gps) {
                gps = null;
            }

            const query = `
                INSERT INTO public.facilities (
                    facility_id, facility_name, facility_code, type, 
                    is_functioning, gps_coordinates, province_id, 
                    district_id, created_at, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                ON CONFLICT (facility_id) DO UPDATE SET
                    facility_name = EXCLUDED.facility_name,
                    facility_code = EXCLUDED.facility_code,
                    type = EXCLUDED.type,
                    is_functioning = EXCLUDED.is_functioning,
                    gps_coordinates = EXCLUDED.gps_coordinates,
                    province_id = EXCLUDED.province_id,
                    district_id = EXCLUDED.district_id,
                    updated_at = EXCLUDED.updated_at
            `;

            const values = [
                row['facility_id'],
                row['facility_name'],
                row['facility_code'],
                row['type'],
                row['is_functioning'] === 't',
                gps,
                row['province_id'] === '\\N' ? null : parseInt(row['province_id']),
                row['district_id'] === '\\N' ? null : parseInt(row['district_id']),
                row['created_at'] === '\\N' ? new Date() : row['created_at'],
                row['updated_at'] === '\\N' ? new Date() : row['updated_at']
            ];

            await client.query(query, values);
        }

        await client.query('COMMIT');
        console.log('Restoration complete!');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Restoration failed:', err);
    } finally {
        client.release();
        process.exit(0);
    }
}

restore();
