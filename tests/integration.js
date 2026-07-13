const { registerSuite } = require('./runner');
const db = require('../backend/src/db');
const tenantStore = require('../backend/src/middleware/tenantStore');
const bcrypt = require('bcryptjs');
const http = require('http');

function makeRequest(method, urlPath, body = null, headers = {}) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 5050,
            path: urlPath,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            }
        };
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                let parsed = data;
                try {
                    parsed = JSON.parse(data);
                } catch (e) {}
                resolve({
                    status: res.statusCode,
                    headers: res.headers,
                    body: parsed
                });
            });
        });
        req.on('error', (err) => reject(err));
        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
}

registerSuite('integration', {
    'Integration Health Dashboard Endpoint': async (assert) => {
        // Authenticate as a user
        const testEmail = 'test_health@ccets.com';
        const password = 'TestPassword123';
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);

        await tenantStore.run({ schema_name: 'png' }, async () => {
            await db.query('DELETE FROM audit_trail WHERE user_id IN (SELECT user_id FROM users WHERE email = $1)', [testEmail]);
            await db.query('DELETE FROM users WHERE email = $1', [testEmail]);
            const roleRes = await db.query("SELECT role_id FROM roles WHERE role_name = 'Administrator'");
            await db.query(`
                INSERT INTO users (username, email, password_hash, role_id) 
                VALUES ('png_health_test', $1, $2, $3)
            `, [testEmail, hash, roleRes.rows[0].role_id]);
        });

        try {
            const login = await makeRequest('POST', '/api/png/auth/login', {
                email: testEmail,
                password: password
            });
            const token = login.body.token;

            // Call health metrics endpoint
            const healthRes = await makeRequest('GET', '/api/png/integration/health', null, {
                'Authorization': `Bearer ${token}`
            });
            assert.equal(healthRes.status, 200, 'Integration health check should respond with 200 OK');
            const h = healthRes.body.health;
            assert.ok(h, 'Should return health object');
            assert.ok(h.runs && h.runs.successRate !== undefined, 'Should include successRate');
            assert.ok(h.connectors && h.connectors.active !== undefined, 'Should include activeConnectors');
            assert.ok(h.submissions && h.submissions.pending !== undefined, 'Should include backlogQueue');
            assert.ok(Array.isArray(h.recentRuns), 'Should include recentRuns array');
            assert.ok(Array.isArray(h.errorDistribution), 'Should include errorDistribution array');

        } finally {
            await tenantStore.run({ schema_name: 'png' }, async () => {
                await db.query('DELETE FROM audit_trail WHERE user_id IN (SELECT user_id FROM users WHERE email = $1)', [testEmail]);
                await db.query('DELETE FROM users WHERE email = $1', [testEmail]);
            });
        }
    },

    'Express Custom Memory Rate Limiting': async (assert) => {
        // Make 15 consecutive requests to the auth login endpoint
        const attempts = [];
        for (let i = 0; i < 12; i++) {
            const res = await makeRequest('POST', '/api/png/auth/login', {
                email: 'non_existent_rate_limit_user@ccets.com',
                password: 'WrongPassword'
            });
            attempts.push(res.status);
        }

        // The first 10 requests should fail with 401 Unauthorized (invalid credentials)
        // The 11th and 12th requests must fail with 429 Too Many Requests (rate limited)
        const rateLimitedCount = attempts.filter(s => s === 429).length;
        assert.ok(rateLimitedCount >= 1, `Expected at least one request to be rate limited (429), but attempts resulted in: ${attempts.join(', ')}`);
    },

    'ODK/Kobo Webhook Submission Ingestion': async (assert) => {
        // Submit simulated form data to the ODK webhook endpoint
        const koboId = `kobo_test_suite_${Date.now()}`;
        const submissionPayload = {
            '_id': koboId,
            'facility_id': 1,
            'equipment_id': 2,
            'fault_description': 'Compressor is leaking fluid in the main vaccine fridge'
        };

        const postWebhook = await makeRequest('POST', '/api/png/hooks/kobo/submission', submissionPayload);
        assert.ok(postWebhook.status === 200 || postWebhook.status === 201, 'ODK webhook submission should succeed');

        // Check database to ensure submission got recorded in the staging table
        await tenantStore.run({ schema_name: 'png' }, async () => {
            const checkDb = await db.query('SELECT * FROM staging_odk_submissions WHERE kobo_id = $1', [koboId]);
            assert.equal(checkDb.rows.length, 1, 'Simulated ODK submission should exist in staging_odk_submissions table');
            assert.equal(checkDb.rows[0].status, 'pending', 'Staging status should be pending initially');
            
            // Clean up staging submission
            await db.query('DELETE FROM staging_odk_submissions WHERE kobo_id = $1', [koboId]);
        });
    }
});
