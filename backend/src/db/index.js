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
    console.error('Unexpected error on idle client:', err.message);
});

const tenantStore = require('../middleware/tenantStore');

module.exports = {
    query: async (text, params) => {
        const client = await pool.connect();
        try {
            const tenant = tenantStore.getStore();
            const schema = tenant && tenant.schema_name ? tenant.schema_name : 'public';
            
            // Tenant isolation safety guard
            if (schema === 'public') {
                const tenantTables = [
                    'facilities', 'equipment', 'tickets', 'users', 'roles', 'groups', 
                    'permissions', 'audit_trail', 'ticket_activity_log', 'spare_parts', 
                    'faults', 'notifications', 'connector_registry', 'integration_sync_runs', 
                    'integration_sync_logs', 'staging_odk_submissions', 'staging_facilities', 
                    'staging_equipment'
                ];
                const queryLower = text.toLowerCase();
                const hasTenantTable = tenantTables.some(table => 
                    new RegExp(`\\b${table}\\b`).test(queryLower)
                );
                if (hasTenantTable) {
                    throw new Error('Tenant isolation leak blocked: Attempted to query tenant-specific table outside active tenant context');
                }
            }

            // Set search path for this client transaction
            await client.query(`SET search_path TO "${schema}", public`);

            // Set PostgreSQL session app.user_id for RLS policies, audit triggers, and stored procedures
            const rawUserId = tenant && (tenant.userId || tenant.user_id);
            const safeUserId = rawUserId ? String(rawUserId).replace(/[^0-9]/g, '') : '1';
            await client.query(`SELECT set_config('app.user_id', $1, false)`, [safeUserId || '1']);
            
            // Execute the actual query
            return await client.query(text, params);
        } catch (error) {
            console.error('Database Query Error:', error.message);
            console.error('Query:', text);
            console.error('Params:', params);
            throw error;
        } finally {
            // Restore default to prevent leaks (though releasing to pool usually resets, it is safer)
            await client.query(`SET search_path TO public; SELECT set_config('app.user_id', '', false)`).catch(() => {});
            client.release();
        }
    },
    pool,
};
