const db = require('../db');

// Helper to determine category for a part
const determineCategory = (part) => {
    if (part.category && String(part.category).trim()) {
        return String(part.category).trim();
    }
    const text = `${part.sparepart_name || ''} ${part.description || ''}`.toLowerCase();
    if (text.includes('compressor') || text.includes('gas') || text.includes('refrigerant') || text.includes('condenser') || text.includes('evaporator')) {
        return 'Refrigeration';
    }
    if (text.includes('solar') || text.includes('panel') || text.includes('inverter') || text.includes('charge controller')) {
        return 'Solar Power';
    }
    if (text.includes('battery') || text.includes('power') || text.includes('cable') || text.includes('wire') || text.includes('fuse') || text.includes('switch')) {
        return 'Electrical';
    }
    if (text.includes('sensor') || text.includes('thermostat') || text.includes('display') || text.includes('thermometer') || text.includes('controller') || text.includes('board')) {
        return 'Controls & Sensors';
    }
    if (text.includes('door') || text.includes('gasket') || text.includes('seal') || text.includes('handle') || text.includes('hinge') || text.includes('lock')) {
        return 'Hardware & Seals';
    }
    return 'General';
};

// Get all spare parts organized by category
const getSpareParts = async (req, res) => {
    try {
        console.log('📋 Fetching spare parts...');

        let result;
        try {
            // First try querying without assuming category column exists
            result = await db.query(`
                SELECT * FROM spareparts 
                WHERE is_active = true 
                ORDER BY sparepart_name ASC
            `);
        } catch (queryErr) {
            console.warn('Initial spareparts query failed, trying public.spareparts fallback:', queryErr.message);
            result = await db.query(`
                SELECT * FROM public.spareparts 
                WHERE is_active = true 
                ORDER BY sparepart_name ASC
            `);
        }

        console.log(`✅ Found ${result.rows.length} spare parts`);

        // Group by category
        const categories = {};
        const enrichedParts = result.rows.map(part => {
            const cat = determineCategory(part);
            const enrichedPart = {
                ...part,
                category: cat
            };

            if (!categories[cat]) {
                categories[cat] = [];
            }
            categories[cat].push(enrichedPart);
            return enrichedPart;
        });

        res.json({
            success: true,
            parts: enrichedParts,
            categories: categories
        });
    } catch (error) {
        console.error('❌ Error fetching spare parts:', error.message);
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
        let result;
        try {
            result = await db.query(
                'SELECT * FROM spareparts WHERE is_active = true ORDER BY sparepart_name ASC'
            );
        } catch (err) {
            result = await db.query(
                'SELECT * FROM public.spareparts WHERE is_active = true ORDER BY sparepart_name ASC'
            );
        }

        const filteredParts = result.rows
            .map(p => ({ ...p, category: determineCategory(p) }))
            .filter(p => !category || category.toLowerCase() === 'all' || p.category.toLowerCase() === category.toLowerCase());

        res.json({
            success: true,
            parts: filteredParts
        });
    } catch (error) {
        console.error('Error fetching spare parts by category:', error.message);
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

