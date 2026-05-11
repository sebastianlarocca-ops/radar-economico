# Radar Económico

Mobile-first dashboard de indicadores macro y financieros (Argentina, USA, Eurozona, China).

**Stack:** Next.js 15 · TypeScript · Tailwind · MongoDB Atlas · Vercel (hosting + Cron).

**Estado:** Phase 2 v0.1 — pipeline mínimo end-to-end (DolarAPI + CoinGecko → Mongo → Dashboard). FRED, ArgentinaDatos, BCRA y los gráficos se suman en v0.2.

---

## Setup local

```bash
# 1. Instalar dependencias
npm install

# 2. Variables de entorno
cp .env.local.example .env.local
# editá .env.local con tus claves reales (MongoDB URI, CRON_SECRET, FRED API key)

# 3. Levantar dev
npm run dev
# → http://localhost:3000
```

## Disparar un snapshot manualmente

```bash
curl -X POST "http://localhost:3000/api/cron/daily" \
  -H "Authorization: Bearer $(grep CRON_SECRET .env.local | cut -d= -f2)"
```

Debería responder `{"ok": true, "written": N}` e insertar N filas en la colección `indicator_values` de Mongo.

## Endpoints

| Ruta | Método | Auth | Descripción |
|---|---|---|---|
| `/api/cron/daily` | POST/GET | Bearer `CRON_SECRET` | Corre todos los fetchers y persiste el snapshot. Vercel Cron lo dispara diario 10:00 UTC. |
| `/api/snapshots/latest` | GET | — | Último valor disponible por indicador. |

## Estructura

```
app/
  layout.tsx              shell HTML
  page.tsx                dashboard (server component que carga /api/snapshots/latest)
  globals.css             tokens + tailwind
  api/
    cron/daily/           cron handler — snapshot diario
    snapshots/latest/     último valor por indicador
lib/
  mongodb.ts              cliente Mongo (singleton)
  types.ts                tipos compartidos
  indicators.ts           registro central de indicadores
  snapshot.ts             orquestador del snapshot
  sources/
    dolarapi.ts           AR FX (oficial, blue, MEP, CCL, cripto, tarjeta, mayorista)
    coingecko.ts          BTC, ETH
components/
  Dashboard.tsx
  Tile.tsx
  Section.tsx
vercel.json               schedule del cron (10:00 UTC = 07:00 ART)
```

## Deploy a Vercel

1. Push del repo a GitHub.
2. Vercel → New Project → Import `radar-economico` → Deploy.
3. Vercel → Settings → Environment Variables: pegar `MONGODB_URI`, `MONGODB_DB`, `CRON_SECRET`, `FRED_API_KEY`.
4. Re-deploy para que tome las variables.

## Próxima iteración (v0.2)

- Sumar fetchers: ArgentinaDatos (IPC, riesgo país), BCRA (tasas, reservas), FRED (US macro).
- Endpoint `/api/snapshots/history` con time-series.
- Reincorporar charts (Chart.js + react-chartjs-2) — sparklines en tiles + gráficos grandes.
- Backfill route para cargar histórico desde fuentes que tienen API histórica.
- PWA installable.
