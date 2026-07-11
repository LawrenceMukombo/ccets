const express = require('express');
const router = express.Router({ mergeParams: true });
const fs = require('fs');
const path = require('path');

// Route to get boundaries for a tenant
router.get('/', async (req, res) => {
    try {
        const tenantCode = req.params.tenantCode.toLowerCase();
        const { level } = req.query; // 'province' or 'district'

        let filename = '';
        if (tenantCode === 'zambia' || tenantCode === 'zmb') {
            if (level === 'province') filename = 'zmb_provinces.json';
            else if (level === 'district') filename = 'zmb_districts.json';
        } else if (tenantCode === 'malawi' || tenantCode === 'mwi') {
            if (level === 'province') filename = 'mwi_provinces.json';
            else if (level === 'district') filename = 'mwi_districts.json';
        } else if (tenantCode === 'png') {
            // PNG boundaries might already be in the system or we can add them later
            // For now, if not found, return empty feature collection
            if (level === 'province') filename = 'png_provinces.json';
            else if (level === 'district') filename = 'png_districts.json';
        }

        if (!filename) {
            return res.json({ type: 'FeatureCollection', features: [] });
        }

        const filePath = path.join(__dirname, '..', 'data', filename);
        if (fs.existsSync(filePath)) {
            const data = fs.readFileSync(filePath, 'utf8');
            return res.json(JSON.parse(data));
        } else {
            console.warn(`Boundary file not found: ${filePath}`);
            return res.json({ type: 'FeatureCollection', features: [] });
        }
    } catch (error) {
        console.error('Error serving boundaries:', error);
        res.status(500).json({ message: 'Error fetching boundary data' });
    }
});

module.exports = router;
