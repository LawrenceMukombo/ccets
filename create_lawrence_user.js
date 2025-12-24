const bcrypt = require('bcryptjs');

async function createUser() {
    const password = 'S@mund3ng0';
    const hashedPassword = await bcrypt.hash(password, 10);

    console.log(`
INSERT INTO users (username, email, password_hash, first_name, last_name, phone, is_active, created_at, updated_at)
VALUES ('lawrence', 'lawrence@ndoh.gov.pg', '${hashedPassword}', 'Lawrence', 'Admin', '+675 123 4567', true, NOW(), NOW());
  `);
}

createUser();
