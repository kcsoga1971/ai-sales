import { Router, Request, Response } from 'express';
import { supabase } from '../db';
import * as storage from '../services/StorageService';

const router = Router();
const p = (v: string | string[]) => String(Array.isArray(v) ? v[0] : v);

router.get('/overview', async (_req: Request, res: Response) => {
  try {
    const campaigns = await storage.getCampaigns();
    let totalSent = 0, totalReplied = 0, totalDemo = 0, totalConverted = 0;
    for (const c of campaigns as (storage.Campaign & { id: string })[]) {
      const stats = await storage.getCampaignStats(c.id!);
      totalSent += stats.total;
      totalReplied += stats.replied;
      totalDemo += stats.demo_booked;
      totalConverted += stats.converted;
    }
    res.json({
      success: true,
      overview: {
        total_campaigns: campaigns.length,
        active_campaigns: (campaigns as (storage.Campaign & { status: string })[]).filter(c => c.status === 'active').length,
        total_contacts: totalSent,
        total_replied: totalReplied,
        total_demo: totalDemo,
        total_converted: totalConverted,
        reply_rate: totalSent ? Math.round((totalReplied / totalSent) * 100) : 0,
        demo_rate: totalSent ? Math.round((totalDemo / totalSent) * 100) : 0,
        conversion_rate: totalSent ? Math.round((totalConverted / totalSent) * 100) : 0,
      }
    });
  } catch (err: unknown) { res.status(500).json({ success: false, message: (err as Error).message }); }
});

router.get('/campaign/:id', async (req: Request, res: Response) => {
  try {
    const id = p(req.params.id);
    const stats = await storage.getCampaignStats(id);
    const { data: contacts } = await supabase
      .from('sales_campaign_contacts').select('status').eq('campaign_id', id);
    const statusBreakdown = (contacts || []).reduce((acc: Record<string, number>, c: { status: string }) => {
      acc[c.status] = (acc[c.status] || 0) + 1;
      return acc;
    }, {});
    res.json({ success: true, stats, status_breakdown: statusBreakdown });
  } catch (err: unknown) { res.status(500).json({ success: false, message: (err as Error).message }); }
});

export default router;
