import { useEffect, useMemo, useState } from 'react';
import { Bebas_Neue, Oswald } from 'next/font/google';

// importa as fontes do Google
const bebas = Bebas_Neue({ subsets: ['latin'], weight: '400' }); // só existe um peso
const oswald = Oswald({ subsets: ['latin'], weight: '400' });

type SearchItem = { id: string; title: string; orig: string; year: number | null };
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
type GuessResult = { isCorrect: boolean; overlap: Overlap; film?: any };
type GuessUI = { label: string; year?: number | null; result: GuessResult };

export default function Home() {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SearchItem[]>([]);
  const [guesses, setGuesses] = useState<GuessUI[]>([]);
  const [won, setWon] = useState(false);
  const [isSmall, setIsSmall] = useState(false);

  useEffect(() => {
    const mq = typeof window !== 'undefined' ? window.matchMedia('(max-width: 480px)') : null;
    const apply = () => setIsSmall(!!mq?.matches);
    apply();
    mq?.addEventListener('change', apply);
    return () => mq?.removeEventListener('change', apply);
  }, []);

  useEffect(() => {
    const t = setTimeout(async () => {
      if (!query) { setSuggestions([]); return; }
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        if (!res.ok) throw new Error('search http ' + res.status);
        const data = await res.json();
        setSuggestions(data.results || []);
      } catch (e) {
        console.error('search error', e);
        setSuggestions([]);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  async function submitGuess(item: SearchItem) {
    setQuery('');
    setSuggestions([]);
    try {
      const res = await fetch('/api/guess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filmIdGuess: item.id }),
      });
      if (!res.ok) throw new Error('guess http ' + res.status);
      const data: GuessResult = await res.json();
      const wrapped: GuessUI = { label: item.title, year: item.year, result: data };
      setGuesses((g) => [wrapped, ...g]);
      if (data.isCorrect) setWon(true);
    } catch (e) {
      console.error('guess error', e);
      alert('Ocorreu um erro ao enviar o chute. Tente novamente.');
    }
  }

  const credits = useMemo(() => {
    const addAll = (src?: string[], dest?: Set<string>) => { if (!src || !dest) return; for (const v of src) dest.add(v); };
    const stars = new Set<string>(), directors = new Set<string>(), writers = new Set<string>(),
      prod = new Set<string>(), countries = new Set<string>(), locs = new Set<string>(),
      genres = new Set<string>(), langs = new Set<string>(), years = new Set<string>();
    for (const g of guesses) {
      const o = g.result?.overlap || {};
      addAll(o.stars, stars); addAll(o.directors, directors); addAll(o.writers, writers);
      addAll(o.production_companies, prod); addAll(o.countries_origin, countries);
      addAll(o.filming_locations, locs); addAll(o.genres, genres); addAll(o.languages, langs);
      if (typeof o.release_year === 'number') years.add(String(o.release_year));
    }
    return {
      stars: Array.from(stars),
      directors: Array.from(directors),
      writers: Array.from(writers),
      production_companies: Array.from(prod),
      countries_origin: Array.from(countries),
      filming_locations: Array.from(locs),
      genres: Array.from(genres),
      languages: Array.from(langs),
      years: Array.from(years),
    };
  }, [guesses]);

  const creditGridColumns = isSmall ? '110px 1fr' : '160px 1fr';
  const creditLabelFont = isSmall ? 16 : 20;
  const creditLineFont = isSmall ? 20 : 26;
  const creditLetter = isSmall ? 0.8 : 1.2;

  return (
    <div style={page}>
      <div style={container}>
        <h1 style={title}>Qual é o filme?</h1>
        <p style={subtitle}>Chute um filme. Se não for o do dia, mostramos apenas o que ele tem <b>em comum</b>.</p>

        {!won && (
          <div style={{ position: 'relative', marginBottom: 16 }}>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
              placeholder="Digite o nome do filme e clique numa opção…"
              style={input}
            />
            {(suggestions.length > 0 || query) && (
              <div style={dropdown}>
                {suggestions.length > 0 ? suggestions.map((item) => (
                  <div key={item.id} style={dropdownItem} onClick={() => submitGuess(item)}>
                    <span>{item.title}</span>
                    {item.title !== item.orig ? <span style={{ marginLeft: 8, opacity: .6 }}>({item.orig})</span> : null}
                    {item.year ? <span style={{ marginLeft: 6, opacity: .7 }}>• {item.year}</span> : null}
                  </div>
                )) : (
                  <div style={{ padding: 12, color: '#bbb' }}>Nenhuma opção encontrada.</div>
                )}
              </div>
            )}
            <div style={{ marginTop: 6, color: '#bbb', fontSize: 13 }}>Dica: <b>clique</b> numa opção para enviar o chute.</div>
          </div>
        )}

        <div style={twoCols}>
          <div style={leftCol}>
            <CreditsPanel
              credits={credits}
              creditGridColumns={creditGridColumns}
              creditLabelFont={creditLabelFont}
              creditLineFont={creditLineFont}
              creditLetter={creditLetter}
            />
          </div>
          <div style={rightCol}>
            {guesses.map((g, idx) => (
              <GuessPill key={idx} label={`${g.label}${g.year ? ' (' + g.year + ')' : ''}`} ok={!!g.result?.isCorrect} />
            ))}
          </div>
        </div>

        {won && guesses.length > 0 && (
          <div style={winBox}>
            <b>Você acertou!</b>{' '}
            {guesses.find(g => g.result?.isCorrect)?.result?.film?.title_pt
              ?? guesses.find(g => g.result?.isCorrect)?.result?.film?.title}
            {' '}({guesses.find(g => g.result?.isCorrect)?.result?.film?.release_year})
          </div>
        )}

        <footer style={footer}>
          Fonte: <code>movies.json</code> com títulos pt-br (IMDb AKAs). Layout: créditos à esquerda, chutes à direita.
        </footer>
      </div>
    </div>
  );
}

/* ====== Créditos estilo “filme” ====== */

function CreditRow({
  label,
  lines,
  creditGridColumns,
  creditLabelFont,
  creditLineFont,
  creditLetter,
}: {
  label: string;
  lines: string[];
  creditGridColumns: string;
  creditLabelFont: number;
  creditLineFont: number;
  creditLetter: number;
}) {
  return (
    <div style={{ ...creditRow, gridTemplateColumns: creditGridColumns }}>
      <div style={{ ...creditLabel, fontSize: creditLabelFont }} className={oswald.className}>{label}</div>
      <div style={creditLines}>
        {lines.length > 0 ? (
          lines.map((t, i) => (
            <div
              key={i}
              style={{
                ...creditLine,
                fontSize: creditLineFont,
                letterSpacing: creditLetter,
              }}
              className={bebas.className}
            >
              {t}
            </div>
          ))
        ) : (
          <div style={creditPlaceholder}>—</div>
        )}
      </div>
    </div>
  );
}

function CreditsPanel({
  credits,
  creditGridColumns,
  creditLabelFont,
  creditLineFont,
  creditLetter,
}: {
  credits: {
    stars: string[];
    directors: string[];
    writers: string[];
    production_companies: string[];
    countries_origin: string[];
    filming_locations: string[];
    genres: string[];
    languages: string[];
    years: string[];
  };
  creditGridColumns: string;
  creditLabelFont: number;
  creditLineFont: number;
  creditLetter: number;
}) {
  return (
    <div>
      <CreditRow label="Elenco"        lines={credits.stars}                creditGridColumns={creditGridColumns} creditLabelFont={creditLabelFont} creditLineFont={creditLineFont} creditLetter={creditLetter} />
      <CreditRow label="Diretor"       lines={credits.directors}            creditGridColumns={creditGridColumns} creditLabelFont={creditLabelFont} creditLineFont={creditLineFont} creditLetter={creditLetter} />
      <CreditRow label="Roteiro"       lines={credits.writers}              creditGridColumns={creditGridColumns} creditLabelFont={creditLabelFont} creditLineFont={creditLineFont} creditLetter={creditLetter} />
      <CreditRow label="Trilha sonora" lines={[]}                           creditGridColumns={creditGridColumns} creditLabelFont={creditLabelFont} creditLineFont={creditLineFont} creditLetter={creditLetter} />
      <CreditRow label="Produção"      lines={credits.production_companies} creditGridColumns={creditGridColumns} creditLabelFont={creditLabelFont} creditLineFont={creditLineFont} creditLetter={creditLetter} />
      <CreditRow label="Ano"           lines={credits.years}                creditGridColumns={creditGridColumns} creditLabelFont={creditLabelFont} creditLineFont={creditLineFont} creditLetter={creditLetter} />
      <CreditRow label="País"          lines={credits.countries_origin}     creditGridColumns={creditGridColumns} creditLabelFont={creditLabelFont} creditLineFont={creditLineFont} creditLetter={creditLetter} />
      <CreditRow label="Locações"      lines={credits.filming_locations}    creditGridColumns={creditGridColumns} creditLabelFont={creditLabelFont} creditLineFont={creditLineFont} creditLetter={creditLetter} />
      <CreditRow label="Gênero"        lines={credits.genres}               creditGridColumns={creditGridColumns} creditLabelFont={creditLabelFont} creditLineFont={creditLineFont} creditLetter={creditLetter} />
      <CreditRow label="Idioma"        lines={credits.languages}            creditGridColumns={creditGridColumns} creditLabelFont={creditLabelFont} creditLineFont={creditLineFont} creditLetter={creditLetter} />
    </div>
  );
}

/* ====== Lista de chutes ====== */

function GuessPill({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div style={pillRow}>
      <div style={{ ...statusBadge, background: ok ? '#cfe8d9' : '#f5d0d0', color: ok ? '#2f6b45' : '#7a2020' }}>
        {ok ? 'V' : 'X'}
      </div>
      <div style={pillLabel}>{label}</div>
    </div>
  );
}

/* ====== Estilos base ====== */

const page: React.CSSProperties = { minHeight: '100vh', background: '#000', color: '#fff' };
const container: React.CSSProperties = { maxWidth: 1200, margin: '40px auto', padding: '0 20px' };
const title: React.CSSProperties = {
  color: '#d9d9d9',
  fontSize: 60,
  letterSpacing: 5,
  padding: 15,
  fontWeight: 800,
  margin: 0,
  textAlign: 'center',
  fontVariant: 'common-ligatures',
  fontFamily: '"Bebas Neue", sans-serif', // usa a fonte do next/font
};
const subtitle: React.CSSProperties = {
  marginTop: 8,
  color: '#d9d9d9',
  fontSize: 15,
  letterSpacing: 0.5,
  padding: 15,
  fontWeight: 800,
  margin: 0,
  textAlign: 'center',
  fontVariant: 'common-ligatures',
  fontFamily: '"Oswald", sans-serif', // fonte do next/font
};

const input: React.CSSProperties = {
  width: '100%', padding: '14px 16px', border: '1px solid #666', background: '#111', color: '#fff',
  borderRadius: 12, fontSize: 18, outline: 'none',
};
const dropdown: React.CSSProperties = {
  position: 'absolute', top: 52, left: 0, right: 0, background: '#0d0d0d', border: '1px solid #333',
  borderRadius: 12, boxShadow: '0 10px 30px rgba(0,0,0,0.4)', zIndex: 10, maxHeight: 260, overflowY: 'auto',
};
const dropdownItem: React.CSSProperties = { padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid #161616', display: 'flex', alignItems: 'center' };

const twoCols: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 24, marginTop: 24 };
const leftCol: React.CSSProperties = { paddingTop: 8 };
const rightCol: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 8 };

const creditRow: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '160px 1fr',
  columnGap: 24,
  alignItems: 'start',
  marginBottom: 26,
};
const creditLabel: React.CSSProperties = {
  textAlign: 'right',
  color: '#d9d9d9',
  fontSize: 20,
  letterSpacing: 0.5,
  paddingTop: 2,
};
const creditLines: React.CSSProperties = { display: 'grid', rowGap: 6 };
const creditLine: React.CSSProperties = {
  fontWeight: 800,
  fontSize: 26,
  lineHeight: 1.05,
  textTransform: 'uppercase',
  letterSpacing: 1.2,
  color: '#fff',
  textShadow: '0 0 0.01px rgba(255,255,255,0.15)',
};
const creditPlaceholder: React.CSSProperties = {
  color: '#777',
  fontStyle: 'italic',
  letterSpacing: 0.5,
};

const pillRow: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10 };
const statusBadge: React.CSSProperties = {
  width: 28, height: 28, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800,
};
const pillLabel: React.CSSProperties = {
  background: '#f4f4f4', color: '#111', borderRadius: 12, padding: '6px 12px', minHeight: 28, display: 'flex', alignItems: 'center',
};

const winBox: React.CSSProperties = {
  marginTop: 16, padding: 16, border: '1px solid #c7f3c7', background: '#0f2', color: '#000', borderRadius: 8, fontWeight: 600,
};
const footer: React.CSSProperties = { marginTop: 40, color: '#aaa', fontSize: 13 };
