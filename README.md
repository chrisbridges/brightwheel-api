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
Ingest is idempotent per `(deviceId, timestamp)` and ignores conflicting counts for the same timestamp.

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

Returns the latest timestamp for a device, determined by max timestamp value (not arrival order).
Timestamps are normalized to a canonical ISO-8601 UTC format (e.g. `2021-09-29T15:09:15.000Z`).

Response:

```json
{ "latest_timestamp": "2021-09-29T15:09:15.000Z" }
```

### GET /devices/:id/cumulative

Returns the cumulative count across all unique-timestamp readings for a device.

Response:

```json
{ "cumulative_count": 17 }
```

## Project structure

- `src/store.ts` holds the in-memory device aggregation map.
- `src/app.ts` defines routes and request validation.
- `src/server.ts` wires the app to the HTTP listener.
- `tests/` includes API tests using supertest.

## Assumptions and behavior

- `count` is per-reading (incremental); cumulative is the sum of unique-timestamp readings.
- Duplicate definition is `(deviceId, timestamp)` after timestamp normalization; duplicates with different counts are ignored.
- “Latest” is the maximum timestamp value, not arrival order.
- Reads for unknown devices return `404 Not Found`.
- Counts must be non-negative integers within JS safe integer limits.

## Data structure and complexity

Per device we store a `Map<epochMillis, count>`, plus `latestEpoch` and `totalCount`.
This yields O(1) average ingest, O(1) latest lookup, and O(1) cumulative lookup.
Tradeoff: we do not retain full reading history or support range queries; those would require a different structure.

## Notes and improvement ideas

- Add request idempotency keys and stronger dedupe handling for retries across restarts.
  - BUT given the hard requirement to not persist anything to disk
- Provide pagination or query filters if devices have very large reading volumes.
- Persist to an external datastore (Redis/Postgres) with retention policies.
- Add metrics, tracing, and structured logging for production readiness.
- Validate timestamp bounds (e.g., reject future readings) and add rate limiting.
- Evaluate bigint or decimal types if counts can exceed safe integer range.

## Running tests

```bash
npm test
```

TODO:

- dockerize
- bruno collection
- tests easily structured and full coverage
- GitHub link
- remove carats fro package.json
