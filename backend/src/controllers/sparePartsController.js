const db = require('../db');

// Get all spare parts organized by category
const getSpareParts = async (req, res) => {
    try {
        console.log('📋 Fetching spare parts from public.spareparts...');

        // Query the spareparts table
        const result = await db.query(`
            SELECT * FROM spareparts 
            WHERE is_active = true 
            ORDER BY category, sparepart_name
        `);

        console.log(`✅ Found ${result.rows.length} spare parts`);

        // Group by category
        const categories = {};
        result.rows.forEach(part => {
            const cat = part.category || 'Other';
            if (!categories[cat]) {
                categories[cat] = [];
            }
            categories[cat].push(part);
        });

        res.json({
            success: true,
            parts: result.rows,
            categories: categories
        });
    } catch (error) {
        console.error('❌ Error fetching spare parts:', error.message);
        console.error('Full error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch spare parts',
            error: error.message
        });
    }
};

// Get spare parts by category
const getSparePartsByCategory = async (req, res) => {
    const { category } = req.params;

    try {
        const result = await db.query(
            'SELECT * FROM spareparts WHERE is_active = true AND category = $1 ORDER BY sparepart_name',
            [category]
        );

        res.json({
            success: true,
            parts: result.rows
        });
    } catch (error) {
        console.error('Error fetching spare parts by category:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch spare parts',
            error: error.message
        });
    }
};

module.exports = {
    getSpareParts,
    getSparePartsByCategory
};
