/**
 * Shared utility functions for status management and data processing
 */

/**
 * Returns a standardized status name.
 * 'Pending Assignment' is mapped to 'New'.
 */
export const getEffectiveStatus = (ticket) => {
    if (!ticket) return 'Unknown';
    const s = ticket.status || ticket.ticket_status;
    return s === 'Pending Assignment' ? 'New' : s;
};

/**
 * Returns the ISO week number for a given date.
 */
export const getWeekNumber = (d) => {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return weekNo;
};
