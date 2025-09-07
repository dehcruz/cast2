import type { NextApiRequest, NextApiResponse } from 'next';
import { filmOfTheDay } from '../../lib/loader';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { date } = req.query;
    const film = filmOfTheDay(typeof date === 'string' ? date : undefined);
    const masked = Buffer.from(String(film.id)).toString('base64').replace(/=/g,'');
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth()+1).padStart(2,'0');
    const d = String(now.getDate()).toString().padStart(2,'0');
    res.status(200).json({ date: `${y}-${m}-${d}`, filmIdMasked: masked });
  } catch (e:any) {
    res.status(500).json({ error: e?.message || 'Internal error' });
  }
}
