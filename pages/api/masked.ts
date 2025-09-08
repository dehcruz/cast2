// pages/api/masked.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { filmOfTheDay } from '../../lib/loader';

type MaskItem = { key: string; mask: string };
type MaskedCreditsResponse = {
  stars: MaskItem[];
  directors: MaskItem[];
  writers: MaskItem[];
  production_companies: MaskItem[];
  countries_origin: MaskItem[];
  filming_locations: MaskItem[];
  genres: MaskItem[];
  languages: MaskItem[];
};

function maskText(text: string): string {
  return text.split('').map(ch => {
    if (/[A-ZÀ-ÖØ-Ý]/.test(ch)) return 'X';
    if (/[a-zà-öø-ÿ]/.test(ch)) return 'x';
    return ch;
  }).join('');
}

// chave estável para casar itens entre servidor e cliente
function keyify(s: string): string {
  return s
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove acentos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')                      // só letras/números e espaços
    .trim()
    .replace(/\s+/g, '-');                            // espaços -> hífen
}

export default function handler(req: NextApiRequest, res: NextApiResponse<MaskedCreditsResponse>) {
  const film = filmOfTheDay();
  const pick = (arr?: string[]) => (Array.isArray(arr) ? arr : []);

  const make = (arr?: string[]): MaskItem[] =>
    pick(arr).map(v => ({ key: keyify(String(v)), mask: maskText(String(v)) }));

  res.status(200).json({
    stars: make(film.stars),
    directors: make(film.directors),
    writers: make(film.writers),
    production_companies: make(film.production_companies),
    countries_origin: make(film.countries_origin),
    filming_locations: make(film.filming_locations),
    genres: make(film.genres),
    languages: make(film.languages),
  });
}
