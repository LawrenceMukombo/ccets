const API_URL = process.env.API_URL || 'http://localhost:5050/api';

const runTests = async () => {
    console.log('Running verification tests...');

    try {
        // 1. Health Check (via Auth/Login)
        console.log('Testing Login...');
        const loginRes = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: process.env.TEST_EMAIL || 'admin@ccets.gov.pg',
                password: process.env.TEST_PASSWORD || 'Please_Set_TEST_PASSWORD_Env_Var'
            })
        });

        if (loginRes.ok) {
            const data = await loginRes.json();
            const token = data.token;
            console.log('✅ Login Successful');

            const headers = {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            };

            // 2. Facilities
            console.log('Testing Facilities List...');
            const facRes = await fetch(`${API_URL}/facilities`, { headers });
            const facData = await facRes.json();

            if (facRes.ok && Array.isArray(facData)) {
                console.log(`✅ Facilities Fetched (${facData.length} found)`);
            } else {
                console.error('❌ Facilities list failed');
            }

            // 3. Tickets
            console.log('Testing Ticket Creation...');
            if (facData.length > 0) {
                const facId = facData[0].facility_id || facData[0].facilityId; // Handle snake/camel

                const ticketRes = await fetch(`${API_URL}/tickets`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({
                        facilityId: facId,
                        priority: 'High',
                        description: 'Test Verification Ticket',
                        category: 'General'
                    })
                });

                if (ticketRes.ok) {
                    console.log('✅ Ticket Created');
                } else {
                    const err = await ticketRes.text();
                    console.error('❌ Ticket creation failed:', err);
                }
            } else {
                console.warn('⚠️ No facilities found, skipping ticket creation test.');
            }

            console.log('Tests Completed.');
        } else {
            console.error('❌ Login failed:', await loginRes.text());
        }

    } catch (error) {
        if (error.cause && error.cause.code === 'ECONNREFUSED') {
            console.error('❌ Connection refused. Is the backend running on port 5050?');
        } else {
            console.error('❌ Test failed:', error.message);
        }
    }
};

runTests();
