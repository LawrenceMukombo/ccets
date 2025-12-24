const bcrypt = require('bcryptjs');
const { Client } = require('pg');

async function createAdminUser() {
    const client = new Client({
        host: 'localhost',
        port: 5432,
        database: 'png_ccets',
        user: 'postgres',
        password: 'postgres123'
    });

    try {
        await client.connect();
        console.log('Connected to database');

        // Admin user details
        const username = 'admin';
        const password = 'Admin@2024';
        const email = 'admin@ccets.pg';
        const firstName = 'System';
        const lastName = 'Administrator';
        const phoneNumber = '+675 7000 0000';
        const role = 'national_admin';

        // Hash the password
        const passwordHash = await bcrypt.hash(password, 10);

        // Check if user already exists
        const checkQuery = 'SELECT user_id FROM users WHERE username = $1';
        const checkResult = await client.query(checkQuery, [username]);

        if (checkResult.rows.length > 0) {
            console.log('Admin user already exists. Updating password...');

            const updateQuery = `
        UPDATE users 
        SET password_hash = $1, 
            email = $2,
            first_name = $3,
            last_name = $4,
            phone_number = $5,
            role = $6,
            is_active = true,
            updated_at = NOW()
        WHERE username = $7
        RETURNING user_id, username, email, role
      `;

            const result = await client.query(updateQuery, [
                passwordHash,
                email,
                firstName,
                lastName,
                phoneNumber,
                role,
                username
            ]);

            console.log('\n✅ Admin user updated successfully!');
            console.log('User details:', result.rows[0]);
        } else {
            console.log('Creating new admin user...');

            const insertQuery = `
        INSERT INTO users (
          username, 
          password_hash, 
          email, 
          first_name, 
          last_name, 
          phone_number, 
          role,
          is_active,
          is_national_access,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, true, true, NOW(), NOW())
        RETURNING user_id, username, email, role
      `;

            const result = await client.query(insertQuery, [
                username,
                passwordHash,
                email,
                firstName,
                lastName,
                phoneNumber,
                role
            ]);

            console.log('\n✅ Admin user created successfully!');
            console.log('User details:', result.rows[0]);
        }

        console.log('\n📋 LOGIN CREDENTIALS:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('Username: admin');
        console.log('Password: Admin@2024');
        console.log('Role:     National Administrator');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    } catch (error) {
        console.error('Error creating admin user:', error);
        throw error;
    } finally {
        await client.end();
        console.log('Database connection closed');
    }
}

createAdminUser()
    .then(() => {
        console.log('Script completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Script failed:', error);
        process.exit(1);
    });
