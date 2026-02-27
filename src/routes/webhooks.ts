import { Router, Request, Response } from 'express';
import * as storage from '../services/StorageService';
import * as personalization from '../services/PersonalizationEngine';
import * as sequenceManager from '../services/SequenceManager';
import * as dotenv from 'dotenv';
dotenv.config();

const router = Router();

// POST /api/webhooks/aipm — triggered when AI-PM project moves to 'launch'
router.post('/aipm', async (req: Request, res: Response) => {
  try {
    const secret = req.headers['x-webhook-secret'];
    if (secret !== process.env.AIPM_WEBHOOK_SECRET) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { project_id, project_name, product_name, stage, domain, description, demex_card_id } = req.body;

    if (stage !== 'launch') {
      return res.json({ success: true, message: `Stage ${stage} ignored` });
    }

    console.log(`[Webhook] AI-PM launch trigger: ${project_name} (${project_id})`);

    // Auto-create campaign
    const campaign = await storage.createCampaign({
      name: `[Auto] ${project_name}`,
      product_name: product_name || project_name,
      aipm_project_id: project_id,
      demex_card_id,
      pitch_headline: description || '',
      pitch_body: `領域: ${domain || ''}`,
      status: 'draft',
    });

    res.json({ success: true, message: 'Campaign created', campaign_id: campaign.id });
  } catch (err: unknown) {
    res.status(500).json({ success: false, message: (err as Error).message });
  }
});

// POST /api/webhooks/email-inbound — SendGrid inbound parse
router.post('/email-inbound', async (req: Request, res: Response) => {
  try {
    const { from, subject, text, to } = req.body;
    console.log(`[Webhook] Inbound email from ${from}: ${subject}`);

    // Try to match email to a campaign contact
    // For now, log it — full matching logic in Phase 3
    res.json({ success: true, message: 'Email received', from, subject });
  } catch (err: unknown) {
    res.status(500).json({ success: false, message: (err as Error).message });
  }
});

// POST /api/webhooks/telegram-seeding — request group seeding via tg-claude-bot
router.post('/telegram-seeding', async (req: Request, res: Response) => {
  try {
    const { message, groups } = req.body;
    const TG_URL = process.env.TG_BOT_WEBHOOK_URL;

    const result = await fetch(`${TG_URL}/seeding`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, groups }),
    });

    if (!result.ok) {
      return res.status(502).json({ success: false, message: 'tg-claude-bot seeding failed' });
    }
    res.json({ success: true, message: 'Seeding request sent' });
  } catch (err: unknown) {
    res.status(500).json({ success: false, message: (err as Error).message });
  }
});

export default router;
