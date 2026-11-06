# Monitor de racks: dashboard web

Panel de monitoreo de temperatura y humedad de racks de TI con control remoto de la
compuerta de ventilación (damper). Proyecto IoT universitario:

```
Raspberry Pi + DHT11 + servo ──MQTT──▶ AWS IoT Core ──regla──▶ DynamoDB
                                                        ▲
              Este dashboard (S3) ──HTTPS──▶ API Gateway + Lambda
```

El dashboard es un **sitio estático** (Next.js con `output: 'export'`): todo el fetch
ocurre en el navegador; no hay servidor, rutas API ni SSR.

## Funcionalidades

- Indicador **En línea / Sin datos** (sin datos si la última lectura tiene más de 30 s,
  según `received_at`) y hora de la última lectura.
- KPI de temperatura y humedad con estado según umbrales ASHRAE
  (temperatura 18–27 °C normal, 27–32 advertencia; humedad 20–60 % normal, 60–80 advertencia;
  fuera de eso crítico), tendencia de 15 min y mín/promedio/máx del rango.
- Gráficas con bandas de umbral, cursor sincronizado y tooltips; rangos 1 h, 6 h, 24 h y 7 días.
  Se reducen a ≤ 500 puntos con el algoritmo LTTB (el CSV conserva todos).
- Polling cada 10 s (3 s mientras un comando espera confirmación). Solo la primera carga
  pide el rango completo; luego se anexan las lecturas nuevas, sin parpadeos.
- Control de compuerta: Cerrar (0°), Media (90°), Abrir (180°) o slider + Enviar.
  Estados: enviando → pendiente de confirmación → confirmado (cuando una lectura **nueva**
  reporta ese ángulo), o error con el mensaje de la API.
- Descarga CSV: `fecha_hora` (ISO, hora de Colombia), `device_id`, `temperatura_c`,
  `humedad_pct`, `compuerta_grados`, `latencia_ms`. Archivo `rack01_24h_2026-11-06_1042.csv`.

## Requisitos

- Node.js 20.9 o superior y npm.

## Cómo correrlo

```bash
cd dashboard
npm install
cp .env.example .env.local   # y edita la URL de tu API
npm run dev                  # http://localhost:3000
```

`.env.local`:

```
NEXT_PUBLIC_API_URL=https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com
```

> Las variables `NEXT_PUBLIC_*` se **incrustan en el JavaScript al compilar**. Si cambias la
> URL, vuelve a ejecutar `npm run build`.

## Build para S3

```bash
npm run build      # genera ./out
```

Sube el **contenido** de `out/` a la raíz del bucket (con hosting de sitio estático,
documento índice `index.html` y documento de error `404.html`). Por ejemplo:

```bash
aws s3 sync out/ s3://TU-BUCKET --delete
```

`trailingSlash: true` genera `ruta/index.html`, que S3 sirve sin reglas adicionales.

## Estructura

```
src/
├─ app/
│  ├─ layout.tsx        Layout raíz (Server Component): <html>, fuente IBM Plex Sans, metadatos
│  ├─ page.tsx          Ruta "/": renderiza <Dashboard />
│  └─ globals.css       Tokens de diseño (Tailwind v4 @theme), animaciones, reduced-motion
├─ components/
│  ├─ Dashboard.tsx     "use client": estado de la página, hooks y layout en grid
│  ├─ Header.tsx        Nombre, selector de rack, indicador En línea / Sin datos
│  ├─ KpiCard.tsx       Valor actual, estado, tendencia, barra de umbrales, mín/prom/máx
│  ├─ DamperPanel.tsx   Botones, slider y estado del comando
│  ├─ DamperVisual.tsx  SVG animado: lamas de la compuerta y flujo de aire
│  ├─ HistoryPanel.tsx  Selector de rango, botón CSV y las dos gráficas
│  ├─ TelemetryChart.tsx Gráfica Recharts con bandas de umbral y tooltip
│  └─ StateViews.tsx    Esqueleto de carga, error y vacío
├─ hooks/
│  ├─ useReadings.ts    Carga + polling incremental de lecturas
│  ├─ useDamperCommand.ts Máquina de estados del comando
│  └─ useNow.ts         Reloj compartido (useSyncExternalStore)
└─ lib/
   ├─ api.ts            Cliente HTTP de /readings y /command
   ├─ metrics.ts        Umbrales, colores y posiciones de la compuerta
   ├─ downsample.ts     LTTB y cortes de línea en huecos sin datos
   ├─ stats.ts          Mín/máx/promedio y tendencia
   ├─ csv.ts            Generación y descarga del CSV
   ├─ format.ts         Formato de fechas/números (es-CO, America/Bogota)
   └─ types.ts          Tipos de datos y rangos
```

## Diseño

Dirección «pasillo frío»: grafito azulado, un único acento (azul aire frío) y colores de
estado apagados que aparecen solo donde informan. Tipografía IBM Plex Sans (variable;
las cifras grandes usan su eje de ancho condensado) con cifras tabulares. Respeta
`prefers-reduced-motion`.

## Scripts

| Comando         | Qué hace                                  |
| --------------- | ----------------------------------------- |
| `npm run dev`   | Servidor de desarrollo con recarga en vivo |
| `npm run build` | Build estático en `out/`                   |
| `npm run lint`  | ESLint                                     |

> El CSV usa coma como separador. Si Excel en español lo abre en una sola columna, usa
> *Datos → Desde texto/CSV* y elige «Coma» como delimitador.
