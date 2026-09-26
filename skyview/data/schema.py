"""
Schema initializer — creates all tables (IF NOT EXISTS).
Run once before seeding: python -m skyview.data.schema
"""

from skyview.data.db import execute_update, init_db
from skyview.utils.logger import get_logger

logger = get_logger(__name__)

_SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    phone VARCHAR(20) PRIMARY KEY,
    name VARCHAR(100),
    land_size_acres FLOAT,
    location VARCHAR(200),
    crops TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS installations (
    id SERIAL PRIMARY KEY,
    station_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    latitude FLOAT NOT NULL,
    longitude FLOAT NOT NULL,
    location_name VARCHAR(200),
    installation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'active',
    device_type VARCHAR(50),
    firmware_version VARCHAR(50),
    last_heartbeat TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS installation_sensors (
    id SERIAL PRIMARY KEY,
    installation_id INTEGER REFERENCES installations(id) ON DELETE CASCADE,
    sensor_type VARCHAR(50) NOT NULL,
    sensor_name VARCHAR(100),
    unit VARCHAR(20),
    active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS weather_data (
    id SERIAL PRIMARY KEY,
    station_id VARCHAR(50) NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    temperature FLOAT,
    humidity FLOAT,
    pressure FLOAT,
    wind_speed FLOAT,
    wind_direction VARCHAR(20),
    rainfall FLOAT,
    soil_temperature FLOAT,
    soil_moisture FLOAT,
    pm25 FLOAT,
    pm10 FLOAT,
    uv_index FLOAT,
    lux FLOAT,
    battery_voltage FLOAT,
    solar_voltage FLOAT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS alerts (
    id SERIAL PRIMARY KEY,
    station_id VARCHAR(50) NOT NULL,
    alert_type VARCHAR(50),
    severity VARCHAR(20),
    message TEXT,
    value FLOAT,
    threshold FLOAT,
    acknowledged BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    acknowledged_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_preferences (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(50) UNIQUE NOT NULL,
    preferred_unit VARCHAR(10) DEFAULT 'C',
    verbosity VARCHAR(20) DEFAULT 'short',
    alert_channel VARCHAR(20) DEFAULT 'whatsapp',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS trends (
    id SERIAL PRIMARY KEY,
    station_id VARCHAR(50) NOT NULL,
    metric VARCHAR(50) NOT NULL,
    period VARCHAR(20) NOT NULL,
    trend_direction VARCHAR(20),
    trend_rate FLOAT,
    confidence FLOAT,
    start_timestamp TIMESTAMP,
    end_timestamp TIMESTAMP
);

CREATE TABLE IF NOT EXISTS system_health (
    id SERIAL PRIMARY KEY,
    station_id VARCHAR(50) NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sensor_status VARCHAR(50),
    battery_level FLOAT,
    connectivity VARCHAR(50),
    last_data_received TIMESTAMP,
    uptime_hours FLOAT
);

CREATE TABLE IF NOT EXISTS crop_calendar (
    id SERIAL PRIMARY KEY,
    state VARCHAR(100),
    crop VARCHAR(100),
    season VARCHAR(50),
    sow_start VARCHAR(20),
    sow_end VARCHAR(20),
    harvest_start VARCHAR(20),
    harvest_end VARCHAR(20),
    variety VARCHAR(200),
    water_requirement VARCHAR(50),
    duration_days INTEGER,
    advisory TEXT
);

CREATE TABLE IF NOT EXISTS government_schemes (
    id SERIAL PRIMARY KEY,
    scheme_id VARCHAR(50) UNIQUE NOT NULL,
    scheme_name VARCHAR(200),
    scheme_type VARCHAR(50),
    state VARCHAR(100),
    applicable_crops TEXT,
    benefit_description TEXT,
    eligibility TEXT,
    status VARCHAR(20),
    official_url VARCHAR(500),
    helpline VARCHAR(50),
    email VARCHAR(200),
    contact_address TEXT
);

CREATE TABLE IF NOT EXISTS mandi_rates_history (
    id SERIAL PRIMARY KEY,
    state VARCHAR(100),
    district VARCHAR(100),
    market VARCHAR(200),
    commodity VARCHAR(100),
    variety VARCHAR(100),
    arrival_date DATE,
    min_price FLOAT,
    max_price FLOAT,
    modal_price FLOAT,
    unit VARCHAR(50),
    year INTEGER,
    month INTEGER,
    week INTEGER
);

CREATE TABLE IF NOT EXISTS msp_history (
    id SERIAL PRIMARY KEY,
    crop VARCHAR(100),
    year INTEGER,
    msp_rs_quintal FLOAT,
    unit VARCHAR(50),
    announced_by VARCHAR(200),
    effective_season VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS emergency_resource_allocation (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(100),
    event_description TEXT,
    station_id VARCHAR(50),
    state VARCHAR(100),
    district VARCHAR(100),
    resource_type VARCHAR(200),
    quantity FLOAT,
    unit VARCHAR(50),
    priority VARCHAR(50),
    responsible_agency VARCHAR(200),
    event_start TIMESTAMP,
    dispatch_time TIMESTAMP,
    status VARCHAR(50),
    beneficiary_farmers INTEGER,
    area_covered_ha FLOAT,
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_weather_station ON weather_data(station_id);
CREATE INDEX IF NOT EXISTS idx_weather_ts ON weather_data(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_station ON alerts(station_id);
CREATE INDEX IF NOT EXISTS idx_alerts_ts ON alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sys_health_station ON system_health(station_id);
CREATE INDEX IF NOT EXISTS idx_mandi_commodity ON mandi_rates_history(commodity);
CREATE INDEX IF NOT EXISTS idx_mandi_state ON mandi_rates_history(state);
CREATE INDEX IF NOT EXISTS idx_trends_station ON trends(station_id);
"""


def init_schema() -> None:
    init_db()
    logger.info("Applying schema (CREATE IF NOT EXISTS)…")
    # Execute statement by statement to handle semicolons
    from skyview.data.db import get_session
    from sqlalchemy import text
    db = get_session()
    try:
        for stmt in _SCHEMA.split(";"):
            stmt = stmt.strip()
            if stmt:
                db.execute(text(stmt))
        db.commit()
        logger.info("✅ Schema applied successfully")
    except Exception as exc:
        db.rollback()
        logger.error("Schema error: %s", exc)
        raise
    finally:
        db.close()


if __name__ == "__main__":
    init_schema()