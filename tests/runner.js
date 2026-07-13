const path = require('path');
const fs = require('fs');

// Load backend environment variables
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

const suites = {};

function registerSuite(name, testCases) {
    suites[name] = testCases;
}

const assert = {
    ok(val, message) {
        if (!val) {
            throw new Error(message || `Expected truthy but got ${val}`);
        }
    },
    equal(actual, expected, message) {
        if (actual !== expected) {
            throw new Error(message || `Expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`);
        }
    },
    throws: async (fn, expectedErrorMsg, message) => {
        try {
            await fn();
            throw new Error(message || 'Expected function to throw an error');
        } catch (err) {
            if (expectedErrorMsg && !err.message.includes(expectedErrorMsg)) {
                throw new Error(message || `Expected error message to contain "${expectedErrorMsg}" but got "${err.message}"`);
            }
        }
    }
};

async function run() {
    console.log('==================================================');
    console.log('🧪 CCETS AUTOMATED TEST RUNNER');
    console.log(`Time: ${new Date().toISOString()}`);
    console.log('==================================================\n');

    // Verify backend is listening
    console.log('🔍 Checking CCETS Backend connectivity...');
    const http = require('http');
    const backendOnline = await new Promise((resolve) => {
        const req = http.request('http://localhost:5050/api/platform/context', { method: 'GET', timeout: 2000 }, (res) => {
            resolve(true);
        });
        req.on('error', () => resolve(false));
        req.end();
    });

    if (!backendOnline) {
        console.error('❌ CCETS Express Backend is offline or not responding on http://localhost:5050');
        console.error('Please ensure the backend server is running before executing tests.');
        process.exit(1);
    }
    console.log('🟢 Backend is online!\n');

    // Load test suites dynamically
    const suiteFiles = ['regression.js', 'integration.js', 'offline.js'];
    for (const file of suiteFiles) {
        const filePath = path.join(__dirname, file);
        if (fs.existsSync(filePath)) {
            require(filePath);
        }
    }

    let totalTests = 0;
    let passedTests = 0;
    let failedTests = 0;

    const suiteNames = Object.keys(suites);
    for (const suiteName of suiteNames) {
        console.log(`📦 Suite: ${suiteName.toUpperCase()}`);
        console.log('--------------------------------------------------');
        
        const testCases = suites[suiteName];
        for (const [testName, testFn] of Object.entries(testCases)) {
            totalTests++;
            try {
                process.stdout.write(`👉 Running "${testName}"... `);
                await testFn(assert);
                passedTests++;
                console.log('✅ PASS');
            } catch (err) {
                failedTests++;
                console.log('❌ FAIL');
                console.error(`   Error: ${err.message}`);
                if (err.stack) {
                    console.error(err.stack.split('\n').slice(1, 4).map(line => `     ${line.trim()}`).join('\n'));
                }
            }
        }
        console.log();
    }

    console.log('==================================================');
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('==================================================');
    console.log(`Total:  ${totalTests}`);
    console.log(`Passed: ${passedTests} 🟢`);
    console.log(`Failed: ${failedTests} ${failedTests > 0 ? '🔴' : '🟢'}`);
    console.log('==================================================\n');

    if (failedTests > 0) {
        process.exit(1);
    } else {
        process.exit(0);
    }
}

module.exports = {
    registerSuite,
    run
};

if (require.main === module) {
    run().catch(err => {
        console.error('Fatal Runner Error:', err);
        process.exit(1);
    });
}
