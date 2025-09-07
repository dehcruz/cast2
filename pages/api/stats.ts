import type { NextApiRequest, NextApiResponse } from 'next';
import { getAllMovies } from '../../lib/loader';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const all = getAllMovies() as any[];
  const withPt = all.filter(m => m.title_pt && String(m.title_pt).trim() !== '').length;
  res.status(200).json({ total: all.length, com_title_pt: withPt });
}
