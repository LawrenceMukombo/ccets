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

registerSuite('regression', {
    'Database Isolation and Direct Schema Queries': async (assert) => {
        // Query png users
        let pngUserCount = 0;
        await tenantStore.run({ schema_name: 'png' }, async () => {
            const res = await db.query('SELECT count(*)::integer FROM users');
            pngUserCount = res.rows[0].count;
            assert.ok(pngUserCount >= 0, 'Should be able to query users in PNG schema');
        });

        // Query zambia users
        let zambiaUserCount = 0;
        await tenantStore.run({ schema_name: 'zambia' }, async () => {
            const res = await db.query('SELECT count(*)::integer FROM users');
            zambiaUserCount = res.rows[0].count;
            assert.ok(zambiaUserCount >= 0, 'Should be able to query users in Zambia schema');
        });

        // Verify query leakage guard
        await assert.throws(async () => {
            // Attempt to query tenant table without a tenantStore context
            await db.query('SELECT * FROM users');
        }, 'Tenant isolation leak blocked', 'Should block table queries outside tenant store context');
    },

    'Authentication and Cross-Tenant JWT Block': async (assert) => {
        const testEmail = 'test_reg_user@ccets.com';
        const password = 'TestPassword123';
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);

        // Setup clean test users in both schemas
        await tenantStore.run({ schema_name: 'png' }, async () => {
            await db.query('DELETE FROM audit_trail WHERE user_id IN (SELECT user_id FROM users WHERE email = $1)', [testEmail]);
            await db.query('DELETE FROM users WHERE email = $1', [testEmail]);
            const roleRes = await db.query("SELECT role_id FROM roles WHERE role_name = 'Administrator'");
            assert.ok(roleRes.rows.length > 0, 'Should find role');
            await db.query(`
                INSERT INTO users (username, email, password_hash, role_id) 
                VALUES ('png_reg_test', $1, $2, $3)
            `, [testEmail, hash, roleRes.rows[0].role_id]);
        });

        await tenantStore.run({ schema_name: 'zambia' }, async () => {
            await db.query('DELETE FROM audit_trail WHERE user_id IN (SELECT user_id FROM users WHERE email = $1)', [testEmail]);
            await db.query('DELETE FROM users WHERE email = $1', [testEmail]);
            const roleRes = await db.query("SELECT role_id FROM roles WHERE role_name = 'Administrator'");
            await db.query(`
                INSERT INTO users (username, email, password_hash, role_id) 
                VALUES ('zambia_reg_test', $1, $2, $3)
            `, [testEmail, hash, roleRes.rows[0].role_id]);
        });

        try {
            // Test 1: Successful login on PNG
            const pngLogin = await makeRequest('POST', '/api/png/auth/login', {
                email: testEmail,
                password: password
            });
            assert.equal(pngLogin.status, 200, 'PNG login should succeed');
            assert.ok(pngLogin.body.token, 'PNG login should return a token');
            const pngToken = pngLogin.body.token;

            // Test 2: Accessing own tenant with own token should succeed
            const pngMe = await makeRequest('GET', '/api/png/auth/me', null, {
                'Authorization': `Bearer ${pngToken}`
            });
            assert.equal(pngMe.status, 200, 'PNG /auth/me should succeed with PNG token');

            // Test 3: Cross-tenant call (using PNG token to access Zambia URL) should return 403 Forbidden
            const crossTenantMe = await makeRequest('GET', '/api/zambia/auth/me', null, {
                'Authorization': `Bearer ${pngToken}`
            });
            assert.equal(crossTenantMe.status, 403, 'Cross-tenant request should be rejected with 403 Forbidden');

        } finally {
            // Cleanup test users
            await tenantStore.run({ schema_name: 'png' }, async () => {
                await db.query('DELETE FROM audit_trail WHERE user_id IN (SELECT user_id FROM users WHERE email = $1)', [testEmail]);
                await db.query('DELETE FROM users WHERE email = $1', [testEmail]);
            });
            await tenantStore.run({ schema_name: 'zambia' }, async () => {
                await db.query('DELETE FROM audit_trail WHERE user_id IN (SELECT user_id FROM users WHERE email = $1)', [testEmail]);
                await db.query('DELETE FROM users WHERE email = $1', [testEmail]);
            });
        }
    },

    'Geographic Location Query Filtering': async (assert) => {
        // Query Zambia facilities list with and without filters
        const testEmail = 'test_geofilter@ccets.com';
        const password = 'TestPassword123';
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);

        await tenantStore.run({ schema_name: 'zambia' }, async () => {
            await db.query('DELETE FROM audit_trail WHERE user_id IN (SELECT user_id FROM users WHERE email = $1)', [testEmail]);
            await db.query('DELETE FROM users WHERE email = $1', [testEmail]);
            const roleRes = await db.query("SELECT role_id FROM roles WHERE role_name = 'Administrator'");
            await db.query(`
                INSERT INTO users (username, email, password_hash, role_id) 
                VALUES ('zambia_geo_test', $1, $2, $3)
            `, [testEmail, hash, roleRes.rows[0].role_id]);
        });

        try {
            const login = await makeRequest('POST', '/api/zambia/auth/login', {
                email: testEmail,
                password: password
            });
            const token = login.body.token;

            // Query all facilities
            const allFac = await makeRequest('GET', '/api/zambia/facilities', null, {
                'Authorization': `Bearer ${token}`
            });
            assert.equal(allFac.status, 200, 'Getting facilities list should succeed');
            assert.ok(Array.isArray(allFac.body.facilities) || Array.isArray(allFac.body.data), 'Should return facilities array');

            const facList = allFac.body.facilities || allFac.body.data;
            // Find a province name that exists in returned list to filter by
            const firstFac = facList[0];
            if (firstFac && firstFac.province) {
                const provName = firstFac.province;
                const filteredFac = await makeRequest('GET', `/api/zambia/facilities?province=${encodeURIComponent(provName)}`, null, {
                    'Authorization': `Bearer ${token}`
                });
                assert.equal(filteredFac.status, 200, 'Filtering should succeed');
                const filteredList = filteredFac.body.facilities || filteredFac.body.data;
                assert.ok(filteredList.every(f => f.province === provName), 'All returned facilities should match the filter');
            }
        } finally {
            await tenantStore.run({ schema_name: 'zambia' }, async () => {
                await db.query('DELETE FROM audit_trail WHERE user_id IN (SELECT user_id FROM users WHERE email = $1)', [testEmail]);
                await db.query('DELETE FROM users WHERE email = $1', [testEmail]);
            });
        }
    }
});
