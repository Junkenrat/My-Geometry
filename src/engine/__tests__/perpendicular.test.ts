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

// A triangle with all three sides drawn — the playground for the bridges.
function fullTriangle() {
    const p = new Problem();
    const A = p.addPoint(0, 0);
    const B = p.addPoint(90, 0);
    const C = p.addPoint(90, 120);
    p.addTriangle(A.id, B.id, C.id);
    return { p, A, B, C };
}

describe("rightTriangleFromAngle (bridge: value -> fact)", () => {
    it("a 90° angle in a triangle produces a derived right_triangle fact", () => {
        const { p, A, B, C } = fullTriangle();
        p.setAngle(p.getAngle(B.id, A.id, C.id)!, 90);
        solve(p);
        const fact = p.facts.find(f => f.kind === "right_triangle");
        expect(fact).toBeDefined();
        expect(fact!.kind === "right_triangle" && fact!.rightAngleAt).toBe(B);
        expect(fact!.reason.kind).toBe("derived");
    });

    it("full chain: AB ⊥ BC plus two legs computes the hypotenuse", () => {
        const { p, A, B, C } = fullTriangle();
        perp(p, p.getSegment(A.id, B.id)!, p.getSegment(B.id, C.id)!);
        p.setLength(p.getSegment(A.id, B.id)!, 3);
        p.setLength(p.getSegment(B.id, C.id)!, 4);
        solve(p);
        expect(p.quantities.value(p.lengthId(p.getSegment(A.id, C.id)!))).toBeCloseTo(5, 6);
    });

    it("does not fire on a non-right angle", () => {
        const { p, A, B, C } = fullTriangle();
        p.setAngle(p.getAngle(A.id, B.id, C.id)!, 60);
        solve(p);
        expect(p.facts.filter(f => f.kind === "right_triangle")).toHaveLength(0);
    });

    it("stays idempotent across solve passes and a user-given duplicate", () => {
        const { p, A, B, C } = fullTriangle();
        const tri = p.getTriangle(A.id, B.id, C.id)!;
        p.addCondition({
            kind: "fact",
            fact: { kind: "right_triangle", triangle: tri, rightAngleAt: B, reason: { kind: "given" } },
        });
        solve(p); // pythagoras assigns 90 -> bridge sees it -> same fact, deduped
        solve(p);
        expect(p.facts.filter(f => f.kind === "right_triangle")).toHaveLength(1);
    });
});

describe("perpendicularFromAngle (reverse bridge)", () => {
    it("a 90° angle between segments derives a perpendicular fact", () => {
        const p = new Problem();
        const A = p.addPoint(0, 0);
        const B = p.addPoint(90, 0);
        const C = p.addPoint(90, 120);
        p.addSegment(A.id, B.id);
        p.addSegment(B.id, C.id);
        p.setAngle(p.addAngle(B.id, A.id, C.id), 90);
        solve(p);
        const fact = p.facts.find(f => f.kind === "perpendicular");
        expect(fact).toBeDefined();
        expect(fact!.reason.kind).toBe("derived");
    });

    it("makes the Prove ⊥ goal achievable", () => {
        const p = new Problem();
        const A = p.addPoint(0, 0);
        const B = p.addPoint(90, 0);
        const C = p.addPoint(90, 120);
        p.addSegment(A.id, B.id);
        p.addSegment(B.id, C.id);
        p.setGoal({ kind: "perpendicular", seg1: p.getSegment(A.id, B.id)!, seg2: p.getSegment(B.id, C.id)! });
        p.setAngle(p.addAngle(B.id, A.id, C.id), 90);
        expect(solve(p)).toBe(true);
    });
});
