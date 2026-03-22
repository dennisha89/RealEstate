-- ============================================================
-- Microeconomics, City Development & Rental Analysis Schema
-- ============================================================

-- Capital flow tracking
CREATE TABLE capital_flows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    market_area_id UUID REFERENCES market_areas(id) ON DELETE CASCADE,
    data_month DATE NOT NULL,
    mortgage_origination_volume DECIMAL(15, 2),
    sba_loan_volume DECIMAL(15, 2),
    commercial_loan_volume DECIMAL(15, 2),
    vc_deal_count INTEGER,
    vc_total_funding DECIMAL(15, 2),
    commercial_re_investment DECIMAL(15, 2),
    residential_re_transaction_volume DECIMAL(15, 2),
    federal_grants_received DECIMAL(15, 2),
    state_infrastructure_spending DECIMAL(15, 2),
    municipal_bond_issuance DECIMAL(15, 2),
    sales_tax_revenue DECIMAL(15, 2),
    property_tax_revenue DECIMAL(15, 2),
    income_tax_revenue DECIMAL(15, 2),
    net_capital_flow_direction VARCHAR(20),
    capital_flow_score INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(market_area_id, data_month)
);

-- Business activity tracking
CREATE TABLE business_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    market_area_id UUID REFERENCES market_areas(id) ON DELETE CASCADE,
    data_month DATE NOT NULL,
    new_business_formations INTEGER,
    business_dissolutions INTEGER,
    business_license_applications INTEGER,
    commercial_lease_sqft_absorbed INTEGER,
    commercial_vacancy_rate DECIMAL(5, 2),
    retail_store_openings INTEGER,
    retail_store_closings INTEGER,
    restaurant_openings INTEGER,
    restaurant_closings INTEGER,
    coworking_spaces INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(market_area_id, data_month)
);

-- Construction activity tracking
CREATE TABLE construction_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    market_area_id UUID REFERENCES market_areas(id) ON DELETE CASCADE,
    data_month DATE NOT NULL,
    residential_permit_value DECIMAL(15, 2),
    commercial_permit_value DECIMAL(15, 2),
    demolition_permits INTEGER,
    renovation_permits INTEGER,
    active_construction_projects INTEGER,
    construction_employment INTEGER,
    architectural_billings_index DECIMAL(5, 1),
    construction_cost_index DECIMAL(8, 2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(market_area_id, data_month)
);

-- Consumer spending indicators
CREATE TABLE consumer_spending (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    market_area_id UUID REFERENCES market_areas(id) ON DELETE CASCADE,
    data_quarter DATE NOT NULL, -- first day of quarter
    retail_sales_per_capita DECIMAL(10, 2),
    restaurant_spending_per_capita DECIMAL(10, 2),
    grocery_spending_index DECIMAL(6, 2),
    luxury_retail_count INTEGER,
    auto_registrations INTEGER,
    avg_new_car_price DECIMAL(10, 2),
    discretionary_spending_ratio DECIMAL(5, 2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(market_area_id, data_quarter)
);

-- Credit market metrics
CREATE TABLE credit_market (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    market_area_id UUID REFERENCES market_areas(id) ON DELETE CASCADE,
    data_month DATE NOT NULL,
    avg_credit_score INTEGER,
    mortgage_approval_rate DECIMAL(5, 2),
    mortgage_delinquency_rate DECIMAL(5, 2),
    foreclosure_rate DECIMAL(5, 2),
    avg_debt_to_income DECIMAL(5, 2),
    refinance_volume DECIMAL(15, 2),
    heloc_originations DECIMAL(15, 2),
    avg_mortgage_amount DECIMAL(12, 2),
    cash_buyer_percentage DECIMAL(5, 2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(market_area_id, data_month)
);

-- Housing micro-metrics
CREATE TABLE housing_micro_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    market_area_id UUID REFERENCES market_areas(id) ON DELETE CASCADE,
    data_month DATE NOT NULL,
    median_price_1bed DECIMAL(12, 2),
    median_price_2bed DECIMAL(12, 2),
    median_price_3bed DECIMAL(12, 2),
    median_price_4plus_bed DECIMAL(12, 2),
    psf_new_construction DECIMAL(8, 2),
    psf_mid_age DECIMAL(8, 2),
    psf_older DECIMAL(8, 2),
    flips_completed INTEGER,
    avg_flip_profit DECIMAL(12, 2),
    investor_purchase_pct DECIMAL(5, 2),
    first_time_buyer_pct DECIMAL(5, 2),
    cash_offer_pct DECIMAL(5, 2),
    price_reduction_pct DECIMAL(5, 2),
    avg_price_reduction DECIMAL(12, 2),
    expired_listings_pct DECIMAL(5, 2),
    shadow_inventory INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(market_area_id, data_month)
);

-- Wealth indicators
CREATE TABLE wealth_indicators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    market_area_id UUID REFERENCES market_areas(id) ON DELETE CASCADE,
    data_year INTEGER NOT NULL,
    median_net_worth DECIMAL(12, 2),
    savings_rate DECIMAL(5, 2),
    bankruptcy_filings INTEGER,
    charitable_donations_per_capita DECIMAL(10, 2),
    private_school_enrollment_pct DECIMAL(5, 2),
    million_dollar_homes_pct DECIMAL(5, 2),
    luxury_car_registrations_per_capita DECIMAL(8, 4),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(market_area_id, data_year)
);

-- City development projects (from open data portals)
CREATE TABLE city_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    market_area_id UUID REFERENCES market_areas(id) ON DELETE CASCADE,
    project_id VARCHAR(50), -- city's internal project ID
    name VARCHAR(300) NOT NULL,
    project_type VARCHAR(50) NOT NULL,
    description TEXT,
    department VARCHAR(100),
    status VARCHAR(30) NOT NULL,
    budget DECIMAL(15, 2),
    actual_cost DECIMAL(15, 2),
    start_date DATE,
    estimated_completion DATE,
    actual_completion DATE,
    latitude DECIMAL(10, 7),
    longitude DECIMAL(10, 7),
    ward VARCHAR(20),
    district VARCHAR(50),
    contractor VARCHAR(200),
    funding_source VARCHAR(300),
    impact_radius_miles DECIMAL(5, 2),
    estimated_value_impact_low DECIMAL(5, 2),
    estimated_value_impact_mid DECIMAL(5, 2),
    estimated_value_impact_high DECIMAL(5, 2),
    impact_type VARCHAR(20),
    council_vote_date DATE,
    council_vote_result VARCHAR(50),
    public_document_url TEXT,
    data_source VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Opportunity zones
CREATE TABLE opportunity_zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    market_area_id UUID REFERENCES market_areas(id) ON DELETE CASCADE,
    tract_number VARCHAR(20) NOT NULL,
    designation VARCHAR(20),
    total_investment DECIMAL(15, 2),
    active_qo_funds INTEGER,
    development_activity VARCHAR(20),
    tax_benefit_summary TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tract_number)
);

-- TIF districts
CREATE TABLE tif_districts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    market_area_id UUID REFERENCES market_areas(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    creation_date DATE,
    expiration_date DATE,
    total_investment DECIMAL(15, 2),
    projects_in_district INTEGER,
    current_balance DECIMAL(15, 2),
    annual_increment DECIMAL(15, 2),
    purpose TEXT,
    impact_on_property_tax TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rental market data (time-series)
CREATE TABLE rental_market_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    market_area_id UUID REFERENCES market_areas(id) ON DELETE CASCADE,
    data_month DATE NOT NULL,
    median_rent DECIMAL(10, 2),
    average_rent DECIMAL(10, 2),
    rent_per_sqft DECIMAL(6, 2),
    vacancy_rate DECIMAL(5, 2),
    days_to_lease INTEGER,
    application_volume INTEGER,
    renewal_rate DECIMAL(5, 2),
    rent_to_income_ratio DECIMAL(5, 2),
    -- By bedroom
    studio_median DECIMAL(10, 2),
    one_bed_median DECIMAL(10, 2),
    two_bed_median DECIMAL(10, 2),
    three_bed_median DECIMAL(10, 2),
    four_plus_bed_median DECIMAL(10, 2),
    -- By type
    sfh_median DECIMAL(10, 2),
    apartment_median DECIMAL(10, 2),
    condo_median DECIMAL(10, 2),
    townhouse_median DECIMAL(10, 2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(market_area_id, data_month)
);

-- Comparable rentals
CREATE TABLE comparable_rentals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    market_area_id UUID REFERENCES market_areas(id) ON DELETE CASCADE,
    address VARCHAR(300) NOT NULL,
    rent DECIMAL(10, 2) NOT NULL,
    sqft INTEGER,
    rent_per_sqft DECIMAL(6, 2),
    bedrooms INTEGER,
    bathrooms DECIMAL(4, 1),
    year_built INTEGER,
    property_type VARCHAR(50),
    list_date DATE,
    days_on_market INTEGER,
    amenities JSONB,
    pet_policy VARCHAR(50),
    parking_included BOOLEAN,
    utilities_included JSONB,
    latitude DECIMAL(10, 7),
    longitude DECIMAL(10, 7),
    data_source VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI analysis cache
CREATE TABLE ai_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_type VARCHAR(50) NOT NULL, -- 'property_insight', 'market_insight', 'development_impact', 'anomaly_detection', 'rental_insight'
    reference_id VARCHAR(200), -- property address, zip code, etc.
    input_data_hash VARCHAR(64), -- SHA-256 of input to detect staleness
    ai_model VARCHAR(50),
    ai_response JSONB NOT NULL,
    tokens_used INTEGER,
    latency_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

-- ============================================================
-- Indexes
-- ============================================================

CREATE INDEX idx_capital_flows_market_month ON capital_flows(market_area_id, data_month);
CREATE INDEX idx_business_activity_market_month ON business_activity(market_area_id, data_month);
CREATE INDEX idx_construction_market_month ON construction_activity(market_area_id, data_month);
CREATE INDEX idx_credit_market_month ON credit_market(market_area_id, data_month);
CREATE INDEX idx_housing_micro_market_month ON housing_micro_metrics(market_area_id, data_month);
CREATE INDEX idx_city_projects_status ON city_projects(market_area_id, status);
CREATE INDEX idx_city_projects_type ON city_projects(project_type, status);
CREATE INDEX idx_city_projects_location ON city_projects(latitude, longitude);
CREATE INDEX idx_rental_data_market_month ON rental_market_data(market_area_id, data_month);
CREATE INDEX idx_comparable_rentals_location ON comparable_rentals(latitude, longitude);
CREATE INDEX idx_comparable_rentals_market ON comparable_rentals(market_area_id, list_date DESC);
CREATE INDEX idx_ai_analyses_type ON ai_analyses(analysis_type, reference_id);
CREATE INDEX idx_ai_analyses_hash ON ai_analyses(input_data_hash);
CREATE INDEX idx_opportunity_zones_tract ON opportunity_zones(tract_number);
