import * as dotenv from 'dotenv';
dotenv.config();

const AIPM_URL = process.env.AIPM_URL || 'http://localhost:3002';

export interface AipmLaunchPayload {
  project_id: string;
  project_name: string;
  product_name: string;
  stage: string;
  domain?: string;
  description?: string;
  demex_card_id?: string;
}

export interface ConversionEvidence {
  campaign_id: string;
  total_contacts: number;
  converted: number;
  demo_booked: number;
  reply_rate: number;
  conversion_rate: number;
  first_customer?: string;
}

export async function reportValidation(
  aipm_project_id: string,
  evidence: ConversionEvidence
): Promise<boolean> {
  try {
    const res = await fetch(`${AIPM_URL}/api/projects/${aipm_project_id}/stage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage: 'validate', evidence }),
    });
    if (!res.ok) {
      console.warn(`[AipmBridge] Failed to report validation: ${res.status}`);
      return false;
    }
    console.log(`[AipmBridge] Project ${aipm_project_id} moved to validate`);
    return true;
  } catch (err) {
    console.warn('[AipmBridge] AI-PM unreachable:', (err as Error).message);
    return false;
  }
}

export async function getAipmProject(project_id: string): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(`${AIPM_URL}/api/projects/${project_id}`);
    if (!res.ok) return null;
    const data = await res.json() as Record<string, unknown>;
    return data;
  } catch {
    return null;
  }
}
