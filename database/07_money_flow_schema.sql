-- ============================================================
-- Follow The Money Schema
-- Tables for institutional capital tracking, capital migration,
-- transaction pipeline, alternative data signals, and
-- cost/insurance intelligence.
-- ============================================================

-- Institutional Capital Tracking
CREATE TABLE institutional_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_area_id UUID REFERENCES market_areas(id),
  zip_code VARCHAR(5) NOT NULL,
  entity_name VARCHAR(255) NOT NULL,
  entity_type VARCHAR(20) CHECK (entity_type IN ('llc', 'corp', 'trust', 'reit', 'fund', 'unknown')),
  parent_company VARCHAR(255),
  purchase_count INTEGER,
  total_volume DECIMAL(15,2),
  avg_purchase_price DECIMAL(12,2),
  property_types TEXT[], -- array of property types
  strategy VARCHAR(20) CHECK (strategy IN ('buy_and_hold', 'flip', 'value_add', 'development', 'unknown')),
  first_purchase_date DATE,
  most_recent_purchase DATE,
  estimated_aum DECIMAL(15,2),
  data_period VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE reit_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_area_id UUID REFERENCES market_areas(id),
  zip_code VARCHAR(5) NOT NULL,
  reit_name VARCHAR(255) NOT NULL,
  ticker VARCHAR(10),
  sector VARCHAR(50),
  activity_status VARCHAR(20) CHECK (activity_status IN ('entering', 'expanding', 'maintaining', 'reducing', 'exiting')),
  properties_owned INTEGER,
  recent_acquisitions INTEGER,
  recent_dispositions INTEGER,
  capital_deployed DECIMAL(15,2),
  source VARCHAR(100),
  data_period VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE pe_fund_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_area_id UUID REFERENCES market_areas(id),
  zip_code VARCHAR(5) NOT NULL,
  fund_name VARCHAR(255),
  target_size DECIMAL(15,2),
  strategy VARCHAR(255),
  filing_date DATE,
  dry_powder DECIMAL(15,2),
  data_period VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE ibuyer_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_area_id UUID REFERENCES market_areas(id),
  zip_code VARCHAR(5) NOT NULL,
  buyer_name VARCHAR(100) NOT NULL,
  purchase_volume INTEGER,
  resale_volume INTEGER,
  avg_hold_period INTEGER, -- days
  avg_markup DECIMAL(5,2),
  market_share DECIMAL(5,2),
  inventory_on_hand INTEGER,
  signal VARCHAR(20),
  data_period VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE corporate_relocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_area_id UUID REFERENCES market_areas(id),
  zip_code VARCHAR(5) NOT NULL,
  company_name VARCHAR(255) NOT NULL,
  industry VARCHAR(100),
  relocation_type VARCHAR(30),
  estimated_jobs INTEGER,
  avg_salary DECIMAL(10,2),
  announcement_date DATE,
  expected_move_date DATE,
  incentives_received DECIMAL(15,2),
  estimated_housing_demand INTEGER,
  source VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Capital Migration
CREATE TABLE exchange_1031_flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_area_id UUID REFERENCES market_areas(id),
  zip_code VARCHAR(5) NOT NULL,
  direction VARCHAR(10) CHECK (direction IN ('inbound', 'outbound')),
  volume DECIMAL(15,2),
  count INTEGER,
  origin_market VARCHAR(255),
  destination_market VARCHAR(255),
  avg_value DECIMAL(12,2),
  property_type VARCHAR(50),
  data_period VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE hmda_mortgage_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_area_id UUID REFERENCES market_areas(id),
  zip_code VARCHAR(5) NOT NULL,
  total_applications INTEGER,
  approval_rate DECIMAL(5,2),
  avg_loan_amount DECIMAL(12,2),
  investor_pct DECIMAL(5,2),
  owner_occupied_pct DECIMAL(5,2),
  conventional_pct DECIMAL(5,2),
  fha_pct DECIMAL(5,2),
  va_pct DECIMAL(5,2),
  jumbo_count INTEGER,
  first_time_buyer_pct DECIMAL(5,2),
  avg_borrower_income DECIMAL(10,2),
  data_year INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE foreign_capital_flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_area_id UUID REFERENCES market_areas(id),
  zip_code VARCHAR(5) NOT NULL,
  origin_country VARCHAR(100) NOT NULL,
  investment_volume DECIMAL(15,2),
  transaction_count INTEGER,
  avg_purchase_price DECIMAL(12,2),
  trend_direction VARCHAR(20),
  data_period VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE tax_migration (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_area_id UUID REFERENCES market_areas(id),
  zip_code VARCHAR(5) NOT NULL,
  origin_state VARCHAR(2),
  destination_state VARCHAR(2),
  net_migrants INTEGER,
  avg_income DECIMAL(10,2),
  net_income_flow DECIMAL(15,2),
  tax_savings_per_migrant DECIMAL(10,2),
  data_year INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transaction Pipeline
CREATE TABLE title_insurance_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_area_id UUID REFERENCES market_areas(id),
  zip_code VARCHAR(5) NOT NULL,
  order_volume INTEGER,
  closing_volume INTEGER,
  order_to_close_ratio DECIMAL(5,2),
  avg_days_to_close INTEGER,
  cancelation_rate DECIMAL(5,2),
  purchase_pct DECIMAL(5,2),
  refinance_pct DECIMAL(5,2),
  data_period VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE foreclosure_pipeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_area_id UUID REFERENCES market_areas(id),
  zip_code VARCHAR(5) NOT NULL,
  notice_of_default INTEGER,
  lis_pendens INTEGER,
  scheduled_auctions INTEGER,
  auction_sales INTEGER,
  reo_inventory INTEGER,
  total_pipeline INTEGER,
  flow_rate VARCHAR(20) CHECK (flow_rate IN ('accelerating', 'stable', 'decelerating')),
  avg_timeline_days INTEGER,
  short_sales INTEGER,
  loan_modifications INTEGER,
  data_period VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE hard_money_lending (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_area_id UUID REFERENCES market_areas(id),
  zip_code VARCHAR(5) NOT NULL,
  loan_volume DECIMAL(15,2),
  loan_count INTEGER,
  avg_loan_amount DECIMAL(12,2),
  avg_interest_rate DECIMAL(5,2),
  avg_ltv DECIMAL(5,2),
  avg_term_months INTEGER,
  default_rate DECIMAL(5,2),
  active_lenders INTEGER,
  fix_flip_pct DECIMAL(5,2),
  bridge_pct DECIMAL(5,2),
  construction_pct DECIMAL(5,2),
  data_period VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE eviction_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_area_id UUID REFERENCES market_areas(id),
  zip_code VARCHAR(5) NOT NULL,
  filing_count INTEGER,
  filing_rate DECIMAL(6,2), -- per 1000 units
  executed_evictions INTEGER,
  avg_days_to_eviction INTEGER,
  rate_vs_metro DECIMAL(6,2),
  serial_eviction_properties INTEGER,
  moratorium_active BOOLEAN DEFAULT FALSE,
  data_period VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Alternative Data Signals
CREATE TABLE usps_migration (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_area_id UUID REFERENCES market_areas(id),
  zip_code VARCHAR(5) NOT NULL,
  inbound_volume INTEGER,
  outbound_volume INTEGER,
  net_flow INTEGER,
  inbound_vs_outbound_ratio DECIMAL(5,2),
  business_coa INTEGER,
  avg_income_inbound DECIMAL(10,2),
  high_income_movers INTEGER,
  data_period VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE utility_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_area_id UUID REFERENCES market_areas(id),
  zip_code VARCHAR(5) NOT NULL,
  new_electric INTEGER,
  disconnections INTEGER,
  net_connections INTEGER,
  commercial_connections INTEGER,
  construction_connections INTEGER,
  vacant_properties INTEGER,
  data_period VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE school_enrollment_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_area_id UUID REFERENCES market_areas(id),
  zip_code VARCHAR(5) NOT NULL,
  total_enrollment INTEGER,
  kindergarten_enrollment INTEGER,
  transfers_in INTEGER,
  transfers_out INTEGER,
  net_transfers INTEGER,
  capacity_utilization DECIMAL(5,2),
  per_pupil_spending DECIMAL(10,2),
  data_year INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE search_intelligence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_area_id UUID REFERENCES market_areas(id),
  zip_code VARCHAR(5) NOT NULL,
  real_estate_search_volume INTEGER,
  rental_search_volume INTEGER,
  relocation_search_volume INTEGER,
  intent_score INTEGER,
  search_vs_national DECIMAL(6,2),
  data_period VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cost & Insurance Intelligence
CREATE TABLE construction_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_area_id UUID REFERENCES market_areas(id),
  zip_code VARCHAR(5) NOT NULL,
  cost_per_sqft DECIMAL(8,2),
  commercial_cost_per_sqft DECIMAL(8,2),
  labor_cost_index DECIMAL(6,2),
  material_cost_index DECIMAL(6,2),
  labor_availability VARCHAR(20),
  contractor_backlog_weeks INTEGER,
  permit_fees DECIMAL(10,2),
  impact_fees DECIMAL(10,2),
  data_period VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE insurance_landscape (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_area_id UUID REFERENCES market_areas(id),
  zip_code VARCHAR(5) NOT NULL,
  avg_premium DECIMAL(10,2),
  premium_per_sqft DECIMAL(6,2),
  premium_change_5yr DECIMAL(6,2),
  active_insurers INTEGER,
  net_insurer_change INTEGER,
  claims_density DECIMAL(6,2),
  avg_claim_amount DECIMAL(10,2),
  insurability_risk VARCHAR(20),
  flood_required BOOLEAN,
  flood_avg_premium DECIMAL(10,2),
  data_period VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE muni_bond_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_area_id UUID REFERENCES market_areas(id),
  zip_code VARCHAR(5) NOT NULL,
  go_yield DECIMAL(5,2),
  revenue_bond_yield DECIMAL(5,2),
  spread_vs_aaa INTEGER, -- basis points
  credit_rating VARCHAR(5),
  credit_trend VARCHAR(20),
  total_outstanding_debt DECIMAL(15,2),
  debt_per_capita DECIMAL(10,2),
  pension_funding_ratio DECIMAL(5,2),
  fiscal_health VARCHAR(20),
  data_period VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Follow The Money Composite
CREATE TABLE money_flow_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_area_id UUID REFERENCES market_areas(id),
  zip_code VARCHAR(5) NOT NULL,
  composite_score INTEGER,
  institutional_score INTEGER,
  migration_score INTEGER,
  pipeline_score INTEGER,
  alternative_score INTEGER,
  cost_insurance_score INTEGER,
  net_capital_direction VARCHAR(20),
  estimated_capital_inflow DECIMAL(15,2),
  estimated_capital_outflow DECIMAL(15,2),
  money_velocity_score INTEGER,
  timing_assessment VARCHAR(20),
  buy_signal_strength INTEGER,
  risk_level VARCHAR(20),
  top_signals JSONB,
  analysis_data JSONB, -- full profile for historical tracking
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_institutional_purchases_zip ON institutional_purchases(zip_code);
CREATE INDEX idx_reit_activity_zip ON reit_activity(zip_code);
CREATE INDEX idx_ibuyer_activity_zip ON ibuyer_activity(zip_code);
CREATE INDEX idx_corporate_relocations_zip ON corporate_relocations(zip_code);
CREATE INDEX idx_exchange_1031_zip ON exchange_1031_flows(zip_code);
CREATE INDEX idx_hmda_zip ON hmda_mortgage_data(zip_code);
CREATE INDEX idx_foreign_capital_zip ON foreign_capital_flows(zip_code);
CREATE INDEX idx_tax_migration_zip ON tax_migration(zip_code);
CREATE INDEX idx_title_insurance_zip ON title_insurance_activity(zip_code);
CREATE INDEX idx_foreclosure_zip ON foreclosure_pipeline(zip_code);
CREATE INDEX idx_hard_money_zip ON hard_money_lending(zip_code);
CREATE INDEX idx_eviction_zip ON eviction_data(zip_code);
CREATE INDEX idx_usps_migration_zip ON usps_migration(zip_code);
CREATE INDEX idx_utility_signals_zip ON utility_signals(zip_code);
CREATE INDEX idx_school_enrollment_zip ON school_enrollment_signals(zip_code);
CREATE INDEX idx_search_intelligence_zip ON search_intelligence(zip_code);
CREATE INDEX idx_construction_costs_zip ON construction_costs(zip_code);
CREATE INDEX idx_insurance_landscape_zip ON insurance_landscape(zip_code);
CREATE INDEX idx_muni_bond_zip ON muni_bond_data(zip_code);
CREATE INDEX idx_money_flow_zip ON money_flow_analyses(zip_code);
CREATE INDEX idx_money_flow_score ON money_flow_analyses(composite_score);
CREATE INDEX idx_money_flow_created ON money_flow_analyses(created_at);
