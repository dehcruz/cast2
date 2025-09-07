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

let cache: { movies: Movie[] } | null = null;

export function getAllMovies(): Movie[] {
  if (cache) return cache.movies;
  const file = path.join(process.cwd(), 'movies.json');
  const raw = fs.readFileSync(file, 'utf-8');
  const arr = JSON.parse(raw) as Movie[];
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
  cache = { movies: arr };
  return cache.movies;
}

export function getMovieById(id: string | number): Movie | undefined {
  const sid = String(id);
  return getAllMovies().find(m => String(m.id) == sid);
}

export function filmOfTheDay(dateStr?: string): Movie {
  const all = getAllMovies();

  // pega a data fornecida ou a data atual
  const date = dateStr ? new Date(dateStr) : new Date();

  // converte para UTC e aplica offset fixo de -3 horas (Brasília)
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  const brasilTime = new Date(utc - 3 * 60 * 60 * 1000);

  const y = brasilTime.getUTCFullYear();
  const m = String(brasilTime.getUTCMonth() + 1).padStart(2, '0');
  const d = String(brasilTime.getUTCDate()).padStart(2, '0');

  const seedStr = `${y}-${m}-${d}`;

  // gera hash determinístico a partir da string da data
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = (hash * 31 + seedStr.charCodeAt(i)) >>> 0;
  }

  const idx = hash % all.length;
  return all[idx];
}
