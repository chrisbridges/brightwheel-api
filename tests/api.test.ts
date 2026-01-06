import { ReadingStore } from "../src/store";

const deviceId = "36d5658a-6908-479e-887e-a949ec199272";

describe("reading store", () => {
  it("stores readings, ignores duplicates, and returns latest/cumulative", () => {
    const store = new ReadingStore();

    const stored = store.addReadings(deviceId, [
      { timestamp: "2021-09-29T16:09:15+01:00", count: 15 },
      { timestamp: "2021-09-29T16:08:15+01:00", count: 2 }
    ]);

    expect(stored).toBe(2);
    expect(store.addReadings(deviceId, [
      { timestamp: "2021-09-29T16:09:15+01:00", count: 15 }
    ])).toBe(0);

    expect(store.getLatestTimestamp(deviceId)).toBe("2021-09-29T15:09:15.000Z");
    expect(store.getCumulativeCount(deviceId)).toBe(17);
  });

  it("normalizes timestamps with offsets and ignores duplicate timestamps with different counts", () => {
    const store = new ReadingStore();

    expect(store.addReadings(deviceId, [
      { timestamp: "2021-09-29T12:00:00-04:00", count: 5 }
    ])).toBe(1);

    expect(store.addReadings(deviceId, [
      { timestamp: "2021-09-29T16:00:00+00:00", count: 500 }
    ])).toBe(0);

    expect(store.getCumulativeCount(deviceId)).toBe(5);
  });

  it("ignores invalid timestamps without mutating state", () => {
    const store = new ReadingStore();

    expect(store.addReadings(deviceId, [
      { timestamp: "bad-timestamp", count: 10 }
    ])).toBe(0);

    expect(store.getLatestTimestamp(deviceId)).toBeUndefined();
    expect(store.getCumulativeCount(deviceId)).toBeUndefined();
  });
});
