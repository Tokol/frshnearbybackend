# frshnearbybackend

Backend service for **FRSH nearby** — the app that connects local food
producers with nearby consumers.

This service provides the API used by the FRSH nearby Flutter app
([Tokol/frshnearbyapp](https://github.com/Tokol/frshnearbyapp)). Built with
[Next.js](https://nextjs.org) (App Router, TypeScript); API endpoints live
under `src/app/api/`.

## Getting started

```bash
npm install
npm run dev
```

The server starts at [http://localhost:3000](http://localhost:3000).

## API

- `GET /api/health` — service health check, returns `{"status":"ok","service":"frshnearby-backend"}`.

Add new endpoints as `src/app/api/<name>/route.ts`.
