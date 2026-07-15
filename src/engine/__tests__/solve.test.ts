import { describe, it, expect } from "vitest";
import { Problem } from "../problem";
import { solve } from "../solve";

// Basic solver behaviour: the value/relation layer and the classic theorems.

function rightTriangle345() {
    const p = new Problem();
    const A = p.addPoint(150, 450);
    const B = p.addPoint(390, 150);
    const C = p.addPoint(390, 450);
    const tri = p.addTriangle(A.id, B.id, C.id);
    p.addCondition({
        kind: "fact",
        fact: { kind: "right_triangle", triangle: tri, rightAngleAt: C, reason: { kind: "given" } },
    });
    return { p, A, B, C };
}

describe("solve", () => {
    it("pythagoras: legs 3 and 4 give hypotenuse 5", () => {
        const { p, A, B, C } = rightTriangle345();
        p.setLength(p.getSegment(A.id, C.id)!, 3);
        p.setLength(p.getSegment(B.id, C.id)!, 4);
        p.setGoal({ kind: "length", segment: p.getSegment(A.id, B.id)! });
        expect(solve(p)).toBe(true);
        expect(p.quantities.value(p.lengthId(p.getSegment(A.id, B.id)!))).toBeCloseTo(5, 6);
    });

    it("angle goal: right triangle with one acute angle known derives the other", () => {
        const { p, A, B, C } = rightTriangle345();
        p.setAngle(p.getAngle(A.id, B.id, C.id)!, 30);
        p.setGoal({ kind: "angle", angle: p.getAngle(B.id, A.id, C.id)! });
        expect(solve(p)).toBe(true);
        expect(p.quantities.value(p.angleId(p.getAngle(B.id, A.id, C.id)!))).toBeCloseTo(60, 6);
    });

    it("X-crossing: vertical angles and linear pairs propagate one given angle", () => {
        const p = new Problem();
        const A = p.addPoint(0, 0);
        const B = p.addPoint(120, 120);
        const C = p.addPoint(0, 120);
        const D = p.addPoint(120, 0);
        p.addSegment(A.id, B.id);
        p.addSegment(C.id, D.id);
        solve(p); // materialize the intersection point and its angles
        const E = p.getPointAt(60, 60)!;
        expect(E).toBeDefined();
        p.setAngle(p.getAngle(E.id, A.id, C.id)!, 40);
        solve(p);
        expect(p.quantities.value(p.angleId(p.getAngle(E.id, B.id, D.id)!))).toBeCloseTo(40, 6);   // vertical
        expect(p.quantities.value(p.angleId(p.getAngle(E.id, A.id, D.id)!))).toBeCloseTo(140, 6);  // linear pair
        expect(p.quantities.value(p.angleId(p.getAngle(E.id, B.id, C.id)!))).toBeCloseTo(140, 6);  // vertical of that
    });

    it("segment addition: point on a segment splits it", () => {
        const p = new Problem();
        const A = p.addPoint(0, 0);
        const B = p.addPoint(90, 0);
        p.addPoint(30, 0); // lies on AB
        p.addSegment(A.id, B.id);
        solve(p); // pointOnSegment -> between -> AE + EB = AB
        const E = p.getPointAt(30, 0)!;
        p.setLength(p.getSegment(A.id, B.id)!, 9);
        p.setLength(p.getSegment(A.id, E.id)!, 4);
        solve(p);
        expect(p.quantities.value(p.lengthId(p.getSegment(E.id, B.id)!))).toBeCloseTo(5, 6);
    });

    it("contradictory lengths on a split segment produce a conflict", () => {
        const p = new Problem();
        const A = p.addPoint(0, 0);
        const B = p.addPoint(90, 0);
        p.addPoint(30, 0);
        p.addSegment(A.id, B.id);
        solve(p);
        const E = p.getPointAt(30, 0)!;
        p.setLength(p.getSegment(A.id, B.id)!, 10);
        p.setLength(p.getSegment(A.id, E.id)!, 4);
        p.setLength(p.getSegment(E.id, B.id)!, 7);
        solve(p);
        expect(p.quantities.conflicts.length).toBeGreaterThan(0);
    });
});
