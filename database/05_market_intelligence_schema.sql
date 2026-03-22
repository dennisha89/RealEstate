-- ============================================================
-- Market Intelligence Schema
-- Hyper-Multidimensional Analysis System
-- ============================================================

-- Market areas (zip codes, metros, neighborhoods)
CREATE TABLE market_areas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zip_code VARCHAR(10),
    metro_area VARCHAR(100),
    city VARCHAR(100),
    state VARCHAR(2),
    county VARCHAR(100),
    neighborhood VARCHAR(100),
    latitude DECIMAL(10, 7),
    longitude DECIMAL(10, 7),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(zip_code)
);

-- Demographic time-series data (Census ACS, IRS SOI)
CREATE TABLE demographic_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    market_area_id UUID REFERENCES market_areas(id) ON DELETE CASCADE,
    data_year INTEGER NOT NULL,
    data_source VARCHAR(50) NOT NULL, -- 'census_acs', 'irs_soi', 'bls'
    population INTEGER,
    median_household_income DECIMAL(12, 2),
    net_migration INTEGER, -- positive = in-migration
    bachelors_pct DECIMAL(5, 2),
    graduate_pct DECIMAL(5, 2),
    millennials_25_39_pct DECIMAL(5, 2),
    young_families_pct DECIMAL(5, 2),
    retirees_pct DECIMAL(5, 2),
    household_formation_rate DECIMAL(5, 2),
    doctors_per_capita DECIMAL(8, 4),
    engineers_per_capita DECIMAL(8, 4),
    tech_workers_per_capita DECIMAL(8, 4),
    high_income_households_pct DECIMAL(5, 2), -- >$150k
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(market_area_id, data_year, data_source)
);

-- Economic indicators (BLS QCEW, state labor dept)
CREATE TABLE economic_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    market_area_id UUID REFERENCES market_areas(id) ON DELETE CASCADE,
    data_month DATE NOT NULL, -- first day of month
    data_source VARCHAR(50) NOT NULL,
    job_growth_rate DECIMAL(6, 2),
    unemployment_rate DECIMAL(5, 2),
    wage_growth_rate DECIMAL(6, 2),
    cost_of_living_index DECIMAL(6, 2),
    business_permit_count INTEGER,
    metro_gdp_growth_rate DECIMAL(6, 2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(market_area_id, data_month, data_source)
);

-- Major employers tracking
CREATE TABLE major_employers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    market_area_id UUID REFERENCES market_areas(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    industry VARCHAR(100),
    employee_count INTEGER,
    recent_event VARCHAR(50), -- 'expanding', 'stable', 'layoffs', 'relocating_in', 'relocating_out'
    event_date DATE,
    event_description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Industry composition
CREATE TABLE industry_composition (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    market_area_id UUID REFERENCES market_areas(id) ON DELETE CASCADE,
    data_year INTEGER NOT NULL,
    industry_name VARCHAR(100) NOT NULL,
    pct_employment DECIMAL(5, 2),
    employee_count INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(market_area_id, data_year, industry_name)
);

-- Infrastructure & development projects
CREATE TABLE development_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    market_area_id UUID REFERENCES market_areas(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    project_type VARCHAR(50) NOT NULL, -- 'transit', 'commercial', 'medical', 'school', 'tech_office', 'residential'
    investment_amount DECIMAL(15, 2),
    status VARCHAR(30) NOT NULL, -- 'planned', 'under_construction', 'completed'
    start_date DATE,
    completion_date DATE,
    latitude DECIMAL(10, 7),
    longitude DECIMAL(10, 7),
    impact_radius_miles DECIMAL(5, 2),
    estimated_value_impact_pct DECIMAL(5, 2),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Zoning changes
CREATE TABLE zoning_changes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    market_area_id UUID REFERENCES market_areas(id) ON DELETE CASCADE,
    area_description VARCHAR(200),
    from_zone VARCHAR(20),
    to_zone VARCHAR(20),
    density_impact VARCHAR(20), -- 'increase', 'decrease', 'neutral'
    estimated_units INTEGER,
    status VARCHAR(20), -- 'proposed', 'approved', 'enacted'
    effective_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Building permits (Census Building Permits Survey)
CREATE TABLE building_permits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    market_area_id UUID REFERENCES market_areas(id) ON DELETE CASCADE,
    data_month DATE NOT NULL,
    residential_permits INTEGER,
    commercial_permits INTEGER,
    total_permit_value DECIMAL(15, 2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(market_area_id, data_month)
);

-- School ratings (GreatSchools)
CREATE TABLE school_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    market_area_id UUID REFERENCES market_areas(id) ON DELETE CASCADE,
    school_name VARCHAR(200) NOT NULL,
    school_type VARCHAR(20), -- 'elementary', 'middle', 'high'
    rating INTEGER CHECK (rating BETWEEN 1 AND 10),
    previous_rating INTEGER,
    distance_miles DECIMAL(5, 2),
    latitude DECIMAL(10, 7),
    longitude DECIMAL(10, 7),
    data_year INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Crime statistics
CREATE TABLE crime_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    market_area_id UUID REFERENCES market_areas(id) ON DELETE CASCADE,
    data_year INTEGER NOT NULL,
    data_source VARCHAR(50), -- 'fbi_ucr', 'local_pd'
    violent_per_1000 DECIMAL(8, 2),
    property_per_1000 DECIMAL(8, 2),
    metro_avg_violent DECIMAL(8, 2),
    metro_avg_property DECIMAL(8, 2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(market_area_id, data_year, data_source)
);

-- Walkability scores
CREATE TABLE walkability_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    market_area_id UUID REFERENCES market_areas(id) ON DELETE CASCADE,
    walk_score INTEGER,
    transit_score INTEGER,
    bike_score INTEGER,
    fetched_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(market_area_id)
);

-- Supply-demand metrics
CREATE TABLE supply_demand_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    market_area_id UUID REFERENCES market_areas(id) ON DELETE CASCADE,
    data_month DATE NOT NULL,
    months_of_inventory DECIMAL(5, 2),
    median_days_on_market INTEGER,
    list_to_sale_ratio DECIMAL(6, 4),
    new_listings_count INTEGER,
    pending_sales_count INTEGER,
    closed_sales_count INTEGER,
    median_sale_price DECIMAL(12, 2),
    median_list_price DECIMAL(12, 2),
    median_rent DECIMAL(10, 2),
    rental_vacancy_rate DECIMAL(5, 2),
    rent_growth_rate_yoy DECIMAL(6, 2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(market_area_id, data_month)
);

-- Comparable sales
CREATE TABLE comparable_sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    market_area_id UUID REFERENCES market_areas(id) ON DELETE CASCADE,
    address VARCHAR(300) NOT NULL,
    sale_price DECIMAL(12, 2) NOT NULL,
    sale_date DATE NOT NULL,
    list_price DECIMAL(12, 2),
    sqft INTEGER,
    price_per_sqft DECIMAL(8, 2),
    bedrooms INTEGER,
    bathrooms DECIMAL(4, 1),
    year_built INTEGER,
    lot_size_sqft INTEGER,
    property_type VARCHAR(50),
    days_on_market INTEGER,
    latitude DECIMAL(10, 7),
    longitude DECIMAL(10, 7),
    data_source VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Macro/risk factors
CREATE TABLE macro_risk_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    market_area_id UUID REFERENCES market_areas(id) ON DELETE CASCADE,
    data_date DATE NOT NULL,
    flood_zone BOOLEAN DEFAULT FALSE,
    flood_zone_type VARCHAR(10),
    wildfire_risk VARCHAR(20),
    hurricane_risk VARCHAR(20),
    earthquake_risk VARCHAR(20),
    climate_risk_score INTEGER,
    rent_control_active BOOLEAN DEFAULT FALSE,
    rent_control_proposed BOOLEAN DEFAULT FALSE,
    landlord_friendliness_score INTEGER,
    market_cycle_position VARCHAR(30),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- HyperScore history (cached analysis results)
CREATE TABLE hyper_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID, -- optional: links to user who ran analysis
    market_area_id UUID REFERENCES market_areas(id),
    property_address VARCHAR(300),
    property_price DECIMAL(12, 2),
    hyper_score INTEGER,
    recommendation VARCHAR(30),
    confidence INTEGER,
    financial_score INTEGER,
    comps_score INTEGER,
    demographic_score INTEGER,
    economic_score INTEGER,
    infrastructure_score INTEGER,
    quality_of_life_score INTEGER,
    supply_demand_score INTEGER,
    macro_risk_score INTEGER,
    appreciation_1yr DECIMAL(6, 2),
    appreciation_3yr DECIMAL(6, 2),
    appreciation_5yr DECIMAL(6, 2),
    top_drivers JSONB, -- array of KPIDriver
    top_risks JSONB,   -- array of KPIDriver
    full_analysis JSONB, -- complete HyperAnalysis object
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Deal alerts
CREATE TABLE deal_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    criteria JSONB NOT NULL, -- DealCriteria object
    frequency VARCHAR(20) DEFAULT 'daily', -- 'instant', 'daily', 'weekly'
    channels JSONB DEFAULT '["email"]', -- notification channels
    active BOOLEAN DEFAULT TRUE,
    last_triggered_at TIMESTAMPTZ,
    match_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Deal alert matches
CREATE TABLE deal_alert_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_id UUID REFERENCES deal_alerts(id) ON DELETE CASCADE,
    property_address VARCHAR(300),
    deal_type VARCHAR(30),
    hyper_score INTEGER,
    estimated_discount DECIMAL(5, 2),
    projected_cash_flow DECIMAL(10, 2),
    projected_appreciation DECIMAL(6, 2),
    urgency VARCHAR(20),
    key_reasons JSONB,
    notified BOOLEAN DEFAULT FALSE,
    notified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Indexes for query performance
-- ============================================================

CREATE INDEX idx_demographic_data_market_year ON demographic_data(market_area_id, data_year);
CREATE INDEX idx_economic_data_market_month ON economic_data(market_area_id, data_month);
CREATE INDEX idx_supply_demand_market_month ON supply_demand_data(market_area_id, data_month);
CREATE INDEX idx_comparable_sales_market_date ON comparable_sales(market_area_id, sale_date);
CREATE INDEX idx_comparable_sales_location ON comparable_sales(latitude, longitude);
CREATE INDEX idx_development_projects_status ON development_projects(market_area_id, status);
CREATE INDEX idx_building_permits_market_month ON building_permits(market_area_id, data_month);
CREATE INDEX idx_hyper_analyses_user ON hyper_analyses(user_id, created_at DESC);
CREATE INDEX idx_hyper_analyses_market ON hyper_analyses(market_area_id, created_at DESC);
CREATE INDEX idx_hyper_analyses_score ON hyper_analyses(hyper_score DESC);
CREATE INDEX idx_deal_alerts_user ON deal_alerts(user_id, active);
CREATE INDEX idx_deal_alert_matches_alert ON deal_alert_matches(alert_id, created_at DESC);
CREATE INDEX idx_market_areas_zip ON market_areas(zip_code);
CREATE INDEX idx_market_areas_metro ON market_areas(metro_area);
CREATE INDEX idx_school_ratings_market ON school_ratings(market_area_id, school_type);
CREATE INDEX idx_crime_data_market_year ON crime_data(market_area_id, data_year);
