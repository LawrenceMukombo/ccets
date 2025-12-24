const fs = require('fs');
const content = fs.readFileSync('populate_facilities.sql', 'utf8');
const lines = content.split(/\r?\n/);

const copyLine = lines.find(l => l.startsWith('COPY public.facilities'));
const columns = copyLine.match(/\((.*?)\)/)[1].split(',').map(s => s.trim());
console.log('Columns:', columns);
const nameIdx = columns.indexOf('facility_name');
const gpsIdx = columns.indexOf('gps_coordinates');
const latIdx = columns.indexOf('latitude');
const lonIdx = columns.indexOf('longitude');

console.log('Indices:', { nameIdx, gpsIdx, latIdx, lonIdx });

const boramLine = lines.find(l => l.includes('BORAM') && !l.includes('COPY'));
console.log('Raw Line:', boramLine);

if (boramLine) {
    const values = boramLine.split('\t');
    console.log('Values count:', values.length);
    console.log('Name:', values[nameIdx]);
    console.log('GPS:', values[gpsIdx]);
    console.log('Lat:', values[latIdx]);
    console.log('Lon:', values[lonIdx]);
}
