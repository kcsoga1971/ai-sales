const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003';

async function req<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, { headers: { 'Content-Type': 'application/json' }, ...opts });
  return res.json();
}

export const api = {
  getCampaigns: () => req<{ success: boolean; campaigns: Campaign[] }>('/api/campaigns'),
  getCampaign: (id: string) => req<{ success: boolean; campaign: Campaign; contacts: CampaignContact[]; stats: Stats }>(`/api/campaigns/${id}`),
  createCampaign: (body: Partial<Campaign>) => req<{ success: boolean; campaign: Campaign }>('/api/campaigns', { method: 'POST', body: JSON.stringify(body) }),
  updateCampaign: (id: string, body: Partial<Campaign>) => req<{ success: boolean; campaign: Campaign }>(`/api/campaigns/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  addContact: (campaignId: string, body: Partial<Contact>) => req<{ success: boolean }>(`/api/campaigns/${campaignId}/contacts`, { method: 'POST', body: JSON.stringify(body) }),
  personalizeCampaign: (id: string) => req<{ success: boolean; processed: number }>(`/api/campaigns/${id}/personalize`, { method: 'POST', body: '{}' }),
  getQueue: (id: string) => req<{ success: boolean; count: number; queue: Touchpoint[] }>(`/api/campaigns/${id}/queue`),
  approveMessage: (campaignId: string, tpId: string) => req<{ success: boolean }>(`/api/campaigns/${campaignId}/queue/${tpId}/approve`, { method: 'POST', body: '{}' }),
  markSent: (campaignId: string, tpId: string) => req<{ success: boolean }>(`/api/campaigns/${campaignId}/queue/${tpId}/sent`, { method: 'POST', body: '{}' }),
  logResponse: (campaignId: string, ccId: string, body: { content?: string; sentiment?: string; action?: string }) =>
    req<{ success: boolean }>(`/api/campaigns/${campaignId}/contacts/${ccId}/respond`, { method: 'POST', body: JSON.stringify(body) }),
  getContacts: () => req<{ success: boolean; contacts: Contact[] }>('/api/contacts'),
  getOverview: () => req<{ success: boolean; overview: Overview }>('/api/analytics/overview'),
  getGoCards: () => req<{ success: boolean; cards: DemexCard[] }>('/api/demex/go-cards'),
  createFromCard: (card_id: string) => req<{ success: boolean; campaign: Campaign }>('/api/demex/create-campaign', { method: 'POST', body: JSON.stringify({ card_id }) }),
};

export interface Campaign {
  id: string; name: string; product_name: string; status: string;
  aipm_project_id?: string; demex_card_id?: string;
  pitch_headline?: string; pitch_body?: string; target_segment?: string;
  created_at: string; stats?: Stats;
}
export interface Contact {
  id: string; name: string; title?: string; company?: string;
  linkedin_url?: string; email?: string; source?: string; notes?: string;
}
export interface CampaignContact {
  id: string; campaign_id: string; contact_id: string;
  status: string; current_step: number; contact?: Contact;
}
export interface Touchpoint {
  id: string; campaign_contact_id: string; channel: string;
  step: number; scheduled_at?: string; sent_at?: string;
  content?: string; status: string;
  campaign_contact?: CampaignContact & { contact?: Contact; campaign?: Campaign };
}
export interface Stats {
  total: number; replied: number; demo_booked: number; converted: number;
  reply_rate: number; demo_rate: number; conversion_rate: number;
}
export interface Overview {
  total_campaigns: number; active_campaigns: number;
  total_contacts: number; total_replied: number;
  total_demo: number; total_converted: number;
  reply_rate: number; demo_rate: number; conversion_rate: number;
}
export interface DemexCard {
  id: string; domain?: string; need?: string; verdict?: string;
  opportunity_score?: number; description?: string;
}
