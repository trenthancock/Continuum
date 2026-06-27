# Continuum — Paragon Home Configurator

CRM · 3D home configurator · ERP · warranty — by Camelot Homes / Research and Developments.

## Stack

- **Vite + React** — single-page app
- **Three.js** — parametric 3D massing viewer (WebGL)

## Dev

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Production stubs

Three integrations are stubbed and marked in `src/App.jsx`:

| Marker | What to wire |
|---|---|
| `// ⟶ PRODUCTION · SALESFORCE` | Write Lead + saved configuration on form submit |
| `track()` calls | Forward events to analytics + Salesforce campaign |
| `// GEOMETRY SLOT` | Swap parametric massing for real Model 1 GLTF mesh |
