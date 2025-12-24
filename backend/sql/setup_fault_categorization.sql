-- =====================================================
-- Equipment Fault Categorization System
-- =====================================================
-- This script creates enums and tables for fault tracking
-- when technicians resolve tickets
-- =====================================================
-- 1. Create Equipment Functional Status Enum
CREATE TYPE equipment_functional_status AS ENUM (
    'Functional (Working Normally)',
    'Functional but at Risk',
    'Partially Functional',
    'Non-Functional',
    'Not Installed / Commissioned',
    'Decommissioned',
    'Unknown (Status Not Confirmed)'
);
-- 2. Create Fault Categories Table
CREATE TABLE IF NOT EXISTS fault_categories (
    category_id SERIAL PRIMARY KEY,
    category_code VARCHAR(50) UNIQUE NOT NULL,
    category_name VARCHAR(200) NOT NULL,
    description TEXT,
    display_order INT
);
-- 3. Create Fault Issues Table
CREATE TABLE IF NOT EXISTS fault_issues (
    issue_id SERIAL PRIMARY KEY,
    category_id INT REFERENCES fault_categories(category_id),
    issue_name VARCHAR(200) NOT NULL,
    issue_code VARCHAR(100) UNIQUE NOT NULL,
    display_order INT
);
-- 4. Create Ticket Fault Issues Junction Table (for multi-select)
CREATE TABLE IF NOT EXISTS ticket_fault_issues (
    ticket_fault_issue_id SERIAL PRIMARY KEY,
    ticket_id INT REFERENCES tickets(ticket_id) ON DELETE CASCADE,
    issue_id INT REFERENCES fault_issues(issue_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(ticket_id, issue_id)
);
-- 5. Add columns to tickets table for fault tracking
ALTER TABLE tickets
ADD COLUMN IF NOT EXISTS equipment_functional_status equipment_functional_status,
    ADD COLUMN IF NOT EXISTS resolution_notes TEXT;
-- 6. Insert Fault Categories
INSERT INTO fault_categories (
        category_code,
        category_name,
        description,
        display_order
    )
VALUES (
        'REFRIGERATION',
        'A. Refrigeration System Faults',
        'Failures affecting cooling performance and temperature stability',
        1
    ),
    (
        'ELECTRICAL',
        'B. Electrical and Power Faults',
        'Related to power supply and control electronics',
        2
    ),
    (
        'TEMPERATURE',
        'C. Temperature Monitoring and Control Faults',
        'Affecting compliance and safety of vaccines',
        3
    ),
    (
        'MECHANICAL',
        'D. Mechanical and Structural Faults',
        'Affecting physical integrity and usability',
        4
    ),
    (
        'SOLAR',
        'E. Solar Direct Drive (SDD) System Faults',
        'Applies to solar-powered cold chain',
        5
    ),
    (
        'BACKUP_POWER',
        'F. Backup Power & Auxiliary System Faults',
        'Ensuring continuity during outages',
        6
    ),
    (
        'ENVIRONMENTAL',
        'G. Environmental & Installation Issues',
        'Not caused by equipment but affect performance',
        7
    ),
    (
        'OPERATIONAL',
        'H. User / Operational Issues',
        'Operational challenges health workers face',
        8
    ),
    (
        'MAINTENANCE',
        'I. Preventive Maintenance Related Issues',
        'Result of poor servicing',
        9
    ) ON CONFLICT (category_code) DO NOTHING;
-- 7. Insert Fault Issues for each category
-- A. Refrigeration System Faults
INSERT INTO fault_issues (
        category_id,
        issue_code,
        issue_name,
        display_order
    )
VALUES (
        (
            SELECT category_id
            FROM fault_categories
            WHERE category_code = 'REFRIGERATION'
        ),
        'REF_001',
        'Compressor failure / noisy compressor',
        1
    ),
    (
        (
            SELECT category_id
            FROM fault_categories
            WHERE category_code = 'REFRIGERATION'
        ),
        'REF_002',
        'Evaporator coil frozen / blocked',
        2
    ),
    (
        (
            SELECT category_id
            FROM fault_categories
            WHERE category_code = 'REFRIGERATION'
        ),
        'REF_003',
        'Condenser coil damaged / clogged',
        3
    ),
    (
        (
            SELECT category_id
            FROM fault_categories
            WHERE category_code = 'REFRIGERATION'
        ),
        'REF_004',
        'Refrigerant gas leakage',
        4
    ),
    (
        (
            SELECT category_id
            FROM fault_categories
            WHERE category_code = 'REFRIGERATION'
        ),
        'REF_005',
        'Low refrigerant pressure',
        5
    ),
    (
        (
            SELECT category_id
            FROM fault_categories
            WHERE category_code = 'REFRIGERATION'
        ),
        'REF_006',
        'Capillary tube blockage',
        6
    ),
    (
        (
            SELECT category_id
            FROM fault_categories
            WHERE category_code = 'REFRIGERATION'
        ),
        'REF_007',
        'Expansion valve malfunction',
        7
    ),
    (
        (
            SELECT category_id
            FROM fault_categories
            WHERE category_code = 'REFRIGERATION'
        ),
        'REF_008',
        'Filter drier blocked',
        8
    ),
    (
        (
            SELECT category_id
            FROM fault_categories
            WHERE category_code = 'REFRIGERATION'
        ),
        'REF_009',
        'System low cooling performance',
        9
    ),
    (
        (
            SELECT category_id
            FROM fault_categories
            WHERE category_code = 'REFRIGERATION'
        ),
        'REF_010',
        'Overcooling / freezing vaccines',
        10
    ),
    (
        (
            SELECT category_id
            FROM fault_categories
            WHERE category_code = 'REFRIGERATION'
        ),
        'REF_011',
        'Not cooling at all',
        11
    ) ON CONFLICT (issue_code) DO NOTHING;
-- B. Electrical and Power Faults
INSERT INTO fault_issues (
        category_id,
        issue_code,
        issue_name,
        display_order
    )
VALUES (
        (
            SELECT category_id
            FROM fault_categories
            WHERE category_code = 'ELECTRICAL'
        ),
        'ELEC_001',
        'Power not reaching equipment',
        1
    ),
    (
        (
            SELECT category_id
            FROM fault_categories
            WHERE category_code = 'ELECTRICAL'
        ),
        'ELEC_002',
        'Blown fuse / tripped breaker',
        2
    ),
    (
        (
            SELECT category_id
            FROM fault_categories
            WHERE category_code = 'ELECTRICAL'
        ),
        'ELEC_003',
        'PCB / control board malfunction',
        3
    ),
    (
        (
            SELECT category_id
            FROM fault_categories
            WHERE category_code = 'ELECTRICAL'
        ),
        'ELEC_004',
        'Loose or damaged wiring',
        4
    ),
    (
        (
            SELECT category_id
            FROM fault_categories
            WHERE category_code = 'ELECTRICAL'
        ),
        'ELEC_005',
        'Burnt electrical components',
        5
    ),
    (
        (
            SELECT category_id
            FROM fault_categories
            WHERE category_code = 'ELECTRICAL'
        ),
        'ELEC_006',
        'Voltage stabiliser failure',
        6
    ),
    (
        (
            SELECT category_id
            FROM fault_categories
            WHERE category_code = 'ELECTRICAL'
        ),
        'ELEC_007',
        'Frequent power surges affecting unit',
        7
    ),
    (
        (
            SELECT category_id
            FROM fault_categories
            WHERE category_code = 'ELECTRICAL'
        ),
        'ELEC_008',
        'Power plug / socket faults',
        8
    ) ON CONFLICT (issue_code) DO NOTHING;
-- C. Temperature Monitoring and Control Faults
INSERT INTO fault_issues (
        category_id,
        issue_code,
        issue_name,
        display_order
    )
VALUES (
        (
            SELECT category_id
            FROM fault_categories
            WHERE category_code = 'TEMPERATURE'
        ),
        'TEMP_001',
        'Thermostat malfunctioning',
        1
    ),
    (
        (
            SELECT category_id
            FROM fault_categories
            WHERE category_code = 'TEMPERATURE'
        ),
        'TEMP_002',
        'Temperature probe damaged / inaccurate',
        2
    ),
    (
        (
            SELECT category_id
            FROM fault_categories
            WHERE category_code = 'TEMPERATURE'
        ),
        'TEMP_003',
        'Data logger not working / offline',
        3
    ),
    (
        (
            SELECT category_id
            FROM fault_categories
            WHERE category_code = 'TEMPERATURE'
        ),
        'TEMP_004',
        'RTMD device failure or not reporting',
        4
    ),
    (
        (
            SELECT category_id
            FROM fault_categories
            WHERE category_code = 'TEMPERATURE'
        ),
        'TEMP_005',
        'Incorrect temperature display',
        5
    ),
    (
        (
            SELECT category_id
            FROM fault_categories
            WHERE category_code = 'TEMPERATURE'
        ),
        'TEMP_006',
        'Temperature alarms not working',
        6
    ),
    (
        (
            SELECT category_id
            FROM fault_categories
            WHERE category_code = 'TEMPERATURE'
        ),
        'TEMP_007',
        'Calibration deviation suspected',
        7
    ) ON CONFLICT (issue_code) DO NOTHING;
-- D. Mechanical and Structural Faults
INSERT INTO fault_issues (
        category_id,
        issue_code,
        issue_name,
        display_order
    )
VALUES (
        (
            SELECT category_id
            FROM fault_categories
            WHERE category_code = 'MECHANICAL'
        ),
        'MECH_001',
        'Door seal/gasket damaged (cold air leakage)',
        1
    ),
    (
        (
            SELECT category_id
            FROM fault_categories
            WHERE category_code = 'MECHANICAL'
        ),
        'MECH_002',
        'Hinges broken / loose',
        2
    ),
    (
        (
            SELECT category_id
            FROM fault_categories
            WHERE category_code = 'MECHANICAL'
        ),
        'MECH_003',
        'Door not closing properly',
        3
    ),
    (
        (
            SELECT category_id
            FROM fault_categories
            WHERE category_code = 'MECHANICAL'
        ),
        'MECH_004',
        'Door lock damaged',
        4
    ),
    (
        (
            SELECT category_id
            FROM fault_categories
            WHERE category_code = 'MECHANICAL'
        ),
        'MECH_005',
        'Handle broken',
        5
    ),
    (
        (
            SELECT category_id
            FROM fault_categories
            WHERE category_code = 'MECHANICAL'
        ),
        'MECH_006',
        'Cabinet cracked / damaged',
        6
    ),
    (
        (
            SELECT category_id
            FROM fault_categories
            WHERE category_code = 'MECHANICAL'
        ),
        'MECH_007',
        'Shelves / baskets broken or missing',
        7
    ),
    (
        (
            SELECT category_id
            FROM fault_categories
            WHERE category_code = 'MECHANICAL'
        ),
        'MECH_008',
        'Lid damaged (for chest refrigerators)',
        8
    ) ON CONFLICT (issue_code) DO NOTHING;
-- E. Solar Direct Drive (SDD) System Faults
INSERT INTO fault_issues (
        category_id,
        issue_code,
        issue_name,
        display_order
    )
VALUES (
        (
            SELECT category_id
            FROM fault_categories
            WHERE category_code = 'SOLAR'
        ),
        'SOLAR_001',
        'Solar panel damaged / cracked',
        1
    ),
    (
        (
            SELECT category_id
            FROM fault_categories
            WHERE category_code = 'SOLAR'
        ),
        'SOLAR_002',
        'Solar panel shading / dirty reducing power',
        2
    ),
    (
        (
            SELECT category_id
            FROM fault_categories
            WHERE category_code = 'SOLAR'
        ),
        'SOLAR_003',
        'PV wiring fault',
        3
    ),
    (
        (
            SELECT category_id
            FROM fault_categories
            WHERE category_code = 'SOLAR'
        ),
        'SOLAR_004',
        'Charge controller failure',
        4
    ),
    (
        (
            SELECT category_id
            FROM fault_categories
            WHERE category_code = 'SOLAR'
        ),
        'SOLAR_005',
        'Solar mounting structure broken',
        5
    ),
    (
        (
            SELECT category_id
            FROM fault_categories
            WHERE category_code = 'SOLAR'
        ),
        'SOLAR_006',
        'Solar array disconnected',
        6
    ),
    (
        (
            SELECT category_id
            FROM fault_categories
            WHERE category_code = 'SOLAR'
        ),
        'SOLAR_007',
        'Solar system not charging battery',
        7
    ),
    (
        (
            SELECT category_id
            FROM fault_categories
            WHERE category_code = 'SOLAR'
        ),
        'SOLAR_008',
        'Battery not holding charge',
        8
    ) ON CONFLICT (issue_code) DO NOTHING;
-- F. Backup Power & Auxiliary System Faults
INSERT INTO fault_issues (
        category_id,
        issue_code,
        issue_name,
        display_order
    )
VALUES (
        (
            SELECT category_id
            FROM fault_categories
            WHERE category_code = 'BACKUP_POWER'
        ),
        'BACKUP_001',
        'Backup battery failure',
        1
    ),
    (
        (
            SELECT category_id
            FROM fault_categories
            WHERE category_code = 'BACKUP_POWER'
        ),
        'BACKUP_002',
        'Generator not operational',
        2
    ),
    (
        (
            SELECT category_id
            FROM fault_categories
            WHERE category_code = 'BACKUP_POWER'
        ),
        'BACKUP_003',
        'UPS failure',
        3
    ),
    (
        (
            SELECT category_id
            FROM fault_categories
            WHERE category_code = 'BACKUP_POWER'
        ),
        'BACKUP_004',
        'Charging system failure',
        4
    ),
    (
        (
            SELECT category_id
            FROM fault_categories
            WHERE category_code = 'BACKUP_POWER'
        ),
        'BACKUP_005',
        'Voltage regulator malfunction',
        5
    ),
    (
        (
            SELECT category_id
            FROM fault_categories
            WHERE category_code = 'BACKUP_POWER'
        ),
        'BACKUP_006',
        'Backup system incorrectly configured',
        6
    ) ON CONFLICT (issue_code) DO NOTHING;
-- G. Environmental & Installation Issues
INSERT INTO fault_issues (
        category_id,
        issue_code,
        issue_name,
        display_order
    )
VALUES (
        (
            SELECT category_id
            FROM fault_categories
            WHERE category_code = 'ENVIRONMENTAL'
        ),
        'ENV_001',
        'Poor ventilation / wrong placement',
        1
    ),
    (
        (
            SELECT category_id
            FROM fault_categories
            WHERE category_code = 'ENVIRONMENTAL'
        ),
        'ENV_002',
        'Equipment too close to heat source',
        2
    ),
    (
        (
            SELECT category_id
            FROM fault_categories
            WHERE category_code = 'ENVIRONMENTAL'
        ),
        'ENV_003',
        'Poor room conditions',
        3
    ),
    (
        (
            SELECT category_id
            FROM fault_categories
            WHERE category_code = 'ENVIRONMENTAL'
        ),
        'ENV_004',
        'Dust accumulation in vents',
        4
    ),
    (
        (
            SELECT category_id
            FROM fault_categories
            WHERE category_code = 'ENVIRONMENTAL'
        ),
        'ENV_005',
        'Improper installation',
        5
    ),
    (
        (
            SELECT category_id
            FROM fault_categories
            WHERE category_code = 'ENVIRONMENTAL'
        ),
        'ENV_006',
        'Frequent power outage environment',
        6
    ),
    (
        (
            SELECT category_id
            FROM fault_categories
            WHERE category_code = 'ENVIRONMENTAL'
        ),
        'ENV_007',
        'Flooding / water exposure',
        7
    ),
    (
        (
            SELECT category_id
            FROM fault_categories
            WHERE category_code = 'ENVIRONMENTAL'
        ),
        'ENV_008',
        'Rodent / insect damage',
        8
    ) ON CONFLICT (issue_code) DO NOTHING;
-- H. User / Operational Issues
INSERT INTO fault_issues (
        category_id,
        issue_code,
        issue_name,
        display_order
    )
VALUES (
        (
            SELECT category_id
            FROM fault_categories
            WHERE category_code = 'OPERATIONAL'
        ),
        'OPS_001',
        'Incorrect handling or operation',
        1
    ),
    (
        (
            SELECT category_id
            FROM fault_categories
            WHERE category_code = 'OPERATIONAL'
        ),
        'OPS_002',
        'Poor temperature monitoring practices',
        2
    ),
    (
        (
            SELECT category_id
            FROM fault_categories
            WHERE category_code = 'OPERATIONAL'
        ),
        'OPS_003',
        'Lid/door frequently left open',
        3
    ),
    (
        (
            SELECT category_id
            FROM fault_categories
            WHERE category_code = 'OPERATIONAL'
        ),
        'OPS_004',
        'Overloading / poor loading arrangement',
        4
    ),
    (
        (
            SELECT category_id
            FROM fault_categories
            WHERE category_code = 'OPERATIONAL'
        ),
        'OPS_005',
        'Lack of trained operator',
        5
    ),
    (
        (
            SELECT category_id
            FROM fault_categories
            WHERE category_code = 'OPERATIONAL'
        ),
        'OPS_006',
        'Misuse of equipment',
        6
    ) ON CONFLICT (issue_code) DO NOTHING;
-- I. Preventive Maintenance Related Issues
INSERT INTO fault_issues (
        category_id,
        issue_code,
        issue_name,
        display_order
    )
VALUES (
        (
            SELECT category_id
            FROM fault_categories
            WHERE category_code = 'MAINTENANCE'
        ),
        'MAINT_001',
        'Equipment not serviced for long',
        1
    ),
    (
        (
            SELECT category_id
            FROM fault_categories
            WHERE category_code = 'MAINTENANCE'
        ),
        'MAINT_002',
        'Lack of spare parts',
        2
    ),
    (
        (
            SELECT category_id
            FROM fault_categories
            WHERE category_code = 'MAINTENANCE'
        ),
        'MAINT_003',
        'Delayed technician visits',
        3
    ),
    (
        (
            SELECT category_id
            FROM fault_categories
            WHERE category_code = 'MAINTENANCE'
        ),
        'MAINT_004',
        'Expired lubricants / consumables',
        4
    ),
    (
        (
            SELECT category_id
            FROM fault_categories
            WHERE category_code = 'MAINTENANCE'
        ),
        'MAINT_005',
        'Filters never replaced or maintained',
        5
    ) ON CONFLICT (issue_code) DO NOTHING;
-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ticket_fault_issues_ticket_id ON ticket_fault_issues(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_fault_issues_issue_id ON ticket_fault_issues(issue_id);
CREATE INDEX IF NOT EXISTS idx_fault_issues_category_id ON fault_issues(category_id);
COMMENT ON TYPE equipment_functional_status IS 'Equipment functional status when ticket is resolved';
COMMENT ON TABLE fault_categories IS 'Categories of faults for equipment issues';
COMMENT ON TABLE fault_issues IS 'Specific fault issues within categories';
COMMENT ON TABLE ticket_fault_issues IS 'Links tickets to multiple fault issues (many-to-many)';
SELECT 'Fault categorization system created successfully!' as status;