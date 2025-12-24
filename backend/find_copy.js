const fs = require('fs');
const readline = require('readline');

async function findCopyCommand() {
    const fileStream = fs.createReadStream('c:/ccets_png/init.sql');

    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    let lineNum = 0;
    for await (const line of rl) {
        lineNum++;
        if (line.includes('COPY') && line.includes('facilities') && !line.includes('VIEW')) {
            console.log(`Found COPY facilities at line ${lineNum}: ${line}`);
            // Read a few more lines to see what it looks like
            // break; 
        }
    }
}
findCopyCommand();
