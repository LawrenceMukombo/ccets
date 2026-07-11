const db = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { logAudit } = require('../services/auditService');

exports.login = async (req, res) => {
    const { email, username, password } = req.body;
    const loginIdentifier = email || username;

    if (!loginIdentifier || !password) {
        return res.status(400).json({ message: 'Username/Email and password are required' });
    }

    try {
        // 1. Fetch user by Email OR Username
        const userResult = await db.query(
            'SELECT * FROM users WHERE email = $1 OR username = $1',
            [loginIdentifier]
        );

        if (userResult.rows.length === 0) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const user = userResult.rows[0];

        // Check if user is active
        if (!user.is_active) {
            return res.status(401).json({ message: 'Account is inactive' });
        }

        // 2. Validate Password
        // Try bcrypt first (for users created with bcrypt like our admin user)
        let isPasswordValid = false;

        try {
            isPasswordValid = await bcrypt.compare(password, user.password_hash);
        } catch (bcryptError) {
            // If bcrypt fails, try pgcrypto (for legacy users)
            const passwordMatchResult = await db.query(
                `SELECT (password_hash = crypt($1, password_hash)) AS match FROM users WHERE user_id = $2`,
                [password, user.user_id]
            );
            isPasswordValid = passwordMatchResult.rows[0]?.match || false;
        }

        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        if (!process.env.JWT_SECRET) {
            throw new Error('JWT_SECRET environment variable is not defined');
        }

        // 3. Generate JWT
        const token = jwt.sign(
            {
                userId: user.user_id,
                roleId: user.role_id,
                regionId: user.assigned_region_id,
                provinceId: user.assigned_province_id,
                isNationalAccess: user.is_national_access,
                tenant_code: req.tenant.code,
                tenant_id: req.tenant.id
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        // 4. Update last login
        await db.query(
            'UPDATE users SET last_login = NOW() WHERE user_id = $1',
            [user.user_id]
        );

        // Notify user
        try {
            const { sendNotification } = require('../services/notificationService');
            sendNotification(req.app, {
                userId: user.user_id,
                ticketId: null,
                type: 'login',
                message: `New login detected at ${new Date().toLocaleString()}`
            });
        } catch (e) {
            console.error('Login notification failed:', e);
        }

        // Audit Log
        try {
            await logAudit(
                user.user_id,
                'Login',
                'User',
                user.user_id,
                'User logged in successfully',
                req
            );
        } catch (auditErr) {
            console.error('Audit log CRASHED:', auditErr);
        }

        // 5. Return User Data + Token
        res.json({
            token,
            user: {
                id: user.user_id,
                user_id: user.user_id,
                username: user.username,
                email: user.email,
                first_name: user.first_name,
                last_name: user.last_name,
                roleId: user.role_id,
                is_national_access: user.is_national_access
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error during login' });
    }
};

// Get current user details (for /api/auth/me)
exports.getCurrentUser = async (req, res) => {
    try {
        console.log('getCurrentUser called, req.user:', req.user);

        const userId = req.user?.user_id || req.user?.userId;

        if (!userId) {
            console.error('No userId found in token');
            return res.status(401).json({ message: 'User not authenticated' });
        }

        console.log('Fetching user with ID:', userId);

        // Fetch user with role information and location
        const userResult = await db.query(`
            SELECT 
                u.user_id,
                u.username,
                u.email,
                u.first_name,
                u.last_name,
                u.is_national_access,
                u.last_login,
                u.phone_number,
                u.is_active,
                u.assigned_region_id,
                u.assigned_province_id,
                u.assigned_district_id,
                u.assigned_facility_id,
                r.role_id,
                r.role_name,
                reg.region_name
            FROM users u
            LEFT JOIN roles r ON u.role_id = r.role_id
            LEFT JOIN regions reg ON u.assigned_region_id = reg.region_id
            WHERE u.user_id = $1
        `, [userId]);

        if (userResult.rows.length === 0) {
            console.error('User not found for ID:', userId);
            return res.status(404).json({ message: 'User not found' });
        }

        const user = userResult.rows[0];

        // Fetch permissions
        const permResult = await db.query(`
            SELECT p.permission_name
            FROM role_permissions rp
            JOIN permissions p ON rp.permission_id = p.permission_id
            WHERE rp.role_id = $1
        `, [user.role_id]);
        const permissions = permResult.rows.map(r => r.permission_name);

        // If user has regional access (region but no specific province), get all provinces in that region
        let provinces = [];
        if (user.assigned_region_id && !user.assigned_province_id) {
            const provinceResult = await db.query(`
                SELECT province_name 
                FROM provinces 
                WHERE region_id = $1 
                ORDER BY province_name
            `, [user.assigned_region_id]);
            provinces = provinceResult.rows.map(p => p.province_name);
        } else if (user.assigned_province_id) {
            // Single province
            const provinceResult = await db.query(`
                SELECT province_name 
                FROM provinces 
                WHERE province_id = $1
            `, [user.assigned_province_id]);
            if (provinceResult.rows.length > 0) {
                provinces = [provinceResult.rows[0].province_name];
            }
        }

        // Build location string with region and all provinces
        let location = 'National';
        if (user.region_name) {
            if (provinces.length > 0) {
                location = `${user.region_name}: ${provinces.join(', ')}`;
            } else {
                location = user.region_name;
            }
        } else if (provinces.length > 0) {
            location = provinces.join(', ');
        }

        res.json({
            id: user.user_id,
            user_id: user.user_id,
            username: user.username,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            is_national_access: user.is_national_access,
            last_login: user.last_login,
            phone_number: user.phone_number,
            ip_address: req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress,
            role_name: user.role_name,
            is_active: user.is_active,
            location: location,
            permissions: permissions, // Added permissions
            region_name: user.region_name,
            provinces: provinces  // Array of province names
        });

    } catch (error) {
        console.error('Get current user error:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({ message: 'Server error fetching user details', error: error.message });
    }
};

exports.updateProfile = async (req, res) => {
    try {
        const userId = req.user?.user_id || req.user?.userId;
        const { first_name, last_name, email, phone_number } = req.body;

        if (!userId) {
            return res.status(401).json({ message: 'User not authenticated' });
        }

        const result = await db.query(`
            UPDATE users 
            SET first_name = $1, 
                last_name = $2, 
                email = $3, 
                phone_number = $4,
                updated_at = NOW()
            WHERE user_id = $5
            RETURNING user_id, username, email, first_name, last_name, phone_number
        `, [first_name, last_name, email, phone_number, userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        const updatedUser = result.rows[0];

        // Audit Log
        await logAudit(userId, 'Update', 'User', userId, 'User updated their own profile', req);

        res.json({
            success: true,
            message: 'Profile updated successfully',
            user: updatedUser
        });

    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ message: 'Server error updating profile', error: error.message });
    }
};

exports.changePassword = async (req, res) => {
    try {
        const userId = req.user?.user_id || req.user?.userId;
        const { currentPassword, newPassword } = req.body;

        if (!userId) {
            return res.status(401).json({ message: 'User not authenticated' });
        }

        // 1. Fetch user to verify current password
        const userResult = await db.query('SELECT password_hash FROM users WHERE user_id = $1', [userId]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        const user = userResult.rows[0];

        // 2. Verify current password
        const isPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
        if (!isPasswordValid) {
            return res.status(401).json({ success: false, message: 'Invalid current password' });
        }

        // 3. Hash new password
        const newPasswordHash = await bcrypt.hash(newPassword, 10);

        // 4. Update password
        await db.query(`
            UPDATE users 
            SET password_hash = $1, 
                must_change_password = false,
                updated_at = NOW()
            WHERE user_id = $2
        `, [newPasswordHash, userId]);

        // Audit Log
        await logAudit(userId, 'ChangePassword', 'User', userId, 'User changed their own password', req);

        res.json({
            success: true,
            message: 'Password changed successfully'
        });

    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ message: 'Server error changing password', error: error.message });
    }
};
