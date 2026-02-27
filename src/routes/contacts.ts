import { Router, Request, Response } from 'express';
import * as storage from '../services/StorageService';

const router = Router();
const p = (v: string | string[]) => String(Array.isArray(v) ? v[0] : v);

router.get('/', async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 100;
    const contacts = await storage.getContacts(limit);
    res.json({ success: true, count: contacts.length, contacts });
  } catch (err: unknown) { res.status(500).json({ success: false, message: (err as Error).message }); }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = p(req.params.id);
    const contact = await storage.getContact(id);
    const responses = await storage.getResponses(id);
    res.json({ success: true, contact, responses });
  } catch (err: unknown) { res.status(404).json({ success: false, message: (err as Error).message }); }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, title, company, linkedin_url, email, notes } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'name required' });
    const contact = await storage.createContact({ name, title, company, linkedin_url, email, notes, source: 'manual' });
    res.json({ success: true, contact });
  } catch (err: unknown) { res.status(500).json({ success: false, message: (err as Error).message }); }
});

export default router;
