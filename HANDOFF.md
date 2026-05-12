# Radar Económico — Handoff Document

**Fecha:** 2026-05-12
**De:** Claude Code session
**Para:** Claude Code / continuador del proyecto
**Repo:** https://github.com/sebastianlarocca-ops/radar-economico

---

## TL;DR

Dashboard mobile-first de indicadores macro y financieros — Argentina (FX, riesgo país, IPC, BCRA), USA (FRED), Eurozona y China (en backlog). Stack: Next.js 15 + TypeScript + Tailwind + MongoDB Atlas, desplegado en Vercel con cron diario.

**Estado actual en una línea:** v0.2 está completamente vivo en producción — backend + frontend + charts + sparklines + range selector + tooltips informativos. No hay deuda técnica pendiente. El siguiente paso es v0.3 (Eurozona + China + mejoras UX).

---

## Status snapshot

### ✅ En producción (v0.2)

URL: `https://radar-economico-one.vercel.app`

- Next.js 15 desplegado en Vercel (free tier), auto-deploy desde `main`
- MongoDB Atlas M0, colección `radar.indicator_values`, ~23.1k docs
- **5 fuentes activas:** DolarAPI · ArgentinaDatos · BCRA · CoinGecko · FRED
- **21 indicadores** registrados en `lib/indicators.ts`
- Cron diario: `POST /api/cron/daily` a las 10:00 UTC — todas las fuentes, ~21 rows/día
- Dashboard con: tiles + sparklines, range selector (30d/90d/1a/Máx), line charts, brecha chart, tooltips ⓘ en cada indicador y chart

### Estado de los datos en MongoDB (al 2026-05-12)

| Fuente | Rows | Rango |
|---|---|---|
| argentinadatos | 15,599 | May 2021 – May 2026 |
| fred | 4,501 | May 2021 – Mar 2026 |
| bcra | 3,000 | May 2021 – May 2025 (*) |
| dolarapi | ~8/día | solo current (cron diario) |
| coingecko | ~2/día | solo current — ver ⚠️ abajo |

(*) El indicador `ar.bcra.tasa_politica` (var 160) dejó de actualizarse en la API del BCRA después de julio 2025. Ver sección "Problemas conocidos".

### Componentes del frontend

| Archivo | Estado |
|---|---|
| `components/charts.tsx` | Sparkline, LineChart (dual-axis), BarChart. Labels multi-año automáticos ("may '21"). |
| `components/RangeSelector.tsx` | Botones 30d/90d/1a/Máx. Client component. |
| `components/InfoTooltip.tsx` | Ícono ⓘ con tooltip hover/click. Descripción plain-language de cada indicador y chart. |
| `components/Tile.tsx` | Acepta `sparkline`, `sparkColor`, `info` props. |
| `components/DashboardClient.tsx` | Client principal. Estado de rango, lazy-fetch de history, todas las secciones. |
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

### 1. BCRA tasa política — dato desactualizado

- **Variable:** `ar.bcra.tasa_politica` → idVariable 160 ("Tasas de interés de política monetaria")
- **Síntoma:** el BCRA dejó de publicar datos en esa variable después de julio 2025. El tile muestra el último valor conocido (29%), el chart muestra el historial hasta jul-2025 como fallback.
- **Causa probable:** el BCRA cambió su framework de política monetaria en 2025 y la variable 160 quedó discontinuada.
- **Fix pendiente:** identificar el nuevo idVariable o serie BCRA que representa la tasa de referencia actual. Hacerlo: llamar `GET https://api.bcra.gob.ar/estadisticas/v4.0/Monetarias` y buscar variables con `ultFechaInformada` reciente relacionadas con tasa o pases. Actualizar el `pattern` en `lib/indicators.ts`.

### 2. CoinGecko history — bloqueado desde IPs de Vercel

- **Síntoma:** backfill de CoinGecko retorna 0 rows aunque el endpoint responde 200 localmente.
- **Causa:** CoinGecko free tier restringe el endpoint `/coins/{id}/market_chart` desde IPs de servidores (Vercel, AWS, etc.).
- **Estado actual:** crypto history se acumula 1 punto/día via cron. El chart BTC/ETH muestra "Acumulando historial" hasta tener ≥2 puntos.
- **Fix pendiente:** conseguir una API key de CoinGecko (demo tier es gratis) y agregarla como `COINGECKO_API_KEY` en Vercel env vars. Actualizar `lib/sources/coingecko.ts` para incluir el header `x-cg-demo-api-key`. Re-correr backfill.

### 3. BCRA API — versión actual es v4.0

- La API migró de v3.0 a v4.0 durante mayo 2026. `lib/sources/bcra.ts` ya usa v4.0.
- Cambios de schema en v4: índice usa `ultFechaInformada`/`ultValorInformado` (antes `fecha`/`valor`); historia usa `results[0].detalle[]` (antes `results[]` flat).
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
- `crypto.btc.usd`, `crypto.eth.usd`

### Registro central de indicadores

`lib/indicators.ts` es la única fuente de verdad. Cada indicador tiene `id`, `label`, `region`, `category`, `unit`, `source` y exactamente un config block de fuente (`fred?`, `bcra?`, `argentinadatos?`, `coingecko?`, `dolarapi?`).

Los módulos de `lib/sources/*` leen del registro vía `indicatorsBySource()`.

---

## Backfill (ya corridos — referencia para refrescar)

```bash
URL=https://radar-economico-one.vercel.app
TOKEN=<CRON_SECRET>

# Refrescar history (idempotente — solo upserta lo nuevo)
curl -X POST "$URL/api/admin/backfill?source=argentinadatos&years=5" -H "Authorization: Bearer $TOKEN"
curl -X POST "$URL/api/admin/backfill?source=bcra&years=5"           -H "Authorization: Bearer $TOKEN"
curl -X POST "$URL/api/admin/backfill?source=fred&years=5"           -H "Authorization: Bearer $TOKEN"
curl -X POST "$URL/api/admin/backfill?source=coingecko&years=1"      -H "Authorization: Bearer $TOKEN"
# (coingecko con years>1 retorna 0 desde Vercel — ver problema conocido #2)
```

---

## Future backlog

### Sprint v0.3 (próxima iteración)

**Cobertura geográfica:**
- 🇪🇺 Eurozona: ECB DFR, HICP, Bund 10Y, BTP-Bund spread, HCOB PMI, ZEW, IFO
  - Fuente: ECB SDW (SDMX REST) + Eurostat
  - Crear `lib/sources/ecb.ts` + `lib/sources/eurostat.ts`
- 🇨🇳 China: 1Y/5Y LPR, CPI YoY, PPI YoY, USD/CNY, USD/CNH, Caixin PMI
  - FRED tiene mirrors de China (`CHNCPIALLMINMEI`, etc.) — reusar `lib/sources/fred.ts`

**Fixes pendientes (ver sección "Problemas conocidos"):**
- Encontrar variable BCRA vigente para tasa de política monetaria
- Agregar `COINGECKO_API_KEY` (demo tier gratuito) para desbloquear history desde Vercel

**UX:**
- BTC/ARS derivado: BTC × USDT (crypto) — computar client-side
- Brechas stables vs blue y vs CCL como tiles derivados
- Stale indicator badge: cuando `timestamp` del último dato tiene > N días, mostrar advertencia visible

**Operations:**
- Health check `/api/health`: last cron timestamp + Mongo connectivity + source staleness
- Cron run log: colección `cron_runs` con timestamp, bySource counts, errors — para debugging futuro
- Tighten Mongo network access: reemplazar `0.0.0.0/0` con egress IPs de Vercel

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

### Sprint v0.5+

**Insights LLM:**
- Resumen semanal generado los lunes con Claude API (ya sabés el patrón)
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
| `FRED_API_KEY` | local + Vercel | FRED fetcher (ya configurada en Vercel) |
| `COINGECKO_API_KEY` | — pendiente — | Demo API key para desbloquear history desde Vercel |

Local viven en `.env.local` (gitignored).

### API endpoints

| Path | Método | Auth | Descripción |
|---|---|---|---|
| `/api/cron/daily` | GET/POST | Bearer CRON_SECRET | Snapshot diario de todas las fuentes |
| `/api/admin/backfill?source=&years=&from=` | GET/POST | Bearer CRON_SECRET | Backfill histórico por fuente |
| `/api/snapshots/latest` | GET | — | Último valor por indicador (21 rows) |
| `/api/snapshots/history?days=&indicators=&from=` | GET | — | Series temporales por indicador |

### URLs y recursos

- **Prod:** https://radar-economico-one.vercel.app
- **GitHub:** https://github.com/sebastianlarocca-ops/radar-economico
- **MongoDB Atlas:** `radareconomico.ywfuspc.mongodb.net` / db `radar`
- **FRED API docs:** https://fred.stlouisfed.org/docs/api/fred/
- **BCRA API docs:** https://bcra.gob.ar/documentacion-apis/?fileName=estadisticas-monetarias-v4
- **DolarAPI:** https://dolarapi.com/
- **ArgentinaDatos:** https://argentinadatos.com/

### Documentos relacionados

- `/Users/sebastianlarocca/Desktop/movimientos/economic-radar-blueprint.md` — Blueprint estratégico original
- `/Users/sebastianlarocca/Desktop/movimientos/economic-radar.html` — Artifact visual de referencia (HTML standalone)
- `/Users/sebastianlarocca/Desktop/movimientos/phase-2-setup-checklist.md` — Checklist de setup original

---

## Next session quickstart

```
1. Leer este archivo (HANDOFF.md).
2. El proyecto está en producción y sin deuda pendiente — no hay que compilar ni pushear nada.
3. Revisar "Problemas conocidos" para contexto:
   - BCRA tasa política desactualizada (variable 160 discontinuada por el BCRA)
   - CoinGecko history bloqueado desde IPs de Vercel (fix: agregar COINGECKO_API_KEY demo)
4. El siguiente sprint es v0.3: Eurozona + China + fix BCRA variable + CoinGecko key.
5. Para cualquier cambio: editar en el worktree activo, `npm run build` para validar, PR a main.
```
