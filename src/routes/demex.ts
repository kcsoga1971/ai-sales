import { Router, Request, Response } from 'express';
import * as targetFinder from '../services/TargetFinder';
import * as storage from '../services/StorageService';

const router = Router();

// GET /api/demex/go-cards — list GO opportunity cards from DEMEX
router.get('/go-cards', async (req: Request, res: Response) => {
  try {
    const minScore = req.query.min_score ? Number(req.query.min_score) : undefined;
    const cards = await targetFinder.getGoOpportunityCards(minScore);
    res.json({ success: true, count: cards.length, cards });
  } catch (err: unknown) {
    res.status(500).json({ success: false, message: (err as Error).message });
  }
});

// POST /api/demex/create-campaign — create campaign from a DEMEX GO card
router.post('/create-campaign', async (req: Request, res: Response) => {
  try {
    const { card_id } = req.body;
    if (!card_id) return res.status(400).json({ success: false, message: 'card_id required' });

    const card = await targetFinder.getOpportunityCard(card_id) as Record<string, string> | null;
    if (!card) return res.status(404).json({ success: false, message: 'Opportunity card not found' });

    const campaign = await storage.createCampaign({
      name: `[DEMEX] ${card.domain || card.title || card_id}`,
      product_name: String(card.domain || card.title || ''),
      demex_card_id: card_id,
      pitch_headline: String(card.opportunity_headline || card.summary || ''),
      pitch_body: String(card.analysis || ''),
      target_segment: String(card.target_segment || ''),
      status: 'draft',
    });

    res.json({ success: true, campaign, source_card: card });
  } catch (err: unknown) {
    res.status(500).json({ success: false, message: (err as Error).message });
  }
});

export default router;
