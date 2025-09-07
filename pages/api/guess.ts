import type { NextApiRequest, NextApiResponse } from 'next';
import { filmOfTheDay, getMovieById } from '../../lib/loader';

type Overlap = Partial<{
  stars: string[];
  directors: string[];
  writers: string[];
  production_companies: string[];
  countries_origin: string[];
  filming_locations: string[];
  genres: string[];
  languages: string[];
  release_year: number;
}>;
type GuessResponse = { isCorrect: boolean; overlap: Overlap; film?: any };

function arr(x: any): string[] { return Array.isArray(x) ? x.map(String) : []; }
function intersect(a: any, b: any): string[] {
  const A = arr(a), B = arr(b);
  if (A.length === 0 || B.length === 0) return [];
  const set = new Set(B.map(String));
  const out: string[] = [];
  for (const x of A) if (set.has(String(x))) out.push(String(x));
  return out;
}

export default function handler(req: NextApiRequest, res: NextApiResponse<GuessResponse | {error:string}>) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { filmIdGuess, date } = req.body || {};
    const guess = getMovieById(String(filmIdGuess));
    if (!guess) return res.status(400).json({ error: 'Unknown filmIdGuess' });
    const secret = filmOfTheDay(typeof date === 'string' ? date : undefined);

    const isCorrect = String(guess.id) === String(secret.id);

    const overlap: Overlap = {};
    const fields: (keyof Overlap)[] = [
      'stars','directors','writers','production_companies',
      'countries_origin','filming_locations','genres','languages'
    ];
    for (const key of fields) {
      const v = intersect((guess as any)[key], (secret as any)[key]);
      if (v.length) (overlap as any)[key] = v;
    }
    if (guess.release_year && secret.release_year && guess.release_year === secret.release_year) {
      overlap.release_year = guess.release_year;
    }

    const resp: GuessResponse = { isCorrect, overlap };
    if (isCorrect) resp.film = secret;
    res.status(200).json(resp);
  } catch (e:any) {
    res.status(500).json({ error: e?.message || 'Internal error' });
  }
}
