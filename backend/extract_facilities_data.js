const fs = require('fs');
const readline = require('readline');

async function extract() {
    const fileStream = fs.createReadStream('c:/ccets_png/init.sql');

    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    const out = fs.createWriteStream('c:/ccets_png/backend/populate_facilities.sql');

    let processing = false;
    for await (const line of rl) {
        if (line.includes('COPY public.facilities')) {
            processing = true;
            out.write(line + '\n');
            console.log('Found start of facilities data');
            continue;
        }

        if (processing) {
            out.write(line + '\n');
            if (line.trim() === '\\.') {
                console.log('Found end of facilities data');
                processing = false;
                break;
            }
        }
    }
    out.end();
}
extract();
