const express = require('express');
const router = express.Router({ mergeParams: true });
const fs = require('fs');
const path = require('path');
const auth = require('../middleware/auth');
const shapefile = require('shapefile');

const DATA_DIR = path.join(__dirname, '..', 'data');
const UPLOAD_DIR = path.join(DATA_DIR, 'boundaries');

const adminOnly = (req, res, next) => {
    if (req.user && (req.user.roleId === 1 || req.user.role === 'Admin' || req.user.role === 'SuperAdmin' || req.user.role_name === 'Administrator' || req.user.role_name === 'National Manager' || req.user.is_admin)) {
        next();
    } else {
        res.status(403).json({ success: false, message: 'Access denied. Administrator or Manager role required.' });
    }
};

const normalizePart = (value) => String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');

const emptyFeatureCollection = () => ({ type: 'FeatureCollection', features: [] });

const getUploadedBoundaryPath = (tenantCode, level) => {
    const safeTenant = normalizePart(tenantCode);
    const safeLevel = normalizePart(level);
    return path.join(UPLOAD_DIR, `${safeTenant}_${safeLevel}.json`);
};

const getBundledBoundaryFile = (tenantCode, level) => {
    const code = normalizePart(tenantCode);
    const normalizedLevel = normalizePart(level);

    if (code === 'zambia' || code === 'zmb') {
        if (normalizedLevel === 'province') return 'zmb_provinces.json';
        if (normalizedLevel === 'district') return 'zmb_districts.json';
    } else if (code === 'malawi' || code === 'mwi') {
        if (normalizedLevel === 'province') return 'mwi_provinces.json';
        if (normalizedLevel === 'district') return 'mwi_districts.json';
    } else if (code === 'png') {
        if (normalizedLevel === 'province') return 'png_provinces.json';
        if (normalizedLevel === 'district') return 'png_districts.json';
    }

    return '';
};

const getFileByExtension = (files = [], extension) => files.find(file => String(file.name || '').toLowerCase().endsWith(extension));

const decodeUploadFile = (file) => Buffer.from(String(file.content || ''), 'base64');

const boundaryFilesToGeoJson = async (files = []) => {
    const geoJsonFile = files.find(file => /\.(geojson|json)$/i.test(file.name || ''));
    if (geoJsonFile) {
        return JSON.parse(decodeUploadFile(geoJsonFile).toString('utf8'));
    }

    const shpFile = getFileByExtension(files, '.shp');
    if (!shpFile) {
        throw new Error('Upload a GeoJSON file or select the .shp component of the shapefile.');
    }

    const dbfFile = getFileByExtension(files, '.dbf');
    return shapefile.read(decodeUploadFile(shpFile), dbfFile ? decodeUploadFile(dbfFile) : undefined);
};

const validateGeoJson = (geojson) => {
    if (!geojson || geojson.type !== 'FeatureCollection' || !Array.isArray(geojson.features)) {
        return 'Boundary file must be a GeoJSON FeatureCollection.';
    }

    const invalidFeature = geojson.features.find(feature => !feature || feature.type !== 'Feature' || !feature.geometry);
    if (invalidFeature) {
        return 'Every GeoJSON item must be a Feature with geometry.';
    }

    return null;
};

// Route to get boundaries for a tenant
router.get('/', async (req, res) => {
    try {
        const tenantCode = req.params.tenantCode;
        const { level } = req.query;

        if (!level) {
            return res.status(400).json({ message: 'Boundary level is required.' });
        }

        const uploadedPath = getUploadedBoundaryPath(tenantCode, level);
        if (fs.existsSync(uploadedPath)) {
            const data = fs.readFileSync(uploadedPath, 'utf8');
            return res.json(JSON.parse(data));
        }

        const filename = getBundledBoundaryFile(tenantCode, level);
        if (!filename) {
            return res.json(emptyFeatureCollection());
        }

        const filePath = path.join(DATA_DIR, filename);
        if (fs.existsSync(filePath)) {
            const data = fs.readFileSync(filePath, 'utf8');
            return res.json(JSON.parse(data));
        }

        console.warn(`Boundary file not found: ${filePath}`);
        return res.json(emptyFeatureCollection());
    } catch (error) {
        console.error('Error serving boundaries:', error);
        res.status(500).json({ message: 'Error fetching boundary data' });
    }
});

// Upload or replace a GeoJSON boundary layer for the current tenant.
router.post('/upload', auth, adminOnly, async (req, res) => {
    try {
        const tenantCode = req.params.tenantCode;
        const { level, geojson, files } = req.body;
        const normalizedLevel = normalizePart(level);

        if (!normalizedLevel) {
            return res.status(400).json({ success: false, message: 'Boundary level is required.' });
        }

        const boundaryGeoJson = geojson || await boundaryFilesToGeoJson(files);
        const validationError = validateGeoJson(boundaryGeoJson);
        if (validationError) {
            return res.status(400).json({ success: false, message: validationError });
        }

        fs.mkdirSync(UPLOAD_DIR, { recursive: true });
        const filePath = getUploadedBoundaryPath(tenantCode, normalizedLevel);
        fs.writeFileSync(filePath, JSON.stringify(boundaryGeoJson), 'utf8');

        res.json({
            success: true,
            message: `Uploaded ${boundaryGeoJson.features.length} ${normalizedLevel} boundary features.`,
            level: normalizedLevel,
            featureCount: boundaryGeoJson.features.length
        });
    } catch (error) {
        console.error('Error uploading boundaries:', error);
        res.status(500).json({ success: false, message: 'Error uploading boundary data', error: error.message });
    }
});

module.exports = router;