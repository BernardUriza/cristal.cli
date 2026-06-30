import { describe, expect, it } from "vitest";
import { RelationshipTracker, deserializeRelationship } from "./RelationshipTracker";

describe("RelationshipTracker", () => {
  it("lets confession increase trust slowly", () => {
    const tracker = new RelationshipTracker();
    const initial = tracker.snapshot();
    for (let i = 0; i < 8; i++) {
      tracker.recordInteraction({ stance: "confession", pressure: 0.18, exploredNewRoom: true });
    }
    const after = tracker.snapshot();

    expect(after.trust).toBeGreaterThan(initial.trust);
    expect(after.trust).toBeLessThan(0.55);
    expect(after.resistance).toBeLessThan(initial.resistance + 0.05);
  });

  it("builds resistance and avoidance under repeated evasion", () => {
    const tracker = new RelationshipTracker();
    for (let i = 0; i < 14; i++) {
      tracker.recordInteraction({ stance: "deflection", pressure: 0.72, revisitedRoom: true });
    }
    const after = tracker.snapshot();

    expect(after.resistance).toBeGreaterThan(0.55);
    expect(after.avoidance).toBeGreaterThan(0.5);
    expect(after.avoidanceStreak).toBe(14);
    expect(after.curiosity).toBeLessThan(0.2);
  });

  it("tracks ritual depth without treating it as morality or score", () => {
    const tracker = new RelationshipTracker();
    for (let i = 0; i < 10; i++) {
      tracker.recordInteraction({ stance: "ritualization", pressure: 0.35, exploredNewRoom: i % 2 === 0 });
    }
    const after = tracker.snapshot();

    expect(after.ritualDepth).toBeGreaterThan(0.25);
    expect(after.trust).toBeGreaterThan(0.2);
    expect(after.interactionCount).toBe(10);
  });

  it("serializes and resumes a relationship curve", () => {
    const tracker = new RelationshipTracker();
    tracker.recordInteraction({ stance: "intellectualization", pressure: 0.4 });
    const resumed = deserializeRelationship(tracker.serialize());
    resumed.recordInteraction({ stance: "intellectualization", pressure: 0.6 });

    expect(resumed.snapshot().avoidanceStreak).toBe(2);
    expect(resumed.snapshot().resistance).toBeGreaterThan(tracker.snapshot().resistance);
  });
});
