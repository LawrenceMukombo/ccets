const fs = require('fs');
const content = fs.readFileSync('insert_facilities.sql', 'utf8');

// Extract columns
const colMatch = content.match(/INSERT INTO public.facilities \((.*?)\)/);
if (!colMatch) {
    console.log('No INSERT found');
    process.exit(1);
}
const columns = colMatch[1].split(',').map(s => s.trim());
console.log('Columns:', columns);
const gpsIdx = columns.indexOf('gps_coordinates');
const latIdx = columns.indexOf('latitude'); // Might not exist
const lonIdx = columns.indexOf('longitude'); // Might not exist
const nameIdx = columns.indexOf('facility_name');

console.log('Indices:', { nameIdx, gpsIdx, latIdx, lonIdx });

// Find BORAM
const lines = content.split(/\r?\n/);
const boramLine = lines.find(l => l.includes("'AMBOIN'"));

if (boramLine) {
    // Basic CSV parse (careful with quoted strings containing commas)
    // VALUES ('v1', 'v2', ...)
    const valStr = boramLine.match(/VALUES \((.*)\);/)[1];

    // Split by ', ' might be safe enough for this specific file if no text contains that sequence
    // Better: regex for 'value' or value
    const values = valStr.split(/,\s*(?=(?:[^']*'[^']*')*[^']*$)/).map(v => v.replace(/^'|'$/g, ''));

    console.log('BORAM GPS:', values[gpsIdx]);
}
