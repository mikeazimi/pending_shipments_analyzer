-- ShipHero SKU Analyzer Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Reports table: stores uploaded CSV data
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  type TEXT NOT NULL CHECK (type IN ('pending_shipments', 'inventory')),
  filename TEXT NOT NULL,
  row_count INTEGER NOT NULL,
  raw_data JSONB NOT NULL
);

-- Analysis results table: stores analysis outputs
CREATE TABLE IF NOT EXISTS analysis_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  pending_report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  inventory_report_id UUID REFERENCES reports(id) ON DELETE SET NULL,
  filters_applied JSONB NOT NULL,
  results_json JSONB NOT NULL,
  orders_analyzed INTEGER NOT NULL,
  orders_unlockable INTEGER NOT NULL
);

-- SKU trends table: tracks SKU demand over time
CREATE TABLE IF NOT EXISTS sku_trends (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sku TEXT NOT NULL,
  date DATE DEFAULT CURRENT_DATE,
  orders_impacted INTEGER NOT NULL,
  analysis_id UUID NOT NULL REFERENCES analysis_results(id) ON DELETE CASCADE
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_reports_type ON reports(type);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analysis_results_created_at ON analysis_results(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sku_trends_sku ON sku_trends(sku);
CREATE INDEX IF NOT EXISTS idx_sku_trends_date ON sku_trends(date DESC);

-- Row Level Security (RLS) - Enable if needed for multi-user setup
-- ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE analysis_results ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE sku_trends ENABLE ROW LEVEL SECURITY;
