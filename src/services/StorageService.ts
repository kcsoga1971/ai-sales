import { supabase } from '../db';

export interface Contact {
  id?: string;
  name: string;
  title?: string;
  company?: string;
  linkedin_url?: string;
  email?: string;
  source?: string;
  chain_reaction_data?: Record<string, unknown>;
  notes?: string;
}

export interface Campaign {
  id?: string;
  name: string;
  product_name: string;
  aipm_project_id?: string;
  demex_card_id?: string;
  pitch_headline?: string;
  pitch_body?: string;
  target_segment?: string;
  status?: string;
}

export interface CampaignContact {
  id?: string;
  campaign_id: string;
  contact_id: string;
  status?: string;
  current_step?: number;
}

export interface Touchpoint {
  id?: string;
  campaign_contact_id: string;
  channel: 'linkedin' | 'email' | 'telegram';
  step: number;
  scheduled_at?: string;
  sent_at?: string;
  content?: string;
  status?: string;
}

export interface SalesResponse {
  id?: string;
  touchpoint_id?: string;
  campaign_contact_id: string;
  content?: string;
  sentiment?: string;
  action?: string;
}

// --- Contacts ---
export async function createContact(c: Contact) {
  const { data, error } = await supabase.from('sales_contacts').insert(c).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function getContacts(limit = 100) {
  const { data, error } = await supabase.from('sales_contacts').select('*').order('created_at', { ascending: false }).limit(limit);
  if (error) throw new Error(error.message);
  return data || [];
}

export async function getContact(id: string) {
  const { data, error } = await supabase.from('sales_contacts').select('*').eq('id', id).single();
  if (error) throw new Error(error.message);
  return data;
}

// --- Campaigns ---
export async function createCampaign(c: Campaign) {
  const { data, error } = await supabase.from('sales_campaigns').insert(c).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function getCampaigns() {
  const { data, error } = await supabase.from('sales_campaigns').select('*').order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function getCampaign(id: string) {
  const { data, error } = await supabase.from('sales_campaigns').select('*').eq('id', id).single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateCampaign(id: string, updates: Partial<Campaign>) {
  const { data, error } = await supabase.from('sales_campaigns').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  return data;
}

// --- Campaign Contacts ---
export async function addContactToCampaign(cc: CampaignContact) {
  const { data, error } = await supabase.from('sales_campaign_contacts').insert(cc).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function getCampaignContacts(campaign_id: string) {
  const { data, error } = await supabase
    .from('sales_campaign_contacts')
    .select('*, contact:sales_contacts(*)')
    .eq('campaign_id', campaign_id)
    .order('added_at', { ascending: true });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function updateCampaignContact(id: string, updates: Partial<CampaignContact>) {
  const { data, error } = await supabase.from('sales_campaign_contacts').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  return data;
}

// --- Touchpoints ---
export async function createTouchpoint(t: Touchpoint) {
  const { data, error } = await supabase.from('sales_touchpoints').insert(t).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function getTouchpoints(campaign_contact_id: string) {
  const { data, error } = await supabase.from('sales_touchpoints').select('*').eq('campaign_contact_id', campaign_contact_id).order('step');
  if (error) throw new Error(error.message);
  return data || [];
}

export async function getPendingTouchpoints() {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('sales_touchpoints')
    .select('*, campaign_contact:sales_campaign_contacts(*, contact:sales_contacts(*), campaign:sales_campaigns(*))')
    .eq('status', 'approved')
    .lte('scheduled_at', now);
  if (error) throw new Error(error.message);
  return data || [];
}

export async function updateTouchpoint(id: string, updates: Partial<Touchpoint>) {
  const { data, error } = await supabase.from('sales_touchpoints').update(updates).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function getQueuedTouchpoints() {
  const { data, error } = await supabase
    .from('sales_touchpoints')
    .select('*, campaign_contact:sales_campaign_contacts(*, contact:sales_contacts(*), campaign:sales_campaigns(*))')
    .eq('status', 'pending')
    .order('scheduled_at', { ascending: true });
  if (error) throw new Error(error.message);
  return data || [];
}

// --- Responses ---
export async function createResponse(r: SalesResponse) {
  const { data, error } = await supabase.from('sales_responses').insert(r).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function getResponses(campaign_contact_id: string) {
  const { data, error } = await supabase.from('sales_responses').select('*').eq('campaign_contact_id', campaign_contact_id);
  if (error) throw new Error(error.message);
  return data || [];
}

// --- Analytics ---
export async function getCampaignStats(campaign_id: string) {
  const contacts = await getCampaignContacts(campaign_id);
  const total = contacts.length;
  const replied = contacts.filter((c: Record<string, string>) => ['replied', 'demo_booked', 'converted'].includes(c.status)).length;
  const demo = contacts.filter((c: Record<string, string>) => ['demo_booked', 'converted'].includes(c.status)).length;
  const converted = contacts.filter((c: Record<string, string>) => c.status === 'converted').length;
  return {
    total,
    replied,
    demo_booked: demo,
    converted,
    reply_rate: total ? Math.round((replied / total) * 100) : 0,
    demo_rate: total ? Math.round((demo / total) * 100) : 0,
    conversion_rate: total ? Math.round((converted / total) * 100) : 0,
  };
}
