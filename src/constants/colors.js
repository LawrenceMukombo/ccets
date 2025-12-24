/**
 * Unified Color Palette for CCETS Platform
 * 
 * CONSISTENT TERMINOLOGY & COLORS ACROSS PLATFORM:
 * - New: Brand new ticket, not yet acted on
 * - Assigned: Assigned to a technician
 * - In Progress: Being actively worked on
 * - Pending Assignment: New ticket older than 12 hours (action required)
 * - Escalated: Critical attention needed
 * - Resolved: Issue fixed
 * - Closed: Ticket archived
 * - Reassigned: Transferred to different technician
 */

export const STATUS_COLORS = {
    'New': '#3b82f6',                    // Blue-500 (Brand new)
    'Assigned': '#8b5cf6',               // Violet-500 (Has owner)
    'In Progress': '#6366f1',            // Indigo-500 (Being worked on)
    'On Hold': '#f59e0b',                // Amber-500 (Paused)
    'Escalated': '#ef4444',              // Red-500 (Critical attention)
    'Resolved': '#10b981',               // Emerald-500 (Fixed)
    'Closed': '#64748b',                 // Slate-500 (Archived)
    'Reassigned': '#eab308'              // Yellow-500 (Transferred)
};

export const PRIORITY_COLORS = {
    'Critical': '#dc2626',               // Red-600
    'High': '#ea580c',                   // Orange-600
    'Medium': '#ca8a04',                 // Yellow-600
    'Low': '#16a34a'                     // Green-600
};

// Badge background and text colors for status badges
export const STATUS_BADGE_COLORS = {
    'New': { bg: '#dbeafe', text: '#1e3a8a' },                  // Blue
    'Assigned': { bg: '#f3e8ff', text: '#6b21a8' },             // Violet
    'In Progress': { bg: '#e0e7ff', text: '#3730a3' },          // Indigo
    'On Hold': { bg: '#fef3c7', text: '#92400e' },              // Amber
    'Escalated': { bg: '#fee2e2', text: '#991b1b' },            // Red
    'Resolved': { bg: '#d1fae5', text: '#065f46' },             // Emerald
    'Closed': { bg: '#e2e8f0', text: '#475569' },               // Slate
    'Reassigned': { bg: '#fef9c3', text: '#854d0e' }            // Yellow
};

// Badge colors for priority badges
export const PRIORITY_BADGE_COLORS = {
    'Critical': { bg: '#fee2e2', text: '#991b1b' },             // Red
    'High': { bg: '#ffedd5', text: '#9a3412' },                 // Orange
    'Medium': { bg: '#fef9c3', text: '#854d0e' },               // Yellow
    'Low': { bg: '#d1fae5', text: '#065f46' }                   // Green
};

// Semantic colors for different contexts
export const SEMANTIC_COLORS = {
    success: '#10b981',          // Emerald-500
    warning: '#f59e0b',          // Amber-500
    error: '#ef4444',            // Red-500
    info: '#3b82f6',             // Blue-500
    neutral: '#64748b'           // Slate-500
};

// Map marker colors (for consistency with statuses)
export const MAP_MARKER_COLORS = {
    new: '#3b82f6',                      // Blue (Brand new)
    assigned: '#8b5cf6',                 // Violet (Assigned)
    inProgress: '#6366f1',               // Indigo (In Progress)
    onHold: '#f59e0b',                   // Amber (Paused)
    escalated: '#ef4444',                // Red (Escalated)
    resolved: '#10b981',                 // Green (Resolved)
    closed: '#64748b',                   // Slate (Closed)
    noTickets: '#94a3b8'                 // Slate-400 (No data)
};

export default {
    STATUS_COLORS,
    PRIORITY_COLORS,
    STATUS_BADGE_COLORS,
    PRIORITY_BADGE_COLORS,
    SEMANTIC_COLORS,
    MAP_MARKER_COLORS
};
