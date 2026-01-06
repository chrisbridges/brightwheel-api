import { request, withServer } from "../shared/server";

const deviceId = "36d5658a-6908-479e-887e-a949ec199272";

describe("POST /readings", () => {
  it("returns 201 with stored count for a valid payload", async () => {
    // TODO: refactor to reduce redundancy with other tests
    await withServer(async ({ baseUrl }) => {
      const response = await request(baseUrl, {
        // TODO: create basic POST request object and then reuse it in other tests for less redundancy
        method: "POST",
        path: "/readings",
        body: {
          id: deviceId,
          readings: [
            { timestamp: "2021-09-29T16:08:15+01:00", count: 2 },
            { timestamp: "2021-09-29T16:09:15+01:00", count: 15 }
          ]
        }
      });

      expect(response.status).toBe(201);
      expect(response.json).toEqual({ stored: 2 });
    });
  });

  it("returns 201 with stored count for duplicates across requests", async () => {
    await withServer(async ({ baseUrl }) => {
      await request(baseUrl, {
        method: "POST",
        path: "/readings",
        body: {
          id: deviceId,
          readings: [
            { timestamp: "2021-09-29T16:09:15+01:00", count: 15 }
          ]
        }
      });

      const response = await request(baseUrl, {
        method: "POST",
        path: "/readings",
        body: {
          id: deviceId,
          readings: [
            { timestamp: "2021-09-29T16:09:15+01:00", count: 999 }
          ]
        }
      });

      expect(response.status).toBe(201);
      expect(response.json).toEqual({ stored: 0 });
    });
  });

  it("returns 400 for an invalid uuid", async () => {
    await withServer(async ({ baseUrl }) => {
      const response = await request(baseUrl, {
        method: "POST",
        path: "/readings",
        body: {
          id: "not-a-uuid",
          readings: [
            { timestamp: "2021-09-29T16:09:15+01:00", count: 15 }
          ]
        }
      });

      expect(response.status).toBe(400);
    });
  });

  it("returns 400 for empty readings arrays", async () => {
    await withServer(async ({ baseUrl }) => {
      const response = await request(baseUrl, {
        method: "POST",
        path: "/readings",
        body: {
          id: deviceId,
          readings: []
        }
      });

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
});

describe("GET /devices/:id/latest", () => {
  it("returns 404 for an unknown device", async () => {
    await withServer(async ({ baseUrl }) => {
      // TODO: refactor to reduce redundancy with other tests
      const response = await request(baseUrl, {
        method: "GET",
        path: `/devices/${deviceId}/latest`
      });

      expect(response.status).toBe(404);
    });
  });

  it("returns the latest timestamp value", async () => {
    await withServer(async ({ baseUrl }) => {
      await request(baseUrl, {
        method: "POST",
        path: "/readings",
        body: {
          id: deviceId,
          readings: [
            { timestamp: "2021-09-29T16:08:15+01:00", count: 2 },
            { timestamp: "2021-09-29T16:09:15+01:00", count: 15 }
          ]
        }
      });

      const response = await request(baseUrl, {
        method: "GET",
        path: `/devices/${deviceId}/latest`
      });

      expect(response.status).toBe(200);
      expect(response.json).toEqual({ latest_timestamp: "2021-09-29T15:09:15.000Z" });
    });
  });
});

describe("GET /devices/:id/cumulative", () => {
  it("returns 404 for an unknown device", async () => {
    // TODO: refactor to reduce redundancy with other tests
    await withServer(async ({ baseUrl }) => {
      const response = await request(baseUrl, {
        method: "GET",
        path: `/devices/${deviceId}/cumulative`
      });

      expect(response.status).toBe(404);
    });
  });

  it("returns the cumulative count for a device", async () => {
    await withServer(async ({ baseUrl }) => {
      await request(baseUrl, {
        method: "POST",
        path: "/readings",
        body: {
          id: deviceId,
          readings: [
            { timestamp: "2021-09-29T16:08:15+01:00", count: 2 },
            { timestamp: "2021-09-29T16:09:15+01:00", count: 15 }
          ]
        }
      });

      const response = await request(baseUrl, {
        method: "GET",
        path: `/devices/${deviceId}/cumulative`
      });

      expect(response.status).toBe(200);
      expect(response.json).toEqual({ cumulative_count: 17 });
    });
  });
});
