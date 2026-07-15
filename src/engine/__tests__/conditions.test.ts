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
