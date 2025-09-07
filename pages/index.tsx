import { useEffect, useMemo, useState } from 'react';
import { Bebas_Neue, Oswald, Nunito } from 'next/font/google';


// importa as fontes do Google
const bebas = Bebas_Neue({ subsets: ['latin'], weight: '400' }); // só existe um peso
const oswald = Oswald({ subsets: ['latin'], weight: '400' });
const nunito = Nunito({ subsets: ['latin'], weight: ['700'] });

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

  // novo: tentativas e modal
  const [attempts, setAttempts] = useState<number>(0);
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [winningFilm, setWinningFilm] = useState<any>(null);

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

      // construímos o array novo antes de setar (para calcular tentativas corretamente)
      setGuesses((prev) => {
        const wrapped: GuessUI = { label: item.title, year: item.year, result: data };
        const next = [wrapped, ...prev];

        if (data.isCorrect && !won) {
          // tentativas = chutes anteriores + 1 (este em que acertou)
          setAttempts(prev.length + 1);
          setWinningFilm(data.film ?? null);
          setWon(true);
          setModalOpen(true);
        }
        return next;
      });

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
        <h1 style={title} className={nunito.className}>Qual é o filme?</h1>
        <p style={subtitle} className={oswald.className}>
          Chute um filme. Se não for o do dia, mostramos apenas o que ele tem <b>em comum</b>.
        </p>

        {/* contador de tentativas (sempre visível; zera ao recarregar a página) */}
        <div style={attemptsBar} className={oswald.className}>
          Tentativas: <span style={{ fontWeight: 900, marginLeft: 6 }}>{guesses.length}</span>
        </div>

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
            <div style={{ marginTop: 6, color: '#bbb', fontSize: 13, fontFamily: '__Nunito_85d4bb' }}>Dica: <b>clique</b> numa opção para enviar o chute.</div>
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

        {/* Modal de vitória */}
        {modalOpen && (
          <WinModal
            onClose={() => setModalOpen(false)}
            attempts={attempts}
            filmTitle={(winningFilm?.title_pt?.trim?.() ? winningFilm.title_pt : winningFilm?.title) ?? 'Filme'}
            filmYear={winningFilm?.release_year ?? null}
          />
        )}

        <footer style={footer}>
          Fonte: <code>movies.json</code> com títulos pt-br (IMDb AKAs). Layout: créditos à esquerda, chutes à direita.
        </footer>
      </div>
    </div>
  );
}

/* ====== Modal ====== */

function WinModal({
  attempts,
  filmTitle,
  filmYear,
  onClose,
}: {
  attempts: number;
  filmTitle: string;
  filmYear: number | null;
  onClose: () => void;
}) {
  return (
    <div style={modalOverlay} role="dialog" aria-modal="true" aria-labelledby="win-title">
      <div style={modalCard}>
        <div style={modalHeader}>
          <span id="win-title" style={{ fontSize: 18, fontWeight: 700 }}>Você acertou! 🎉</span>
          <button onClick={onClose} style={modalCloseBtn} aria-label="Fechar">×</button>
        </div>
        <div style={modalBody}>
          <div style={modalFilm} className={bebas.className}>
            {filmTitle}{filmYear ? ` (${filmYear})` : ''}
          </div>
          <div style={modalText} className={oswald.className}>
            Você acertou em <b>{attempts}</b> {attempts === 1 ? 'tentativa' : 'tentativas'}.
          </div>
        </div>
        <div style={modalFooter}>
          <button onClick={onClose} style={modalPrimaryBtn}>Fechar</button>
        </div>
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
const container: React.CSSProperties = { maxWidth: 1200, margin: '0', padding: '0 20px' };

const title: React.CSSProperties = {
  
  fontWeight: 700,
  fontSize: 38,
  margin: 0,
  color: '#d9d9d9',
  textAlign: 'center',
  textTransform: 'uppercase',
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
  fontFamily: '__Nunito_85d4bb',
};

const attemptsBar: React.CSSProperties = {
  display: 'inline-flex',
  gap: 8,
  alignItems: 'baseline',
  color: '#d9d9d9',
  background: '#121212',
  border: '1px solid #2a2a2a',
  borderRadius: 10,
  padding: '8px 12px',
  margin: '0 auto 12px',
  fontSize: 14,
};

const input: React.CSSProperties = {
  width: '100%', padding: '14px 16px', border: '1px solid #666', background: '#111', color: '#fff',
  borderRadius: 12, fontSize: 18, outline: 'none',fontFamily: '__Nunito_85d4bb',
};
const dropdown: React.CSSProperties = {
  position: 'absolute', top: 52, left: 0, right: 0, background: '#0d0d0d', border: '1px solid #333',
  borderRadius: 12, boxShadow: '0 10px 30px rgba(0,0,0,0.4)', zIndex: 10, maxHeight: 260, overflowY: 'auto',
};
const dropdownItem: React.CSSProperties = { padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid #161616', display: 'flex', alignItems: 'center' };

const twoCols: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 24, marginTop: 24 };
const leftCol: React.CSSProperties = { paddingTop: 8 };
const rightCol: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 8 };

/* Créditos “cinema” */
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

/* Chutes */
const pillRow: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10 };
const statusBadge: React.CSSProperties = {
  width: 28, height: 28, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontFamily: '__Nunito_85d4bb',
};
const pillLabel: React.CSSProperties = {
  background: '#f4f4f4', color: '#111', borderRadius: 12, padding: '6px 12px', minHeight: 28, display: 'flex', alignItems: 'center',fontFamily: '__Nunito_85d4bb',
};

const winBox: React.CSSProperties = {
  marginTop: 16, padding: 16, border: '1px solid #c7f3c7', background: '#0f2', color: '#000', borderRadius: 8, fontWeight: 600,
};
const footer: React.CSSProperties = { marginTop: 40, color: '#aaa', fontSize: 13 };

/* Modal styles */
const modalOverlay: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 1000,
};
const modalCard: React.CSSProperties = {
  width: 'min(92vw, 560px)',
  background: '#101010',
  border: '1px solid #2a2a2a',
  borderRadius: 14,
  boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
  color: '#fff',
};
const modalHeader: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: '14px 16px', borderBottom: '1px solid #1e1e1e',
};
const modalCloseBtn: React.CSSProperties = {
  background: 'transparent', color: '#aaa', border: 'none', fontSize: 22, cursor: 'pointer', lineHeight: 1,
};
const modalBody: React.CSSProperties = { padding: '18px 16px 8px' };
const modalFilm: React.CSSProperties = {
  fontSize: 32, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8,
};
const modalText: React.CSSProperties = { color: '#d9d9d9', fontSize: 16 };
const modalFooter: React.CSSProperties = {
  display: 'flex', justifyContent: 'flex-end', padding: '10px 16px 16px',
};
const modalPrimaryBtn: React.CSSProperties = {
  background: '#24d366', color: '#000', fontWeight: 800, border: 'none',
  borderRadius: 10, padding: '10px 14px', cursor: 'pointer',
};
