--
-- PostgreSQL database dump
--

\restrict 5EA40uu0lNP1iu2LEvmNqwD4bYlooh9FFfzJE8clFolWUhndIp51oNmoAFNc7mb

-- Dumped from database version 18.0
-- Dumped by pg_dump version 18.0

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: png; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA png;


ALTER SCHEMA png OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: appsmith_user_mapping; Type: TABLE; Schema: png; Owner: postgres
--

CREATE TABLE png.appsmith_user_mapping (
    appsmith_email character varying(255) NOT NULL,
    application_user_id integer,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE png.appsmith_user_mapping OWNER TO postgres;

--
-- Name: audit_logs; Type: TABLE; Schema: png; Owner: postgres
--

CREATE TABLE png.audit_logs (
    id integer NOT NULL,
    user_id integer,
    action character varying(50) NOT NULL,
    entity_type character varying(50) NOT NULL,
    entity_id integer,
    details jsonb,
    ip_address character varying(45),
    user_agent text,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE png.audit_logs OWNER TO postgres;

--
-- Name: audit_logs_id_seq; Type: SEQUENCE; Schema: png; Owner: postgres
--

CREATE SEQUENCE png.audit_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE png.audit_logs_id_seq OWNER TO postgres;

--
-- Name: audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: png; Owner: postgres
--

ALTER SEQUENCE png.audit_logs_id_seq OWNED BY png.audit_logs.id;


--
-- Name: audit_trail; Type: TABLE; Schema: png; Owner: postgres
--

CREATE TABLE png.audit_trail (
    audit_id integer NOT NULL,
    user_id integer,
    action character varying(255) NOT NULL,
    table_name character varying(100) NOT NULL,
    record_id integer,
    old_value text,
    new_value text,
    "timestamp" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE png.audit_trail OWNER TO postgres;

--
-- Name: audit_trail_audit_id_seq; Type: SEQUENCE; Schema: png; Owner: postgres
--

CREATE SEQUENCE png.audit_trail_audit_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE png.audit_trail_audit_id_seq OWNER TO postgres;

--
-- Name: audit_trail_audit_id_seq; Type: SEQUENCE OWNED BY; Schema: png; Owner: postgres
--

ALTER SEQUENCE png.audit_trail_audit_id_seq OWNED BY png.audit_trail.audit_id;


--
-- Name: device_registry; Type: TABLE; Schema: png; Owner: postgres
--

CREATE TABLE png.device_registry (
    id integer NOT NULL,
    device_id character varying(255) NOT NULL,
    device_model character varying(255) NOT NULL,
    os_version character varying(50) NOT NULL,
    app_version character varying(20) NOT NULL,
    last_seen timestamp without time zone NOT NULL,
    user_id integer NOT NULL
);


ALTER TABLE png.device_registry OWNER TO postgres;

--
-- Name: device_registry_id_seq; Type: SEQUENCE; Schema: png; Owner: postgres
--

CREATE SEQUENCE png.device_registry_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE png.device_registry_id_seq OWNER TO postgres;

--
-- Name: device_registry_id_seq; Type: SEQUENCE OWNED BY; Schema: png; Owner: postgres
--

ALTER SEQUENCE png.device_registry_id_seq OWNED BY png.device_registry.id;


--
-- Name: districts; Type: TABLE; Schema: png; Owner: postgres
--

CREATE TABLE png.districts (
    district_id integer NOT NULL,
    district_name character varying(255) NOT NULL,
    province_id integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE png.districts OWNER TO postgres;

--
-- Name: districts_district_id_seq; Type: SEQUENCE; Schema: png; Owner: postgres
--

CREATE SEQUENCE png.districts_district_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE png.districts_district_id_seq OWNER TO postgres;

--
-- Name: districts_district_id_seq; Type: SEQUENCE OWNED BY; Schema: png; Owner: postgres
--

ALTER SEQUENCE png.districts_district_id_seq OWNED BY png.districts.district_id;


--
-- Name: energy_sources; Type: TABLE; Schema: png; Owner: postgres
--

CREATE TABLE png.energy_sources (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    close_resolution_status text
);


ALTER TABLE png.energy_sources OWNER TO postgres;

--
-- Name: energy_sources_id_seq; Type: SEQUENCE; Schema: png; Owner: postgres
--

CREATE SEQUENCE png.energy_sources_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE png.energy_sources_id_seq OWNER TO postgres;

--
-- Name: energy_sources_id_seq; Type: SEQUENCE OWNED BY; Schema: png; Owner: postgres
--

ALTER SEQUENCE png.energy_sources_id_seq OWNED BY png.energy_sources.id;


--
-- Name: equipment; Type: TABLE; Schema: png; Owner: postgres
--

CREATE TABLE png.equipment (
    equipment_id integer NOT NULL,
    facility_id integer NOT NULL,
    item_class character varying(100),
    item_type character varying(100),
    manufacturer character varying(100),
    model character varying(100),
    serial_number character varying(100),
    year_installed integer,
    physical_condition character varying(50),
    working_condition character varying(50),
    is_functioning boolean DEFAULT true,
    refrigerant_gas character varying(255),
    energy_source character varying(50),
    voltage integer,
    phase integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone,
    image_url text,
    qr_code_url text,
    last_synced timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    item_code character varying(100),
    is_deleted boolean DEFAULT false,
    delete_reason text,
    height real,
    width real,
    length real,
    gross_volume real,
    weight real,
    number_of_doors integer,
    external_size character varying(100),
    has_alarm boolean DEFAULT false,
    has_shelves boolean DEFAULT false,
    has_curtain boolean DEFAULT false,
    net_vaccine_capacity real,
    freezer_net_capacity real,
    cooling_units integer,
    cfc_free boolean DEFAULT false,
    has_temp_monitor boolean DEFAULT false,
    has_thermometer boolean DEFAULT false,
    power_consumption character varying(50),
    repair_history text,
    unit_cost_installed numeric(12,2),
    unit_cost_present numeric(12,2),
    original_cost numeric(12,2),
    pqspis_code character varying(100),
    pqspis_type character varying(100),
    pqspis_manufacturer character varying(100),
    pqspis_refrigerant_gas character varying(100),
    pqspis_temperature_zone character varying(100),
    end_guaranty_date date,
    type_p character varying(100),
    last_sync timestamp without time zone,
    item_class_name character varying(100),
    item_type_name character varying(100),
    physical_condition_name character varying(100),
    working_condition_name character varying(100),
    energy_source_name character varying(100),
    facility_name character varying(255),
    storage_condition_name character varying(100),
    financial_source_name character varying(100),
    reasons_for_not_functioning text,
    not_in_use_since date,
    running_time numeric(10,2),
    running_time_km numeric(10,2),
    net_generated_power numeric(10,2),
    energy_source_generator character varying(100),
    has_extra_fuel_tank boolean,
    power_or_fuel_consumption numeric(10,2),
    has_automatic_startup_system boolean,
    wvssm_code character varying(50),
    unicef_catalogue_codes character varying(100),
    other_code character varying(50),
    maintenance_group character varying(100),
    other_fields_item1 text,
    other_fields_item2 text,
    other_fields_item3 text,
    other_fields_item_parameter4 text,
    code character varying(50),
    typep character varying(50),
    type1 character varying(50),
    type2 character varying(50),
    type3 character varying(50),
    type4 character varying(50),
    type5 character varying(50),
    type1p character varying(50),
    technical_conditions character varying(50),
    storage_condition character varying(10),
    working_temperature_range character varying(50),
    is_there_inside_door boolean,
    does_it_have_an_alarm_system boolean,
    does_it_have_adequate_shelves boolean,
    does_it_have_curtain boolean,
    is_the_refrigerant_gas_cfc_free boolean,
    does_it_have_freezing_compartment boolean,
    does_it_have_continuous_temperature_monitoring_device boolean,
    does_it_have_built_in_thermometer boolean,
    does_it_have_an_extra_fuel_tank boolean,
    is_there_an_automatic_start_up_system boolean,
    have_guaranty boolean DEFAULT false,
    net_shipping_volume numeric(10,2),
    ice_making_capacity numeric(10,2),
    cool_water_production_capacity numeric(10,2),
    coolant_pack_nominal_capacity numeric(10,2),
    number_of_coolant_packs_required integer,
    pqspis_temperature_working_zone character varying(50),
    does_the_dry_store_have_adequate_lighting boolean,
    does_the_dry_store_have_heating boolean,
    does_the_dry_store_have_air_conditioning boolean,
    is_the_dry_storage_area_protected_from_direct_sunlight boolean,
    is_the_dry_storage_area boolean,
    is_the_dry_storage_area_clean boolean,
    is_the_dry_storage_area_dry boolean,
    is_the_dry_storage_area_equipped_with_mechanical boolean,
    financial_source integer,
    number_of_cooling_units integer,
    weightkg real,
    net_vaccine_storage_capacity real,
    unit_cost_when_installed numeric(12,2),
    unit_cost_at_present numeric(12,2),
    surface_area real,
    accessible_height real,
    repair_and_maintenance_history text,
    is_del boolean DEFAULT false,
    not_used_since_date date,
    completerstaffname character varying(100)
);


ALTER TABLE png.equipment OWNER TO postgres;

--
-- Name: TABLE equipment; Type: COMMENT; Schema: png; Owner: postgres
--

COMMENT ON TABLE png.equipment IS 'Complete medical equipment inventory with technical specifications and maintenance history';


--
-- Name: equipment_equipment_id_seq; Type: SEQUENCE; Schema: png; Owner: postgres
--

CREATE SEQUENCE png.equipment_equipment_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE png.equipment_equipment_id_seq OWNER TO postgres;

--
-- Name: equipment_equipment_id_seq; Type: SEQUENCE OWNED BY; Schema: png; Owner: postgres
--

ALTER SEQUENCE png.equipment_equipment_id_seq OWNED BY png.equipment.equipment_id;


--
-- Name: equipment_telemetry; Type: TABLE; Schema: png; Owner: postgres
--

CREATE TABLE png.equipment_telemetry (
    telemetry_id integer NOT NULL,
    equipment_id integer,
    temperature numeric(5,2),
    battery_level numeric(5,2),
    signal_strength integer,
    recorded_at timestamp without time zone DEFAULT now()
);


ALTER TABLE png.equipment_telemetry OWNER TO postgres;

--
-- Name: equipment_telemetry_telemetry_id_seq; Type: SEQUENCE; Schema: png; Owner: postgres
--

CREATE SEQUENCE png.equipment_telemetry_telemetry_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE png.equipment_telemetry_telemetry_id_seq OWNER TO postgres;

--
-- Name: equipment_telemetry_telemetry_id_seq; Type: SEQUENCE OWNED BY; Schema: png; Owner: postgres
--

ALTER SEQUENCE png.equipment_telemetry_telemetry_id_seq OWNED BY png.equipment_telemetry.telemetry_id;


--
-- Name: escalation_paths; Type: TABLE; Schema: png; Owner: postgres
--

CREATE TABLE png.escalation_paths (
    path_id integer NOT NULL,
    from_level character varying(20) NOT NULL,
    to_level character varying(20) NOT NULL,
    auto_escalate_days integer,
    required_approval boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT escalation_paths_from_level_check CHECK (((from_level)::text = ANY ((ARRAY['facility'::character varying, 'district'::character varying, 'province'::character varying, 'region'::character varying, 'national'::character varying])::text[]))),
    CONSTRAINT escalation_paths_to_level_check CHECK (((to_level)::text = ANY ((ARRAY['facility'::character varying, 'district'::character varying, 'province'::character varying, 'region'::character varying, 'national'::character varying])::text[])))
);


ALTER TABLE png.escalation_paths OWNER TO postgres;

--
-- Name: escalation_paths_path_id_seq; Type: SEQUENCE; Schema: png; Owner: postgres
--

CREATE SEQUENCE png.escalation_paths_path_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE png.escalation_paths_path_id_seq OWNER TO postgres;

--
-- Name: escalation_paths_path_id_seq; Type: SEQUENCE OWNED BY; Schema: png; Owner: postgres
--

ALTER SEQUENCE png.escalation_paths_path_id_seq OWNED BY png.escalation_paths.path_id;


--
-- Name: facilities; Type: TABLE; Schema: png; Owner: postgres
--

CREATE TABLE png.facilities (
    facility_id integer NOT NULL,
    facility_name character varying(255) NOT NULL,
    facility_code character varying(50),
    region_id integer,
    province_id integer,
    district_id integer,
    gps_coordinates character varying(100),
    level integer,
    type character varying(100),
    is_functioning boolean DEFAULT true,
    ownership character varying(50),
    population_number integer,
    children_number integer,
    transport_mode character varying(50),
    power_source character varying(50),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone,
    geom public.geometry(Point,4326),
    latitude numeric(10,8),
    longitude numeric(11,8),
    address character varying(255),
    city character varying(100),
    postalcode character varying(20),
    email character varying(100),
    phone character varying(20),
    land_phone boolean,
    haveinternet boolean,
    roadtype character varying(10),
    distancefromparent numeric(10,2),
    timetoparent character varying(10),
    days_open integer,
    working_from character varying(10),
    working_to character varying(10),
    recieve_mode character varying(10),
    haveimmservice boolean,
    typeimmservice character varying(50),
    numimmperweek integer,
    havecovid19service boolean,
    coveragex1 character varying(10),
    coveragex2 character varying(10),
    coveragex3 character varying(10),
    coveragex4 character varying(10),
    individualsx1 integer,
    individualsx2 integer,
    individualsx3 integer,
    individualsx4 integer,
    number_icepack integer,
    other_service boolean,
    other_services character varying(255),
    is_suitable boolean,
    is_suitable_reason character varying(255),
    havegen boolean,
    maintance character varying(100),
    vac_num integer,
    total_staff integer,
    prof_staff integer,
    nurses integer,
    drivers integer,
    other_staff integer,
    completerstaffsign character varying(100),
    is_deleted boolean DEFAULT false,
    delete_reason character varying(255),
    other_code character varying(50),
    item_counter integer,
    country integer,
    parentid integer,
    zone character varying(50),
    powersource character varying(50),
    completerstaffname character varying(100)
);


ALTER TABLE png.facilities OWNER TO postgres;

--
-- Name: TABLE facilities; Type: COMMENT; Schema: png; Owner: postgres
--

COMMENT ON TABLE png.facilities IS 'Comprehensive healthcare facilities data with GPS coordinates and infrastructure details';


--
-- Name: facilities_facility_id_seq; Type: SEQUENCE; Schema: png; Owner: postgres
--

CREATE SEQUENCE png.facilities_facility_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE png.facilities_facility_id_seq OWNER TO postgres;

--
-- Name: facilities_facility_id_seq; Type: SEQUENCE OWNED BY; Schema: png; Owner: postgres
--

ALTER SEQUENCE png.facilities_facility_id_seq OWNED BY png.facilities.facility_id;


--
-- Name: facility_gps_status; Type: VIEW; Schema: png; Owner: postgres
--

CREATE VIEW png.facility_gps_status AS
 SELECT facility_id,
    facility_name,
    gps_coordinates,
        CASE
            WHEN ((gps_coordinates)::text ~* '^LatLng\([^)]+\)$'::text) THEN 'LatLng Format'::text
            WHEN ((gps_coordinates)::text ~~ '%,%'::text) THEN 'Comma Separated'::text
            ELSE 'Other Format'::text
        END AS gps_format,
    latitude,
    longitude,
    geom,
        CASE
            WHEN ((latitude IS NOT NULL) AND (longitude IS NOT NULL)) THEN 'Complete'::text
            WHEN ((gps_coordinates IS NOT NULL) AND ((gps_coordinates)::text <> ''::text)) THEN 'Has GPS Text'::text
            ELSE 'Missing'::text
        END AS status
   FROM png.facilities
  ORDER BY facility_id;


ALTER VIEW png.facility_gps_status OWNER TO postgres;

--
-- Name: fault_categories; Type: TABLE; Schema: png; Owner: postgres
--

CREATE TABLE png.fault_categories (
    category_id integer NOT NULL,
    category_code character varying(50) NOT NULL,
    category_name character varying(200) NOT NULL,
    description text,
    display_order integer
);


ALTER TABLE png.fault_categories OWNER TO postgres;

--
-- Name: TABLE fault_categories; Type: COMMENT; Schema: png; Owner: postgres
--

COMMENT ON TABLE png.fault_categories IS 'Categories of faults for equipment issues';


--
-- Name: fault_categories_category_id_seq; Type: SEQUENCE; Schema: png; Owner: postgres
--

CREATE SEQUENCE png.fault_categories_category_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE png.fault_categories_category_id_seq OWNER TO postgres;

--
-- Name: fault_categories_category_id_seq; Type: SEQUENCE OWNED BY; Schema: png; Owner: postgres
--

ALTER SEQUENCE png.fault_categories_category_id_seq OWNED BY png.fault_categories.category_id;


--
-- Name: fault_issues; Type: TABLE; Schema: png; Owner: postgres
--

CREATE TABLE png.fault_issues (
    issue_id integer NOT NULL,
    category_id integer,
    issue_name character varying(200) NOT NULL,
    issue_code character varying(100) NOT NULL,
    display_order integer
);


ALTER TABLE png.fault_issues OWNER TO postgres;

--
-- Name: TABLE fault_issues; Type: COMMENT; Schema: png; Owner: postgres
--

COMMENT ON TABLE png.fault_issues IS 'Specific fault issues within categories';


--
-- Name: fault_issues_issue_id_seq; Type: SEQUENCE; Schema: png; Owner: postgres
--

CREATE SEQUENCE png.fault_issues_issue_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE png.fault_issues_issue_id_seq OWNER TO postgres;

--
-- Name: fault_issues_issue_id_seq; Type: SEQUENCE OWNED BY; Schema: png; Owner: postgres
--

ALTER SEQUENCE png.fault_issues_issue_id_seq OWNED BY png.fault_issues.issue_id;


--
-- Name: group_permissions; Type: TABLE; Schema: png; Owner: postgres
--

CREATE TABLE png.group_permissions (
    group_permission_id integer NOT NULL,
    group_id integer NOT NULL,
    permission_id integer NOT NULL,
    is_allowed boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE png.group_permissions OWNER TO postgres;

--
-- Name: group_permissions_group_permission_id_seq; Type: SEQUENCE; Schema: png; Owner: postgres
--

CREATE SEQUENCE png.group_permissions_group_permission_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE png.group_permissions_group_permission_id_seq OWNER TO postgres;

--
-- Name: group_permissions_group_permission_id_seq; Type: SEQUENCE OWNED BY; Schema: png; Owner: postgres
--

ALTER SEQUENCE png.group_permissions_group_permission_id_seq OWNED BY png.group_permissions.group_permission_id;


--
-- Name: login_audit; Type: TABLE; Schema: png; Owner: postgres
--

CREATE TABLE png.login_audit (
    audit_id integer NOT NULL,
    login_attempted_at timestamp without time zone DEFAULT now(),
    login_input text,
    login_ip text,
    user_id integer,
    username character varying(255),
    email character varying(255),
    success boolean DEFAULT false,
    failure_reason text
);


ALTER TABLE png.login_audit OWNER TO postgres;

--
-- Name: login_audit_audit_id_seq; Type: SEQUENCE; Schema: png; Owner: postgres
--

CREATE SEQUENCE png.login_audit_audit_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE png.login_audit_audit_id_seq OWNER TO postgres;

--
-- Name: login_audit_audit_id_seq; Type: SEQUENCE OWNED BY; Schema: png; Owner: postgres
--

ALTER SEQUENCE png.login_audit_audit_id_seq OWNED BY png.login_audit.audit_id;


--
-- Name: maintenance_schedules; Type: TABLE; Schema: png; Owner: postgres
--

CREATE TABLE png.maintenance_schedules (
    schedule_id integer NOT NULL,
    equipment_id integer,
    frequency_days integer NOT NULL,
    last_performed date,
    next_due date,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE png.maintenance_schedules OWNER TO postgres;

--
-- Name: maintenance_schedules_schedule_id_seq; Type: SEQUENCE; Schema: png; Owner: postgres
--

CREATE SEQUENCE png.maintenance_schedules_schedule_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE png.maintenance_schedules_schedule_id_seq OWNER TO postgres;

--
-- Name: maintenance_schedules_schedule_id_seq; Type: SEQUENCE OWNED BY; Schema: png; Owner: postgres
--

ALTER SEQUENCE png.maintenance_schedules_schedule_id_seq OWNED BY png.maintenance_schedules.schedule_id;


--
-- Name: migrations; Type: TABLE; Schema: png; Owner: postgres
--

CREATE TABLE png.migrations (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    executed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE png.migrations OWNER TO postgres;

--
-- Name: migrations_id_seq; Type: SEQUENCE; Schema: png; Owner: postgres
--

CREATE SEQUENCE png.migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE png.migrations_id_seq OWNER TO postgres;

--
-- Name: migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: png; Owner: postgres
--

ALTER SEQUENCE png.migrations_id_seq OWNED BY png.migrations.id;


--
-- Name: mobile_devices; Type: TABLE; Schema: png; Owner: postgres
--

CREATE TABLE png.mobile_devices (
    device_id integer NOT NULL,
    user_id integer,
    device_uuid character varying(100),
    fcm_token text,
    platform character varying(20),
    app_version character varying(20),
    last_sync_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE png.mobile_devices OWNER TO postgres;

--
-- Name: mobile_devices_device_id_seq; Type: SEQUENCE; Schema: png; Owner: postgres
--

CREATE SEQUENCE png.mobile_devices_device_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE png.mobile_devices_device_id_seq OWNER TO postgres;

--
-- Name: mobile_devices_device_id_seq; Type: SEQUENCE OWNED BY; Schema: png; Owner: postgres
--

ALTER SEQUENCE png.mobile_devices_device_id_seq OWNED BY png.mobile_devices.device_id;


--
-- Name: notification_templates; Type: TABLE; Schema: png; Owner: postgres
--

CREATE TABLE png.notification_templates (
    template_id integer NOT NULL,
    template_name character varying(100) NOT NULL,
    subject character varying(255),
    message_body text,
    variables jsonb,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT now(),
    event_type character varying
);


ALTER TABLE png.notification_templates OWNER TO postgres;

--
-- Name: notification_templates_template_id_seq; Type: SEQUENCE; Schema: png; Owner: postgres
--

CREATE SEQUENCE png.notification_templates_template_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE png.notification_templates_template_id_seq OWNER TO postgres;

--
-- Name: notification_templates_template_id_seq; Type: SEQUENCE OWNED BY; Schema: png; Owner: postgres
--

ALTER SEQUENCE png.notification_templates_template_id_seq OWNED BY png.notification_templates.template_id;


--
-- Name: notifications; Type: TABLE; Schema: png; Owner: postgres
--

CREATE TABLE png.notifications (
    notification_id integer NOT NULL,
    ticket_id integer,
    recipient_user_id integer NOT NULL,
    message text NOT NULL,
    sent_on timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    is_read boolean DEFAULT false,
    link text,
    status character varying(20) DEFAULT 'pending'::character varying,
    notification_type public.notification_type_enum DEFAULT 'email'::public.notification_type_enum,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    sent_at timestamp with time zone,
    event_type public.notification_event_enum,
    priority character varying(20) DEFAULT 'medium'::character varying
);


ALTER TABLE png.notifications OWNER TO postgres;

--
-- Name: notifications_notification_id_seq; Type: SEQUENCE; Schema: png; Owner: postgres
--

CREATE SEQUENCE png.notifications_notification_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE png.notifications_notification_id_seq OWNER TO postgres;

--
-- Name: notifications_notification_id_seq; Type: SEQUENCE OWNED BY; Schema: png; Owner: postgres
--

ALTER SEQUENCE png.notifications_notification_id_seq OWNED BY png.notifications.notification_id;


--
-- Name: password_reset_tokens; Type: TABLE; Schema: png; Owner: postgres
--

CREATE TABLE png.password_reset_tokens (
    token_id integer NOT NULL,
    user_id integer NOT NULL,
    token character varying(255) NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    used boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE png.password_reset_tokens OWNER TO postgres;

--
-- Name: password_reset_tokens_token_id_seq; Type: SEQUENCE; Schema: png; Owner: postgres
--

CREATE SEQUENCE png.password_reset_tokens_token_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE png.password_reset_tokens_token_id_seq OWNER TO postgres;

--
-- Name: password_reset_tokens_token_id_seq; Type: SEQUENCE OWNED BY; Schema: png; Owner: postgres
--

ALTER SEQUENCE png.password_reset_tokens_token_id_seq OWNED BY png.password_reset_tokens.token_id;


--
-- Name: password_resets; Type: TABLE; Schema: png; Owner: postgres
--

CREATE TABLE png.password_resets (
    reset_id integer NOT NULL,
    user_id integer,
    token character varying(100) NOT NULL,
    expiry timestamp without time zone NOT NULL,
    used boolean DEFAULT false
);


ALTER TABLE png.password_resets OWNER TO postgres;

--
-- Name: password_resets_reset_id_seq; Type: SEQUENCE; Schema: png; Owner: postgres
--

CREATE SEQUENCE png.password_resets_reset_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE png.password_resets_reset_id_seq OWNER TO postgres;

--
-- Name: password_resets_reset_id_seq; Type: SEQUENCE OWNED BY; Schema: png; Owner: postgres
--

ALTER SEQUENCE png.password_resets_reset_id_seq OWNED BY png.password_resets.reset_id;


--
-- Name: permissions; Type: TABLE; Schema: png; Owner: postgres
--

CREATE TABLE png.permissions (
    permission_id integer NOT NULL,
    permission_name character varying(100) NOT NULL,
    description text,
    category character varying(50),
    resource text,
    action text,
    scope text,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE png.permissions OWNER TO postgres;

--
-- Name: permissions_permission_id_seq; Type: SEQUENCE; Schema: png; Owner: postgres
--

CREATE SEQUENCE png.permissions_permission_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE png.permissions_permission_id_seq OWNER TO postgres;

--
-- Name: permissions_permission_id_seq; Type: SEQUENCE OWNED BY; Schema: png; Owner: postgres
--

ALTER SEQUENCE png.permissions_permission_id_seq OWNED BY png.permissions.permission_id;


--
-- Name: provinces; Type: TABLE; Schema: png; Owner: postgres
--

CREATE TABLE png.provinces (
    province_id integer NOT NULL,
    province_name character varying(100) NOT NULL,
    region_id integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE png.provinces OWNER TO postgres;

--
-- Name: provinces_province_id_seq; Type: SEQUENCE; Schema: png; Owner: postgres
--

CREATE SEQUENCE png.provinces_province_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE png.provinces_province_id_seq OWNER TO postgres;

--
-- Name: provinces_province_id_seq; Type: SEQUENCE OWNED BY; Schema: png; Owner: postgres
--

ALTER SEQUENCE png.provinces_province_id_seq OWNED BY png.provinces.province_id;


--
-- Name: regions; Type: TABLE; Schema: png; Owner: postgres
--

CREATE TABLE png.regions (
    region_id integer NOT NULL,
    region_name character varying(100) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE png.regions OWNER TO postgres;

--
-- Name: regions_region_id_seq; Type: SEQUENCE; Schema: png; Owner: postgres
--

CREATE SEQUENCE png.regions_region_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE png.regions_region_id_seq OWNER TO postgres;

--
-- Name: regions_region_id_seq; Type: SEQUENCE OWNED BY; Schema: png; Owner: postgres
--

ALTER SEQUENCE png.regions_region_id_seq OWNED BY png.regions.region_id;


--
-- Name: repair_attachments; Type: TABLE; Schema: png; Owner: postgres
--

CREATE TABLE png.repair_attachments (
    attachment_id integer NOT NULL,
    repair_id integer,
    file_url text,
    file_type character varying(50),
    uploaded_at timestamp without time zone DEFAULT now()
);


ALTER TABLE png.repair_attachments OWNER TO postgres;

--
-- Name: repair_attachments_attachment_id_seq; Type: SEQUENCE; Schema: png; Owner: postgres
--

CREATE SEQUENCE png.repair_attachments_attachment_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE png.repair_attachments_attachment_id_seq OWNER TO postgres;

--
-- Name: repair_attachments_attachment_id_seq; Type: SEQUENCE OWNED BY; Schema: png; Owner: postgres
--

ALTER SEQUENCE png.repair_attachments_attachment_id_seq OWNED BY png.repair_attachments.attachment_id;


--
-- Name: repairs; Type: TABLE; Schema: png; Owner: postgres
--

CREATE TABLE png.repairs (
    repair_id integer NOT NULL,
    ticket_id integer NOT NULL,
    selected_equipment_id integer NOT NULL,
    facility_id integer NOT NULL,
    repair_date date DEFAULT CURRENT_DATE NOT NULL,
    technician_name character varying(150),
    technician_email character varying(150),
    technician_phone character varying(50),
    repair_description text,
    parts_used text,
    parts_cost numeric(12,2),
    labour_cost numeric(12,2),
    total_cost numeric(12,2) GENERATED ALWAYS AS ((COALESCE(parts_cost, (0)::numeric) + COALESCE(labour_cost, (0)::numeric))) STORED,
    downtime_days integer,
    status character varying(50) DEFAULT 'Completed'::character varying,
    comments text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    created_by integer
);


ALTER TABLE png.repairs OWNER TO postgres;

--
-- Name: repairs_repair_id_seq; Type: SEQUENCE; Schema: png; Owner: postgres
--

CREATE SEQUENCE png.repairs_repair_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE png.repairs_repair_id_seq OWNER TO postgres;

--
-- Name: repairs_repair_id_seq; Type: SEQUENCE OWNED BY; Schema: png; Owner: postgres
--

ALTER SEQUENCE png.repairs_repair_id_seq OWNED BY png.repairs.repair_id;


--
-- Name: role_location_access; Type: TABLE; Schema: png; Owner: postgres
--

CREATE TABLE png.role_location_access (
    id integer NOT NULL,
    role_id integer,
    region_id integer,
    province_id integer,
    district_id integer,
    facility_id integer
);


ALTER TABLE png.role_location_access OWNER TO postgres;

--
-- Name: role_location_access_id_seq; Type: SEQUENCE; Schema: png; Owner: postgres
--

CREATE SEQUENCE png.role_location_access_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE png.role_location_access_id_seq OWNER TO postgres;

--
-- Name: role_location_access_id_seq; Type: SEQUENCE OWNED BY; Schema: png; Owner: postgres
--

ALTER SEQUENCE png.role_location_access_id_seq OWNED BY png.role_location_access.id;


--
-- Name: role_permissions; Type: TABLE; Schema: png; Owner: postgres
--

CREATE TABLE png.role_permissions (
    role_permission_id integer NOT NULL,
    role_id integer NOT NULL,
    permission_id integer NOT NULL,
    is_allowed boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE png.role_permissions OWNER TO postgres;

--
-- Name: role_permissions_role_permission_id_seq; Type: SEQUENCE; Schema: png; Owner: postgres
--

CREATE SEQUENCE png.role_permissions_role_permission_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE png.role_permissions_role_permission_id_seq OWNER TO postgres;

--
-- Name: role_permissions_role_permission_id_seq; Type: SEQUENCE OWNED BY; Schema: png; Owner: postgres
--

ALTER SEQUENCE png.role_permissions_role_permission_id_seq OWNED BY png.role_permissions.role_permission_id;


--
-- Name: roles; Type: TABLE; Schema: png; Owner: postgres
--

CREATE TABLE png.roles (
    role_id integer NOT NULL,
    role_name character varying(50) NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at date,
    is_system_role boolean DEFAULT false
);


ALTER TABLE png.roles OWNER TO postgres;

--
-- Name: roles_role_id_seq; Type: SEQUENCE; Schema: png; Owner: postgres
--

CREATE SEQUENCE png.roles_role_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE png.roles_role_id_seq OWNER TO postgres;

--
-- Name: roles_role_id_seq; Type: SEQUENCE OWNED BY; Schema: png; Owner: postgres
--

ALTER SEQUENCE png.roles_role_id_seq OWNED BY png.roles.role_id;


--
-- Name: sla_policies; Type: TABLE; Schema: png; Owner: postgres
--

CREATE TABLE png.sla_policies (
    policy_id integer NOT NULL,
    priority character varying(20) NOT NULL,
    resolution_time_hours integer NOT NULL,
    escalation_time_hours integer NOT NULL,
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE png.sla_policies OWNER TO postgres;

--
-- Name: sla_policies_policy_id_seq; Type: SEQUENCE; Schema: png; Owner: postgres
--

CREATE SEQUENCE png.sla_policies_policy_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE png.sla_policies_policy_id_seq OWNER TO postgres;

--
-- Name: sla_policies_policy_id_seq; Type: SEQUENCE OWNED BY; Schema: png; Owner: postgres
--

ALTER SEQUENCE png.sla_policies_policy_id_seq OWNED BY png.sla_policies.policy_id;


--
-- Name: sla_settings; Type: TABLE; Schema: png; Owner: postgres
--

CREATE TABLE png.sla_settings (
    priority public.priority_enum NOT NULL,
    sla_days integer NOT NULL
);


ALTER TABLE png.sla_settings OWNER TO postgres;

--
-- Name: spareparts; Type: TABLE; Schema: png; Owner: postgres
--

CREATE TABLE png.spareparts (
    sparepart_id integer NOT NULL,
    sparepart_name text NOT NULL,
    part_number text,
    unit text,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    description text,
    cost numeric(12,2),
    category character varying(100),
    manufacturer character varying(255),
    model character varying(255),
    compatible_equipment character varying(255),
    storage_location character varying(255),
    is_critical boolean DEFAULT false,
    reorder_level integer DEFAULT 0,
    last_updated timestamp without time zone DEFAULT now(),
    currency character varying(10) DEFAULT 'USD'::character varying,
    remarks text
);


ALTER TABLE png.spareparts OWNER TO postgres;

--
-- Name: spareparts_sparepart_id_seq; Type: SEQUENCE; Schema: png; Owner: postgres
--

CREATE SEQUENCE png.spareparts_sparepart_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE png.spareparts_sparepart_id_seq OWNER TO postgres;

--
-- Name: spareparts_sparepart_id_seq; Type: SEQUENCE OWNED BY; Schema: png; Owner: postgres
--

ALTER SEQUENCE png.spareparts_sparepart_id_seq OWNED BY png.spareparts.sparepart_id;


--
-- Name: sync_log; Type: TABLE; Schema: png; Owner: postgres
--

CREATE TABLE png.sync_log (
    id integer NOT NULL,
    device_id character varying(255) NOT NULL,
    sync_type public.sync_type_enum NOT NULL,
    items_count integer NOT NULL,
    sync_start timestamp without time zone NOT NULL,
    sync_end timestamp without time zone NOT NULL,
    status character varying(20) NOT NULL
);


ALTER TABLE png.sync_log OWNER TO postgres;

--
-- Name: sync_log_id_seq; Type: SEQUENCE; Schema: png; Owner: postgres
--

CREATE SEQUENCE png.sync_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE png.sync_log_id_seq OWNER TO postgres;

--
-- Name: sync_log_id_seq; Type: SEQUENCE OWNED BY; Schema: png; Owner: postgres
--

ALTER SEQUENCE png.sync_log_id_seq OWNED BY png.sync_log.id;


--
-- Name: sync_sessions; Type: TABLE; Schema: png; Owner: postgres
--

CREATE TABLE png.sync_sessions (
    session_id integer NOT NULL,
    device_id character varying(255) NOT NULL,
    user_id integer,
    sync_start timestamp without time zone NOT NULL,
    sync_end timestamp without time zone,
    records_synced integer,
    sync_status character varying(20),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE png.sync_sessions OWNER TO postgres;

--
-- Name: sync_sessions_session_id_seq; Type: SEQUENCE; Schema: png; Owner: postgres
--

CREATE SEQUENCE png.sync_sessions_session_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE png.sync_sessions_session_id_seq OWNER TO postgres;

--
-- Name: sync_sessions_session_id_seq; Type: SEQUENCE OWNED BY; Schema: png; Owner: postgres
--

ALTER SEQUENCE png.sync_sessions_session_id_seq OWNED BY png.sync_sessions.session_id;


--
-- Name: technicians; Type: TABLE; Schema: png; Owner: postgres
--

CREATE TABLE png.technicians (
    technician_id integer NOT NULL,
    full_name character varying(150),
    email character varying(150),
    phone character varying(50),
    role character varying(50),
    user_id integer,
    assigned_facility_id integer,
    assigned_district_id integer,
    assigned_province_id integer,
    assigned_region_id integer
);


ALTER TABLE png.technicians OWNER TO postgres;

--
-- Name: technicians_technician_id_seq; Type: SEQUENCE; Schema: png; Owner: postgres
--

CREATE SEQUENCE png.technicians_technician_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE png.technicians_technician_id_seq OWNER TO postgres;

--
-- Name: technicians_technician_id_seq; Type: SEQUENCE OWNED BY; Schema: png; Owner: postgres
--

ALTER SEQUENCE png.technicians_technician_id_seq OWNED BY png.technicians.technician_id;


--
-- Name: ticket_activity_log; Type: TABLE; Schema: png; Owner: postgres
--

CREATE TABLE png.ticket_activity_log (
    log_id integer NOT NULL,
    ticket_id integer,
    action_by integer,
    action character varying(50),
    details text,
    "timestamp" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE png.ticket_activity_log OWNER TO postgres;

--
-- Name: ticket_activity_log_log_id_seq; Type: SEQUENCE; Schema: png; Owner: postgres
--

CREATE SEQUENCE png.ticket_activity_log_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE png.ticket_activity_log_log_id_seq OWNER TO postgres;

--
-- Name: ticket_activity_log_log_id_seq; Type: SEQUENCE OWNED BY; Schema: png; Owner: postgres
--

ALTER SEQUENCE png.ticket_activity_log_log_id_seq OWNED BY png.ticket_activity_log.log_id;


--
-- Name: ticket_escalations; Type: TABLE; Schema: png; Owner: postgres
--

CREATE TABLE png.ticket_escalations (
    escalation_id integer NOT NULL,
    ticket_id integer NOT NULL,
    from_user_id integer,
    to_user_id integer,
    from_level character varying(20),
    to_level character varying(20),
    reason text,
    escalation_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    status character varying(20) DEFAULT 'pending'::character varying,
    CONSTRAINT ticket_escalations_from_level_check CHECK (((from_level)::text = ANY ((ARRAY['facility'::character varying, 'district'::character varying, 'province'::character varying, 'region'::character varying, 'national'::character varying])::text[]))),
    CONSTRAINT ticket_escalations_to_level_check CHECK (((to_level)::text = ANY ((ARRAY['facility'::character varying, 'district'::character varying, 'province'::character varying, 'region'::character varying, 'national'::character varying])::text[])))
);


ALTER TABLE png.ticket_escalations OWNER TO postgres;

--
-- Name: ticket_escalations_escalation_id_seq; Type: SEQUENCE; Schema: png; Owner: postgres
--

CREATE SEQUENCE png.ticket_escalations_escalation_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE png.ticket_escalations_escalation_id_seq OWNER TO postgres;

--
-- Name: ticket_escalations_escalation_id_seq; Type: SEQUENCE OWNED BY; Schema: png; Owner: postgres
--

ALTER SEQUENCE png.ticket_escalations_escalation_id_seq OWNED BY png.ticket_escalations.escalation_id;


--
-- Name: ticket_fault_issues; Type: TABLE; Schema: png; Owner: postgres
--

CREATE TABLE png.ticket_fault_issues (
    ticket_fault_issue_id integer NOT NULL,
    ticket_id integer,
    issue_id integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE png.ticket_fault_issues OWNER TO postgres;

--
-- Name: TABLE ticket_fault_issues; Type: COMMENT; Schema: png; Owner: postgres
--

COMMENT ON TABLE png.ticket_fault_issues IS 'Links tickets to multiple fault issues (many-to-many)';


--
-- Name: ticket_fault_issues_ticket_fault_issue_id_seq; Type: SEQUENCE; Schema: png; Owner: postgres
--

CREATE SEQUENCE png.ticket_fault_issues_ticket_fault_issue_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE png.ticket_fault_issues_ticket_fault_issue_id_seq OWNER TO postgres;

--
-- Name: ticket_fault_issues_ticket_fault_issue_id_seq; Type: SEQUENCE OWNED BY; Schema: png; Owner: postgres
--

ALTER SEQUENCE png.ticket_fault_issues_ticket_fault_issue_id_seq OWNED BY png.ticket_fault_issues.ticket_fault_issue_id;


--
-- Name: ticket_interactions; Type: TABLE; Schema: png; Owner: postgres
--

CREATE TABLE png.ticket_interactions (
    interaction_id integer NOT NULL,
    ticket_id integer NOT NULL,
    user_id integer,
    action_type character varying(50) NOT NULL,
    details text,
    interaction_timestamp timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE png.ticket_interactions OWNER TO postgres;

--
-- Name: ticket_interactions_interaction_id_seq; Type: SEQUENCE; Schema: png; Owner: postgres
--

CREATE SEQUENCE png.ticket_interactions_interaction_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE png.ticket_interactions_interaction_id_seq OWNER TO postgres;

--
-- Name: ticket_interactions_interaction_id_seq; Type: SEQUENCE OWNED BY; Schema: png; Owner: postgres
--

ALTER SEQUENCE png.ticket_interactions_interaction_id_seq OWNED BY png.ticket_interactions.interaction_id;


--
-- Name: ticket_spare_parts; Type: TABLE; Schema: png; Owner: postgres
--

CREATE TABLE png.ticket_spare_parts (
    id integer NOT NULL,
    ticket_id integer,
    sparepart_id integer,
    quantity integer DEFAULT 1,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE png.ticket_spare_parts OWNER TO postgres;

--
-- Name: ticket_spare_parts_id_seq; Type: SEQUENCE; Schema: png; Owner: postgres
--

CREATE SEQUENCE png.ticket_spare_parts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE png.ticket_spare_parts_id_seq OWNER TO postgres;

--
-- Name: ticket_spare_parts_id_seq; Type: SEQUENCE OWNED BY; Schema: png; Owner: postgres
--

ALTER SEQUENCE png.ticket_spare_parts_id_seq OWNED BY png.ticket_spare_parts.id;


--
-- Name: ticket_spareparts; Type: TABLE; Schema: png; Owner: postgres
--

CREATE TABLE png.ticket_spareparts (
    id integer NOT NULL,
    ticket_id integer,
    sparepart_id integer,
    quantity_used numeric DEFAULT 1,
    notes text,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE png.ticket_spareparts OWNER TO postgres;

--
-- Name: ticket_spareparts_id_seq; Type: SEQUENCE; Schema: png; Owner: postgres
--

CREATE SEQUENCE png.ticket_spareparts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE png.ticket_spareparts_id_seq OWNER TO postgres;

--
-- Name: ticket_spareparts_id_seq; Type: SEQUENCE OWNED BY; Schema: png; Owner: postgres
--

ALTER SEQUENCE png.ticket_spareparts_id_seq OWNED BY png.ticket_spareparts.id;


--
-- Name: ticket_transactions; Type: TABLE; Schema: png; Owner: postgres
--

CREATE TABLE png.ticket_transactions (
    transaction_id integer NOT NULL,
    ticket_id integer NOT NULL,
    action_type character varying(50) NOT NULL,
    action_by integer,
    action_to integer,
    old_status character varying(50),
    new_status character varying(50),
    remarks text,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE png.ticket_transactions OWNER TO postgres;

--
-- Name: ticket_transactions_transaction_id_seq; Type: SEQUENCE; Schema: png; Owner: postgres
--

CREATE SEQUENCE png.ticket_transactions_transaction_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE png.ticket_transactions_transaction_id_seq OWNER TO postgres;

--
-- Name: ticket_transactions_transaction_id_seq; Type: SEQUENCE OWNED BY; Schema: png; Owner: postgres
--

ALTER SEQUENCE png.ticket_transactions_transaction_id_seq OWNED BY png.ticket_transactions.transaction_id;


--
-- Name: tickets; Type: TABLE; Schema: png; Owner: postgres
--

CREATE TABLE png.tickets (
    ticket_id integer NOT NULL,
    ticket_reference_number character varying(50),
    region_id integer,
    province_id integer,
    district_id integer,
    facility_id integer NOT NULL,
    selected_equipment_id integer,
    date_of_reporting date,
    reported_by_name character varying(255),
    reported_by_phone character varying(50),
    reported_by_email character varying(255),
    fault_status character varying(50),
    fault_description text,
    parts_required character varying(50),
    parts_used character varying(50),
    equipment_manufacturer character varying(255),
    equipment_model character varying(255),
    equipment_serial_number character varying(255),
    equipment_refrigerant_gas character varying(255),
    priority public.priority_enum DEFAULT 'Medium'::public.priority_enum,
    created_by character varying(255),
    assigned_to integer,
    completion_date date,
    downtime_days integer,
    comments text,
    part_id integer,
    local_id character varying(36),
    sync_status character varying(20) DEFAULT 'pending'::character varying,
    last_sync_attempt timestamp without time zone,
    sync_error text,
    device_id character varying(255),
    offline_id character varying(36),
    is_offline boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    has_repair boolean DEFAULT false,
    repair_id integer,
    assigned_to_name character varying(150),
    assigned_to_email character varying(150),
    assigned_to_phone character varying(50),
    date_assigned date,
    assignment_status character varying(50) DEFAULT 'Pending'::character varying,
    escalated_to integer,
    escalation_reason text,
    findings text,
    actions_taken text,
    notes text,
    closure_status text,
    technician_email text,
    technician_phone text,
    closed_at timestamp without time zone,
    close_resolution_status character varying(20),
    is_deleted boolean DEFAULT false,
    escalation_level character varying(20),
    created_via character varying(20) DEFAULT 'Web'::character varying,
    is_synced boolean DEFAULT true,
    sms_trigger_id character varying(50),
    is_overdue boolean DEFAULT false,
    last_updated_at timestamp without time zone DEFAULT now(),
    region_name character varying(255),
    province_name character varying(255),
    district_name character varying(255),
    date_started_work timestamp without time zone,
    date_escalated timestamp without time zone,
    date_resolved timestamp without time zone,
    days_created_to_assigned numeric(10,2),
    days_assigned_to_started numeric(10,2),
    days_started_to_resolved numeric(10,2),
    sla_due_date timestamp without time zone,
    total_days_open numeric(10,2),
    escalated_to_name character varying(255),
    sla_due_at timestamp without time zone,
    ticket_status public.ticket_status_enum DEFAULT 'New'::public.ticket_status_enum,
    equipment_functional_status public.equipment_functional_status,
    resolution_notes text,
    CONSTRAINT close_resolution_status_check CHECK ((((close_resolution_status)::text = ANY ((ARRAY['Resolved'::character varying, 'Unresolved'::character varying])::text[])) OR (close_resolution_status IS NULL)))
);


ALTER TABLE png.tickets OWNER TO postgres;

--
-- Name: COLUMN tickets.escalation_level; Type: COMMENT; Schema: png; Owner: postgres
--

COMMENT ON COLUMN png.tickets.escalation_level IS 'Level to which ticket was escalated (Provincial, Regional, National)';


--
-- Name: COLUMN tickets.date_started_work; Type: COMMENT; Schema: png; Owner: postgres
--

COMMENT ON COLUMN png.tickets.date_started_work IS 'Timestamp when technician started working on the ticket';


--
-- Name: COLUMN tickets.date_escalated; Type: COMMENT; Schema: png; Owner: postgres
--

COMMENT ON COLUMN png.tickets.date_escalated IS 'Timestamp when ticket was escalated';


--
-- Name: COLUMN tickets.date_resolved; Type: COMMENT; Schema: png; Owner: postgres
--

COMMENT ON COLUMN png.tickets.date_resolved IS 'Timestamp when ticket was resolved';


--
-- Name: COLUMN tickets.days_created_to_assigned; Type: COMMENT; Schema: png; Owner: postgres
--

COMMENT ON COLUMN png.tickets.days_created_to_assigned IS 'Days between ticket creation and assignment';


--
-- Name: COLUMN tickets.days_assigned_to_started; Type: COMMENT; Schema: png; Owner: postgres
--

COMMENT ON COLUMN png.tickets.days_assigned_to_started IS 'Days between assignment and work start';


--
-- Name: COLUMN tickets.days_started_to_resolved; Type: COMMENT; Schema: png; Owner: postgres
--

COMMENT ON COLUMN png.tickets.days_started_to_resolved IS 'Days between work start and resolution';


--
-- Name: COLUMN tickets.sla_due_date; Type: COMMENT; Schema: png; Owner: postgres
--

COMMENT ON COLUMN png.tickets.sla_due_date IS 'Calculated due date based on ticket priority and SLA rules';


--
-- Name: COLUMN tickets.total_days_open; Type: COMMENT; Schema: png; Owner: postgres
--

COMMENT ON COLUMN png.tickets.total_days_open IS 'Total days ticket has been open';


--
-- Name: tickets_ticket_id_seq; Type: SEQUENCE; Schema: png; Owner: postgres
--

CREATE SEQUENCE png.tickets_ticket_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE png.tickets_ticket_id_seq OWNER TO postgres;

--
-- Name: tickets_ticket_id_seq; Type: SEQUENCE OWNED BY; Schema: png; Owner: postgres
--

ALTER SEQUENCE png.tickets_ticket_id_seq OWNED BY png.tickets.ticket_id;


--
-- Name: user_audit_log; Type: TABLE; Schema: png; Owner: postgres
--

CREATE TABLE png.user_audit_log (
    id integer NOT NULL,
    user_id integer,
    action character varying(100),
    details jsonb,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE png.user_audit_log OWNER TO postgres;

--
-- Name: user_audit_log_id_seq; Type: SEQUENCE; Schema: png; Owner: postgres
--

CREATE SEQUENCE png.user_audit_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE png.user_audit_log_id_seq OWNER TO postgres;

--
-- Name: user_audit_log_id_seq; Type: SEQUENCE OWNED BY; Schema: png; Owner: postgres
--

ALTER SEQUENCE png.user_audit_log_id_seq OWNED BY png.user_audit_log.id;


--
-- Name: user_group_assignments; Type: TABLE; Schema: png; Owner: postgres
--

CREATE TABLE png.user_group_assignments (
    user_id integer NOT NULL,
    group_id integer NOT NULL
);


ALTER TABLE png.user_group_assignments OWNER TO postgres;

--
-- Name: user_group_members; Type: TABLE; Schema: png; Owner: postgres
--

CREATE TABLE png.user_group_members (
    group_id integer NOT NULL,
    user_id integer NOT NULL,
    added_at timestamp without time zone DEFAULT now()
);


ALTER TABLE png.user_group_members OWNER TO postgres;

--
-- Name: user_group_membership; Type: TABLE; Schema: png; Owner: postgres
--

CREATE TABLE png.user_group_membership (
    membership_id integer NOT NULL,
    user_id integer NOT NULL,
    group_id integer NOT NULL,
    assigned_at timestamp without time zone DEFAULT now()
);


ALTER TABLE png.user_group_membership OWNER TO postgres;

--
-- Name: user_group_membership_membership_id_seq; Type: SEQUENCE; Schema: png; Owner: postgres
--

CREATE SEQUENCE png.user_group_membership_membership_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE png.user_group_membership_membership_id_seq OWNER TO postgres;

--
-- Name: user_group_membership_membership_id_seq; Type: SEQUENCE OWNED BY; Schema: png; Owner: postgres
--

ALTER SEQUENCE png.user_group_membership_membership_id_seq OWNED BY png.user_group_membership.membership_id;


--
-- Name: user_groups; Type: TABLE; Schema: png; Owner: postgres
--

CREATE TABLE png.user_groups (
    group_id integer NOT NULL,
    group_name character varying(100) NOT NULL,
    description text,
    role_id integer,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE png.user_groups OWNER TO postgres;

--
-- Name: user_groups_group_id_seq; Type: SEQUENCE; Schema: png; Owner: postgres
--

CREATE SEQUENCE png.user_groups_group_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE png.user_groups_group_id_seq OWNER TO postgres;

--
-- Name: user_groups_group_id_seq; Type: SEQUENCE OWNED BY; Schema: png; Owner: postgres
--

ALTER SEQUENCE png.user_groups_group_id_seq OWNED BY png.user_groups.group_id;


--
-- Name: user_locations; Type: TABLE; Schema: png; Owner: postgres
--

CREATE TABLE png.user_locations (
    id integer NOT NULL,
    user_id integer,
    region_id integer,
    province_id integer,
    district_id integer,
    facility_id integer
);


ALTER TABLE png.user_locations OWNER TO postgres;

--
-- Name: user_locations_id_seq; Type: SEQUENCE; Schema: png; Owner: postgres
--

CREATE SEQUENCE png.user_locations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE png.user_locations_id_seq OWNER TO postgres;

--
-- Name: user_locations_id_seq; Type: SEQUENCE OWNED BY; Schema: png; Owner: postgres
--

ALTER SEQUENCE png.user_locations_id_seq OWNED BY png.user_locations.id;


--
-- Name: user_notification_preferences; Type: TABLE; Schema: png; Owner: postgres
--

CREATE TABLE png.user_notification_preferences (
    user_id integer NOT NULL,
    email_enabled boolean DEFAULT true,
    sms_enabled boolean DEFAULT false,
    whatsapp_enabled boolean DEFAULT false,
    in_app_enabled boolean DEFAULT true,
    digest_frequency character varying(20) DEFAULT 'immediate'::character varying,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE png.user_notification_preferences OWNER TO postgres;

--
-- Name: user_otps; Type: TABLE; Schema: png; Owner: postgres
--

CREATE TABLE png.user_otps (
    otp_id integer NOT NULL,
    user_id integer NOT NULL,
    otp_code character varying(10) NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    is_used boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE png.user_otps OWNER TO postgres;

--
-- Name: user_otps_otp_id_seq; Type: SEQUENCE; Schema: png; Owner: postgres
--

CREATE SEQUENCE png.user_otps_otp_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE png.user_otps_otp_id_seq OWNER TO postgres;

--
-- Name: user_otps_otp_id_seq; Type: SEQUENCE OWNED BY; Schema: png; Owner: postgres
--

ALTER SEQUENCE png.user_otps_otp_id_seq OWNED BY png.user_otps.otp_id;


--
-- Name: user_permission_overrides; Type: TABLE; Schema: png; Owner: postgres
--

CREATE TABLE png.user_permission_overrides (
    override_id integer NOT NULL,
    user_id integer NOT NULL,
    permission_id integer NOT NULL,
    override_type character varying(10) DEFAULT 'add'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE png.user_permission_overrides OWNER TO postgres;

--
-- Name: user_permission_overrides_override_id_seq; Type: SEQUENCE; Schema: png; Owner: postgres
--

CREATE SEQUENCE png.user_permission_overrides_override_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE png.user_permission_overrides_override_id_seq OWNER TO postgres;

--
-- Name: user_permission_overrides_override_id_seq; Type: SEQUENCE OWNED BY; Schema: png; Owner: postgres
--

ALTER SEQUENCE png.user_permission_overrides_override_id_seq OWNED BY png.user_permission_overrides.override_id;


--
-- Name: user_permissions; Type: TABLE; Schema: png; Owner: postgres
--

CREATE TABLE png.user_permissions (
    user_id integer NOT NULL,
    permission_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE png.user_permissions OWNER TO postgres;

--
-- Name: user_roles; Type: TABLE; Schema: png; Owner: postgres
--

CREATE TABLE png.user_roles (
    user_id integer NOT NULL,
    role_id integer NOT NULL,
    assigned_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE png.user_roles OWNER TO postgres;

--
-- Name: user_scopes; Type: TABLE; Schema: png; Owner: postgres
--

CREATE TABLE png.user_scopes (
    id integer NOT NULL,
    user_id integer NOT NULL,
    region_id integer,
    province_id integer,
    district_id integer,
    facility_id integer,
    created_at timestamp without time zone DEFAULT now(),
    CONSTRAINT one_scope_per_row CHECK ((((region_id IS NOT NULL) AND (province_id IS NULL) AND (district_id IS NULL) AND (facility_id IS NULL)) OR ((region_id IS NULL) AND (province_id IS NOT NULL) AND (district_id IS NULL) AND (facility_id IS NULL)) OR ((region_id IS NULL) AND (province_id IS NULL) AND (district_id IS NOT NULL) AND (facility_id IS NULL)) OR ((region_id IS NULL) AND (province_id IS NULL) AND (district_id IS NULL) AND (facility_id IS NOT NULL))))
);


ALTER TABLE png.user_scopes OWNER TO postgres;

--
-- Name: user_scopes_id_seq; Type: SEQUENCE; Schema: png; Owner: postgres
--

CREATE SEQUENCE png.user_scopes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE png.user_scopes_id_seq OWNER TO postgres;

--
-- Name: user_scopes_id_seq; Type: SEQUENCE OWNED BY; Schema: png; Owner: postgres
--

ALTER SEQUENCE png.user_scopes_id_seq OWNED BY png.user_scopes.id;


--
-- Name: users; Type: TABLE; Schema: png; Owner: postgres
--

CREATE TABLE png.users (
    user_id integer NOT NULL,
    username character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    first_name character varying(255),
    last_name character varying(255),
    phone_number character varying(50),
    title character varying(100),
    is_active boolean DEFAULT true,
    assigned_region_id integer,
    assigned_province_id integer,
    assigned_district_id integer,
    assigned_facility_id integer,
    is_national_access boolean DEFAULT false,
    profile text,
    photo character varying(255),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone,
    last_login timestamp without time zone,
    accessible_regions integer[],
    accessible_provinces integer[],
    accessible_districts integer[],
    accessible_facilities integer[],
    escalation_level character varying(20) DEFAULT 'facility'::character varying,
    can_escalate_to text[] DEFAULT '{}'::text[],
    role_id integer,
    password_hash text,
    must_change_password boolean DEFAULT false,
    password text,
    password_reset_required boolean DEFAULT false,
    notification_preferences jsonb DEFAULT '{"sms": false, "email": true, "inApp": true, "whatsapp": false, "sla_breach": true, "ticket_created": true, "ticket_assigned": true, "ticket_resolved": true, "ticket_escalated": true}'::jsonb,
    CONSTRAINT ck_location_scope_v2 CHECK ((((is_national_access = true) AND (COALESCE(assigned_region_id, assigned_province_id, assigned_district_id, assigned_facility_id) IS NULL)) OR (is_national_access = false)))
);


ALTER TABLE png.users OWNER TO postgres;

--
-- Name: COLUMN users.is_national_access; Type: COMMENT; Schema: png; Owner: postgres
--

COMMENT ON COLUMN png.users.is_national_access IS 'Flag indicating if user has national-level access';


--
-- Name: COLUMN users.accessible_regions; Type: COMMENT; Schema: png; Owner: postgres
--

COMMENT ON COLUMN png.users.accessible_regions IS 'Array of region IDs user can access';


--
-- Name: COLUMN users.accessible_provinces; Type: COMMENT; Schema: png; Owner: postgres
--

COMMENT ON COLUMN png.users.accessible_provinces IS 'Array of province IDs user can access';


--
-- Name: COLUMN users.accessible_districts; Type: COMMENT; Schema: png; Owner: postgres
--

COMMENT ON COLUMN png.users.accessible_districts IS 'Array of district IDs user can access';


--
-- Name: COLUMN users.accessible_facilities; Type: COMMENT; Schema: png; Owner: postgres
--

COMMENT ON COLUMN png.users.accessible_facilities IS 'Array of facility IDs user can access';


--
-- Name: COLUMN users.notification_preferences; Type: COMMENT; Schema: png; Owner: postgres
--

COMMENT ON COLUMN png.users.notification_preferences IS 'JSON storing user notification channel preferences';


--
-- Name: users_user_id_seq; Type: SEQUENCE; Schema: png; Owner: postgres
--

CREATE SEQUENCE png.users_user_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE png.users_user_id_seq OWNER TO postgres;

--
-- Name: users_user_id_seq; Type: SEQUENCE OWNED BY; Schema: png; Owner: postgres
--

ALTER SEQUENCE png.users_user_id_seq OWNED BY png.users.user_id;


--
-- Name: v_user_access; Type: VIEW; Schema: png; Owner: postgres
--

CREATE VIEW png.v_user_access AS
 SELECT u.user_id,
    r.role_id,
    r.role_name,
    p.permission_id,
    p.permission_name,
    p.category,
    p.resource,
    p.action,
    p.scope
   FROM ((((png.users u
     LEFT JOIN png.user_roles ur ON ((ur.user_id = u.user_id)))
     LEFT JOIN png.roles r ON ((r.role_id = ur.role_id)))
     LEFT JOIN png.role_permissions rp ON (((rp.role_id = r.role_id) AND (rp.is_allowed = true))))
     LEFT JOIN png.permissions p ON ((p.permission_id = rp.permission_id)))
UNION
 SELECT up.user_id,
    u.role_id,
    r.role_name,
    p.permission_id,
    p.permission_name,
    p.category,
    p.resource,
    p.action,
    p.scope
   FROM (((png.user_permissions up
     LEFT JOIN png.users u ON ((u.user_id = up.user_id)))
     LEFT JOIN png.roles r ON ((r.role_id = u.role_id)))
     LEFT JOIN png.permissions p ON ((p.permission_id = up.permission_id)));


ALTER VIEW png.v_user_access OWNER TO postgres;

--
-- Name: v_user_access_summary; Type: VIEW; Schema: png; Owner: postgres
--

CREATE VIEW png.v_user_access_summary AS
 SELECT u.user_id,
    u.username,
    u.email,
    r.role_name,
    g.group_name,
    p.permission_name,
    p.category,
    p.resource,
    p.action,
    p.scope
   FROM ((((((png.users u
     LEFT JOIN png.user_roles ur ON ((ur.user_id = u.user_id)))
     LEFT JOIN png.roles r ON ((ur.role_id = r.role_id)))
     LEFT JOIN png.user_group_members gm ON ((gm.user_id = u.user_id)))
     LEFT JOIN png.user_groups g ON ((gm.group_id = g.group_id)))
     LEFT JOIN png.user_permissions up ON ((up.user_id = u.user_id)))
     LEFT JOIN png.permissions p ON ((up.permission_id = p.permission_id)));


ALTER VIEW png.v_user_access_summary OWNER TO postgres;

--
-- Name: v_user_roles; Type: VIEW; Schema: png; Owner: postgres
--

CREATE VIEW png.v_user_roles AS
 SELECT ur.user_id,
    r.role_id,
    r.role_name
   FROM (png.user_roles ur
     JOIN png.roles r ON ((r.role_id = ur.role_id)));


ALTER VIEW png.v_user_roles OWNER TO postgres;

--
-- Name: v_user_scope; Type: VIEW; Schema: png; Owner: postgres
--

CREATE VIEW png.v_user_scope AS
 SELECT user_id,
    assigned_facility_id AS facility_id,
    assigned_district_id AS district_id,
    assigned_province_id AS province_id,
    assigned_region_id AS region_id
   FROM png.users u;


ALTER VIEW png.v_user_scope OWNER TO postgres;

--
-- Name: vw_user_access; Type: VIEW; Schema: png; Owner: postgres
--

CREATE VIEW png.vw_user_access AS
 SELECT u.user_id,
    u.username,
    u.email,
    COALESCE(u.first_name, ''::character varying) AS first_name,
    COALESCE(u.last_name, ''::character varying) AS last_name,
    r.role_id,
    r.role_name,
    g.group_id,
    g.group_name,
    p.permission_id,
    p.permission_name,
    p.category,
    p.resource,
    p.action,
    p.scope,
    gp.is_allowed
   FROM (((((png.users u
     JOIN png.user_group_membership ugm ON ((u.user_id = ugm.user_id)))
     JOIN png.user_groups g ON ((ugm.group_id = g.group_id)))
     JOIN png.roles r ON ((g.role_id = r.role_id)))
     JOIN png.group_permissions gp ON ((g.group_id = gp.group_id)))
     JOIN png.permissions p ON ((gp.permission_id = p.permission_id)))
  WHERE (u.is_active = true);


ALTER VIEW png.vw_user_access OWNER TO postgres;

--
-- Name: audit_logs id; Type: DEFAULT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.audit_logs ALTER COLUMN id SET DEFAULT nextval('png.audit_logs_id_seq'::regclass);


--
-- Name: audit_trail audit_id; Type: DEFAULT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.audit_trail ALTER COLUMN audit_id SET DEFAULT nextval('png.audit_trail_audit_id_seq'::regclass);


--
-- Name: device_registry id; Type: DEFAULT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.device_registry ALTER COLUMN id SET DEFAULT nextval('png.device_registry_id_seq'::regclass);


--
-- Name: districts district_id; Type: DEFAULT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.districts ALTER COLUMN district_id SET DEFAULT nextval('png.districts_district_id_seq'::regclass);


--
-- Name: equipment equipment_id; Type: DEFAULT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.equipment ALTER COLUMN equipment_id SET DEFAULT nextval('png.equipment_equipment_id_seq'::regclass);


--
-- Name: equipment_telemetry telemetry_id; Type: DEFAULT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.equipment_telemetry ALTER COLUMN telemetry_id SET DEFAULT nextval('png.equipment_telemetry_telemetry_id_seq'::regclass);


--
-- Name: escalation_paths path_id; Type: DEFAULT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.escalation_paths ALTER COLUMN path_id SET DEFAULT nextval('png.escalation_paths_path_id_seq'::regclass);


--
-- Name: facilities facility_id; Type: DEFAULT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.facilities ALTER COLUMN facility_id SET DEFAULT nextval('png.facilities_facility_id_seq'::regclass);


--
-- Name: fault_categories category_id; Type: DEFAULT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.fault_categories ALTER COLUMN category_id SET DEFAULT nextval('png.fault_categories_category_id_seq'::regclass);


--
-- Name: fault_issues issue_id; Type: DEFAULT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.fault_issues ALTER COLUMN issue_id SET DEFAULT nextval('png.fault_issues_issue_id_seq'::regclass);


--
-- Name: group_permissions group_permission_id; Type: DEFAULT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.group_permissions ALTER COLUMN group_permission_id SET DEFAULT nextval('png.group_permissions_group_permission_id_seq'::regclass);


--
-- Name: login_audit audit_id; Type: DEFAULT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.login_audit ALTER COLUMN audit_id SET DEFAULT nextval('png.login_audit_audit_id_seq'::regclass);


--
-- Name: maintenance_schedules schedule_id; Type: DEFAULT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.maintenance_schedules ALTER COLUMN schedule_id SET DEFAULT nextval('png.maintenance_schedules_schedule_id_seq'::regclass);


--
-- Name: migrations id; Type: DEFAULT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.migrations ALTER COLUMN id SET DEFAULT nextval('png.migrations_id_seq'::regclass);


--
-- Name: mobile_devices device_id; Type: DEFAULT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.mobile_devices ALTER COLUMN device_id SET DEFAULT nextval('png.mobile_devices_device_id_seq'::regclass);


--
-- Name: notification_templates template_id; Type: DEFAULT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.notification_templates ALTER COLUMN template_id SET DEFAULT nextval('png.notification_templates_template_id_seq'::regclass);


--
-- Name: notifications notification_id; Type: DEFAULT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.notifications ALTER COLUMN notification_id SET DEFAULT nextval('png.notifications_notification_id_seq'::regclass);


--
-- Name: password_reset_tokens token_id; Type: DEFAULT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.password_reset_tokens ALTER COLUMN token_id SET DEFAULT nextval('png.password_reset_tokens_token_id_seq'::regclass);


--
-- Name: password_resets reset_id; Type: DEFAULT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.password_resets ALTER COLUMN reset_id SET DEFAULT nextval('png.password_resets_reset_id_seq'::regclass);


--
-- Name: permissions permission_id; Type: DEFAULT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.permissions ALTER COLUMN permission_id SET DEFAULT nextval('png.permissions_permission_id_seq'::regclass);


--
-- Name: provinces province_id; Type: DEFAULT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.provinces ALTER COLUMN province_id SET DEFAULT nextval('png.provinces_province_id_seq'::regclass);


--
-- Name: regions region_id; Type: DEFAULT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.regions ALTER COLUMN region_id SET DEFAULT nextval('png.regions_region_id_seq'::regclass);


--
-- Name: repair_attachments attachment_id; Type: DEFAULT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.repair_attachments ALTER COLUMN attachment_id SET DEFAULT nextval('png.repair_attachments_attachment_id_seq'::regclass);


--
-- Name: repairs repair_id; Type: DEFAULT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.repairs ALTER COLUMN repair_id SET DEFAULT nextval('png.repairs_repair_id_seq'::regclass);


--
-- Name: role_location_access id; Type: DEFAULT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.role_location_access ALTER COLUMN id SET DEFAULT nextval('png.role_location_access_id_seq'::regclass);


--
-- Name: role_permissions role_permission_id; Type: DEFAULT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.role_permissions ALTER COLUMN role_permission_id SET DEFAULT nextval('png.role_permissions_role_permission_id_seq'::regclass);


--
-- Name: roles role_id; Type: DEFAULT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.roles ALTER COLUMN role_id SET DEFAULT nextval('png.roles_role_id_seq'::regclass);


--
-- Name: sla_policies policy_id; Type: DEFAULT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.sla_policies ALTER COLUMN policy_id SET DEFAULT nextval('png.sla_policies_policy_id_seq'::regclass);


--
-- Name: spareparts sparepart_id; Type: DEFAULT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.spareparts ALTER COLUMN sparepart_id SET DEFAULT nextval('png.spareparts_sparepart_id_seq'::regclass);


--
-- Name: sync_log id; Type: DEFAULT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.sync_log ALTER COLUMN id SET DEFAULT nextval('png.sync_log_id_seq'::regclass);


--
-- Name: sync_sessions session_id; Type: DEFAULT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.sync_sessions ALTER COLUMN session_id SET DEFAULT nextval('png.sync_sessions_session_id_seq'::regclass);


--
-- Name: technicians technician_id; Type: DEFAULT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.technicians ALTER COLUMN technician_id SET DEFAULT nextval('png.technicians_technician_id_seq'::regclass);


--
-- Name: ticket_activity_log log_id; Type: DEFAULT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.ticket_activity_log ALTER COLUMN log_id SET DEFAULT nextval('png.ticket_activity_log_log_id_seq'::regclass);


--
-- Name: ticket_escalations escalation_id; Type: DEFAULT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.ticket_escalations ALTER COLUMN escalation_id SET DEFAULT nextval('png.ticket_escalations_escalation_id_seq'::regclass);


--
-- Name: ticket_fault_issues ticket_fault_issue_id; Type: DEFAULT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.ticket_fault_issues ALTER COLUMN ticket_fault_issue_id SET DEFAULT nextval('png.ticket_fault_issues_ticket_fault_issue_id_seq'::regclass);


--
-- Name: ticket_interactions interaction_id; Type: DEFAULT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.ticket_interactions ALTER COLUMN interaction_id SET DEFAULT nextval('png.ticket_interactions_interaction_id_seq'::regclass);


--
-- Name: ticket_spare_parts id; Type: DEFAULT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.ticket_spare_parts ALTER COLUMN id SET DEFAULT nextval('png.ticket_spare_parts_id_seq'::regclass);


--
-- Name: ticket_spareparts id; Type: DEFAULT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.ticket_spareparts ALTER COLUMN id SET DEFAULT nextval('png.ticket_spareparts_id_seq'::regclass);


--
-- Name: ticket_transactions transaction_id; Type: DEFAULT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.ticket_transactions ALTER COLUMN transaction_id SET DEFAULT nextval('png.ticket_transactions_transaction_id_seq'::regclass);


--
-- Name: tickets ticket_id; Type: DEFAULT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.tickets ALTER COLUMN ticket_id SET DEFAULT nextval('png.tickets_ticket_id_seq'::regclass);


--
-- Name: user_audit_log id; Type: DEFAULT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.user_audit_log ALTER COLUMN id SET DEFAULT nextval('png.user_audit_log_id_seq'::regclass);


--
-- Name: user_group_membership membership_id; Type: DEFAULT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.user_group_membership ALTER COLUMN membership_id SET DEFAULT nextval('png.user_group_membership_membership_id_seq'::regclass);


--
-- Name: user_groups group_id; Type: DEFAULT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.user_groups ALTER COLUMN group_id SET DEFAULT nextval('png.user_groups_group_id_seq'::regclass);


--
-- Name: user_locations id; Type: DEFAULT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.user_locations ALTER COLUMN id SET DEFAULT nextval('png.user_locations_id_seq'::regclass);


--
-- Name: user_otps otp_id; Type: DEFAULT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.user_otps ALTER COLUMN otp_id SET DEFAULT nextval('png.user_otps_otp_id_seq'::regclass);


--
-- Name: user_permission_overrides override_id; Type: DEFAULT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.user_permission_overrides ALTER COLUMN override_id SET DEFAULT nextval('png.user_permission_overrides_override_id_seq'::regclass);


--
-- Name: user_scopes id; Type: DEFAULT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.user_scopes ALTER COLUMN id SET DEFAULT nextval('png.user_scopes_id_seq'::regclass);


--
-- Name: users user_id; Type: DEFAULT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.users ALTER COLUMN user_id SET DEFAULT nextval('png.users_user_id_seq'::regclass);


--
-- Name: appsmith_user_mapping appsmith_user_mapping_pkey; Type: CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.appsmith_user_mapping
    ADD CONSTRAINT appsmith_user_mapping_pkey PRIMARY KEY (appsmith_email);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: audit_trail audit_trail_pkey; Type: CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.audit_trail
    ADD CONSTRAINT audit_trail_pkey PRIMARY KEY (audit_id);


--
-- Name: device_registry device_registry_pkey; Type: CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.device_registry
    ADD CONSTRAINT device_registry_pkey PRIMARY KEY (id);


--
-- Name: districts districts_pkey; Type: CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.districts
    ADD CONSTRAINT districts_pkey PRIMARY KEY (district_id);


--
-- Name: energy_sources energy_sources_name_key; Type: CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.energy_sources
    ADD CONSTRAINT energy_sources_name_key UNIQUE (name);


--
-- Name: energy_sources energy_sources_pkey; Type: CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.energy_sources
    ADD CONSTRAINT energy_sources_pkey PRIMARY KEY (id);


--
-- Name: equipment equipment_pkey; Type: CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.equipment
    ADD CONSTRAINT equipment_pkey PRIMARY KEY (equipment_id);


--
-- Name: equipment_telemetry equipment_telemetry_pkey; Type: CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.equipment_telemetry
    ADD CONSTRAINT equipment_telemetry_pkey PRIMARY KEY (telemetry_id);


--
-- Name: escalation_paths escalation_paths_pkey; Type: CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.escalation_paths
    ADD CONSTRAINT escalation_paths_pkey PRIMARY KEY (path_id);


--
-- Name: facilities facilities_pkey; Type: CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.facilities
    ADD CONSTRAINT facilities_pkey PRIMARY KEY (facility_id);


--
-- Name: fault_categories fault_categories_category_code_key; Type: CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.fault_categories
    ADD CONSTRAINT fault_categories_category_code_key UNIQUE (category_code);


--
-- Name: fault_categories fault_categories_pkey; Type: CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.fault_categories
    ADD CONSTRAINT fault_categories_pkey PRIMARY KEY (category_id);


--
-- Name: fault_issues fault_issues_issue_code_key; Type: CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.fault_issues
    ADD CONSTRAINT fault_issues_issue_code_key UNIQUE (issue_code);


--
-- Name: fault_issues fault_issues_pkey; Type: CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.fault_issues
    ADD CONSTRAINT fault_issues_pkey PRIMARY KEY (issue_id);


--
-- Name: group_permissions group_permissions_group_id_permission_id_key; Type: CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.group_permissions
    ADD CONSTRAINT group_permissions_group_id_permission_id_key UNIQUE (group_id, permission_id);


--
-- Name: group_permissions group_permissions_pkey; Type: CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.group_permissions
    ADD CONSTRAINT group_permissions_pkey PRIMARY KEY (group_permission_id);


--
-- Name: login_audit login_audit_pkey; Type: CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.login_audit
    ADD CONSTRAINT login_audit_pkey PRIMARY KEY (audit_id);


--
-- Name: maintenance_schedules maintenance_schedules_pkey; Type: CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.maintenance_schedules
    ADD CONSTRAINT maintenance_schedules_pkey PRIMARY KEY (schedule_id);


--
-- Name: migrations migrations_name_key; Type: CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.migrations
    ADD CONSTRAINT migrations_name_key UNIQUE (name);


--
-- Name: migrations migrations_pkey; Type: CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.migrations
    ADD CONSTRAINT migrations_pkey PRIMARY KEY (id);


--
-- Name: mobile_devices mobile_devices_device_uuid_key; Type: CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.mobile_devices
    ADD CONSTRAINT mobile_devices_device_uuid_key UNIQUE (device_uuid);


--
-- Name: mobile_devices mobile_devices_pkey; Type: CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.mobile_devices
    ADD CONSTRAINT mobile_devices_pkey PRIMARY KEY (device_id);


--
-- Name: notification_templates notification_templates_pkey; Type: CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.notification_templates
    ADD CONSTRAINT notification_templates_pkey PRIMARY KEY (template_id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (notification_id);


--
-- Name: password_reset_tokens password_reset_tokens_pkey; Type: CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (token_id);


--
-- Name: password_reset_tokens password_reset_tokens_token_key; Type: CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key UNIQUE (token);


--
-- Name: password_resets password_resets_pkey; Type: CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.password_resets
    ADD CONSTRAINT password_resets_pkey PRIMARY KEY (reset_id);


--
-- Name: password_resets password_resets_token_key; Type: CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.password_resets
    ADD CONSTRAINT password_resets_token_key UNIQUE (token);


--
-- Name: permissions permissions_permission_name_key; Type: CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.permissions
    ADD CONSTRAINT permissions_permission_name_key UNIQUE (permission_name);


--
-- Name: permissions permissions_pkey; Type: CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.permissions
    ADD CONSTRAINT permissions_pkey PRIMARY KEY (permission_id);


--
-- Name: provinces provinces_pkey; Type: CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.provinces
    ADD CONSTRAINT provinces_pkey PRIMARY KEY (province_id);


--
-- Name: regions regions_pkey; Type: CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.regions
    ADD CONSTRAINT regions_pkey PRIMARY KEY (region_id);


--
-- Name: repair_attachments repair_attachments_pkey; Type: CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.repair_attachments
    ADD CONSTRAINT repair_attachments_pkey PRIMARY KEY (attachment_id);


--
-- Name: repairs repairs_pkey; Type: CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.repairs
    ADD CONSTRAINT repairs_pkey PRIMARY KEY (repair_id);


--
-- Name: role_location_access role_location_access_pkey; Type: CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.role_location_access
    ADD CONSTRAINT role_location_access_pkey PRIMARY KEY (id);


--
-- Name: role_permissions role_permissions_pkey; Type: CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.role_permissions
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (role_permission_id);


--
-- Name: role_permissions role_permissions_role_id_permission_id_key; Type: CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.role_permissions
    ADD CONSTRAINT role_permissions_role_id_permission_id_key UNIQUE (role_id, permission_id);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (role_id);


--
-- Name: roles roles_role_name_key; Type: CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.roles
    ADD CONSTRAINT roles_role_name_key UNIQUE (role_name);


--
-- Name: sla_policies sla_policies_pkey; Type: CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.sla_policies
    ADD CONSTRAINT sla_policies_pkey PRIMARY KEY (policy_id);


--
-- Name: sla_policies sla_policies_priority_key; Type: CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.sla_policies
    ADD CONSTRAINT sla_policies_priority_key UNIQUE (priority);


--
-- Name: sla_settings sla_settings_pkey; Type: CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.sla_settings
    ADD CONSTRAINT sla_settings_pkey PRIMARY KEY (priority);


--
-- Name: spareparts spareparts_pkey; Type: CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.spareparts
    ADD CONSTRAINT spareparts_pkey PRIMARY KEY (sparepart_id);


--
-- Name: sync_log sync_log_pkey; Type: CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.sync_log
    ADD CONSTRAINT sync_log_pkey PRIMARY KEY (id);


--
-- Name: sync_sessions sync_sessions_pkey; Type: CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.sync_sessions
    ADD CONSTRAINT sync_sessions_pkey PRIMARY KEY (session_id);


--
-- Name: technicians technicians_pkey; Type: CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.technicians
    ADD CONSTRAINT technicians_pkey PRIMARY KEY (technician_id);


--
-- Name: ticket_activity_log ticket_activity_log_pkey; Type: CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.ticket_activity_log
    ADD CONSTRAINT ticket_activity_log_pkey PRIMARY KEY (log_id);


--
-- Name: ticket_escalations ticket_escalations_pkey; Type: CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.ticket_escalations
    ADD CONSTRAINT ticket_escalations_pkey PRIMARY KEY (escalation_id);


--
-- Name: ticket_fault_issues ticket_fault_issues_pkey; Type: CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.ticket_fault_issues
    ADD CONSTRAINT ticket_fault_issues_pkey PRIMARY KEY (ticket_fault_issue_id);


--
-- Name: ticket_fault_issues ticket_fault_issues_ticket_id_issue_id_key; Type: CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.ticket_fault_issues
    ADD CONSTRAINT ticket_fault_issues_ticket_id_issue_id_key UNIQUE (ticket_id, issue_id);


--
-- Name: ticket_interactions ticket_interactions_pkey; Type: CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.ticket_interactions
    ADD CONSTRAINT ticket_interactions_pkey PRIMARY KEY (interaction_id);


--
-- Name: ticket_spare_parts ticket_spare_parts_pkey; Type: CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.ticket_spare_parts
    ADD CONSTRAINT ticket_spare_parts_pkey PRIMARY KEY (id);


--
-- Name: ticket_spareparts ticket_spareparts_pkey; Type: CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.ticket_spareparts
    ADD CONSTRAINT ticket_spareparts_pkey PRIMARY KEY (id);


--
-- Name: ticket_transactions ticket_transactions_pkey; Type: CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.ticket_transactions
    ADD CONSTRAINT ticket_transactions_pkey PRIMARY KEY (transaction_id);


--
-- Name: tickets tickets_pkey; Type: CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.tickets
    ADD CONSTRAINT tickets_pkey PRIMARY KEY (ticket_id);


--
-- Name: tickets tickets_ticket_reference_number_key; Type: CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.tickets
    ADD CONSTRAINT tickets_ticket_reference_number_key UNIQUE (ticket_reference_number);


--
-- Name: spareparts uq_part_number; Type: CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.spareparts
    ADD CONSTRAINT uq_part_number UNIQUE (part_number);


--
-- Name: user_audit_log user_audit_log_pkey; Type: CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.user_audit_log
    ADD CONSTRAINT user_audit_log_pkey PRIMARY KEY (id);


--
-- Name: user_group_assignments user_group_assignments_pkey; Type: CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.user_group_assignments
    ADD CONSTRAINT user_group_assignments_pkey PRIMARY KEY (user_id, group_id);


--
-- Name: user_group_members user_group_members_pkey; Type: CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.user_group_members
    ADD CONSTRAINT user_group_members_pkey PRIMARY KEY (group_id, user_id);


--
-- Name: user_group_membership user_group_membership_pkey; Type: CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.user_group_membership
    ADD CONSTRAINT user_group_membership_pkey PRIMARY KEY (membership_id);


--
-- Name: user_group_membership user_group_membership_user_id_group_id_key; Type: CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.user_group_membership
    ADD CONSTRAINT user_group_membership_user_id_group_id_key UNIQUE (user_id, group_id);


--
-- Name: user_groups user_groups_group_name_key; Type: CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.user_groups
    ADD CONSTRAINT user_groups_group_name_key UNIQUE (group_name);


--
-- Name: user_groups user_groups_pkey; Type: CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.user_groups
    ADD CONSTRAINT user_groups_pkey PRIMARY KEY (group_id);


--
-- Name: user_locations user_locations_pkey; Type: CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.user_locations
    ADD CONSTRAINT user_locations_pkey PRIMARY KEY (id);


--
-- Name: user_notification_preferences user_notification_preferences_pkey; Type: CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.user_notification_preferences
    ADD CONSTRAINT user_notification_preferences_pkey PRIMARY KEY (user_id);


--
-- Name: user_otps user_otps_pkey; Type: CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.user_otps
    ADD CONSTRAINT user_otps_pkey PRIMARY KEY (otp_id);


--
-- Name: user_permission_overrides user_permission_overrides_pkey; Type: CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.user_permission_overrides
    ADD CONSTRAINT user_permission_overrides_pkey PRIMARY KEY (override_id);


--
-- Name: user_permissions user_permissions_pkey; Type: CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.user_permissions
    ADD CONSTRAINT user_permissions_pkey PRIMARY KEY (user_id, permission_id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (user_id, role_id);


--
-- Name: user_scopes user_scopes_pkey; Type: CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.user_scopes
    ADD CONSTRAINT user_scopes_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (user_id);


--
-- Name: users users_unique_email; Type: CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.users
    ADD CONSTRAINT users_unique_email UNIQUE (email);


--
-- Name: users users_unique_username; Type: CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.users
    ADD CONSTRAINT users_unique_username UNIQUE (username);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: idx_audit_action; Type: INDEX; Schema: png; Owner: postgres
--

CREATE INDEX idx_audit_action ON png.audit_logs USING btree (action);


--
-- Name: idx_audit_created_at; Type: INDEX; Schema: png; Owner: postgres
--

CREATE INDEX idx_audit_created_at ON png.audit_logs USING btree (created_at);


--
-- Name: idx_audit_entity; Type: INDEX; Schema: png; Owner: postgres
--

CREATE INDEX idx_audit_entity ON png.audit_logs USING btree (entity_type, entity_id);


--
-- Name: idx_audit_user_id; Type: INDEX; Schema: png; Owner: postgres
--

CREATE INDEX idx_audit_user_id ON png.audit_logs USING btree (user_id);


--
-- Name: idx_device_registry_user; Type: INDEX; Schema: png; Owner: postgres
--

CREATE INDEX idx_device_registry_user ON png.device_registry USING btree (user_id);


--
-- Name: idx_equipment_created_at; Type: INDEX; Schema: png; Owner: postgres
--

CREATE INDEX idx_equipment_created_at ON png.equipment USING btree (created_at);


--
-- Name: idx_equipment_facility; Type: INDEX; Schema: png; Owner: postgres
--

CREATE INDEX idx_equipment_facility ON png.equipment USING btree (facility_id);


--
-- Name: idx_equipment_facility_id; Type: INDEX; Schema: png; Owner: postgres
--

CREATE INDEX idx_equipment_facility_id ON png.equipment USING btree (facility_id);


--
-- Name: idx_equipment_is_functioning; Type: INDEX; Schema: png; Owner: postgres
--

CREATE INDEX idx_equipment_is_functioning ON png.equipment USING btree (is_functioning);


--
-- Name: idx_equipment_item_class_type; Type: INDEX; Schema: png; Owner: postgres
--

CREATE INDEX idx_equipment_item_class_type ON png.equipment USING btree (item_class, item_type);


--
-- Name: idx_equipment_year_installed; Type: INDEX; Schema: png; Owner: postgres
--

CREATE INDEX idx_equipment_year_installed ON png.equipment USING btree (year_installed);


--
-- Name: idx_facilities_district_id; Type: INDEX; Schema: png; Owner: postgres
--

CREATE INDEX idx_facilities_district_id ON png.facilities USING btree (district_id);


--
-- Name: idx_facilities_is_functioning; Type: INDEX; Schema: png; Owner: postgres
--

CREATE INDEX idx_facilities_is_functioning ON png.facilities USING btree (is_functioning);


--
-- Name: idx_facilities_province_district; Type: INDEX; Schema: png; Owner: postgres
--

CREATE INDEX idx_facilities_province_district ON png.facilities USING btree (province_id, district_id);


--
-- Name: idx_facilities_province_id; Type: INDEX; Schema: png; Owner: postgres
--

CREATE INDEX idx_facilities_province_id ON png.facilities USING btree (province_id);


--
-- Name: idx_facilities_region_id; Type: INDEX; Schema: png; Owner: postgres
--

CREATE INDEX idx_facilities_region_id ON png.facilities USING btree (region_id);


--
-- Name: idx_fault_issues_category_id; Type: INDEX; Schema: png; Owner: postgres
--

CREATE INDEX idx_fault_issues_category_id ON png.fault_issues USING btree (category_id);


--
-- Name: idx_notifications_ticket; Type: INDEX; Schema: png; Owner: postgres
--

CREATE INDEX idx_notifications_ticket ON png.notifications USING btree (ticket_id);


--
-- Name: idx_notifications_user; Type: INDEX; Schema: png; Owner: postgres
--

CREATE INDEX idx_notifications_user ON png.notifications USING btree (recipient_user_id);


--
-- Name: idx_spareparts_active; Type: INDEX; Schema: png; Owner: postgres
--

CREATE INDEX idx_spareparts_active ON png.spareparts USING btree (is_active);


--
-- Name: idx_spareparts_category; Type: INDEX; Schema: png; Owner: postgres
--

CREATE INDEX idx_spareparts_category ON png.spareparts USING btree (category);


--
-- Name: idx_spareparts_critical; Type: INDEX; Schema: png; Owner: postgres
--

CREATE INDEX idx_spareparts_critical ON png.spareparts USING btree (is_critical);


--
-- Name: idx_spareparts_name; Type: INDEX; Schema: png; Owner: postgres
--

CREATE INDEX idx_spareparts_name ON png.spareparts USING btree (sparepart_name);


--
-- Name: idx_sync_log_device; Type: INDEX; Schema: png; Owner: postgres
--

CREATE INDEX idx_sync_log_device ON png.sync_log USING btree (device_id);


--
-- Name: idx_sync_sessions_device; Type: INDEX; Schema: png; Owner: postgres
--

CREATE INDEX idx_sync_sessions_device ON png.sync_sessions USING btree (device_id);


--
-- Name: idx_sync_sessions_user; Type: INDEX; Schema: png; Owner: postgres
--

CREATE INDEX idx_sync_sessions_user ON png.sync_sessions USING btree (user_id);


--
-- Name: idx_ticket_escalations_from_user; Type: INDEX; Schema: png; Owner: postgres
--

CREATE INDEX idx_ticket_escalations_from_user ON png.ticket_escalations USING btree (from_user_id);


--
-- Name: idx_ticket_escalations_ticket; Type: INDEX; Schema: png; Owner: postgres
--

CREATE INDEX idx_ticket_escalations_ticket ON png.ticket_escalations USING btree (ticket_id);


--
-- Name: idx_ticket_escalations_to_user; Type: INDEX; Schema: png; Owner: postgres
--

CREATE INDEX idx_ticket_escalations_to_user ON png.ticket_escalations USING btree (to_user_id);


--
-- Name: idx_ticket_facility; Type: INDEX; Schema: png; Owner: postgres
--

CREATE INDEX idx_ticket_facility ON png.tickets USING btree (facility_id);


--
-- Name: idx_ticket_fault_issues_issue_id; Type: INDEX; Schema: png; Owner: postgres
--

CREATE INDEX idx_ticket_fault_issues_issue_id ON png.ticket_fault_issues USING btree (issue_id);


--
-- Name: idx_ticket_fault_issues_ticket_id; Type: INDEX; Schema: png; Owner: postgres
--

CREATE INDEX idx_ticket_fault_issues_ticket_id ON png.ticket_fault_issues USING btree (ticket_id);


--
-- Name: idx_ticket_interactions_action_type; Type: INDEX; Schema: png; Owner: postgres
--

CREATE INDEX idx_ticket_interactions_action_type ON png.ticket_interactions USING btree (action_type);


--
-- Name: idx_ticket_interactions_ticket_id; Type: INDEX; Schema: png; Owner: postgres
--

CREATE INDEX idx_ticket_interactions_ticket_id ON png.ticket_interactions USING btree (ticket_id);


--
-- Name: idx_ticket_interactions_user_id; Type: INDEX; Schema: png; Owner: postgres
--

CREATE INDEX idx_ticket_interactions_user_id ON png.ticket_interactions USING btree (user_id);


--
-- Name: idx_ticket_reference_number; Type: INDEX; Schema: png; Owner: postgres
--

CREATE INDEX idx_ticket_reference_number ON png.tickets USING btree (ticket_reference_number);


--
-- Name: idx_ticket_spare_parts_sparepart_id; Type: INDEX; Schema: png; Owner: postgres
--

CREATE INDEX idx_ticket_spare_parts_sparepart_id ON png.ticket_spare_parts USING btree (sparepart_id);


--
-- Name: idx_ticket_spare_parts_ticket_id; Type: INDEX; Schema: png; Owner: postgres
--

CREATE INDEX idx_ticket_spare_parts_ticket_id ON png.ticket_spare_parts USING btree (ticket_id);


--
-- Name: idx_ticket_spareparts_ticket_id; Type: INDEX; Schema: png; Owner: postgres
--

CREATE INDEX idx_ticket_spareparts_ticket_id ON png.ticket_spareparts USING btree (ticket_id);


--
-- Name: idx_tickets_assigned; Type: INDEX; Schema: png; Owner: postgres
--

CREATE INDEX idx_tickets_assigned ON png.tickets USING btree (assigned_to);


--
-- Name: idx_tickets_assigned_to; Type: INDEX; Schema: png; Owner: postgres
--

CREATE INDEX idx_tickets_assigned_to ON png.tickets USING btree (assigned_to);


--
-- Name: idx_tickets_created; Type: INDEX; Schema: png; Owner: postgres
--

CREATE INDEX idx_tickets_created ON png.tickets USING btree (created_at);


--
-- Name: idx_tickets_created_at; Type: INDEX; Schema: png; Owner: postgres
--

CREATE INDEX idx_tickets_created_at ON png.tickets USING btree (created_at);


--
-- Name: idx_tickets_district_id; Type: INDEX; Schema: png; Owner: postgres
--

CREATE INDEX idx_tickets_district_id ON png.tickets USING btree (district_id);


--
-- Name: idx_tickets_escalated_to; Type: INDEX; Schema: png; Owner: postgres
--

CREATE INDEX idx_tickets_escalated_to ON png.tickets USING btree (escalated_to);


--
-- Name: idx_tickets_facility; Type: INDEX; Schema: png; Owner: postgres
--

CREATE INDEX idx_tickets_facility ON png.tickets USING btree (facility_id);


--
-- Name: idx_tickets_facility_id; Type: INDEX; Schema: png; Owner: postgres
--

CREATE INDEX idx_tickets_facility_id ON png.tickets USING btree (facility_id);


--
-- Name: idx_tickets_priority; Type: INDEX; Schema: png; Owner: postgres
--

CREATE INDEX idx_tickets_priority ON png.tickets USING btree (priority);


--
-- Name: idx_tickets_province_id; Type: INDEX; Schema: png; Owner: postgres
--

CREATE INDEX idx_tickets_province_id ON png.tickets USING btree (province_id);


--
-- Name: idx_tickets_reference; Type: INDEX; Schema: png; Owner: postgres
--

CREATE INDEX idx_tickets_reference ON png.tickets USING btree (ticket_reference_number);


--
-- Name: idx_tickets_region_id; Type: INDEX; Schema: png; Owner: postgres
--

CREATE INDEX idx_tickets_region_id ON png.tickets USING btree (region_id);


--
-- Name: idx_user_otps_user_id; Type: INDEX; Schema: png; Owner: postgres
--

CREATE INDEX idx_user_otps_user_id ON png.user_otps USING btree (user_id);


--
-- Name: idx_user_scopes_user_id; Type: INDEX; Schema: png; Owner: postgres
--

CREATE INDEX idx_user_scopes_user_id ON png.user_scopes USING btree (user_id);


--
-- Name: idx_users_email; Type: INDEX; Schema: png; Owner: postgres
--

CREATE INDEX idx_users_email ON png.users USING btree (email);


--
-- Name: idx_users_is_active; Type: INDEX; Schema: png; Owner: postgres
--

CREATE INDEX idx_users_is_active ON png.users USING btree (is_active);


--
-- Name: idx_users_is_national_access; Type: INDEX; Schema: png; Owner: postgres
--

CREATE INDEX idx_users_is_national_access ON png.users USING btree (is_national_access);


--
-- Name: idx_users_username; Type: INDEX; Schema: png; Owner: postgres
--

CREATE INDEX idx_users_username ON png.users USING btree (username);


--
-- Name: users_email_uk; Type: INDEX; Schema: png; Owner: postgres
--

CREATE UNIQUE INDEX users_email_uk ON png.users USING btree (email);


--
-- Name: users_username_uk; Type: INDEX; Schema: png; Owner: postgres
--

CREATE UNIQUE INDEX users_username_uk ON png.users USING btree (username);


--
-- Name: tickets set_ticket_reference; Type: TRIGGER; Schema: png; Owner: postgres
--

CREATE TRIGGER set_ticket_reference BEFORE INSERT ON png.tickets FOR EACH ROW EXECUTE FUNCTION public.generate_ticket_reference();


--
-- Name: tickets set_ticket_reference_number; Type: TRIGGER; Schema: png; Owner: postgres
--

CREATE TRIGGER set_ticket_reference_number BEFORE INSERT ON png.tickets FOR EACH ROW EXECUTE FUNCTION public.generate_ticket_reference();


--
-- Name: repairs trg_audit_repairs; Type: TRIGGER; Schema: png; Owner: postgres
--

CREATE TRIGGER trg_audit_repairs AFTER INSERT OR DELETE OR UPDATE ON png.repairs FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();


--
-- Name: ticket_escalations trg_audit_ticket_escalations; Type: TRIGGER; Schema: png; Owner: postgres
--

CREATE TRIGGER trg_audit_ticket_escalations AFTER INSERT OR DELETE OR UPDATE ON png.ticket_escalations FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();


--
-- Name: ticket_interactions trg_audit_ticket_interactions; Type: TRIGGER; Schema: png; Owner: postgres
--

CREATE TRIGGER trg_audit_ticket_interactions AFTER INSERT OR DELETE OR UPDATE ON png.ticket_interactions FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();


--
-- Name: roles trg_audit_tickets; Type: TRIGGER; Schema: png; Owner: postgres
--

CREATE TRIGGER trg_audit_tickets AFTER INSERT OR DELETE OR UPDATE ON png.roles FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();


--
-- Name: technicians trg_audit_tickets; Type: TRIGGER; Schema: png; Owner: postgres
--

CREATE TRIGGER trg_audit_tickets AFTER INSERT OR DELETE OR UPDATE ON png.technicians FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();


--
-- Name: tickets trg_audit_tickets; Type: TRIGGER; Schema: png; Owner: postgres
--

CREATE TRIGGER trg_audit_tickets AFTER INSERT OR DELETE OR UPDATE ON png.tickets FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();


--
-- Name: users trg_audit_tickets; Type: TRIGGER; Schema: png; Owner: postgres
--

CREATE TRIGGER trg_audit_tickets AFTER INSERT OR DELETE OR UPDATE ON png.users FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();


--
-- Name: tickets trg_compute_ticket_reference; Type: TRIGGER; Schema: png; Owner: postgres
--

CREATE TRIGGER trg_compute_ticket_reference BEFORE INSERT ON png.tickets FOR EACH ROW EXECUTE FUNCTION public.compute_ticket_reference();


--
-- Name: tickets trg_generate_ticket_reference; Type: TRIGGER; Schema: png; Owner: postgres
--

CREATE TRIGGER trg_generate_ticket_reference BEFORE INSERT ON png.tickets FOR EACH ROW EXECUTE FUNCTION public.generate_ticket_reference();


--
-- Name: users trg_hash_user_password; Type: TRIGGER; Schema: png; Owner: postgres
--

CREATE TRIGGER trg_hash_user_password BEFORE INSERT OR UPDATE ON png.users FOR EACH ROW EXECUTE FUNCTION public.hash_user_password();


--
-- Name: users trg_link_user_group; Type: TRIGGER; Schema: png; Owner: postgres
--

CREATE TRIGGER trg_link_user_group AFTER INSERT ON png.users FOR EACH ROW EXECUTE FUNCTION public.link_user_to_group();


--
-- Name: tickets trg_ticket_audit; Type: TRIGGER; Schema: png; Owner: postgres
--

CREATE TRIGGER trg_ticket_audit AFTER INSERT OR DELETE OR UPDATE ON png.tickets FOR EACH ROW EXECUTE FUNCTION public.fn_audit_tickets();


--
-- Name: tickets trg_ticket_audit_log; Type: TRIGGER; Schema: png; Owner: postgres
--

CREATE TRIGGER trg_ticket_audit_log AFTER INSERT OR UPDATE ON png.tickets FOR EACH ROW EXECUTE FUNCTION public.log_ticket_activity();


--
-- Name: tickets trg_ticket_sla; Type: TRIGGER; Schema: png; Owner: postgres
--

CREATE TRIGGER trg_ticket_sla BEFORE INSERT OR UPDATE ON png.tickets FOR EACH ROW EXECUTE FUNCTION public.update_ticket_timing_metrics();


--
-- Name: facilities trg_update_geom; Type: TRIGGER; Schema: png; Owner: postgres
--

CREATE TRIGGER trg_update_geom BEFORE INSERT OR UPDATE ON png.facilities FOR EACH ROW EXECUTE FUNCTION public.update_geom_from_latlong();


--
-- Name: tickets trigger_update_ticket_timing; Type: TRIGGER; Schema: png; Owner: postgres
--

CREATE TRIGGER trigger_update_ticket_timing BEFORE INSERT OR UPDATE ON png.tickets FOR EACH ROW EXECUTE FUNCTION public.update_ticket_timing_metrics();


--
-- Name: equipment update_equipment_updated_at; Type: TRIGGER; Schema: png; Owner: postgres
--

CREATE TRIGGER update_equipment_updated_at BEFORE UPDATE ON png.equipment FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: permissions update_permissions_updated_at; Type: TRIGGER; Schema: png; Owner: postgres
--

CREATE TRIGGER update_permissions_updated_at BEFORE UPDATE ON png.permissions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: tickets update_tickets_updated_at; Type: TRIGGER; Schema: png; Owner: postgres
--

CREATE TRIGGER update_tickets_updated_at BEFORE UPDATE ON png.tickets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: user_groups update_user_groups_updated_at; Type: TRIGGER; Schema: png; Owner: postgres
--

CREATE TRIGGER update_user_groups_updated_at BEFORE UPDATE ON png.user_groups FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: users update_users_updated_at; Type: TRIGGER; Schema: png; Owner: postgres
--

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON png.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: appsmith_user_mapping appsmith_user_mapping_application_user_id_fkey; Type: FK CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.appsmith_user_mapping
    ADD CONSTRAINT appsmith_user_mapping_application_user_id_fkey FOREIGN KEY (application_user_id) REFERENCES png.users(user_id);


--
-- Name: audit_logs audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.audit_logs
    ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES png.users(user_id);


--
-- Name: audit_trail audit_trail_user_id_fkey; Type: FK CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.audit_trail
    ADD CONSTRAINT audit_trail_user_id_fkey FOREIGN KEY (user_id) REFERENCES png.users(user_id);


--
-- Name: device_registry device_registry_user_id_fkey; Type: FK CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.device_registry
    ADD CONSTRAINT device_registry_user_id_fkey FOREIGN KEY (user_id) REFERENCES png.users(user_id);


--
-- Name: districts districts_province_id_fkey; Type: FK CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.districts
    ADD CONSTRAINT districts_province_id_fkey FOREIGN KEY (province_id) REFERENCES png.provinces(province_id);


--
-- Name: equipment equipment_facility_id_fkey; Type: FK CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.equipment
    ADD CONSTRAINT equipment_facility_id_fkey FOREIGN KEY (facility_id) REFERENCES png.facilities(facility_id);


--
-- Name: equipment_telemetry equipment_telemetry_equipment_id_fkey; Type: FK CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.equipment_telemetry
    ADD CONSTRAINT equipment_telemetry_equipment_id_fkey FOREIGN KEY (equipment_id) REFERENCES png.equipment(equipment_id) ON DELETE CASCADE;


--
-- Name: facilities facilities_district_id_fkey; Type: FK CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.facilities
    ADD CONSTRAINT facilities_district_id_fkey FOREIGN KEY (district_id) REFERENCES png.districts(district_id);


--
-- Name: facilities facilities_province_id_fkey; Type: FK CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.facilities
    ADD CONSTRAINT facilities_province_id_fkey FOREIGN KEY (province_id) REFERENCES png.provinces(province_id);


--
-- Name: facilities facilities_region_id_fkey; Type: FK CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.facilities
    ADD CONSTRAINT facilities_region_id_fkey FOREIGN KEY (region_id) REFERENCES png.regions(region_id);


--
-- Name: fault_issues fault_issues_category_id_fkey; Type: FK CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.fault_issues
    ADD CONSTRAINT fault_issues_category_id_fkey FOREIGN KEY (category_id) REFERENCES png.fault_categories(category_id);


--
-- Name: repairs fk_repairs_equipment; Type: FK CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.repairs
    ADD CONSTRAINT fk_repairs_equipment FOREIGN KEY (selected_equipment_id) REFERENCES png.equipment(equipment_id) ON DELETE CASCADE;


--
-- Name: repairs fk_repairs_facility; Type: FK CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.repairs
    ADD CONSTRAINT fk_repairs_facility FOREIGN KEY (facility_id) REFERENCES png.facilities(facility_id) ON DELETE CASCADE;


--
-- Name: repairs fk_repairs_ticket; Type: FK CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.repairs
    ADD CONSTRAINT fk_repairs_ticket FOREIGN KEY (ticket_id) REFERENCES png.tickets(ticket_id) ON DELETE CASCADE;


--
-- Name: tickets fk_tickets_assigned_to_users; Type: FK CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.tickets
    ADD CONSTRAINT fk_tickets_assigned_to_users FOREIGN KEY (assigned_to) REFERENCES png.users(user_id);


--
-- Name: group_permissions group_permissions_group_id_fkey; Type: FK CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.group_permissions
    ADD CONSTRAINT group_permissions_group_id_fkey FOREIGN KEY (group_id) REFERENCES png.user_groups(group_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: group_permissions group_permissions_permission_id_fkey; Type: FK CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.group_permissions
    ADD CONSTRAINT group_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES png.permissions(permission_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: maintenance_schedules maintenance_schedules_equipment_id_fkey; Type: FK CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.maintenance_schedules
    ADD CONSTRAINT maintenance_schedules_equipment_id_fkey FOREIGN KEY (equipment_id) REFERENCES png.equipment(equipment_id) ON DELETE CASCADE;


--
-- Name: mobile_devices mobile_devices_user_id_fkey; Type: FK CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.mobile_devices
    ADD CONSTRAINT mobile_devices_user_id_fkey FOREIGN KEY (user_id) REFERENCES png.users(user_id) ON DELETE CASCADE;


--
-- Name: notifications notifications_recipient_user_id_fkey; Type: FK CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.notifications
    ADD CONSTRAINT notifications_recipient_user_id_fkey FOREIGN KEY (recipient_user_id) REFERENCES png.users(user_id);


--
-- Name: notifications notifications_ticket_id_fkey; Type: FK CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.notifications
    ADD CONSTRAINT notifications_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES png.tickets(ticket_id);


--
-- Name: password_reset_tokens password_reset_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES png.users(user_id);


--
-- Name: password_resets password_resets_user_id_fkey; Type: FK CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.password_resets
    ADD CONSTRAINT password_resets_user_id_fkey FOREIGN KEY (user_id) REFERENCES png.users(user_id);


--
-- Name: provinces provinces_region_id_fkey; Type: FK CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.provinces
    ADD CONSTRAINT provinces_region_id_fkey FOREIGN KEY (region_id) REFERENCES png.regions(region_id);


--
-- Name: repair_attachments repair_attachments_repair_id_fkey; Type: FK CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.repair_attachments
    ADD CONSTRAINT repair_attachments_repair_id_fkey FOREIGN KEY (repair_id) REFERENCES png.repairs(repair_id) ON DELETE CASCADE;


--
-- Name: repairs repairs_created_by_fkey; Type: FK CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.repairs
    ADD CONSTRAINT repairs_created_by_fkey FOREIGN KEY (created_by) REFERENCES png.users(user_id);


--
-- Name: role_location_access role_location_access_district_id_fkey; Type: FK CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.role_location_access
    ADD CONSTRAINT role_location_access_district_id_fkey FOREIGN KEY (district_id) REFERENCES png.districts(district_id);


--
-- Name: role_location_access role_location_access_facility_id_fkey; Type: FK CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.role_location_access
    ADD CONSTRAINT role_location_access_facility_id_fkey FOREIGN KEY (facility_id) REFERENCES png.facilities(facility_id);


--
-- Name: role_location_access role_location_access_province_id_fkey; Type: FK CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.role_location_access
    ADD CONSTRAINT role_location_access_province_id_fkey FOREIGN KEY (province_id) REFERENCES png.provinces(province_id);


--
-- Name: role_location_access role_location_access_region_id_fkey; Type: FK CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.role_location_access
    ADD CONSTRAINT role_location_access_region_id_fkey FOREIGN KEY (region_id) REFERENCES png.regions(region_id);


--
-- Name: role_location_access role_location_access_role_id_fkey; Type: FK CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.role_location_access
    ADD CONSTRAINT role_location_access_role_id_fkey FOREIGN KEY (role_id) REFERENCES png.roles(role_id) ON DELETE CASCADE;


--
-- Name: role_permissions role_permissions_permission_id_fkey; Type: FK CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.role_permissions
    ADD CONSTRAINT role_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES png.permissions(permission_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: role_permissions role_permissions_role_id_fkey; Type: FK CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.role_permissions
    ADD CONSTRAINT role_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES png.roles(role_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: sync_sessions sync_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.sync_sessions
    ADD CONSTRAINT sync_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES png.users(user_id);


--
-- Name: technicians technicians_user_id_fkey; Type: FK CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.technicians
    ADD CONSTRAINT technicians_user_id_fkey FOREIGN KEY (user_id) REFERENCES png.users(user_id);


--
-- Name: ticket_activity_log ticket_activity_log_action_by_fkey; Type: FK CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.ticket_activity_log
    ADD CONSTRAINT ticket_activity_log_action_by_fkey FOREIGN KEY (action_by) REFERENCES png.users(user_id);


--
-- Name: ticket_activity_log ticket_activity_log_ticket_id_fkey; Type: FK CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.ticket_activity_log
    ADD CONSTRAINT ticket_activity_log_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES png.tickets(ticket_id) ON DELETE CASCADE;


--
-- Name: ticket_escalations ticket_escalations_from_user_id_fkey; Type: FK CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.ticket_escalations
    ADD CONSTRAINT ticket_escalations_from_user_id_fkey FOREIGN KEY (from_user_id) REFERENCES png.users(user_id);


--
-- Name: ticket_escalations ticket_escalations_ticket_id_fkey; Type: FK CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.ticket_escalations
    ADD CONSTRAINT ticket_escalations_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES png.tickets(ticket_id);


--
-- Name: ticket_escalations ticket_escalations_to_user_id_fkey; Type: FK CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.ticket_escalations
    ADD CONSTRAINT ticket_escalations_to_user_id_fkey FOREIGN KEY (to_user_id) REFERENCES png.users(user_id);


--
-- Name: ticket_fault_issues ticket_fault_issues_issue_id_fkey; Type: FK CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.ticket_fault_issues
    ADD CONSTRAINT ticket_fault_issues_issue_id_fkey FOREIGN KEY (issue_id) REFERENCES png.fault_issues(issue_id);


--
-- Name: ticket_fault_issues ticket_fault_issues_ticket_id_fkey; Type: FK CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.ticket_fault_issues
    ADD CONSTRAINT ticket_fault_issues_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES png.tickets(ticket_id) ON DELETE CASCADE;


--
-- Name: ticket_interactions ticket_interactions_ticket_id_fkey; Type: FK CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.ticket_interactions
    ADD CONSTRAINT ticket_interactions_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES png.tickets(ticket_id);


--
-- Name: ticket_interactions ticket_interactions_user_id_fkey; Type: FK CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.ticket_interactions
    ADD CONSTRAINT ticket_interactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES png.users(user_id);


--
-- Name: ticket_spare_parts ticket_spare_parts_sparepart_id_fkey; Type: FK CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.ticket_spare_parts
    ADD CONSTRAINT ticket_spare_parts_sparepart_id_fkey FOREIGN KEY (sparepart_id) REFERENCES png.spareparts(sparepart_id);


--
-- Name: ticket_spare_parts ticket_spare_parts_ticket_id_fkey; Type: FK CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.ticket_spare_parts
    ADD CONSTRAINT ticket_spare_parts_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES png.tickets(ticket_id) ON DELETE CASCADE;


--
-- Name: ticket_spareparts ticket_spareparts_sparepart_id_fkey; Type: FK CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.ticket_spareparts
    ADD CONSTRAINT ticket_spareparts_sparepart_id_fkey FOREIGN KEY (sparepart_id) REFERENCES png.spareparts(sparepart_id);


--
-- Name: ticket_spareparts ticket_spareparts_ticket_id_fkey; Type: FK CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.ticket_spareparts
    ADD CONSTRAINT ticket_spareparts_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES png.tickets(ticket_id) ON DELETE CASCADE;


--
-- Name: ticket_transactions ticket_transactions_action_by_fkey; Type: FK CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.ticket_transactions
    ADD CONSTRAINT ticket_transactions_action_by_fkey FOREIGN KEY (action_by) REFERENCES png.users(user_id);


--
-- Name: ticket_transactions ticket_transactions_action_to_fkey; Type: FK CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.ticket_transactions
    ADD CONSTRAINT ticket_transactions_action_to_fkey FOREIGN KEY (action_to) REFERENCES png.users(user_id);


--
-- Name: ticket_transactions ticket_transactions_ticket_id_fkey; Type: FK CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.ticket_transactions
    ADD CONSTRAINT ticket_transactions_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES png.tickets(ticket_id) ON DELETE CASCADE;


--
-- Name: tickets tickets_assigned_to_fkey; Type: FK CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.tickets
    ADD CONSTRAINT tickets_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES png.users(user_id);


--
-- Name: tickets tickets_district_id_fkey; Type: FK CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.tickets
    ADD CONSTRAINT tickets_district_id_fkey FOREIGN KEY (district_id) REFERENCES png.districts(district_id);


--
-- Name: tickets tickets_facility_id_fkey; Type: FK CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.tickets
    ADD CONSTRAINT tickets_facility_id_fkey FOREIGN KEY (facility_id) REFERENCES png.facilities(facility_id);


--
-- Name: tickets tickets_province_id_fkey; Type: FK CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.tickets
    ADD CONSTRAINT tickets_province_id_fkey FOREIGN KEY (province_id) REFERENCES png.provinces(province_id);


--
-- Name: tickets tickets_region_id_fkey; Type: FK CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.tickets
    ADD CONSTRAINT tickets_region_id_fkey FOREIGN KEY (region_id) REFERENCES png.regions(region_id);


--
-- Name: tickets tickets_repair_id_fkey; Type: FK CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.tickets
    ADD CONSTRAINT tickets_repair_id_fkey FOREIGN KEY (repair_id) REFERENCES png.repairs(repair_id);


--
-- Name: tickets tickets_selected_equipment_id_fkey; Type: FK CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.tickets
    ADD CONSTRAINT tickets_selected_equipment_id_fkey FOREIGN KEY (selected_equipment_id) REFERENCES png.equipment(equipment_id);


--
-- Name: user_audit_log user_audit_log_user_id_fkey; Type: FK CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.user_audit_log
    ADD CONSTRAINT user_audit_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES png.users(user_id);


--
-- Name: user_group_assignments user_group_assignments_group_id_fkey; Type: FK CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.user_group_assignments
    ADD CONSTRAINT user_group_assignments_group_id_fkey FOREIGN KEY (group_id) REFERENCES png.user_groups(group_id) ON DELETE CASCADE;


--
-- Name: user_group_assignments user_group_assignments_user_id_fkey; Type: FK CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.user_group_assignments
    ADD CONSTRAINT user_group_assignments_user_id_fkey FOREIGN KEY (user_id) REFERENCES png.users(user_id) ON DELETE CASCADE;


--
-- Name: user_group_members user_group_members_group_id_fkey; Type: FK CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.user_group_members
    ADD CONSTRAINT user_group_members_group_id_fkey FOREIGN KEY (group_id) REFERENCES png.user_groups(group_id);


--
-- Name: user_group_members user_group_members_user_id_fkey; Type: FK CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.user_group_members
    ADD CONSTRAINT user_group_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES png.users(user_id) ON DELETE CASCADE;


--
-- Name: user_group_membership user_group_membership_group_id_fkey; Type: FK CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.user_group_membership
    ADD CONSTRAINT user_group_membership_group_id_fkey FOREIGN KEY (group_id) REFERENCES png.user_groups(group_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: user_group_membership user_group_membership_user_id_fkey; Type: FK CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.user_group_membership
    ADD CONSTRAINT user_group_membership_user_id_fkey FOREIGN KEY (user_id) REFERENCES png.users(user_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: user_groups user_groups_role_id_fkey; Type: FK CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.user_groups
    ADD CONSTRAINT user_groups_role_id_fkey FOREIGN KEY (role_id) REFERENCES png.roles(role_id);


--
-- Name: user_locations user_locations_user_id_fkey; Type: FK CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.user_locations
    ADD CONSTRAINT user_locations_user_id_fkey FOREIGN KEY (user_id) REFERENCES png.users(user_id) ON DELETE CASCADE;


--
-- Name: user_notification_preferences user_notification_preferences_user_id_fkey; Type: FK CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.user_notification_preferences
    ADD CONSTRAINT user_notification_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES png.users(user_id);


--
-- Name: user_otps user_otps_user_id_fkey; Type: FK CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.user_otps
    ADD CONSTRAINT user_otps_user_id_fkey FOREIGN KEY (user_id) REFERENCES png.users(user_id) ON DELETE CASCADE;


--
-- Name: user_permission_overrides user_permission_overrides_permission_id_fkey; Type: FK CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.user_permission_overrides
    ADD CONSTRAINT user_permission_overrides_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES png.permissions(permission_id) ON DELETE CASCADE;


--
-- Name: user_permission_overrides user_permission_overrides_user_id_fkey; Type: FK CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.user_permission_overrides
    ADD CONSTRAINT user_permission_overrides_user_id_fkey FOREIGN KEY (user_id) REFERENCES png.users(user_id) ON DELETE CASCADE;


--
-- Name: user_permissions user_permissions_permission_id_fkey; Type: FK CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.user_permissions
    ADD CONSTRAINT user_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES png.permissions(permission_id) ON DELETE CASCADE;


--
-- Name: user_permissions user_permissions_user_id_fkey; Type: FK CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.user_permissions
    ADD CONSTRAINT user_permissions_user_id_fkey FOREIGN KEY (user_id) REFERENCES png.users(user_id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_role_id_fkey; Type: FK CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.user_roles
    ADD CONSTRAINT user_roles_role_id_fkey FOREIGN KEY (role_id) REFERENCES png.roles(role_id);


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES png.users(user_id) ON DELETE CASCADE;


--
-- Name: user_scopes user_scopes_district_id_fkey; Type: FK CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.user_scopes
    ADD CONSTRAINT user_scopes_district_id_fkey FOREIGN KEY (district_id) REFERENCES png.districts(district_id);


--
-- Name: user_scopes user_scopes_facility_id_fkey; Type: FK CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.user_scopes
    ADD CONSTRAINT user_scopes_facility_id_fkey FOREIGN KEY (facility_id) REFERENCES png.facilities(facility_id);


--
-- Name: user_scopes user_scopes_province_id_fkey; Type: FK CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.user_scopes
    ADD CONSTRAINT user_scopes_province_id_fkey FOREIGN KEY (province_id) REFERENCES png.provinces(province_id);


--
-- Name: user_scopes user_scopes_region_id_fkey; Type: FK CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.user_scopes
    ADD CONSTRAINT user_scopes_region_id_fkey FOREIGN KEY (region_id) REFERENCES png.regions(region_id);


--
-- Name: user_scopes user_scopes_user_id_fkey; Type: FK CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.user_scopes
    ADD CONSTRAINT user_scopes_user_id_fkey FOREIGN KEY (user_id) REFERENCES png.users(user_id) ON DELETE CASCADE;


--
-- Name: users users_assigned_district_id_fkey; Type: FK CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.users
    ADD CONSTRAINT users_assigned_district_id_fkey FOREIGN KEY (assigned_district_id) REFERENCES png.districts(district_id);


--
-- Name: users users_assigned_facility_id_fkey; Type: FK CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.users
    ADD CONSTRAINT users_assigned_facility_id_fkey FOREIGN KEY (assigned_facility_id) REFERENCES png.facilities(facility_id);


--
-- Name: users users_assigned_province_id_fkey; Type: FK CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.users
    ADD CONSTRAINT users_assigned_province_id_fkey FOREIGN KEY (assigned_province_id) REFERENCES png.provinces(province_id);


--
-- Name: users users_assigned_region_id_fkey; Type: FK CONSTRAINT; Schema: png; Owner: postgres
--

ALTER TABLE ONLY png.users
    ADD CONSTRAINT users_assigned_region_id_fkey FOREIGN KEY (assigned_region_id) REFERENCES png.regions(region_id);


--
-- Name: repairs repairs_update_pol; Type: POLICY; Schema: png; Owner: postgres
--

CREATE POLICY repairs_update_pol ON png.repairs FOR UPDATE USING ((public.has_repair_permission((current_setting('app.user_id'::text))::integer, 'update'::text, repair_id) OR public.has_repair_permission((current_setting('app.user_id'::text))::integer, 'close'::text, repair_id)));


--
-- Name: ticket_escalations te_delete_pol; Type: POLICY; Schema: png; Owner: postgres
--

CREATE POLICY te_delete_pol ON png.ticket_escalations FOR DELETE USING (public.has_ticket_permission((current_setting('app.user_id'::text))::integer, 'escalate'::text, ticket_id));


--
-- Name: ticket_escalations te_insert_pol; Type: POLICY; Schema: png; Owner: postgres
--

CREATE POLICY te_insert_pol ON png.ticket_escalations FOR INSERT WITH CHECK (public.has_ticket_permission((current_setting('app.user_id'::text))::integer, 'escalate'::text, ticket_id));


--
-- Name: ticket_escalations te_select_pol; Type: POLICY; Schema: png; Owner: postgres
--

CREATE POLICY te_select_pol ON png.ticket_escalations FOR SELECT USING (public.has_ticket_permission((current_setting('app.user_id'::text))::integer, 'read'::text, ticket_id));


--
-- Name: ticket_escalations te_update_pol; Type: POLICY; Schema: png; Owner: postgres
--

CREATE POLICY te_update_pol ON png.ticket_escalations FOR UPDATE USING (public.has_ticket_permission((current_setting('app.user_id'::text))::integer, 'escalate'::text, ticket_id));


--
-- Name: ticket_interactions ti_delete_pol; Type: POLICY; Schema: png; Owner: postgres
--

CREATE POLICY ti_delete_pol ON png.ticket_interactions FOR DELETE USING (public.has_ticket_permission((current_setting('app.user_id'::text))::integer, 'update'::text, ticket_id));


--
-- Name: ticket_interactions ti_insert_pol; Type: POLICY; Schema: png; Owner: postgres
--

CREATE POLICY ti_insert_pol ON png.ticket_interactions FOR INSERT WITH CHECK (public.has_ticket_permission((current_setting('app.user_id'::text))::integer, 'update'::text, ticket_id));


--
-- Name: ticket_interactions ti_select_pol; Type: POLICY; Schema: png; Owner: postgres
--

CREATE POLICY ti_select_pol ON png.ticket_interactions FOR SELECT USING (public.has_ticket_permission((current_setting('app.user_id'::text))::integer, 'read'::text, ticket_id));


--
-- Name: ticket_interactions ti_update_pol; Type: POLICY; Schema: png; Owner: postgres
--

CREATE POLICY ti_update_pol ON png.ticket_interactions FOR UPDATE USING (public.has_ticket_permission((current_setting('app.user_id'::text))::integer, 'update'::text, ticket_id));


--
-- Name: ticket_escalations; Type: ROW SECURITY; Schema: png; Owner: postgres
--

ALTER TABLE png.ticket_escalations ENABLE ROW LEVEL SECURITY;

--
-- Name: ticket_interactions; Type: ROW SECURITY; Schema: png; Owner: postgres
--

ALTER TABLE png.ticket_interactions ENABLE ROW LEVEL SECURITY;

--
-- Name: tickets; Type: ROW SECURITY; Schema: png; Owner: postgres
--

ALTER TABLE png.tickets ENABLE ROW LEVEL SECURITY;

--
-- Name: tickets tickets_insert_pol; Type: POLICY; Schema: png; Owner: postgres
--

CREATE POLICY tickets_insert_pol ON png.tickets FOR INSERT WITH CHECK (public.has_permission((current_setting('app.user_id'::text))::integer, 'tickets'::text, 'create'::text, region_id, province_id, district_id, facility_id, (created_by)::text));


--
-- Name: tickets tickets_select_pol; Type: POLICY; Schema: png; Owner: postgres
--

CREATE POLICY tickets_select_pol ON png.tickets FOR SELECT USING (public.has_permission((current_setting('app.user_id'::text))::integer, 'tickets'::text, 'read'::text, region_id, province_id, district_id, facility_id, (created_by)::text));


--
-- Name: tickets tickets_update_pol; Type: POLICY; Schema: png; Owner: postgres
--

CREATE POLICY tickets_update_pol ON png.tickets FOR UPDATE USING ((public.has_permission((current_setting('app.user_id'::text))::integer, 'tickets'::text, 'update'::text, region_id, province_id, district_id, facility_id, (created_by)::text) OR public.has_permission((current_setting('app.user_id'::text))::integer, 'tickets'::text, 'assign'::text, region_id, province_id, district_id, facility_id, (created_by)::text) OR public.has_permission((current_setting('app.user_id'::text))::integer, 'tickets'::text, 'close'::text, region_id, province_id, district_id, facility_id, (created_by)::text) OR public.has_permission((current_setting('app.user_id'::text))::integer, 'tickets'::text, 'escalate'::text, region_id, province_id, district_id, facility_id, (created_by)::text)));


--
-- Name: TABLE appsmith_user_mapping; Type: ACL; Schema: png; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE png.appsmith_user_mapping TO ccets_api_user;


--
-- Name: TABLE audit_trail; Type: ACL; Schema: png; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE png.audit_trail TO ccets_api_user;


--
-- Name: SEQUENCE audit_trail_audit_id_seq; Type: ACL; Schema: png; Owner: postgres
--

GRANT SELECT,USAGE ON SEQUENCE png.audit_trail_audit_id_seq TO ccets_api_user;


--
-- Name: TABLE device_registry; Type: ACL; Schema: png; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE png.device_registry TO ccets_api_user;


--
-- Name: SEQUENCE device_registry_id_seq; Type: ACL; Schema: png; Owner: postgres
--

GRANT SELECT,USAGE ON SEQUENCE png.device_registry_id_seq TO ccets_api_user;


--
-- Name: TABLE districts; Type: ACL; Schema: png; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE png.districts TO ccets_api_user;


--
-- Name: SEQUENCE districts_district_id_seq; Type: ACL; Schema: png; Owner: postgres
--

GRANT SELECT,USAGE ON SEQUENCE png.districts_district_id_seq TO ccets_api_user;


--
-- Name: TABLE energy_sources; Type: ACL; Schema: png; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE png.energy_sources TO ccets_api_user;


--
-- Name: SEQUENCE energy_sources_id_seq; Type: ACL; Schema: png; Owner: postgres
--

GRANT SELECT,USAGE ON SEQUENCE png.energy_sources_id_seq TO ccets_api_user;


--
-- Name: TABLE equipment; Type: ACL; Schema: png; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE png.equipment TO ccets_api_user;


--
-- Name: SEQUENCE equipment_equipment_id_seq; Type: ACL; Schema: png; Owner: postgres
--

GRANT SELECT,USAGE ON SEQUENCE png.equipment_equipment_id_seq TO ccets_api_user;


--
-- Name: TABLE escalation_paths; Type: ACL; Schema: png; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE png.escalation_paths TO ccets_api_user;


--
-- Name: SEQUENCE escalation_paths_path_id_seq; Type: ACL; Schema: png; Owner: postgres
--

GRANT SELECT,USAGE ON SEQUENCE png.escalation_paths_path_id_seq TO ccets_api_user;


--
-- Name: TABLE facilities; Type: ACL; Schema: png; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE png.facilities TO ccets_api_user;


--
-- Name: SEQUENCE facilities_facility_id_seq; Type: ACL; Schema: png; Owner: postgres
--

GRANT SELECT,USAGE ON SEQUENCE png.facilities_facility_id_seq TO ccets_api_user;


--
-- Name: TABLE group_permissions; Type: ACL; Schema: png; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE png.group_permissions TO ccets_api_user;


--
-- Name: SEQUENCE group_permissions_group_permission_id_seq; Type: ACL; Schema: png; Owner: postgres
--

GRANT SELECT,USAGE ON SEQUENCE png.group_permissions_group_permission_id_seq TO ccets_api_user;


--
-- Name: TABLE login_audit; Type: ACL; Schema: png; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE png.login_audit TO ccets_api_user;


--
-- Name: SEQUENCE login_audit_audit_id_seq; Type: ACL; Schema: png; Owner: postgres
--

GRANT SELECT,USAGE ON SEQUENCE png.login_audit_audit_id_seq TO ccets_api_user;


--
-- Name: TABLE notification_templates; Type: ACL; Schema: png; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE png.notification_templates TO ccets_api_user;


--
-- Name: SEQUENCE notification_templates_template_id_seq; Type: ACL; Schema: png; Owner: postgres
--

GRANT SELECT,USAGE ON SEQUENCE png.notification_templates_template_id_seq TO ccets_api_user;


--
-- Name: TABLE notifications; Type: ACL; Schema: png; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE png.notifications TO ccets_api_user;


--
-- Name: SEQUENCE notifications_notification_id_seq; Type: ACL; Schema: png; Owner: postgres
--

GRANT SELECT,USAGE ON SEQUENCE png.notifications_notification_id_seq TO ccets_api_user;


--
-- Name: TABLE password_reset_tokens; Type: ACL; Schema: png; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE png.password_reset_tokens TO ccets_api_user;


--
-- Name: SEQUENCE password_reset_tokens_token_id_seq; Type: ACL; Schema: png; Owner: postgres
--

GRANT SELECT,USAGE ON SEQUENCE png.password_reset_tokens_token_id_seq TO ccets_api_user;


--
-- Name: TABLE password_resets; Type: ACL; Schema: png; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE png.password_resets TO ccets_api_user;


--
-- Name: SEQUENCE password_resets_reset_id_seq; Type: ACL; Schema: png; Owner: postgres
--

GRANT SELECT,USAGE ON SEQUENCE png.password_resets_reset_id_seq TO ccets_api_user;


--
-- Name: TABLE permissions; Type: ACL; Schema: png; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE png.permissions TO ccets_api_user;


--
-- Name: SEQUENCE permissions_permission_id_seq; Type: ACL; Schema: png; Owner: postgres
--

GRANT SELECT,USAGE ON SEQUENCE png.permissions_permission_id_seq TO ccets_api_user;


--
-- Name: TABLE provinces; Type: ACL; Schema: png; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE png.provinces TO ccets_api_user;


--
-- Name: SEQUENCE provinces_province_id_seq; Type: ACL; Schema: png; Owner: postgres
--

GRANT SELECT,USAGE ON SEQUENCE png.provinces_province_id_seq TO ccets_api_user;


--
-- Name: TABLE regions; Type: ACL; Schema: png; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE png.regions TO ccets_api_user;


--
-- Name: SEQUENCE regions_region_id_seq; Type: ACL; Schema: png; Owner: postgres
--

GRANT SELECT,USAGE ON SEQUENCE png.regions_region_id_seq TO ccets_api_user;


--
-- Name: TABLE repair_attachments; Type: ACL; Schema: png; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE png.repair_attachments TO ccets_api_user;


--
-- Name: SEQUENCE repair_attachments_attachment_id_seq; Type: ACL; Schema: png; Owner: postgres
--

GRANT SELECT,USAGE ON SEQUENCE png.repair_attachments_attachment_id_seq TO ccets_api_user;


--
-- Name: TABLE repairs; Type: ACL; Schema: png; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE png.repairs TO ccets_api_user;


--
-- Name: SEQUENCE repairs_repair_id_seq; Type: ACL; Schema: png; Owner: postgres
--

GRANT SELECT,USAGE ON SEQUENCE png.repairs_repair_id_seq TO ccets_api_user;


--
-- Name: TABLE role_location_access; Type: ACL; Schema: png; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE png.role_location_access TO ccets_api_user;


--
-- Name: SEQUENCE role_location_access_id_seq; Type: ACL; Schema: png; Owner: postgres
--

GRANT SELECT,USAGE ON SEQUENCE png.role_location_access_id_seq TO ccets_api_user;


--
-- Name: TABLE role_permissions; Type: ACL; Schema: png; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE png.role_permissions TO ccets_api_user;


--
-- Name: SEQUENCE role_permissions_role_permission_id_seq; Type: ACL; Schema: png; Owner: postgres
--

GRANT SELECT,USAGE ON SEQUENCE png.role_permissions_role_permission_id_seq TO ccets_api_user;


--
-- Name: TABLE roles; Type: ACL; Schema: png; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE png.roles TO ccets_api_user;


--
-- Name: SEQUENCE roles_role_id_seq; Type: ACL; Schema: png; Owner: postgres
--

GRANT SELECT,USAGE ON SEQUENCE png.roles_role_id_seq TO ccets_api_user;


--
-- Name: TABLE sla_settings; Type: ACL; Schema: png; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE png.sla_settings TO ccets_api_user;


--
-- Name: TABLE spareparts; Type: ACL; Schema: png; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE png.spareparts TO ccets_api_user;


--
-- Name: SEQUENCE spareparts_sparepart_id_seq; Type: ACL; Schema: png; Owner: postgres
--

GRANT SELECT,USAGE ON SEQUENCE png.spareparts_sparepart_id_seq TO ccets_api_user;


--
-- Name: TABLE sync_log; Type: ACL; Schema: png; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE png.sync_log TO ccets_api_user;


--
-- Name: SEQUENCE sync_log_id_seq; Type: ACL; Schema: png; Owner: postgres
--

GRANT SELECT,USAGE ON SEQUENCE png.sync_log_id_seq TO ccets_api_user;


--
-- Name: TABLE sync_sessions; Type: ACL; Schema: png; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE png.sync_sessions TO ccets_api_user;


--
-- Name: SEQUENCE sync_sessions_session_id_seq; Type: ACL; Schema: png; Owner: postgres
--

GRANT SELECT,USAGE ON SEQUENCE png.sync_sessions_session_id_seq TO ccets_api_user;


--
-- Name: TABLE technicians; Type: ACL; Schema: png; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE png.technicians TO ccets_api_user;


--
-- Name: SEQUENCE technicians_technician_id_seq; Type: ACL; Schema: png; Owner: postgres
--

GRANT SELECT,USAGE ON SEQUENCE png.technicians_technician_id_seq TO ccets_api_user;


--
-- Name: TABLE ticket_escalations; Type: ACL; Schema: png; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE png.ticket_escalations TO ccets_api_user;


--
-- Name: SEQUENCE ticket_escalations_escalation_id_seq; Type: ACL; Schema: png; Owner: postgres
--

GRANT SELECT,USAGE ON SEQUENCE png.ticket_escalations_escalation_id_seq TO ccets_api_user;


--
-- Name: TABLE ticket_interactions; Type: ACL; Schema: png; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE png.ticket_interactions TO ccets_api_user;


--
-- Name: SEQUENCE ticket_interactions_interaction_id_seq; Type: ACL; Schema: png; Owner: postgres
--

GRANT SELECT,USAGE ON SEQUENCE png.ticket_interactions_interaction_id_seq TO ccets_api_user;


--
-- Name: TABLE ticket_spareparts; Type: ACL; Schema: png; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE png.ticket_spareparts TO ccets_api_user;


--
-- Name: SEQUENCE ticket_spareparts_id_seq; Type: ACL; Schema: png; Owner: postgres
--

GRANT SELECT,USAGE ON SEQUENCE png.ticket_spareparts_id_seq TO ccets_api_user;


--
-- Name: TABLE ticket_transactions; Type: ACL; Schema: png; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE png.ticket_transactions TO ccets_api_user;


--
-- Name: SEQUENCE ticket_transactions_transaction_id_seq; Type: ACL; Schema: png; Owner: postgres
--

GRANT SELECT,USAGE ON SEQUENCE png.ticket_transactions_transaction_id_seq TO ccets_api_user;


--
-- Name: TABLE tickets; Type: ACL; Schema: png; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE png.tickets TO ccets_api_user;


--
-- Name: SEQUENCE tickets_ticket_id_seq; Type: ACL; Schema: png; Owner: postgres
--

GRANT SELECT,USAGE ON SEQUENCE png.tickets_ticket_id_seq TO ccets_api_user;


--
-- Name: TABLE user_group_members; Type: ACL; Schema: png; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE png.user_group_members TO ccets_api_user;


--
-- Name: TABLE user_group_membership; Type: ACL; Schema: png; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE png.user_group_membership TO ccets_api_user;


--
-- Name: SEQUENCE user_group_membership_membership_id_seq; Type: ACL; Schema: png; Owner: postgres
--

GRANT SELECT,USAGE ON SEQUENCE png.user_group_membership_membership_id_seq TO ccets_api_user;


--
-- Name: TABLE user_groups; Type: ACL; Schema: png; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE png.user_groups TO ccets_api_user;


--
-- Name: SEQUENCE user_groups_group_id_seq; Type: ACL; Schema: png; Owner: postgres
--

GRANT SELECT,USAGE ON SEQUENCE png.user_groups_group_id_seq TO ccets_api_user;


--
-- Name: TABLE user_permissions; Type: ACL; Schema: png; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE png.user_permissions TO ccets_api_user;


--
-- Name: TABLE user_roles; Type: ACL; Schema: png; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE png.user_roles TO ccets_api_user;


--
-- Name: TABLE users; Type: ACL; Schema: png; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE png.users TO ccets_api_user;


--
-- Name: SEQUENCE users_user_id_seq; Type: ACL; Schema: png; Owner: postgres
--

GRANT SELECT,USAGE ON SEQUENCE png.users_user_id_seq TO ccets_api_user;


--
-- Name: TABLE v_user_access_summary; Type: ACL; Schema: png; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE png.v_user_access_summary TO ccets_api_user;


--
-- Name: TABLE v_user_roles; Type: ACL; Schema: png; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE png.v_user_roles TO ccets_api_user;


--
-- Name: TABLE v_user_scope; Type: ACL; Schema: png; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE png.v_user_scope TO ccets_api_user;


--
-- Name: TABLE vw_user_access; Type: ACL; Schema: png; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE png.vw_user_access TO ccets_api_user;


--
-- PostgreSQL database dump complete
--

\unrestrict 5EA40uu0lNP1iu2LEvmNqwD4bYlooh9FFfzJE8clFolWUhndIp51oNmoAFNc7mb

