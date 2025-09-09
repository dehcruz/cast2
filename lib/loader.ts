import fs from 'node:fs';
import path from 'node:path';

export type Movie = {
  id: string | number;
  title: string;
  title_pt?: string | null;
  release_year?: number | null;
  stars?: string[];
  directors?: string[];
  writers?: string[];
  production_companies?: string[];
  countries_origin?: string[];
  filming_locations?: string[];
  genres?: string[];
  languages?: string[];
};

let cache: { movies: Movie[]; curatedIds: string[] | null } | null = null;

function loadJSON<T>(p: string): T {
  return JSON.parse(fs.readFileSync(p, 'utf-8')) as T;
}

export function getAllMovies(): Movie[] {
  if (cache?.movies) return cache.movies;
  const file = path.join(process.cwd(), 'movies.json');
  const arr = loadJSON<Movie[]>(file);
  for (const m of arr) {
    m.stars = Array.isArray(m.stars) ? m.stars : [];
    m.directors = Array.isArray(m.directors) ? m.directors : [];
    m.writers = Array.isArray(m.writers) ? m.writers : [];
    m.production_companies = Array.isArray(m.production_companies) ? m.production_companies : [];
    m.countries_origin = Array.isArray(m.countries_origin) ? m.countries_origin : [];
    m.filming_locations = Array.isArray(m.filming_locations) ? m.filming_locations : [];
    m.genres = Array.isArray(m.genres) ? m.genres : [];
    m.languages = Array.isArray(m.languages) ? m.languages : [];
  }
  cache = { movies: arr, curatedIds: null };
  return arr;
}

function getCuratedIds(): string[] {
  if (cache?.curatedIds) return cache.curatedIds;
  const curatedPath = path.join(process.cwd(), 'curated.json');
  let ids: string[] = [];
  try {
    const obj = loadJSON<{ ids: (string | number)[] }>(curatedPath);
    ids = (obj?.ids || []).map((v) => String(v));
  } catch {
    ids = [];
  }
  if (!cache) cache = { movies: [], curatedIds: ids };
  else cache.curatedIds = ids;
  return ids;
}

export function getMovieById(id: string | number): Movie | undefined {
  const sid = String(id);
  return getAllMovies().find((m) => String(m.id) === sid);
}

// util: dia de Brasília (UTC-3 fixo; sem DST)
function brazilDateParts(date: Date) {
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  const brasil = new Date(utc - 3 * 60 * 60 * 1000);
  const y = brasil.getUTCFullYear();
  const m = String(brasil.getUTCMonth() + 1).padStart(2, '0');
  const d = String(brasil.getUTCDate()).padStart(2, '0');
  return { y, m, d };
}

function daySeed(date: Date, salt = ''): string {
  const { y, m, d } = brazilDateParts(date);
  return `${y}-${m}-${d}${salt}`;
}

function strHash(s: string): number {
  let h = 0 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h >>> 0;
}

export function filmOfTheDay(dateStr?: string): Movie {
  const all = getAllMovies();

  // 1) Override manual por variável de ambiente (opcional)
  const overrideId = process.env.DAILY_FILM_ID;
  if (overrideId) {
    const forced = getMovieById(overrideId);
    if (forced) return forced;
  }

  // 2) Tenta usar a lista curada
  const curatedIds = getCuratedIds();
  const curatedPool: Movie[] =
    curatedIds.length > 0
      ? curatedIds
          .map((sid) => all.find((m) => String(m.id) === sid))
          .filter((m): m is Movie => !!m)
      : [];

  const pool = curatedPool.length > 0 ? curatedPool : all; // fallback

  // 3) Sorteio determinístico por dia (meia-noite Brasil)
  const base = dateStr ? new Date(dateStr) : new Date();
  const seed = daySeed(base, '|v1'); // salt opcional para “embaralhar” a ordem sem mudar a data
  const idx = strHash(seed) % pool.length;

  return pool[idx];
}
