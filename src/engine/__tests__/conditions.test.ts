import { describe, it, expect } from "vitest";
import { Problem } from "../problem";
import { solve } from "../solve";
import { formatQuantity } from "../format";

// The Condition envelope: recording, applying, replaying via resetDerived,
// and removal. Conditions are the single source of "what the user stated".

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
    p.setLength(p.getSegment(A.id, C.id)!, 3);
    p.setLength(p.getSegment(B.id, C.id)!, 4);
    const hyp = p.getSegment(A.id, B.id)!;
    return { p, hyp };
}

describe("resetDerived", () => {
    it("clears everything derived but keeps construction and givens", () => {
        const { p, hyp } = rightTriangle345();
        solve(p);
        expect(p.quantities.value(p.lengthId(hyp))).toBeCloseTo(5, 6);
        p.resetDerived();
        expect(p.quantities.value(p.lengthId(hyp))).toBeNull();
        expect(p.quantities.assignments.filter(a => a.reason.kind === "derived")).toHaveLength(0);
        expect(p.relations.size).toBe(0);
        expect(p.conditions).toHaveLength(3); // fact + two legs
    });

    it("is deterministic: solve -> reset -> solve gives the same picture", () => {
        const { p } = rightTriangle345();
        solve(p);
        const snapshot = () => ({
            facts: p.facts.length,
            relations: p.relations.size,
            derived: p.quantities.assignments
                .filter(a => a.reason.kind === "derived")
                .map(a => formatQuantity(a.quantity))
                .sort()
                .join("; "),
        });
        const first = snapshot();
        p.resetDerived();
        solve(p);
        expect(snapshot()).toEqual(first);
    });
});

describe("removeCondition", () => {
    it("removing a leg makes the hypotenuse unknown; re-adding restores it", () => {
        const { p, hyp } = rightTriangle345();
        solve(p);
        p.removeCondition(2); // BC = 4 (conditions: [fact, AC, BC])
        expect(p.quantities.value(p.lengthId(hyp))).toBeNull();
        solve(p);
        expect(p.quantities.value(p.lengthId(hyp))).toBeNull();
        p.setLength(p.getSegment("p1", "p2")!, 4); // BC again
        solve(p);
        expect(p.quantities.value(p.lengthId(hyp))).toBeCloseTo(5, 6);
    });

    it("removing the right_triangle fact silences pythagoras", () => {
        const { p, hyp } = rightTriangle345();
        solve(p);
        p.removeCondition(p.conditions.findIndex(c => c.kind === "fact"));
        solve(p);
        expect(p.quantities.value(p.lengthId(hyp))).toBeNull();
        expect(p.conditions).toHaveLength(2); // the two legs survive
    });

    it("a conflicting given takes effect once the offender is removed", () => {
        const p = new Problem();
        const A = p.addPoint(0, 0);
        const B = p.addPoint(90, 0);
        p.addSegment(A.id, B.id);
        const seg = p.getSegment(A.id, B.id)!;
        p.setLength(seg, 3);
        p.setLength(seg, 5); // rejected by the store, recorded as a conflict
        expect(p.conditions).toHaveLength(2);
        expect(p.quantities.conflicts.length).toBeGreaterThan(0);
        expect(p.quantities.value(p.lengthId(seg))).toBe(3);
        p.removeCondition(0);
        expect(p.quantities.conflicts).toHaveLength(0);
        expect(p.quantities.value(p.lengthId(seg))).toBe(5);
    });
});

describe("equation conditions (segments_equal)", () => {
    function twoSegments() {
        const p = new Problem();
        const A = p.addPoint(0, 0);
        const B = p.addPoint(90, 0);
        const C = p.addPoint(0, 90);
        const D = p.addPoint(150, 90);
        p.addSegment(A.id, B.id);
        p.addSegment(C.id, D.id);
        const AB = p.getSegment(A.id, B.id)!;
        const CD = p.getSegment(C.id, D.id)!;
        return { p, AB, CD };
    }

    it("derives the other length and records 'given' provenance", () => {
        const { p, AB, CD } = twoSegments();
        p.addCondition({ kind: "equation", equation: { kind: "segments_equal", a: AB, b: CD } });
        p.setLength(AB, 5);
        solve(p);
        expect(p.quantities.value(p.lengthId(CD))).toBeCloseTo(5, 6);
        const assignment = p.quantities.assignments.find(a => a.quantity.id === p.lengthId(CD))!;
        expect(assignment.reason.kind === "derived" && assignment.reason.theorem).toBe("given");
    });

    it("survives resetDerived via replay", () => {
        const { p, AB, CD } = twoSegments();
        p.addCondition({ kind: "equation", equation: { kind: "segments_equal", a: AB, b: CD } });
        p.setLength(AB, 5);
        solve(p);
        p.resetDerived();
        expect(p.quantities.value(p.lengthId(CD))).toBeNull();
        expect(p.relations.size).toBeGreaterThanOrEqual(1); // re-emitted by replay
        solve(p);
        expect(p.quantities.value(p.lengthId(CD))).toBeCloseTo(5, 6);
    });

    it("is idempotent: a duplicate condition adds no second relation", () => {
        const { p, AB, CD } = twoSegments();
        p.addCondition({ kind: "equation", equation: { kind: "segments_equal", a: AB, b: CD } });
        const before = p.relations.size;
        p.addCondition({ kind: "equation", equation: { kind: "segments_equal", a: AB, b: CD } });
        expect(p.relations.size).toBe(before);
    });

    it("works in both directions: value on the b-side propagates to a", () => {
        const { p, AB, CD } = twoSegments();
        p.addCondition({ kind: "equation", equation: { kind: "segments_equal", a: AB, b: CD } });
        p.setLength(CD, 7);
        solve(p);
        expect(p.quantities.value(p.lengthId(AB))).toBeCloseTo(7, 6);
    });

    it("stops deriving once the equality is removed", () => {
        const { p, AB, CD } = twoSegments();
        p.addCondition({ kind: "equation", equation: { kind: "segments_equal", a: AB, b: CD } });
        p.setLength(AB, 5);
        solve(p);
        p.removeCondition(0);
        solve(p);
        expect(p.quantities.value(p.lengthId(CD))).toBeNull();
        expect(p.quantities.value(p.lengthId(AB))).toBe(5);
    });
});

describe("equation conditions (segments_ratio)", () => {
    function twoSegments() {
        const p = new Problem();
        const A = p.addPoint(0, 0);
        const B = p.addPoint(90, 0);
        const C = p.addPoint(0, 90);
        const D = p.addPoint(150, 90);
        p.addSegment(A.id, B.id);
        p.addSegment(C.id, D.id);
        const AB = p.getSegment(A.id, B.id)!;
        const CD = p.getSegment(C.id, D.id)!;
        return { p, AB, CD };
    }

    it("a known numerator derives the denominator: AB/CD = 2, AB = 6 => CD = 3", () => {
        const { p, AB, CD } = twoSegments();
        p.addCondition({ kind: "equation", equation: { kind: "segments_ratio", a: AB, b: CD, value: 2 } });
        p.setLength(AB, 6);
        solve(p);
        expect(p.quantities.value(p.lengthId(CD))).toBeCloseTo(3, 6);
    });

    it("a known denominator derives the numerator: AB/CD = 2, CD = 3 => AB = 6", () => {
        const { p, AB, CD } = twoSegments();
        p.addCondition({ kind: "equation", equation: { kind: "segments_ratio", a: AB, b: CD, value: 2 } });
        p.setLength(CD, 3);
        solve(p);
        expect(p.quantities.value(p.lengthId(AB))).toBeCloseTo(6, 6);
    });

    it("reports a conflict when both lengths contradict the ratio", () => {
        const { p, AB, CD } = twoSegments();
        p.addCondition({ kind: "equation", equation: { kind: "segments_ratio", a: AB, b: CD, value: 2 } });
        p.setLength(AB, 6);
        p.setLength(CD, 5);
        solve(p);
        expect(p.quantities.conflicts.length).toBeGreaterThan(0);
    });

    it("survives resetDerived via replay", () => {
        const { p, AB, CD } = twoSegments();
        p.addCondition({ kind: "equation", equation: { kind: "segments_ratio", a: AB, b: CD, value: 2 } });
        p.setLength(AB, 6);
        p.resetDerived();
        solve(p);
        expect(p.quantities.value(p.lengthId(CD))).toBeCloseTo(3, 6);
    });

    it("AB/CD and CD/AB with the same value are different conditions", () => {
        const { p, AB, CD } = twoSegments();
        p.addCondition({ kind: "equation", equation: { kind: "segments_ratio", a: AB, b: CD, value: 2 } });
        const before = p.relations.size;
        p.addCondition({ kind: "equation", equation: { kind: "segments_ratio", a: CD, b: AB, value: 2 } });
        expect(p.relations.size).toBe(before + 1);
    });
});

describe("angle conditions", () => {
    // ∠ABC at B and ∠DEF at E, each carried as three points.
    function twoAngles() {
        const p = new Problem();
        const A = p.addPoint(0, 0);
        const B = p.addPoint(90, 0);
        const C = p.addPoint(90, 90);
        const D = p.addPoint(300, 0);
        const E = p.addPoint(390, 0);
        const F = p.addPoint(390, 90);
        p.renamePoint(A.id, "A");
        p.renamePoint(B.id, "B");
        p.renamePoint(C.id, "C");
        p.renamePoint(D.id, "D");
        p.renamePoint(E.id, "E");
        p.renamePoint(F.id, "F");
        p.addSegment(A.id, B.id);
        p.addSegment(B.id, C.id);
        p.addSegment(D.id, E.id);
        p.addSegment(E.id, F.id);
        return { p, A, B, C, D, E, F };
    }

    it("angle_value materializes the angle and assigns its measure", () => {
        const { p, A, B, C } = twoAngles();
        expect(p.angles.size).toBe(0);
        p.addCondition({ kind: "angle_value", angle: { vertex: B, thr1: A, thr2: C }, value: 50 });
        solve(p);
        const ang = p.getAngle(B.id, A.id, C.id)!;
        expect(ang).toBeDefined();
        expect(p.quantities.value(p.angleId(ang))).toBeCloseTo(50, 6);
    });

    it("angles_equal propagates a known measure to the other angle", () => {
        const { p, A, B, C, D, E, F } = twoAngles();
        p.addCondition({ kind: "angle_value", angle: { vertex: B, thr1: A, thr2: C }, value: 50 });
        p.addCondition({ kind: "equation", equation: { kind: "angles_equal",
            a: { vertex: B, thr1: A, thr2: C }, b: { vertex: E, thr1: D, thr2: F } } });
        solve(p);
        const def = p.getAngle(E.id, D.id, F.id)!;
        expect(p.quantities.value(p.angleId(def))).toBeCloseTo(50, 6);
    });

    it("angle equality survives resetDerived via replay", () => {
        const { p, A, B, C, D, E, F } = twoAngles();
        p.addCondition({ kind: "angle_value", angle: { vertex: B, thr1: A, thr2: C }, value: 50 });
        p.addCondition({ kind: "equation", equation: { kind: "angles_equal",
            a: { vertex: B, thr1: A, thr2: C }, b: { vertex: E, thr1: D, thr2: F } } });
        solve(p);
        p.resetDerived();
        solve(p);
        const def = p.getAngle(E.id, D.id, F.id)!;
        expect(p.quantities.value(p.angleId(def))).toBeCloseTo(50, 6);
    });
});

describe("triangle conditions", () => {
    function triangle() {
        const p = new Problem();
        const A = p.addPoint(0, 0);
        const B = p.addPoint(120, 0);
        const C = p.addPoint(60, 100);
        p.renamePoint(A.id, "A");
        p.renamePoint(B.id, "B");
        p.renamePoint(C.id, "C");
        p.addSegment(A.id, B.id);
        p.addSegment(B.id, C.id);
        p.addSegment(C.id, A.id);
        return { p, A, B, C };
    }

    it("equilateral: one side pins the others and every angle is 60", () => {
        const { p, A, B, C } = triangle();
        p.addCondition({ kind: "triangle", triangle: { p1: A, p2: B, p3: C }, property: { kind: "equilateral" } });
        p.setLength(p.getSegment(A.id, B.id)!, 7);
        solve(p);
        expect(p.quantities.value(p.lengthId(p.getSegment(B.id, C.id)!))).toBeCloseTo(7, 6);
        expect(p.quantities.value(p.lengthId(p.getSegment(C.id, A.id)!))).toBeCloseTo(7, 6);
        expect(p.quantities.value(p.angleId(p.getAngle(A.id, B.id, C.id)!))).toBeCloseTo(60, 6);
        expect(p.quantities.value(p.angleId(p.getAngle(B.id, A.id, C.id)!))).toBeCloseTo(60, 6);
    });

    it("right: materializes a right_triangle fact and drives Pythagoras", () => {
        const { p, A, B, C } = triangle();
        p.addCondition({ kind: "triangle", triangle: { p1: A, p2: B, p3: C }, property: { kind: "right", vertex: C } });
        p.setLength(p.getSegment(C.id, A.id)!, 3);
        p.setLength(p.getSegment(C.id, B.id)!, 4);
        solve(p);
        expect(p.facts.some(f => f.kind === "right_triangle")).toBe(true);
        expect(p.quantities.value(p.lengthId(p.getSegment(A.id, B.id)!))).toBeCloseTo(5, 6);
    });

    it("obtuse and acute are recorded but inert", () => {
        const { p, A, B, C } = triangle();
        p.addCondition({ kind: "triangle", triangle: { p1: A, p2: B, p3: C }, property: { kind: "obtuse" } });
        solve(p);
        expect(p.facts.some(f => f.kind === "obtuse")).toBe(true);
        // no measures derived from an inequality-only predicate
        expect(p.quantities.assignments.filter(a => a.reason.kind === "derived")).toHaveLength(0);
    });
});
