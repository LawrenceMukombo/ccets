-- Update categories for known spare parts
UPDATE public.spareparts
SET category = 'Refrigeration System Components'
WHERE sparepart_name LIKE '%Compressor%'
    OR sparepart_name LIKE '%Refrigerant%'
    OR sparepart_name LIKE '%Evaporator%'
    OR sparepart_name LIKE '%Filter Drier%';
UPDATE public.spareparts
SET category = 'Temperature Monitoring & Control Components'
WHERE sparepart_name LIKE '%Thermostat%'
    OR sparepart_name LIKE '%Sensor%'
    OR sparepart_name LIKE '%Data Logger%';
UPDATE public.spareparts
SET category = 'Mechanical & Structural Components'
WHERE sparepart_name LIKE '%Door%'
    OR sparepart_name LIKE '%Gasket%'
    OR sparepart_name LIKE '%Hinge%'
    OR sparepart_name LIKE '%Lock%';
UPDATE public.spareparts
SET category = 'Electrical & Power Components'
WHERE sparepart_name LIKE '%Voltage%'
    OR sparepart_name LIKE '%Stabilizer%'
    OR sparepart_name LIKE '%Capacitor%'
    OR sparepart_name LIKE '%Motor%';
UPDATE public.spareparts
SET category = 'Solar Direct Drive System Components'
WHERE sparepart_name LIKE '%Solar%';
UPDATE public.spareparts
SET category = 'Backup Power & Auxiliary Systems'
WHERE sparepart_name LIKE '%Battery%';