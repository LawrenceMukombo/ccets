const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5433,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password_change_me_in_prod',
    database: process.env.DB_NAME || 'png_ccets',
});

const data = `
"Southern"	"Central"	"Abau"	"Abau"	"SOU-CEN-ABA-ABA-20251027-142016-0098"	-10.04042713	148.56661082	"LatLng(-10.040427132604215,148.56661081933245)"
"Highlands"	"Jiwaka"	"Anglimp/SouthWaghi"	"POLGA"	"HIG-JIW-ANG-POL-20251027-142016-0090"	-5.94144678	144.71393937	"LatLng(-5.941446775180923,144.7139393734184)"
"Islands"	"Bougainville"	"Arawa District"	"Arawa District"	"ISL-BOU-ARA-ARA-20251027-142016-0059"	-6.23560162	155.56478599	"LatLng(-6.235601618346524,155.5647859917642)"
"Islands"	"Bougainville"	"Central Bougainville"	"SKOTOLAN"	"ISL-BOU-CEN-SKO-20251120-111706-0179"	-5.05999880	141.96403174	"LatLng(-5.059998800099211,141.96403173578102)"
"Southern"	"Milne Bay"	"Esaala"	"SEHULEA HC"	"SOU-MIL-ESA-SEH-20251027-142016-0140"	-9.94028200	151.18333300	"LatLng(-9.940282,151.183333)"
"Southern"	"Milne Bay"	"Esaala"	"SALAMO SC"	"SOU-MIL-ESA-SAL-20251027-142016-0120"	-9.66652100	150.79997000	"LatLng(-9.666521,150.799970)"
"Southern"	"Milne Bay"	"Esaala"	"ESA'ALA HC"	"SOU-MIL-ESA-ESA-20251027-142016-0101"	-9.72598200	150.78732100	"LatLng(-9.725982,150.787321)"
"Southern"	"Milne Bay"	"Esaala"	"SALAMO SC"	"SOU-MIL-ESA-SAL-20251027-142016-0083"	-9.66652100	150.79997000	"LatLng(-9.666521,150.799970)"
"Southern"	"Milne Bay"	"Esaala"	"ESA'ALA HC"	"SOU-MIL-ESA-ESA-20251027-142016-0063"	-9.72598200	150.78732100	"LatLng(-9.725982,150.787321)"
"Southern"	"Milne Bay"	"Esaala"	"ESA'ALA HC"	"SOU-MIL-ESA-ESA-20251123-122623-0186"	-9.72598200	150.78732100	"LatLng(-9.725982,150.787321)"
"Southern"	"Milne Bay"	"Esaala"	"SEHULEA HC"	"SOU-MIL-ESA-SEH-20251027-142016-0133"	-9.94028200	151.18333300	"LatLng(-9.940282,151.183333)"
"Southern"	"Milne Bay"	"Esaala"	"ESA'ALA HC"	"SOU-MIL-ESA-ESA-20251027-142016-0039"	-9.72598200	150.78732100	"LatLng(-9.725982,150.787321)"
"Islands"	"East New Britain"	"GAZELLE"	"VUNAPAKA"	"ISL-EAS-GAZ-VUN-20251027-142016-0124"	-4.24476036	152.08196101	"LatLng(-4.2447603559239235,152.0819610128497)"
"Islands"	"East New Britain"	"GAZELLE"	"TAPIPIPI"	"ISL-EAS-GAZ-TAP-20251027-142016-0117"	-4.34214541	152.16299474	"LatLng(-4.342145414166277,152.16299474483134)"
"Islands"	"East New Britain"	"GAZELLE"	"PAPARATAVA"	"ISL-EAS-GAZ-PAP-20251027-142016-0091"	-4.38018660	152.16802184	"LatLng(-4.3801866005952395,152.16802183611733)"
"Islands"	"East New Britain"	"GAZELLE"	"PAPARATAVA"	"ISL-EAS-GAZ-PAP-20251027-142016-0056"	-4.38018660	152.16802184	"LatLng(-4.3801866005952395,152.16802183611733)"
"Highlands"	"Eastern Highlands"	"Goroka"	"Goroka"	"HIG-EAS-GOR-GOR-20251123-204051-0192"	-6.57517147	145.49201196	"LatLng(-6.57517146931167,145.49201196084792)"
"Highlands"	"Eastern Highlands"	"Goroka"	"Goroka"	"HIG-EAS-GOR-GOR-20251123-204008-0190"	-6.57517147	145.49201196	"LatLng(-6.57517146931167,145.49201196084792)"
"Highlands"	"Eastern Highlands"	"Goroka"	"Goroka"	"HIG-EAS-GOR-GOR-20251123-204031-0191"	-6.57517147	145.49201196	"LatLng(-6.57517146931167,145.49201196084792)"
"Highlands"	"Eastern Highlands"	"Goroka"	"GOROKA BASE HOSPITAL"	"HIG-EAS-GOR-PNG0400247-001-2025-12"	-6.07787100	145.38488600	"LatLng(-6.077871,145.384886)"
"Southern"	"Gulf"	"Gulf"	"Kerema"	"SOU-GUL-GUL-KER-20251123-205738-0193"	-5.08466047	141.95726395	"LatLng(-5.0846604734459255,141.95726394636952)"
"Southern"	"Gulf"	"Gulf"	"Kerema"	"SOU-GUL-GUL-KER-20251123-205756-0194"	-5.08466047	141.95726395	"LatLng(-5.0846604734459255,141.95726394636952)"
"Southern"	"Gulf"	"Gulf"	"Kerema"	"SOU-GUL-GUL-KER-20251123-211556-0195"	-5.08466047	141.95726395	"LatLng(-5.0846604734459255,141.95726394636952)"
"Highlands"	"Eastern Highlands"	"Henganofi"	"KESAVAKA"	"HIG-EAS-HEN-KES-20251027-142016-0062"	-6.16150000	145.69411300	"LatLng(-6.161500,145.694113)"
"MOMASE"	"Morobe"	"Huon Gulf"	"Morobe Provincial Vaccine Store"	"MOM-MOR-HUO-MOR-20251124-101115-0198"	-6.72766230	146.99848116	"LatLng(-6.727662295545517,146.99848116268072)"
"Islands"	"New Ireland"	"Kavieng"	"LAVONGAI"	"ISL-NEW-KAV-LAV-20251027-142016-0072"	-2.65865519	150.27702804	"LatLng(-2.6586551902026145,150.2770280385947)"
"Islands"	"New Ireland"	"Kavieng"	"TASINGINA"	"ISL-NEW-KAV-TAS-20251027-142016-0036"	-1.67578975	149.98332238	"LatLng(-1.6757897522416774,149.98332237762324)"
"Islands"	"New Ireland"	"KAVINENG"	"PUAS"	"ISL-NEW-KAV-PUA-20251027-142016-0109"	-2.38858100	150.22713021	"LatLng(-2.3885809965975735,150.2271302055939)"
"Southern"	"Gulf"	"Kerema"	"GULF Provincial Vaccine Store"	"SOU-GUL-KER-GUL-20251116-095536-0173"	-7.96464890	145.77467540	"LatLng(-7.964648903007229,145.7746753967846)"
"Islands"	"East New Britain"	"Kokopo"	"EAST NEW BRITAIN Provincial Vaccine Store"	"ISL-EAS-KOK-EAS-20251125-231704-0210"	-4.33905616	152.26264390	"LatLng(-4.339056158381332,152.26264389586655)"
"Islands"	"East New Britain"	"Kokopo"	"EAST NEW BRITAIN Provincial Vaccine Store"	"ISL-EAS-KOK-EAS-20251025-082023-0003"	-4.33905616	152.26264390	"LatLng(-4.339056158381332,152.26264389586655)"
"MOMASE"	"Madang"	"Madang"	"MADANG Provincial Vaccine Store"	"MOM-MAD-MAD-MAD-20251121-115624-0182"	-5.23251000	145.79553600	"LatLng(-5.232510,145.795536)"
"Islands"	"Manus"	"manus"	"TINGOU"	"ISL-MAN-MAN-TIN-20251114-183015-0172"	-2.10453400	147.09536000	"LatLng(-2.104534,147.095360)"
"MOMASE"	"Morobe"	"Markham"	"MARKHAM"	"MOM-MOR-MAR-MAR-20251027-142016-0104"	-6.79353247	146.56949211	"LatLng(-6.793532468428131,146.5694921100514)"
"Southern"	"National Capital District"	"Moresby North East"	"Bomana CIS"	"SOU-NAT-MOR-BOM-20251119-162527-0176"	-9.38841271	147.25226574	"LatLng(-9.388412706773327,147.25226573970883)"
"Southern"	"National Capital District"	"Moresby South"	"National Vaccine Store -Badili"	"SOU-NAT-MOR-NAT-20251125-204811-0209"	-9.47692009	147.17877844	"LatLng(-9.47692008957118,147.1787784389744)"
"Southern"	"National Capital District"	"Moresby South"	"National Vaccine Store -Badili"	"SOU-NAT-MOR-NAT-20251125-193930-0203"	-9.47692009	147.17877844	"LatLng(-9.47692008957118,147.1787784389744)"
"Southern"	"National Capital District"	"Moresby South"	"National Vaccine Store -Badili"	"SOU-NAT-MOR-NAT-20251027-142016-0020"	-9.47692009	147.17877844	"LatLng(-9.47692008957118,147.1787784389744)"
"Southern"	"National Capital District"	"Moresby South"	"National Vaccine Store -Badili"	"SOU-NAT-MOR-NAT-20251125-194415-0205"	-9.47692009	147.17877844	"LatLng(-9.47692008957118,147.1787784389744)"
"Southern"	"National Capital District"	"Moresby South"	"National Vaccine Store -Badili"	"SOU-NAT-MOR-NAT-20251125-204616-0208"	-9.47692009	147.17877844	"LatLng(-9.47692008957118,147.1787784389744)"
"Southern"	"National Capital District"	"Moresby South"	"National Vaccine Store -Badili"	"SOU-NAT-MOR-NAT-20251125-193614-0202"	-9.47692009	147.17877844	"LatLng(-9.47692008957118,147.1787784389744)"
"Southern"	"National Capital District"	"Moresby South"	"National Vaccine Store -Badili"	"SOU-NAT-MOR-NAT-20251125-194003-0204"	-9.47692009	147.17877844	"LatLng(-9.47692008957118,147.1787784389744)"
"Southern"	"National Capital District"	"Moresby South"	"Badili"	"SOU-NAT-MOR-BAD-20251027-142016-0033"	-9.47767094	147.17233214	"LatLng(-9.47767093588434,147.1723321435942)"
"Southern"	"National Capital District"	"Moresby South"	"National Vaccine Store -Badili"	"SOU-NAT-MOR-PNG0100001-008-2025-11"	-9.47692009	147.17877844	"LatLng(-9.47692008957118,147.1787784389744)"
"Highlands"	"Western Highlands"	"Mul/Bayer"	"Mul/Baiyer"	"HIG-WES-MUL-MUL-20251027-142016-0135"	-5.92479058	144.00883669	"LatLng(-5.924790584748448,144.0088366941282)"
"Islands"	"New Ireland"	"Namatanai"	"LIHIR MEDICAL CENTRE"	"ISL-NEW-NAM-LIH-20251027-142016-0026"	-3.06822041	152.62908704	"LatLng(-3.0682204145509626,152.6290870372874)"
"Islands"	"Bougainville"	"North Bougainville"	"BUKA"	"ISL-BOU-NOR-BUK-20251027-142016-0049"	-5.07210846	141.96612121	"LatLng(-5.0721084569691115,141.96612121280936)"
"Islands"	"Bougainville"	"North Bougainville"	"Bougainville Provincial Vaccine Store"	"ISL-BOU-NOR-BOU-20251119-170246-0177"	-5.42910500	154.67067500	"LatLng(-5.429105,154.670675)"
"Highlands"	"Jiwaka"	"North Waghi"	"BANZ No. 1"	"HIG-JIW-NOR-BAN-20251027-142016-0096"	-5.79943493	144.62698709	"LatLng(-5.7994349335539255,144.62698709355496)"
"Highlands"	"Jiwaka"	"North Waghi"	"NorthWaghi"	"HIG-JIW-NOR-NOR-20251027-142016-0113"	-5.90819671	144.68971106	"LatLng(-5.908196708379264,144.68971106203657)"
"Highlands"	"Eastern Highlands"	"Okapa"	"Okapa"	"HIG-EAS-OKA-OKA-20251027-142016-0071"	-6.52183100	145.60058600	"LatLng(-6.521831,145.600586)"
"Southern"	"Northern Oro"	"Popondetta"	"ORO Provincial Vaccine Store"	"SOU-NOR-POP-ORO-20251111-134420-0169"	-8.76388844	148.24618256	"LatLng(-8.763888437482658,148.2461825577775)"
"Islands"	"West New Britain"	"Talasea"	"WEST NEW BRITAIN Provincial Vaccine Store"	"ISL-WES-TAL-WES-20251123-182706-0188"	-5.55866822	150.15922316	"LatLng(-5.558668221299481,150.15922316350043)"
"Highlands"	"Hela"	"Tari"	"HELA PVS (Tari) Provincial Vaccine Store"	"HIG-HEL-TAR-HEL-20251027-142016-0004"	-9.46660000	147.14640000	"LatLng(-9.4666,147.1464)"
"Highlands"	"Hela"	"Tari"	"HELA PVS (Tari) Provincial Vaccine Store"	"HIG-HEL-TAR-HEL-20251027-142016-0005"	-9.46660000	147.14640000	"LatLng(-9.4666,147.1464)"
"Highlands"	"Eastern Highlands"	"Unggai/Benna"	"UNGGAI"	"HIG-EAS-UNG-UNG-20251027-142016-0058"	-6.19935300	145.26690200	"LatLng(-6.199353,145.266902)"
"MOMASE"	"Madang"	"UsinoBundi"	"USINO BUNDI"	"MOM-MAD-USI-USI-20251027-142016-0110"	-5.47404231	145.18816816	"LatLng(-5.474042310473987,145.18816816013148)"
"MOMASE"	"East Sepik"	"Wewak"	"EAST SEPIK Provincial Vaccine store"	"MOM-EAS-WEW-EAS-20251125-201338-0206"	-3.57098187	143.65960884	"LatLng(-3.5709818728385074,143.65960884061397)"
"MOMASE"	"East Sepik"	"Wewak"	"EAST SEPIK Provincial Vaccine store"	"MOM-EAS-WEW-EAS-20251125-201527-0207"	-3.57098187	143.65960884	"LatLng(-3.5709818728385074,143.65960884061397)"
"MOMASE"	"East Sepik"	"Yangoru"	"Yangoru Saussia"	"MOM-EAS-YAN-YAN-20251027-142016-0046"	-5.04305948	141.96807928	"LatLng(-5.043059477743435,141.9680792838335)"
`;

async function run() {
    try {
        console.log('Starting population from CSV data...');
        const lines = data.trim().split('\n');

        for (const line of lines) {
            // Basic TSV/CSV regex or split. The format is quotes and tabs.
            const parts = line.split('\t');
            if (parts.length < 5) continue;

            const region = parts[0].replace(/"/g, '').trim();
            const province = parts[1].replace(/"/g, '').trim();
            const district = parts[2].replace(/"/g, '').trim();
            const facilityName = parts[3].replace(/"/g, '').trim();
            const ticketRef = parts[4].replace(/"/g, '').trim();
            const lat = parts[5].trim();
            const lon = parts[6].trim();
            let gpsRaw = parts[7].replace(/"/g, '').trim();

            // Convert LatLng format to PostgreSQL point format
            let gpsPoint = null;
            if (gpsRaw.startsWith('LatLng(')) {
                const coords = gpsRaw.replace('LatLng(', '').replace(')', '');
                gpsPoint = `(${coords})`;
            } else if (lat && lon) {
                gpsPoint = `(${lat},${lon})`;
            }

            // 1. Update Facility Coords
            // Try to find facility by Name
            let res = await pool.query('SELECT facility_id FROM facilities WHERE facility_name = $1', [facilityName]);
            if (res.rowCount === 0) {
                // Try fuzzy
                res = await pool.query('SELECT facility_id FROM facilities WHERE facility_name ILIKE $1', [facilityName]);
            }

            let facilityId = null;

            if (res.rowCount > 0) {
                facilityId = res.rows[0].facility_id;
                // Update
                if (lat && lon && gpsPoint) {
                    await pool.query('UPDATE facilities SET latitude = $1, longitude = $2, gps_coordinates = $3 WHERE facility_id = $4', [lat, lon, gpsPoint, facilityId]);
                    console.log(`Updated facility ${facilityName} (${facilityId}) coords.`);
                }
            } else {
                console.log(`Facility not found: ${facilityName}, skipping coord update.`);
                // Should we insert? "Populate facilities...". Maybe.
                // Insert with a special code to avoid conflict
                // const newCode = 'CSV_' + Math.floor(Math.random()*100000);
                // const ins = await pool.query('INSERT INTO facilities (facility_name, facility_code, latitude, longitude, gps_coordinates, type) VALUES ($1, $2, $3, $4, $5, $6) RETURNING facility_id', [facilityName, newCode, lat, lon, gps, 'Unknown']);
                // facilityId = ins.rows[0].facility_id;
                // console.log(`Inserted new facility ${facilityName}.`);
            }

            // 2. Ensure Ticket Exists and Link it
            // Only if we have facilityId? Or just update facility_id if ticket exists.
            const tRes = await pool.query('SELECT ticket_id FROM tickets WHERE ticket_reference_number = $1', [ticketRef]);

            if (tRes.rowCount > 0) {
                // Ticket exists, ensure it links to facility
                if (facilityId) {
                    await pool.query('UPDATE tickets SET facility_id = $1 WHERE ticket_reference_number = $2', [facilityId, ticketRef]);
                    console.log(`Linked ticket ${ticketRef} to facility ${facilityId}.`);
                }
            } else {
                // Populate ticket
                // Missing many fields, use defaults
                if (facilityId) {
                    console.log(`Creating missing ticket ${ticketRef}...`);
                    await pool.query(`
                        INSERT INTO tickets (ticket_reference_number, facility_id, status, priority, description, created_by)
                        VALUES ($1, $2, 'Open', 'Medium', 'Imported from CSV', 1)
                    `, [ticketRef, facilityId]);
                } else {
                    console.log(`Cannot create ticket ${ticketRef} - Unknown facility.`);
                }
            }
        }
        console.log('Done.');
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}

run();
