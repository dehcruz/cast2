# 🎬 Créditos Cruzados — v3.4 (layout duas colunas + busca PT-first)

- Layout: créditos do filme à esquerda; lista de chutes à direita.
- Busca: procura em `title_pt` e `title`, exibindo `title_pt ?? title`.
- Tipos: `lib/loader.ts` define `Movie` com `title_pt` e carrega `movies.json` com cache.

## Como rodar
1) Substitua `movies.json` pelo seu `movies_pt_from_akas.json` (renomeie para `movies.json`).  
2) Instale e rode:
```bash
npm install
npm run dev
```
3) Acesse http://localhost:3000
4) Diagnóstico rápido: GET `/api/stats`

## Deploy no Vercel
- Conecte o repo e faça deploy. Se trocar tipos/arquivos, use **Redeploy > Clear build cache**.
