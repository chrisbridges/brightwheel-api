import { request, withServer } from "../shared/server";

const deviceId = "36d5658a-6908-479e-887e-a949ec199272";

describe("POST /readings", () => {
  it("returns 201 with stored count for a valid payload", async () => {
    await withServer(async ({ baseUrl }) => {
      const response = await postReadings(baseUrl, [
        { timestamp: "2021-09-29T16:08:15+01:00", count: 2 },
        { timestamp: "2021-09-29T16:09:15+01:00", count: 15 }
      ]);

      expect(response.status).toBe(201);
      expect(response.json).toEqual({ stored: 2 });
    });
  });

  it("returns 201 with stored count for duplicates across requests", async () => {
    await withServer(async ({ baseUrl }) => {
      await postReadings(baseUrl, [
        { timestamp: "2021-09-29T16:09:15+01:00", count: 15 }
      ]);

      const response = await postReadings(baseUrl, [
        { timestamp: "2021-09-29T16:09:15+01:00", count: 999 }
      ]);

      expect(response.status).toBe(201);
      expect(response.json).toEqual({ stored: 0 });
    });
  });

  it("rejects conflicting counts across duped timestamps", async () => {
    await withServer(async ({ baseUrl }) => {
      const response = await postReadings(baseUrl, [
        { timestamp: "2021-09-29T16:09:15+01:00", count: 15 },
        { timestamp: "2021-09-29T16:09:15+01:00", count: 99 }
      ]);

      expect(response.status).toBe(400);
      expect(response.json).toMatchObject({
        error: "Duplicate timestamp in payload",
        details: expect.arrayContaining([
          { path: "readings", message: "Duplicate timestamp in payload" }
        ])
      });
    });
  });

  it("returns 400 for an invalid uuid", async () => {
    await withServer(async ({ baseUrl }) => {
      const response = await postReadings(
        baseUrl,
        [{ timestamp: "2021-09-29T16:09:15+01:00", count: 15 }],
        "not-a-uuid"
      );

      expect(response.status).toBe(400);
    });
  });

  it("returns 400 with details for invalid timestamps", async () => {
    await withServer(async ({ baseUrl }) => {
      const response = await postReadings(baseUrl, [
        { timestamp: "2021-09-29T16:09:15", count: 15 }
      ]);

      expect(response.status).toBe(400);
      expect(response.json).toMatchObject({
        error: "Invalid payload",
        details: expect.arrayContaining([
          { path: "readings.0.timestamp", message: expect.any(String) }
        ])
      });
    });
  });

  it("returns 400 with details for negative counts", async () => {
    await withServer(async ({ baseUrl }) => {
      const response = await postReadings(baseUrl, [
        { timestamp: "2021-09-29T16:09:15+01:00", count: -1 }
      ]);

      expect(response.status).toBe(400);
      expect(response.json).toMatchObject({
        error: "Invalid payload",
        details: expect.arrayContaining([
          { path: "readings.0.count", message: expect.any(String) }
        ])
      });
    });
  });

  it("returns 400 for empty readings arrays", async () => {
    await withServer(async ({ baseUrl }) => {
      const response = await postReadings(baseUrl, []);

      expect(response.status).toBe(400);
    });
  });

  it("returns 400 for invalid JSON payloads", async () => {
    await withServer(async ({ baseUrl }) => {
      const response = await request(baseUrl, {
        method: "POST",
        path: "/readings",
        rawBody: "{invalid-json",
        headers: { "content-type": "application/json" }
      });

      expect(response.status).toBe(400);
      expect(response.json).toEqual({ error: "Invalid JSON" });
    });
  });

  it("accepts payloads just under the size limit", async () => {
    await withServer(async ({ baseUrl }) => {
      const payload = buildSizedPayload(1024 * 1024 - 100);
      const response = await request(baseUrl, {
        method: "POST",
        path: "/readings",
        rawBody: payload
      });

      expect(response.status).toBe(201);
    });
  });

  it("rejects payloads over the size limit", async () => {
    await withServer(async ({ baseUrl }) => {
      const payload = buildSizedPayload(1024 * 1024 + 100);
      const response = await request(baseUrl, {
        method: "POST",
        path: "/readings",
        rawBody: payload
      });

      expect(response.status).toBe(500);
    });
  });
});

describe("GET /devices/:id/latest", () => {
  it("returns 404 for an unknown device", async () => {
    await withServer(async ({ baseUrl }) => {
      const response = await getLatest(baseUrl);

      expect(response.status).toBe(404);
    });
  });

  it("returns the latest timestamp value", async () => {
    await withServer(async ({ baseUrl }) => {
      await postReadings(baseUrl, [
        { timestamp: "2021-09-29T16:08:15+01:00", count: 2 },
        { timestamp: "2021-09-29T16:09:15+01:00", count: 15 }
      ]);

      const response = await getLatest(baseUrl);

      expect(response.status).toBe(200);
      expect(response.json).toEqual({ latest_timestamp: "2021-09-29T15:09:15.000Z" });
    });
  });
});

describe("GET /devices/:id/cumulative", () => {
  it("returns 404 for an unknown device", async () => {
    await withServer(async ({ baseUrl }) => {
      const response = await getCumulative(baseUrl);

      expect(response.status).toBe(404);
    });
  });

  it("returns the cumulative count for a device", async () => {
    await withServer(async ({ baseUrl }) => {
      await postReadings(baseUrl, [
        { timestamp: "2021-09-29T16:08:15+01:00", count: 2 },
        { timestamp: "2021-09-29T16:09:15+01:00", count: 15 }
      ]);

      const response = await getCumulative(baseUrl);

      expect(response.status).toBe(200);
      expect(response.json).toEqual({ cumulative_count: 17 });
    });
  });
});

// Helper functions
const postReadings = (
  baseUrl: string,
  readings: Array<{ timestamp: string; count: number }>,
  id: string = deviceId
) =>
  request(baseUrl, {
    method: "POST",
    path: "/readings",
    body: { id, readings }
  });

const getLatest = (baseUrl: string, id: string = deviceId) =>
  request(baseUrl, {
    method: "GET",
    path: `/devices/${id}/latest`
  });

const getCumulative = (baseUrl: string, id: string = deviceId) =>
  request(baseUrl, {
    method: "GET",
    path: `/devices/${id}/cumulative`
  });

const buildSizedPayload = (targetBytes: number): string => {
  const basePayload = {
    id: deviceId,
    readings: [{ timestamp: "2021-09-29T16:09:15+01:00", count: 1 }],
    padding: ""
  };
  const baseSize = Buffer.byteLength(JSON.stringify(basePayload));
  const paddingLength = Math.max(0, targetBytes - baseSize);
  const payload = {
    ...basePayload,
    padding: "a".repeat(paddingLength)
  };
  return JSON.stringify(payload);
};
