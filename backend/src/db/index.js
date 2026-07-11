const { Pool } = require('pg');

// Check for required environment variables
const requiredEnvVars = ['DB_USER', 'DB_PASSWORD', 'DB_HOST', 'DB_NAME'];
const missingEnvVars = requiredEnvVars.filter(key => !process.env[key]);

if (missingEnvVars.length > 0) {
    console.error(`CRITICAL ERROR: Missing required environment variables: ${missingEnvVars.join(', ')}`);
    process.exit(1);
}

const poolConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME,
};

// Add SSL configuration if enabled (common for production)
if (process.env.DB_SSL === 'true') {
    poolConfig.ssl = {
        rejectUnauthorized: false // Adjust this based on your specific certificate needs
    };
}

const pool = new Pool(poolConfig);

// Test connection
pool.on('error', (err, client) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});

const tenantStore = require('../middleware/tenantStore');

module.exports = {
    query: async (text, params) => {
        const client = await pool.connect();
        try {
            const tenant = tenantStore.getStore();
            const schema = tenant && tenant.schema_name ? tenant.schema_name : 'public';
            
            // Set search path for this client transaction
            await client.query(`SET search_path TO "${schema}", public`);
            
            // Execute the actual query
            return await client.query(text, params);
        } catch (error) {
            console.error('Database Query Error:', error.message);
            console.error('Query:', text);
            console.error('Params:', params);
            throw error;
        } finally {
            // Restore default to prevent leaks (though releasing to pool usually resets, it is safer)
            await client.query(`SET search_path TO public`);
            client.release();
        }
    },
    pool,
};
