import * as dotenv from 'dotenv';
dotenv.config();

const CHAIN_REACTION_URL = process.env.CHAIN_REACTION_URL || 'http://localhost:5000';
const DEMEX_URL = process.env.DEMEX_URL || 'http://localhost:3001';

export interface FoundContact {
  name: string;
  title: string;
  company: string;
  linkedin_url?: string;
  email?: string;
  source: string;
  chain_reaction_data?: Record<string, unknown>;
}

export async function findContactsByCompany(company: string, roles?: string[]): Promise<FoundContact[]> {
  try {
    const res = await fetch(`${CHAIN_REACTION_URL}/api/headhunter`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ company, roles: roles || ['CEO', 'CTO', 'VP', '總經理', '資訊長', 'IT Director'] }),
    });
    if (!res.ok) throw new Error(`ChainReaction returned ${res.status}`);
    const data = await res.json() as { contacts?: FoundContact[] };
    return (data.contacts || []).map((c: FoundContact) => ({ ...c, source: 'headhunter' }));
  } catch (err) {
    console.warn('[TargetFinder] ChainReaction headhunter unavailable:', (err as Error).message);
    return [];
  }
}

export async function getGoOpportunityCards(minScore?: number): Promise<Record<string, unknown>[]> {
  try {
    const params = new URLSearchParams({ verdict: 'GO' });
    if (minScore) params.set('min_score', String(minScore));
    const res = await fetch(`${DEMEX_URL}/api/opportunities?${params}`);
    if (!res.ok) throw new Error(`DEMEX returned ${res.status}`);
    const data = await res.json() as { cards?: Record<string, unknown>[] };
    return data.cards || [];
  } catch (err) {
    console.warn('[TargetFinder] DEMEX unavailable:', (err as Error).message);
    return [];
  }
}

export async function getOpportunityCard(id: string): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(`${DEMEX_URL}/api/opportunity/${id}`);
    if (!res.ok) return null;
    const data = await res.json() as { card?: Record<string, unknown> };
    return data.card || null;
  } catch {
    return null;
  }
}
