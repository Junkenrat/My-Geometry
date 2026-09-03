import { describe, it, expect } from "vitest";
import { segmentsCross } from "../geometry";
import type { Point } from "../types";

// Only the coordinates matter here; ids/labels are filler.
function pt(x: number, y: number): Point {
    return { id: `${x},${y}`, label: null, x, y };
}

describe("segmentsCross", () => {
    it("true when segments cross in their interiors (an X)", () => {
        expect(segmentsCross(pt(0, 0), pt(10, 10), pt(0, 10), pt(10, 0))).toBe(true);
    });

    it("false for the opposite sides of a convex quad ABCD", () => {
        const A = pt(0, 0), B = pt(10, 0), C = pt(10, 10), D = pt(0, 10);
        expect(segmentsCross(A, B, C, D)).toBe(false); // AB vs CD
        expect(segmentsCross(B, C, D, A)).toBe(false); // BC vs DA
    });

    it("true for the crossing diagonal pair of a bowtie quad", () => {
        // Vertices clicked A, B, C, D so that side AB crosses side CD.
        const A = pt(0, 0), B = pt(10, 10), C = pt(10, 0), D = pt(0, 10);
        expect(segmentsCross(A, B, C, D)).toBe(true);
    });

    it("false when they only share an endpoint (adjacent sides)", () => {
        expect(segmentsCross(pt(0, 0), pt(10, 0), pt(10, 0), pt(10, 10))).toBe(false);
    });

    it("false for parallel (never meeting) segments", () => {
        expect(segmentsCross(pt(0, 0), pt(10, 0), pt(0, 5), pt(10, 5))).toBe(false);
    });

    it("false when the crossing lies outside both segments", () => {
        // Lines would meet, but only past the endpoints.
        expect(segmentsCross(pt(0, 0), pt(1, 1), pt(5, 0), pt(6, 1))).toBe(false);
    });
});
