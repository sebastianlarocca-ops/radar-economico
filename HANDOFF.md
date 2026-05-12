# Radar Económico — Handoff Document

**Fecha:** 2026-05-12
**De:** Claude Code session
**Para:** Claude Code / continuador del proyecto
**Repo:** https://github.com/sebastianlarocca-ops/radar-economico

---

## Workflow obligatorio para toda sesión

**Cada cambio de código debe terminar en producción.** El flujo completo es:

```
editar en worktree → npm run build → commit → push → PR → merge → Vercel auto-deploya
```

- Nunca usar `vercel --prod` desde el repo local — siempre dejar que Vercel auto-deploye desde el merge a `main`.
- Si por alguna razón el local está desactualizado antes de deployar: `git fetch origin && git reset --hard origin/main`.
- Al final de cada sesión: actualizar este HANDOFF.md, commitear y mergear a main.

---

## TL;DR

Dashboard mobile-first de indicadores macro y financieros — Argentina (FX, riesgo país, IPC, BCRA), USA (FRED), China (FRED). Stack: Next.js 15 + TypeScript + Tailwind + MongoDB Atlas, desplegado en Vercel con cron diario.

**Estado actual en una línea:** v0.3 casi completo — BCRA + CoinGecko + China + UX derivados + Eurozona (ECB SDW) en producción. Falta: correr backfill ECB en prod + health endpoint + cron_runs log.

---

## Status snapshot

### ✅ En producción (v0.3 parcial)

URL: `https://radar-economico-one.vercel.app`

- Next.js 15 desplegado en Vercel (free tier), auto-deploy desde `main`
- MongoDB Atlas M0, colección `radar.indicator_values`, ~28k docs
- **5 fuentes activas:** DolarAPI · ArgentinaDatos · BCRA · CoinGecko · FRED
- **19 indicadores** registrados en `lib/indicators.ts`
- Cron diario: `POST /api/cron/daily` a las 10:00 UTC — todas las fuentes
- Dashboard con: tiles + sparklines, range selector (30d/90d/1a/Máx), line charts, brecha chart, tooltips ⓘ

### Cambios de v0.3 ya en producción

| PR | Cambio |
|---|---|
| #7 | BCRA: switch tasa política a variable 150 (pases O/N, ~20%). CoinGecko: agrega `x-cg-demo-api-key` header. |
| #8 | CoinGecko: cap history a 365d (demo tier limit). |
| #9/#10 | China: CPI YoY (CHNCPIALLMINMEI) + USD/CNY (DEXCHUS) vía FRED. PPI/PMI removidos (series inexistentes en FRED). |
| #11 | UX derivados: tile BTC/ARS (client-side), tiles USDT vs Blue / USDT vs CCL, stale badge ámbar en Tile. |
| #12 | Eurozona: fuente ECB SDW (ecb.ts), 4 indicadores (DFR, HICP, EUR/USD, Bund 10Y), sección dashboard. |

### Estado de los datos en MongoDB (al 2026-05-12)

| Fuente | Rows aprox. | Rango |
|---|---|---|
| argentinadatos | 15,600 | May 2021 – May 2026 |
| fred | ~9,000 | May 2021 – May 2026 (US + CN) |
| bcra | 3,000+ | May 2021 – May 2026 |
| coingecko | 730 | May 2025 – May 2026 (1 año, demo tier limit) |
| dolarapi | ~8/día | solo current (cron diario) |

### Componentes del frontend

| Archivo | Estado |
|---|---|
| `components/charts.tsx` | Sparkline, LineChart (dual-axis), BarChart. Labels multi-año automáticos ("may '21"). |
| `components/RangeSelector.tsx` | Botones 30d/90d/1a/Máx. Client component. |
| `components/InfoTooltip.tsx` | Ícono ⓘ con tooltip hover/click. |
| `components/Tile.tsx` | Acepta `sparkline`, `sparkColor`, `info` props. |
| `components/DashboardClient.tsx` | Client principal. Estado de rango, lazy-fetch de history, secciones AR/Crypto/US/CN. |
| `components/Dashboard.tsx` | Server shell fino — solo pasa props a DashboardClient. |
| `app/page.tsx` | Server fetch: latest + 365d history en paralelo desde Mongo. |

---

## Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                            Vercel                                │
│  ┌──────────────┐  ┌──────────────────┐  ┌──────────────────┐   │
│  │ Cron 10 UTC  │  │ /api/cron/daily  │  │ /api/admin/      │   │
│  │ (vercel.json)│─▶│ Bearer-protected │  │ backfill?source= │   │
│  └──────────────┘  └────────┬─────────┘  └────────┬─────────┘   │
│                             │                      │             │
│                             ▼                      ▼             │
│                  ┌─────────────────────┐  ┌──────────────────┐   │
│                  │ runSnapshot()       │  │ runBackfill()    │   │
│                  │ lib/snapshot.ts     │  │ lib/backfill.ts  │   │
│                  └──────────┬──────────┘  └──────────┬───────┘   │
│                             │                        │           │
│                             ▼ parallel               ▼           │
│         ┌─────────────────────────────────────────────┐         │
│         │ lib/sources/                                 │         │
│         │   dolarapi · coingecko · argentinadatos      │         │
│         │   bcra · fred                                │         │
│         └────────────────────┬─────────────────────────┘         │
│                              ▼                                   │
│                       MongoDB Atlas M0                           │
│                       indicator_values                           │
│              { indicator, timestamp, value, source, meta }       │
│                              ▲                                   │
│                              │                                   │
│             ┌────────────────┴─────────────────┐                 │
│             │                                  │                 │
│  ┌──────────┴──────────┐         ┌─────────────┴──────────────┐ │
│  │ /api/snapshots/     │         │ /api/snapshots/history     │ │
│  │ latest              │         │ ?days=90&indicators=...    │ │
│  └──────────┬──────────┘         └─────────────┬──────────────┘ │
│             │                                  │                 │
│             ▼                                  ▼                 │
│  ┌────────────────────────────────────────────────────┐         │
│  │  app/page.tsx (server) → Dashboard (server shell)  │         │
│  │  → DashboardClient (client): tiles + charts +      │         │
│  │    sparklines + range selector + info tooltips     │         │
│  └────────────────────────────────────────────────────┘         │
└──────────────────────────────────────────────────────────────────┘
```

### Stack

- **Framework:** Next.js 15 (App Router)
- **Lenguaje:** TypeScript 5.7, strict
- **Styling:** Tailwind 3.4 + CSS variables (`app/globals.css`)
- **DB:** MongoDB Atlas M0 (gratis, 512 MB)
- **Driver Mongo:** `mongodb` v6.12
- **Charts:** `chart.js` v4.4 + `react-chartjs-2` v5.3
- **Hosting:** Vercel free + Vercel Cron
- **Node:** 22.x

---

## Problemas conocidos

### 1. CoinGecko history — limitado a 365 días (demo tier)

- **Síntoma:** `/market_chart` retorna 401 con `days > 365` en demo tier.
- **Estado actual:** history capped a 365d. El chart BTC/ETH tiene 1 año de historial (mayo 2025–mayo 2026) y crece 1 punto/día via cron.
- **Fix futuro:** Pro tier de CoinGecko para acceder a +365d, o aceptar el límite y dejar crecer orgánicamente.

### 2. China — PPI y PMI Caixin sin fuente en FRED

- **Síntoma:** `PPICHO01CNM661N` y `CHNMFGPMI` no existen en FRED → retornan 400.
- **Estado actual:** tiles removidos del dashboard. China muestra solo CPI YoY y USD/CNY.
- **Fix pendiente:** encontrar fuente alternativa (NBS directo, Stooq, u otra) para PPI y PMI Caixin.

### 3. BCRA API — versión actual es v4.0

- La API migró de v3.0 a v4.0 durante mayo 2026. `lib/sources/bcra.ts` ya usa v4.0.
- Si el BCRA vuelve a migrar, buscar 400 con "Método deprecado" y actualizar `BASE` en `lib/sources/bcra.ts`.

---

## Data model

### Colección `indicator_values`

```ts
{
  _id: ObjectId,
  indicator: string,       // e.g. "ar.dolar.oficial.venta"
  timestamp: Date,         // start-of-day UTC (00:00:00Z)
  value: number,
  source: string,          // "dolarapi" | "coingecko" | "argentinadatos" | "bcra" | "fred"
  meta?: Record<string, any>
}
```

**Índice:** único compuesto `{ indicator: 1, timestamp: -1 }`.
Backfills y cron upsertan contra esta clave → idempotente.

### Convención de IDs

Pattern: `<region>.<categoría>.<detalle>`

- `ar.dolar.oficial.venta`, `ar.dolar.blue.venta`, `ar.dolar.ccl.venta`, etc.
- `ar.riesgo_pais`, `ar.ipc.mensual`
- `ar.bcra.tasa_politica`, `ar.bcra.reservas`, `ar.bcra.base_monetaria`
- `us.fed_funds.upper`, `us.ust.dgs10`, `us.cpi.yoy`, `us.unrate`, `us.payems`, `us.dxy_broad`
- `cn.cpi.yoy`, `cn.fx.usdcny`
- `crypto.btc.usd`, `crypto.eth.usd`

### Registro central de indicadores

`lib/indicators.ts` es la única fuente de verdad. Cada indicador tiene `id`, `label`, `region`, `category`, `unit`, `source` y exactamente un config block de fuente (`fred?`, `bcra?`, `argentinadatos?`, `coingecko?`, `dolarapi?`).

Los módulos de `lib/sources/*` leen del registro vía `indicatorsBySource()`.

---

## Backfill (referencia)

```bash
URL=https://radar-economico-one.vercel.app
TOKEN=<CRON_SECRET>

# Refrescar history (idempotente — solo upserta lo nuevo)
curl -X POST "$URL/api/admin/backfill?source=argentinadatos&years=5" -H "Authorization: Bearer $TOKEN"
curl -X POST "$URL/api/admin/backfill?source=bcra&years=5"           -H "Authorization: Bearer $TOKEN"
curl -X POST "$URL/api/admin/backfill?source=fred&years=5"           -H "Authorization: Bearer $TOKEN"
curl -X POST "$URL/api/admin/backfill?source=coingecko&years=1"      -H "Authorization: Bearer $TOKEN"
# (coingecko: demo tier limita a 365d máximo por request)
```

---

## Future backlog

### Sprint v0.3 — pendiente

**Cobertura geográfica:** ✅ parcial
- ~~Eurozona básica~~ — en producción (PR #12): ECB DFR, HICP, EUR/USD, Bund 10Y AAA
- Eurozona pendiente: BTP-Bund spread (necesita serie `IRS/M.IT.L.L40.CI.0.EUR.N.Z`), PMI/ZEW (fuentes comerciales, no en ECB SDW)
- **⚠ Backfill pendiente en prod**: `curl -X POST "$URL/api/admin/backfill?source=ecb&years=5" -H "Authorization: Bearer $TOKEN"`

**UX:** ✅ completado en PR #11
- ~~BTC/ARS derivado~~ — en producción
- ~~Brechas stables vs blue y vs CCL~~ — en producción
- ~~Stale indicator badge~~ — en producción

**Operations:**
- Health check `/api/health`: last cron timestamp + Mongo connectivity + source staleness
- Cron run log: colección `cron_runs` con timestamp, bySource counts, errors

### Sprint v0.4

**Inteligencia:**
- Release calendar `/api/snapshots/calendar` — próximos datos (CPI US, NFP, INDEC IPC, BCRA)
- Surprise tracker: actual vs consenso (REM para AR, TE scraped para US)
- "Trend health" score (z-score del último valor vs media móvil 1 año)

**PWA:**
- `next-pwa` → installable en iOS/Android
- Service worker para offline shell + Push notifications (VAPID)

**Auth:**
- Clerk o Auth.js — single user o multi-user con indicadores personalizables

**China ampliado:**
- PPI y PMI Caixin con fuente alternativa (NBS directo o Stooq)

### Sprint v0.5+

**Insights LLM:**
- Resumen semanal generado los lunes con Claude API
- Narrativa automática de los moves de la semana

**Mejoras técnicas:**
- Backfill incremental automático (cron detecta gaps y los llena)
- Tests E2E Playwright para validar dashboard render
- Tests unitarios para los fetchers

---

## Conventions

### Cómo agregar un indicador

1. Agregar fila en `lib/indicators.ts` con `source` + config block de fuente.
2. Agregar descripción plain-language en el objeto `INFO` de `components/DashboardClient.tsx`.
3. Si la fuente ya existe en `lib/sources/*`, no hace falta más.
4. Si es fuente nueva: crear `lib/sources/<source>.ts` + wire en `snapshot.ts` y `backfill.ts`.
5. El tile aparece automáticamente si se incluye en la sección correspondiente de `DashboardClient`.

### Cómo agregar una nueva fuente

1. Crear `lib/sources/<source>.ts`:
   ```ts
   export async function fetchXxxCurrent(): Promise<IndicatorValue[]>;
   export async function fetchXxxHistory(from: Date): Promise<IndicatorValue[]>;
   ```
2. Agregar literal al union `source` en `lib/types.ts` + config block `XxxConfig`.
3. Wire en `lib/snapshot.ts` (array `sources`) y `lib/backfill.ts` (record `FETCHERS`).
4. Agregar `BackfillSource` literal en `lib/backfill.ts` y en `ALLOWED` en `app/api/admin/backfill/route.ts`.

### Error handling

- Una fuente que falla **no** rompe el snapshot — se captura en `errors[]` del response.
- API routes: 200 si todo OK, 207 si hubo errores parciales, 500 si todo falló.

### Auth pattern

- Endpoints sensibles (`/api/cron/*`, `/api/admin/*`): `Authorization: Bearer ${CRON_SECRET}`.
- Vercel Cron lo envía automáticamente. Para invocar manualmente: `curl -H "Authorization: Bearer $CRON_SECRET"`.

### BCRA API (v4.0)

- Index: `GET /estadisticas/v4.0/Monetarias` → `results[]: { idVariable, descripcion, ultFechaInformada, ultValorInformado }`
- History: `GET /estadisticas/v4.0/Monetarias/{id}?desde=YYYY-MM-DD&hasta=YYYY-MM-DD&limit=1000` → `results[0].detalle[]: { fecha, valor }`
- Si BCRA vuelve a migrar de versión, el error es `400: "Método deprecado"`. Actualizar `BASE` en `lib/sources/bcra.ts`.

### Date normalization

- Toda fecha persistida en Mongo es `Date` con tiempo `T00:00:00Z` (start-of-day UTC).
- `lib/dates.ts`: `startOfDayUtc`, `isoDate`, `daysAgoStartOfDayUtc`, `yearsAgoStartOfDayUtc`.

### TypeScript

- Strict mode on. No `any` — preferir `unknown` o tipos específicos. Tipos compartidos en `lib/types.ts`.

---

## Reference

### Env vars

| Variable | Dónde | Para qué |
|---|---|---|
| `MONGODB_URI` | local + Vercel | Connection string Atlas M0 |
| `MONGODB_DB` | local + Vercel | `radar` |
| `CRON_SECRET` | local + Vercel | Bearer token para `/api/cron/*` y `/api/admin/*` |
| `FRED_API_KEY` | local + Vercel | FRED fetcher |
| `COINGECKO_API_KEY` | local + Vercel | Demo API key — desbloquea `/market_chart` desde IPs de servidor |

Local viven en `.env.local` (gitignored).

### API endpoints

| Path | Método | Auth | Descripción |
|---|---|---|---|
| `/api/cron/daily` | GET/POST | Bearer CRON_SECRET | Snapshot diario de todas las fuentes |
| `/api/admin/backfill?source=&years=&from=` | GET/POST | Bearer CRON_SECRET | Backfill histórico por fuente |
| `/api/snapshots/latest` | GET | — | Último valor por indicador |
| `/api/snapshots/history?days=&indicators=&from=` | GET | — | Series temporales por indicador |

### URLs y recursos

- **Prod:** https://radar-economico-one.vercel.app
- **GitHub:** https://github.com/sebastianlarocca-ops/radar-economico
- **MongoDB Atlas:** `radareconomico.ywfuspc.mongodb.net` / db `radar`
- **FRED API docs:** https://fred.stlouisfed.org/docs/api/fred/
- **BCRA API docs:** https://bcra.gob.ar/documentacion-apis/?fileName=estadisticas-monetarias-v4
- **DolarAPI:** https://dolarapi.com/
- **ArgentinaDatos:** https://argentinadatos.com/
- **ECB SDW:** https://data.ecb.europa.eu/help/api/overview (para Eurozona, sprint v0.3 pendiente)

### Documentos relacionados

- `/Users/sebastianlarocca/Desktop/movimientos/economic-radar-blueprint.md` — Blueprint estratégico original
- `/Users/sebastianlarocca/Desktop/movimientos/economic-radar.html` — Artifact visual de referencia (HTML standalone)
- `/Users/sebastianlarocca/Desktop/movimientos/phase-2-setup-checklist.md` — Checklist de setup original

---

## Next session quickstart

```
1. Leer este archivo (HANDOFF.md).
2. El proyecto está en producción en v0.3 parcial — BCRA, CoinGecko y China resueltos.
3. Próximos ítems de v0.3:
   a. Eurozona (ECB SDW) — nueva fuente lib/sources/ecb.ts
   b. UX: BTC/ARS derivado, tiles de brecha, stale badge
   c. Operations: /api/health, cron_runs collection
4. Para cualquier cambio: editar en worktree → npm run build → commit → push → PR → gh pr merge → Vercel auto-deploya.
   NUNCA usar "vercel --prod" desde local.
5. Al terminar la sesión: actualizar este HANDOFF.md y pushear a main.
```
