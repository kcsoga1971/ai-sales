import { Router, Request, Response } from 'express';
import * as storage from '../services/StorageService';
import * as targetFinder from '../services/TargetFinder';
import * as personalization from '../services/PersonalizationEngine';
import * as sequenceManager from '../services/SequenceManager';
import * as aipmBridge from '../services/AipmBridge';

const router = Router();
const p = (v: string | string[]) => String(Array.isArray(v) ? v[0] : v);

router.get('/', async (_req: Request, res: Response) => {
  try {
    const campaigns = await storage.getCampaigns();
    const withStats = await Promise.all(campaigns.map(async (c: storage.Campaign & { id: string }) => {
      const stats = await storage.getCampaignStats(c.id!);
      return { ...c, stats };
    }));
    res.json({ success: true, campaigns: withStats });
  } catch (err: unknown) { res.status(500).json({ success: false, message: (err as Error).message }); }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, product_name, aipm_project_id, demex_card_id, pitch_headline, pitch_body, target_segment } = req.body;
    if (!name || !product_name) return res.status(400).json({ success: false, message: 'name and product_name required' });
    const campaign = await storage.createCampaign({ name, product_name, aipm_project_id, demex_card_id, pitch_headline, pitch_body, target_segment, status: 'draft' });
    res.json({ success: true, campaign });
  } catch (err: unknown) { res.status(500).json({ success: false, message: (err as Error).message }); }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = p(req.params.id);
    const campaign = await storage.getCampaign(id);
    const contacts = await storage.getCampaignContacts(id);
    const stats = await storage.getCampaignStats(id);
    res.json({ success: true, campaign, contacts, stats });
  } catch (err: unknown) { res.status(404).json({ success: false, message: (err as Error).message }); }
});

router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const campaign = await storage.updateCampaign(p(req.params.id), req.body);
    res.json({ success: true, campaign });
  } catch (err: unknown) { res.status(500).json({ success: false, message: (err as Error).message }); }
});

router.post('/:id/targets', async (req: Request, res: Response) => {
  try {
    const id = p(req.params.id);
    const { company, roles } = req.body;
    if (!company) return res.status(400).json({ success: false, message: 'company required' });
    const found = await targetFinder.findContactsByCompany(company, roles);
    const added = [];
    for (const fc of found) {
      const contact = await storage.createContact({ ...fc });
      const cc = await storage.addContactToCampaign({ campaign_id: id, contact_id: contact.id });
      added.push({ contact, cc });
    }
    res.json({ success: true, found: found.length, added: added.length });
  } catch (err: unknown) { res.status(500).json({ success: false, message: (err as Error).message }); }
});

router.post('/:id/contacts', async (req: Request, res: Response) => {
  try {
    const id = p(req.params.id);
    const { name, title, company, linkedin_url, email, notes } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'name required' });
    const contact = await storage.createContact({ name, title, company, linkedin_url, email, notes, source: 'manual' });
    const cc = await storage.addContactToCampaign({ campaign_id: id, contact_id: contact.id });
    res.json({ success: true, contact, campaign_contact: cc });
  } catch (err: unknown) { res.status(500).json({ success: false, message: (err as Error).message }); }
});

router.post('/:id/personalize', async (req: Request, res: Response) => {
  try {
    const id = p(req.params.id);
    const campaign = await storage.getCampaign(id);
    const contacts = await storage.getCampaignContacts(id);
    const pending = contacts.filter((cc: Record<string, string>) => cc.status === 'pending');
    const product: personalization.ProductInfo = {
      name: campaign.product_name,
      pitch_headline: campaign.pitch_headline,
      pitch_body: campaign.pitch_body,
      target_segment: campaign.target_segment,
    };
    const results = [];
    for (const cc of pending) {
      const contact = cc.contact as personalization.ContactProfile;
      const messages = await personalization.generateMessageSet(contact, product);
      await sequenceManager.initSequence(String(cc.id), messages);
      await storage.updateCampaignContact(String(cc.id), { status: 'in_sequence', current_step: 1 });
      results.push({ contact_id: cc.contact_id, status: 'sequence_created' });
    }
    res.json({ success: true, processed: results.length, results });
  } catch (err: unknown) { res.status(500).json({ success: false, message: (err as Error).message }); }
});

router.get('/:id/queue', async (req: Request, res: Response) => {
  try {
    const all = await sequenceManager.getUpcomingTouchpoints(p(req.params.id));
    res.json({ success: true, count: all.length, queue: all });
  } catch (err: unknown) { res.status(500).json({ success: false, message: (err as Error).message }); }
});

router.post('/:id/queue/:touchpointId/approve', async (req: Request, res: Response) => {
  try {
    const tp = await storage.updateTouchpoint(p(req.params.touchpointId), { status: 'approved' });
    res.json({ success: true, touchpoint: tp });
  } catch (err: unknown) { res.status(500).json({ success: false, message: (err as Error).message }); }
});

router.post('/:id/queue/:touchpointId/sent', async (req: Request, res: Response) => {
  try {
    const tp = await storage.updateTouchpoint(p(req.params.touchpointId), { status: 'sent', sent_at: new Date().toISOString() });
    res.json({ success: true, touchpoint: tp });
  } catch (err: unknown) { res.status(500).json({ success: false, message: (err as Error).message }); }
});

router.post('/:id/contacts/:ccId/respond', async (req: Request, res: Response) => {
  try {
    const id = p(req.params.id);
    const ccId = p(req.params.ccId);
    const { content, sentiment, action } = req.body;
    const response = await storage.createResponse({ campaign_contact_id: ccId, content, sentiment: sentiment || 'positive', action: action || 'none' });
    if (action === 'won') {
      await sequenceManager.markContactConverted(ccId);
      const campaign = await storage.getCampaign(id);
      if (campaign.aipm_project_id) {
        const stats = await storage.getCampaignStats(id);
        await aipmBridge.reportValidation(campaign.aipm_project_id, { campaign_id: id, total_contacts: stats.total, ...stats });
      }
    } else if (action === 'demo_scheduled') {
      await sequenceManager.markDemoBooked(ccId);
    } else {
      await sequenceManager.markContactReplied(ccId);
    }
    res.json({ success: true, response });
  } catch (err: unknown) { res.status(500).json({ success: false, message: (err as Error).message }); }
});

router.get('/:id/stats', async (req: Request, res: Response) => {
  try {
    const stats = await storage.getCampaignStats(p(req.params.id));
    res.json({ success: true, stats });
  } catch (err: unknown) { res.status(500).json({ success: false, message: (err as Error).message }); }
});

export default router;
