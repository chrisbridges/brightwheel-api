# brightwheel-api take-home

## Quick start

```bash
npm install
npm run dev
```

Server starts on `http://localhost:3000` by default. Override with `PORT`.

### Build + run

```bash
npm run build
npm start
```

## API

### POST /readings

Store readings for a device. Duplicate timestamps are ignored.

Request body:

```json
{
  "id": "36d5658a-6908-479e-887e-a949ec199272",
  "readings": [
    { "timestamp": "2021-09-29T16:08:15+01:00", "count": 2 },
    { "timestamp": "2021-09-29T16:09:15+01:00", "count": 15 }
  ]
}
```

Response:

```json
{ "stored": 2 }
```

### GET /devices/:id/latest

Returns the latest timestamp for a device.

Response:

```json
{ "latest_timestamp": "2021-09-29T16:09:15+01:00" }
```

### GET /devices/:id/cumulative

Returns the cumulative count across all readings for a device.

Response:

```json
{ "cumulative_count": 17 }
```

## Project structure

- `src/store.ts` holds the in-memory device aggregation map.
- `src/app.ts` defines routes and request validation.
- `src/server.ts` wires the app to the HTTP listener.
- `tests/` includes API tests using supertest.

## Notes and improvement ideas

- Add request idempotency keys and stronger dedupe handling for retries across restarts.
  - BUT given the hard requirement to not persist anything to disk
- Provide pagination or query filters if devices have very large reading volumes.
- Persist to an external datastore (Redis/Postgres) with retention policies.
- Add metrics, tracing, and structured logging for production readiness.
- Validate timestamp bounds (e.g., reject future readings) and add rate limiting.

## Running tests

```bash
npm test
```

TODO:

- dockerize
- bruno collection
- tests easily structured and full coverage
- GitHub link
