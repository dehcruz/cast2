import type { NextApiRequest, NextApiResponse } from 'next';
import { getAllMovies } from '../../lib/loader';

function normalize(s: string) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const q = String(req.query.q || '').trim();
    if (!q) return res.status(200).json({ results: [] });
    const nq = normalize(q);

    const results = getAllMovies()
      .filter((f: any) => {
        const tOrig = normalize(f.title);
        const tPt   = normalize(f.title_pt || '');
        return tOrig.includes(nq) || (tPt && tPt.includes(nq));
      })
      .slice(0, 20)
      .map((f: any) => {
        const pt = String(f.title_pt || '').trim();
        return {
          id: f.id,
          title: pt ? pt : f.title,
          orig: f.title,
          year: f.release_year ?? null,
        };
      });

    return res.status(200).json({ results });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Internal error' });
  }
}
