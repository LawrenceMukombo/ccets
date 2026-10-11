/**
 * Validation Utility for CCETS Platform
 * Enterprise-grade validation routines for:
 * - Password strength & complexity
 * - Email addresses (RFC-compliant)
 * - Phone numbers (ITU-T E.164 compatible)
 * - Dates & Events (Past / Future checks, format)
 * - Date ranges (Start/End coherence)
 * - Numerical and Year values
 * - Usernames & Text fields
 */

/**
 * Validates password strength and returns individual rule checks and scoring.
 * Enforces:
 * - Min 8 characters
 * - Uppercase letter
 * - Lowercase letter
 * - Number
 * - Special character
 */
export const validatePassword = (password = '') => {
    const str = String(password || '');
    const minLength = str.length >= 8;
    const hasLower = /[a-z]/.test(str);
    const hasUpper = /[A-Z]/.test(str);
    const hasNumber = /[0-9]/.test(str);
    const hasSpecial = /[^A-Za-z0-9]/.test(str);

    let score = 0;
    if (minLength) score++;
    if (hasLower && hasUpper) score++;
    if (hasNumber) score++;
    if (hasSpecial) score++;

    let label = 'Weak';
    let color = '#ef4444'; // Red
    let percent = 25;

    if (str.length === 0) {
        label = 'None';
        color = '#cbd5e1';
        percent = 0;
    } else if (score <= 1) {
        label = 'Weak';
        color = '#ef4444';
        percent = 25;
    } else if (score === 2) {
        label = 'Fair';
        color = '#f97316'; // Orange
        percent = 50;
    } else if (score === 3) {
        label = 'Good';
        color = '#eab308'; // Amber
        percent = 75;
    } else if (score === 4) {
        label = 'Strong';
        color = '#10b981'; // Green
        percent = 100;
    }

    const isValid = minLength && hasLower && hasUpper && hasNumber && hasSpecial;
    let message = '';
    if (!isValid) {
        if (!minLength) message = 'Password must be at least 8 characters long.';
        else if (!hasLower || !hasUpper) message = 'Include both uppercase and lowercase letters.';
        else if (!hasNumber) message = 'Include at least one number (0-9).';
        else if (!hasSpecial) message = 'Include at least one special character (!@#$%^&*...).';
    }

    return {
        isValid,
        score,
        percent,
        label,
        color,
        rules: {
            minLength,
            hasLower,
            hasUpper,
            hasNumber,
            hasSpecial
        },
        message
    };
};

/**
 * Validates an email address.
 */
export const validateEmail = (email = '') => {
    const str = String(email || '').trim();
    if (!str) return { isValid: false, message: 'Email address is required.' };
    
    // Comprehensive RFC-compatible email regex
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
    const isValid = emailRegex.test(str);
    return {
        isValid,
        message: isValid ? '' : 'Please enter a valid email address (e.g. user@domain.com).'
    };
};

/**
 * Validates phone numbers supporting national and international formats (+260..., +675..., local digits).
 */
export const validatePhoneNumber = (phone = '') => {
    const str = String(phone || '').trim();
    if (!str) return { isValid: false, message: 'Phone number is required.' };
    
    // Format check: optional leading '+', allowed characters: digits, spaces, hyphens, parentheses
    const formatRegex = /^\+?[0-9\s\-()]{7,20}$/;
    if (!formatRegex.test(str)) {
        return { isValid: false, message: 'Phone number can only contain digits, spaces, dashes, or a leading +.' };
    }
    
    // Count raw digits (E.164 recommendation: min 7, max 15 digits)
    const digitsOnly = str.replace(/\D/g, '');
    if (digitsOnly.length < 7 || digitsOnly.length > 15) {
        return { isValid: false, message: 'Phone number must contain between 7 and 15 digits.' };
    }
    
    return { isValid: true, message: '' };
};

/**
 * Validates dates and event occurrences.
 */
export const validateDate = (dateVal, { allowFuture = true, label = 'Date' } = {}) => {
    if (!dateVal) return { isValid: false, message: `${label} is required.` };
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return { isValid: false, message: `Invalid ${label} format.` };

    if (!allowFuture) {
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        if (d > today) {
            return { isValid: false, message: `${label} cannot be in the future.` };
        }
    }
    return { isValid: true, message: '' };
};

/**
 * Validates date ranges (e.g. startDate <= endDate).
 */
export const validateDateRange = (startDate, endDate) => {
    if (!startDate && !endDate) return { isValid: true, message: '' };
    if (startDate && isNaN(new Date(startDate).getTime())) {
        return { isValid: false, message: 'Invalid start date format.' };
    }
    if (endDate && isNaN(new Date(endDate).getTime())) {
        return { isValid: false, message: 'Invalid end date format.' };
    }
    if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (start > end) {
            return { isValid: false, message: 'Start date cannot be after end date.' };
        }
    }
    return { isValid: true, message: '' };
};

/**
 * Validates year input.
 */
export const validateYear = (yearVal, { min = 1970, max = new Date().getFullYear() + 1, label = 'Year' } = {}) => {
    if (!yearVal) return { isValid: false, message: `${label} is required.` };
    const y = parseInt(yearVal, 10);
    if (isNaN(y) || y < min || y > max) {
        return { isValid: false, message: `${label} must be a valid year between ${min} and ${max}.` };
    }
    return { isValid: true, message: '' };
};

/**
 * Validates username (alphanumeric, dots, dashes, underscores, min 3 chars).
 */
export const validateUsername = (username = '') => {
    const str = String(username || '').trim();
    if (!str) return { isValid: false, message: 'Username is required.' };
    if (str.length < 3 || str.length > 50) {
        return { isValid: false, message: 'Username must be between 3 and 50 characters.' };
    }
    if (!/^[a-zA-Z0-9._-]+$/.test(str)) {
        return { isValid: false, message: 'Username can only contain letters, numbers, dots, dashes, or underscores.' };
    }
    return { isValid: true, message: '' };
};
