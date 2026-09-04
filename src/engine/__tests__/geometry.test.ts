import { describe, it, expect } from "vitest";
import { segmentsCross, circleLineIntersections, circleCircleIntersections } from "../geometry";
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

// helper to compare unordered point lists up to rounding
function coords(vs: { x: number; y: number }[]): string[] {
    return vs.map(v => `${Math.round(v.x)},${Math.round(v.y)}`).sort();
}

describe("circleLineIntersections", () => {
    const c = { x: 0, y: 0 };
    it("a horizontal line through the center crosses at ±r", () => {
        const hits = circleLineIntersections(c, 10, { x: -20, y: 0 }, { x: 20, y: 0 }, -Infinity, Infinity);
        expect(coords(hits)).toEqual(["-10,0", "10,0"]);
    });

    it("a segment restricts to its own span", () => {
        // Segment from center outward crosses the arc once, at (10,0).
        const hits = circleLineIntersections(c, 10, { x: 0, y: 0 }, { x: 20, y: 0 }, 0, 1);
        expect(coords(hits)).toEqual(["10,0"]);
    });

    it("a tangent line touches once", () => {
        const hits = circleLineIntersections(c, 10, { x: -20, y: 10 }, { x: 20, y: 10 }, -Infinity, Infinity);
        expect(coords(hits)).toEqual(["0,10"]);
    });

    it("a line that misses returns nothing", () => {
        expect(circleLineIntersections(c, 10, { x: -20, y: 15 }, { x: 20, y: 15 }, -Infinity, Infinity)).toEqual([]);
    });
});

describe("circleCircleIntersections", () => {
    it("two overlapping circles cross at two points", () => {
        const hits = circleCircleIntersections({ x: 0, y: 0 }, 10, { x: 16, y: 0 }, 10);
        expect(coords(hits)).toEqual(["8,-6", "8,6"]);
    });

    it("externally tangent circles touch at one point", () => {
        const hits = circleCircleIntersections({ x: 0, y: 0 }, 10, { x: 20, y: 0 }, 10);
        expect(coords(hits)).toEqual(["10,0"]);
    });

    it("far-apart circles do not meet", () => {
        expect(circleCircleIntersections({ x: 0, y: 0 }, 10, { x: 100, y: 0 }, 10)).toEqual([]);
    });

    it("concentric circles do not meet", () => {
        expect(circleCircleIntersections({ x: 0, y: 0 }, 10, { x: 0, y: 0 }, 5)).toEqual([]);
    });
});
