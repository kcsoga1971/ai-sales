import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);

async function setup() {
  console.log('Setting up AI-Sales database tables...');

  const { error: e1 } = await supabase.rpc('exec_sql', { sql: `
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
  `});
  if (e1) console.error('sales_contacts:', e1.message); else console.log('✓ sales_contacts');

  const { error: e2 } = await supabase.rpc('exec_sql', { sql: `
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
  `});
  if (e2) console.error('sales_campaigns:', e2.message); else console.log('✓ sales_campaigns');

  const { error: e3 } = await supabase.rpc('exec_sql', { sql: `
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
  `});
  if (e3) console.error('sales_campaign_contacts:', e3.message); else console.log('✓ sales_campaign_contacts');

  const { error: e4 } = await supabase.rpc('exec_sql', { sql: `
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
  `});
  if (e4) console.error('sales_touchpoints:', e4.message); else console.log('✓ sales_touchpoints');

  const { error: e5 } = await supabase.rpc('exec_sql', { sql: `
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
  `});
  if (e5) console.error('sales_responses:', e5.message); else console.log('✓ sales_responses');

  console.log('\nDone. Tables ready.');
}

setup().catch(console.error);
