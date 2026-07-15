import { describe, it, expect } from "vitest";
import { Problem } from "../problem";
import { solve } from "../solve";
import type { Segment } from "../types";

// perpendicularAngles: a ⊥ fact assigns 90° at the meeting point;
// linearPairs/verticalAngles spread it over the remaining angles.

function perp(p: Problem, a: Segment, b: Segment) {
    p.addCondition({
        kind: "fact",
        fact: { kind: "perpendicular", seg1: a, seg2: b, reason: { kind: "given" } },
    });
}

describe("perpendicularAngles", () => {
    it("shared endpoint: AB ⊥ BC gives ∠ABC = 90", () => {
        const p = new Problem();
        const A = p.addPoint(0, 0);
        const B = p.addPoint(90, 0);
        const C = p.addPoint(90, 120);
        p.addSegment(A.id, B.id);
        p.addSegment(B.id, C.id);
        perp(p, p.getSegment(A.id, B.id)!, p.getSegment(B.id, C.id)!);
        solve(p);
        expect(p.quantities.value(p.angleId(p.getAngle(B.id, A.id, C.id)!))).toBeCloseTo(90, 6);
    });

    it("cross: all four angles at the intersection become 90", () => {
        const p = new Problem();
        const A = p.addPoint(0, 0);
        const B = p.addPoint(120, 120);
        const C = p.addPoint(0, 120);
        const D = p.addPoint(120, 0);
        p.addSegment(A.id, B.id);
        p.addSegment(C.id, D.id);
        perp(p, p.getSegment(A.id, B.id)!, p.getSegment(C.id, D.id)!);
        solve(p);
        const E = p.getPointAt(60, 60)!;
        expect(E).toBeDefined();
        for (const [x, y] of [[A, C], [C, B], [B, D], [D, A]] as const) {
            const angle = p.getAngle(E.id, x.id, y.id)!;
            expect(p.quantities.value(p.angleId(angle))).toBeCloseTo(90, 6);
        }
        expect(p.quantities.conflicts).toHaveLength(0);
    });

    it("perpendicular directions without a meeting point stay silent", () => {
        const p = new Problem();
        const A = p.addPoint(0, 0);
        const B = p.addPoint(90, 0);
        const C = p.addPoint(200, 50);
        const D = p.addPoint(200, 150);
        p.addSegment(A.id, B.id);
        p.addSegment(C.id, D.id);
        perp(p, p.getSegment(A.id, B.id)!, p.getSegment(C.id, D.id)!);
        solve(p);
        expect(p.quantities.assignments.filter(a => a.value === 90)).toHaveLength(0);
        expect(p.quantities.conflicts).toHaveLength(0);
    });

    it("⊥ contradicting a given angle produces a conflict", () => {
        const p = new Problem();
        const A = p.addPoint(0, 0);
        const B = p.addPoint(90, 0);
        const C = p.addPoint(90, 120);
        p.addSegment(A.id, B.id);
        p.addSegment(B.id, C.id);
        const angle = p.getAngle(B.id, A.id, C.id) ?? p.addAngle(B.id, A.id, C.id);
        p.setAngle(angle, 80);
        perp(p, p.getSegment(A.id, B.id)!, p.getSegment(B.id, C.id)!);
        solve(p);
        expect(p.quantities.conflicts.length).toBeGreaterThan(0);
    });
});
