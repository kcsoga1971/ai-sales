-- AI-Sales Platform Tables
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/fiastlgtmnvbcbcvhhbt/sql

CREATE TABLE IF NOT EXISTS sales_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  title TEXT,
  company TEXT,
  linkedin_url TEXT,
  email TEXT,
  source TEXT DEFAULT 'manual',
  chain_reaction_data JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sales_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  product_name TEXT NOT NULL,
  aipm_project_id TEXT,
  demex_card_id TEXT,
  pitch_headline TEXT,
  pitch_body TEXT,
  target_segment TEXT,
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sales_campaign_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES sales_campaigns(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES sales_contacts(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending',
  current_step INTEGER DEFAULT 0,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(campaign_id, contact_id)
);

CREATE TABLE IF NOT EXISTS sales_touchpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_contact_id UUID REFERENCES sales_campaign_contacts(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  step INTEGER NOT NULL,
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  content TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sales_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  touchpoint_id UUID REFERENCES sales_touchpoints(id) ON DELETE CASCADE,
  campaign_contact_id UUID REFERENCES sales_campaign_contacts(id) ON DELETE CASCADE,
  received_at TIMESTAMPTZ DEFAULT NOW(),
  content TEXT,
  sentiment TEXT DEFAULT 'neutral',
  action TEXT DEFAULT 'none',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_campaign_contacts_campaign ON sales_campaign_contacts(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_contacts_status ON sales_campaign_contacts(status);
CREATE INDEX IF NOT EXISTS idx_touchpoints_cc ON sales_touchpoints(campaign_contact_id);
CREATE INDEX IF NOT EXISTS idx_touchpoints_status ON sales_touchpoints(status);
CREATE INDEX IF NOT EXISTS idx_touchpoints_scheduled ON sales_touchpoints(scheduled_at);
