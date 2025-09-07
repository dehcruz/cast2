import { useEffect, useMemo, useState } from 'react';

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

  useEffect(() => {
    const t = setTimeout(async () => {
      if (!query) { setSuggestions([]); return; }
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        if (!res.ok) throw new Error('search http '+res.status);
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
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filmIdGuess: item.id })
      });
      if (!res.ok) throw new Error('guess http '+res.status);
      const data: GuessResult = await res.json();
      const wrapped: GuessUI = { label: item.title, year: item.year, result: data };
      setGuesses(g => [wrapped, ...g]);
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
      years: Array.from(years)
    };
  }, [guesses]);

  return (
    <div style={page}>
      <div style={container}>
        <h1 style={title}>Qual é o filme?</h1>
        <p style={subtitle}>Chute um filme. Se não for o do dia, mostramos apenas o que ele tem <b>em comum</b>.</p>

        {!won && (
          <div style={{position:'relative', marginBottom:16}}>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
              placeholder="Digite o nome (pt-br ou original) e clique numa opção…"
              style={input}
            />
            {(suggestions.length > 0 || query) && (
              <div style={dropdown}>
                {suggestions.length > 0 ? suggestions.map(item => (
                  <div key={item.id} style={dropdownItem} onClick={() => submitGuess(item)}>
                    <span>{item.title}</span>
                    {item.title !== item.orig ? <span style={{marginLeft:8, opacity:.6}}>({item.orig})</span> : null}
                    {item.year ? <span style={{marginLeft:6, opacity:.7}}>• {item.year}</span> : null}
                  </div>
                )) : (
                  <div style={{padding:12, color:'#bbb'}}>Nenhuma opção encontrada.</div>
                )}
              </div>
            )}
            <div style={{marginTop:6, color:'#bbb', fontSize:13}}>Dica: <b>clique</b> numa opção para enviar o chute.</div>
          </div>
        )}

        <div style={twoCols}>
          <div style={leftCol}>
            <Section title="Elenco" items={credits.stars} placeholder="Ainda nada em comum…" />
            <Section title="Diretor" items={credits.directors} />
            <Section title="Roteiro" items={credits.writers} />
            <Section title="Trilha sonora" items={[]} /> {/* placeholder se quiser usar depois */}
            <Section title="Produção (empresas)" items={credits.production_companies} />
            <Section title="Ano de lançamento" items={credits.years} />
            <Section title="País" items={credits.countries_origin} />
            <Section title="Locações" items={credits.filming_locations} />
            <Section title="Gênero" items={credits.genres} />
            <Section title="Idioma" items={credits.languages} />
          </div>

          <div style={rightCol}>
            {guesses.map((g, idx) => (
              <GuessPill key={idx} label={`${g.label}${g.year ? ' ('+g.year+')' : ''}`} ok={!!g.result?.isCorrect} />
            ))}
          </div>
        </div>

        {won && guesses.length > 0 && (
          <div style={winBox}>
            <b>Você acertou!</b> {guesses.find(g => g.result?.isCorrect)?.result?.film?.title_pt ?? guesses.find(g => g.result?.isCorrect)?.result?.film?.title} ({guesses.find(g => g.result?.isCorrect)?.result?.film?.release_year})
          </div>
        )}

        <footer style={footer}>
          Fonte: <code>movies.json</code> com títulos pt-br (IMDb AKAs). Layout: créditos à esquerda, chutes à direita.
        </footer>
      </div>
    </div>
  );
}

function Section({ title, items, placeholder }: { title:string; items:string[]; placeholder?:string }) {
  return (
    <div style={{marginBottom:24}}>
      <div style={sectionTitle}>{title}</div>
      {items.length > 0 ? (
        <ul style={{margin:0, paddingLeft:18, lineHeight:1.6}}>
          {items.map((t, i) => <li key={i}>{t}</li>)}
        </ul>
      ) : (
        placeholder ? <div style={{color:'#aaa'}}>{placeholder}</div> : null
      )}
    </div>
  );
}

function GuessPill({ label, ok }: { label:string; ok:boolean }) {
  return (
    <div style={pillRow}>
      <div style={{...statusBadge, background: ok ? '#cfe8d9' : '#f5d0d0', color: ok ? '#2f6b45' : '#7a2020'}}>
        {ok ? 'V' : 'X'}
      </div>
      <div style={pillLabel}>{label}</div>
    </div>
  );
}

const page: React.CSSProperties = { minHeight: '100vh', background: '#000', color: '#fff' };
const container: React.CSSProperties = { maxWidth: 1200, margin: '40px auto', padding: '0 20px' };
const title: React.CSSProperties = { fontSize: 44, fontWeight: 800, margin: 0 };
const subtitle: React.CSSProperties = { color: '#ddd', marginTop: 8 };

const input: React.CSSProperties = {
  width:'100%', padding:'14px 16px', border:'1px solid #666', background:'#111', color:'#fff',
  borderRadius:12, fontSize:18, outline:'none'
};
const dropdown: React.CSSProperties = {
  position:'absolute', top:52, left:0, right:0, background:'#0d0d0d', border:'1px solid #333',
  borderRadius:12, boxShadow:'0 10px 30px rgba(0,0,0,0.4)', zIndex:10, maxHeight:260, overflowY:'auto'
};
const dropdownItem: React.CSSProperties = { padding:'10px 12px', cursor:'pointer', borderBottom:'1px solid #161616', display:'flex', alignItems:'center' };

const twoCols: React.CSSProperties = { display:'grid', gridTemplateColumns:'1.6fr 1fr', gap:24, marginTop:24 };
const leftCol: React.CSSProperties = { paddingTop:8 };
const rightCol: React.CSSProperties = { display:'flex', flexDirection:'column', gap:10, paddingTop:8 };

const sectionTitle: React.CSSProperties = { color:'#ddd', fontWeight:700, marginBottom:8 };

const pillRow: React.CSSProperties = { display:'flex', alignItems:'center', gap:10 };
const statusBadge: React.CSSProperties = {
  width:28, height:28, borderRadius:14, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800
};
const pillLabel: React.CSSProperties = {
  background:'#f4f4f4', color:'#111', borderRadius:12, padding:'6px 12px', minHeight:28, display:'flex', alignItems:'center'
};

const winBox: React.CSSProperties = {
  marginTop: 16, padding: 16, border: '1px solid #c7f3c7', background:'#0f2', color:'#000', borderRadius: 8, fontWeight: 600
};
const footer: React.CSSProperties = { marginTop: 40, color: '#aaa', fontSize: 13 };
