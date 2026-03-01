import { describe, it, expect } from "vitest";
import { lerp, distance, clamp } from "./math";

describe("lerp", () => {
    it("returns a at t=0", () => {
        expect(lerp(10, 20, 0)).toBe(10);
    });

    it("returns b at t=1", () => {
        expect(lerp(10, 20, 1)).toBe(20);
    });

    it("returns midpoint at t=0.5", () => {
        expect(lerp(0, 100, 0.5)).toBe(50);
    });
});

describe("distance", () => {
    it("returns 0 for same point", () => {
        expect(distance(5, 5, 5, 5)).toBe(0);
    });

    it("computes euclidean distance", () => {
        expect(distance(0, 0, 3, 4)).toBe(5);
    });
});

describe("clamp", () => {
    it("clamps below min", () => {
        expect(clamp(-5, 0, 10)).toBe(0);
    });

    it("clamps above max", () => {
        expect(clamp(15, 0, 10)).toBe(10);
    });

    it("returns value when in range", () => {
        expect(clamp(5, 0, 10)).toBe(5);
    });
});
