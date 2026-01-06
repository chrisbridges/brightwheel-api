# brightwheel API Take-Home

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

### Bruno Collection

I have included a Bruno collection here that can be imported to smoke-test the server's functionality.

_Ensure that after importing the collection, you are leveraging the "Local" environment variables._

## API Endpoints

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
Timestamps are normalized to ISO-8601 UTC format (e.g. `2021-09-29T15:09:15.000Z`).

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
- `src/schemas.ts` defines request/response validation schemas.
- `src/app.ts` defines routes and request validation.
- `src/server.ts` wires the app to the HTTP listener.
- `tests/e2e/` includes API tests.
- `tests/unit/` includes unit tests for the store and schemas.
- `tests/shared/` includes shared test helpers and types.
- `bruno/` includes Bruno API collection files for manual testing.

## Data structure and complexity

Per device we store a `Map<epochMillis, count>`, plus `latestEpoch` and `totalCount`.
This yields O(1) average ingest, O(1) latest lookup, and O(1) cumulative lookup.
Tradeoff: we do not retain full reading history or support range queries; those would require a different structure.

## Assumptions and behavior

- Payloads that contain duplicate timestamps are rejected to prevent inconsistent counts from being stored
- `count` is per-reading (incremental); cumulative is the sum of unique-timestamp readings.
- Duplicate definition is `(deviceId, timestamp)` after timestamp normalization; duplicates with different counts are ignored.
- “Latest” is the maximum timestamp value, not arrival order.
- Reads for unknown devices return `404 Not Found`.
- Counts must be non-negative integers within JS safe integer limits.

## Notes and improvement ideas

- Provide pagination or query filters if devices have very large read volumes.
- Persist to an external datastore (Redis/Postgres) with retention policies.
- Add metrics, tracing, and structured logging for production readiness.
- Validate timestamp bounds (e.g., reject readings from the future) and add rate limiting.
- Evaluate bigint or decimal types if counts can exceed safe integer range.

## A Note on Project Comments

Generally, I try to adhere to "Uncle Bob's" Clean Code principle that comments should be viewed as a last resort, since ideally code should be self-explanatory and easy to read. Given the nature of this project, I try to leverage them to explain certain decisions and parts of the code that might not be immediately obvious to someone who hasn't worked a lot in TypeScript.

## Running tests

```bash
npm test
```

## GitHub Link

[GitHub Link](https://github.com/chrisbridges/brightwheel-api)

## Packages Leveraged

The amount of packages leveraged in this project were attempted to be kept to a minimum to ensure simplicity. Node / Express are a common bundle, while zod is used for schema validation. Jest is used for tests.

## Parting Words

Thank you for the time spent reviewing this project. I look forward to speaking with y'all further about it. This was fun :).

TODO:

- dockerize
- tests easily structured and full coverage
