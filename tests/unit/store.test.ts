import { ReadingStore } from "../../src/store";

const deviceId = "36d5658a-6908-479e-887e-a949ec199272";
const otherDeviceId = "2aeb9181-c5c6-4b0b-9c6f-2446aa7b27d2";

describe("ReadingStore.addReadings", () => {
  it("returns stored count for new readings", () => {
    const store = new ReadingStore();

    const stored = store.addReadings(deviceId, [
      { timestamp: "2021-09-29T16:09:15+01:00", count: 15 },
      { timestamp: "2021-09-29T16:08:15+01:00", count: 2 }
    ]);

    expect(stored).toBe(2);
  });

  it("ignores duplicate timestamps for a device", () => {
    const store = new ReadingStore();

    store.addReadings(deviceId, [
      { timestamp: "2021-09-29T16:09:15+01:00", count: 15 }
    ]);

    const stored = store.addReadings(deviceId, [
      { timestamp: "2021-09-29T16:09:15+01:00", count: 15 }
    ]);

    expect(stored).toBe(0);
  });

  it("dedupes timestamps across equivalent offsets", () => {
    const store = new ReadingStore();

    store.addReadings(deviceId, [
      { timestamp: "2021-09-29T12:00:00-04:00", count: 5 }
    ]);

    const stored = store.addReadings(deviceId, [
      { timestamp: "2021-09-29T16:00:00+00:00", count: 500 }
    ]);

    expect(stored).toBe(0);
  });


  it("rejects duplicate timestamps within a single payload", () => {
    const store = new ReadingStore();

    expect(() =>
      store.addReadings(deviceId, [
        { timestamp: "2021-09-29T16:09:15+01:00", count: 15 },
        { timestamp: "2021-09-29T16:09:15+01:00", count: 99 }
      ])
    ).toThrow("Duplicate timestamp in payload");
  });

  it("returns zero for an empty readings array", () => {
    const store = new ReadingStore();

    const stored = store.addReadings(deviceId, []);

    expect(stored).toBe(0);
  });

  it("ignores invalid timestamps without creating device state", () => {
    const store = new ReadingStore();

    const stored = store.addReadings(deviceId, [
      { timestamp: "bad-timestamp", count: 10 }
    ]);

    expect(stored).toBe(0);
    expect(store.getLatestTimestamp(deviceId)).toBeUndefined();
    expect(store.getCumulativeCount(deviceId)).toBeUndefined();
  });

  it("stores valid readings when mixed with invalid timestamps", () => {
    const store = new ReadingStore();

    const stored = store.addReadings(deviceId, [
      { timestamp: "bad-timestamp", count: 10 },
      { timestamp: "2021-09-29T16:00:00+00:00", count: 4 }
    ]);

    expect(stored).toBe(1);
    expect(store.getLatestTimestamp(deviceId)).toBe("2021-09-29T16:00:00.000Z");
  });

  it("tracks devices independently", () => {
    const store = new ReadingStore();

    store.addReadings(deviceId, [
      { timestamp: "2021-09-29T16:09:15+01:00", count: 15 }
    ]);

    store.addReadings(otherDeviceId, [
      { timestamp: "2021-09-29T16:08:15+01:00", count: 2 }
    ]);

    expect(store.getCumulativeCount(deviceId)).toBe(15);
    expect(store.getCumulativeCount(otherDeviceId)).toBe(2);
  });
});

describe("ReadingStore.getLatestTimestamp", () => {
  it("returns undefined for an unknown device", () => {
    const store = new ReadingStore();

    expect(store.getLatestTimestamp(deviceId)).toBeUndefined();
  });

  it("returns the max timestamp value", () => {
    const store = new ReadingStore();

    store.addReadings(deviceId, [
      { timestamp: "2021-09-29T16:09:15+01:00", count: 15 },
      { timestamp: "2021-09-29T16:08:15+01:00", count: 2 }
    ]);

    expect(store.getLatestTimestamp(deviceId)).toBe("2021-09-29T15:09:15.000Z");
  });

  it("returns a normalized ISO timestamp", () => {
    const store = new ReadingStore();

    store.addReadings(deviceId, [
      { timestamp: "2021-09-29T12:00:00-04:00", count: 5 }
    ]);

    expect(store.getLatestTimestamp(deviceId)).toBe("2021-09-29T16:00:00.000Z");
  });

  it("remains on the latest timestamp after adding older readings", () => {
    const store = new ReadingStore();

    store.addReadings(deviceId, [
      { timestamp: "2021-09-29T16:09:15+01:00", count: 15 }
    ]);

    store.addReadings(deviceId, [
      { timestamp: "2021-09-29T16:08:15+01:00", count: 2 }
    ]);

    expect(store.getLatestTimestamp(deviceId)).toBe("2021-09-29T15:09:15.000Z");
  });
});

describe("ReadingStore.getCumulativeCount", () => {
  it("returns undefined for an unknown device", () => {
    const store = new ReadingStore();

    expect(store.getCumulativeCount(deviceId)).toBeUndefined();
  });

  it("returns the sum of unique timestamps", () => {
    const store = new ReadingStore();

    store.addReadings(deviceId, [
      { timestamp: "2021-09-29T16:09:15+01:00", count: 15 },
      { timestamp: "2021-09-29T16:08:15+01:00", count: 2 }
    ]);

    expect(store.getCumulativeCount(deviceId)).toBe(17);
  });

  it("excludes duplicate timestamps from totals", () => {
    const store = new ReadingStore();

    store.addReadings(deviceId, [
      { timestamp: "2021-09-29T16:09:15+01:00", count: 15 }
    ]);

    store.addReadings(deviceId, [
      { timestamp: "2021-09-29T16:09:15+01:00", count: 999 }
    ]);

    expect(store.getCumulativeCount(deviceId)).toBe(15);
  });

  it("ignores invalid timestamps in totals", () => {
    const store = new ReadingStore();

    store.addReadings(deviceId, [
      { timestamp: "bad-timestamp", count: 10 }
    ]);

    expect(store.getCumulativeCount(deviceId)).toBeUndefined();
  });
});
