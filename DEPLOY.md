# Deploy v0.1 — paso a paso

Todo el código está scaffoldeado. Estos son los pasos para llegar de "código en disco" a "URL pública funcionando con cron diario".

---

## 1. Instalar y probar localmente (5 min)

Abrí terminal en la carpeta del proyecto:

```bash
cd ~/Desktop/movimientos/radar-economico

# Instalar dependencias
npm install

# Copiar el template de env y completar
cp .env.local.example .env.local
```

Editá `.env.local` (con Cursor) y completá:

```
MONGODB_URI=mongodb+srv://sebastianlarocca_db_user:TU-PASSWORD@radareconomico.ywfuspc.mongodb.net/?appName=radarEconomico
MONGODB_DB=radar
FRED_API_KEY=tu-fred-key
CRON_SECRET=    # generar abajo
```

Generá un `CRON_SECRET` random:

```bash
openssl rand -hex 32
# copiá el output al .env.local
```

Levantá el dev server:

```bash
npm run dev
```

Abrí http://localhost:3000 — vas a ver la UI con todos los tiles en "—" porque todavía no hay datos en Mongo.

## 2. Disparar un snapshot local (1 min)

En **otra terminal**:

```bash
CRON_SECRET=$(grep CRON_SECRET ~/Desktop/movimientos/radar-economico/.env.local | cut -d= -f2)
curl -X POST http://localhost:3000/api/cron/daily \
  -H "Authorization: Bearer $CRON_SECRET"
```

Tendrías que ver algo como:

```json
{"ok":true,"written":10,"bySource":{"dolarapi":8,"coingecko":2},"errors":[]}
```

Refrescá http://localhost:3000 — ahora los tiles muestran valores reales.

Si en MongoDB Compass o Atlas mirás la base `radar` vas a ver la colección `indicator_values` con 10 documentos.

## 3. Push a GitHub (2 min)

```bash
cd ~/Desktop/movimientos/radar-economico
git init
git branch -M main
git remote add origin https://github.com/sebastianlarocca-ops/radar-economico.git
git add .
git commit -m "Initial scaffold: Next.js 15 + MongoDB + DolarAPI + CoinGecko"
git push -u origin main
```

## 4. Importar a Vercel y desplegar (3 min)

1. https://vercel.com/new
2. "Import Git Repository" → buscás `radar-economico` → **Import**.
3. La pantalla de configuración detecta Next.js automáticamente. **No cambies nada** del framework preset, build command, output dir.
4. Antes de hacer click en Deploy, expandí **"Environment Variables"** y pegá:

   | Name | Value |
   |---|---|
   | `MONGODB_URI` | tu connection string completo con password |
   | `MONGODB_DB` | `radar` |
   | `FRED_API_KEY` | tu key FRED |
   | `CRON_SECRET` | el mismo random hex de `.env.local` |

5. **Deploy**. Tarda 1–2 min. Cuando termine, te da una URL tipo `https://radar-economico-xxxx.vercel.app`.

## 5. Probar producción (1 min)

Abrí la URL. Vas a ver el mismo dashboard, pero todavía con "—" porque Mongo todavía no tiene datos.

Disparale el snapshot manual:

```bash
curl -X POST https://radar-economico-xxxx.vercel.app/api/cron/daily \
  -H "Authorization: Bearer TU-CRON-SECRET"
```

Refrescá la URL — tiles con valores.

## 6. Confirmar el cron (automático)

El `vercel.json` configura el cron para correr todos los días a las **10:00 UTC** (= 07:00 hora Argentina).

Lo podés ver en: Vercel → tu proyecto → Crons. Si no aparece, hacé un re-deploy.

---

## Troubleshooting

**Error `MONGODB_URI not configured`** — la variable no está en `.env.local` (dev) o en Vercel env vars (prod).

**Error de conexión a Mongo en prod** — verificá que Network Access en Atlas tenga `0.0.0.0/0`. Las IPs de Vercel rotan, así que el allowlist abierto es la solución simple por ahora.

**`/api/cron/daily` devuelve 401** — `CRON_SECRET` no coincide entre `.env.local` (o Vercel) y el header `Authorization`.

**Tiles siempre en "—"** — la colección `indicator_values` está vacía. Dispará el snapshot manual una vez.

---

## Qué pasa después de v0.1

Cuando todo esto esté andando, en la próxima iteración sumamos:

- Fetchers para FRED (US macro), ArgentinaDatos (IPC, riesgo país), BCRA (tasas, reservas, base monetaria).
- Endpoint `/api/snapshots/history` y los charts (sparklines en tiles + gráficos grandes), porteados del artifact.
- Backfill: levantar todo el histórico que ArgentinaDatos y DolarAPI tienen disponible.
- Selector temporal 30d/90d/1a/Máx.
- PWA installable.
