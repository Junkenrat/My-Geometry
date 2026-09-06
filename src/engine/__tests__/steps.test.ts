import { describe, it, expect } from "vitest";
import { Problem } from "../problem";
import { solve } from "../solve";
import { solutionSteps } from "../steps";

// Шаги решения: выкладка восстанавливается из отношения, которое дало число,
// а сам список обрезается до того, что ведёт к цели.

function rightTriangle() {
    const p = new Problem();
    const A = p.addPoint(0, 0);
    const B = p.addPoint(120, 0);
    const C = p.addPoint(0, 90);
    p.renamePoint(A.id, "A");
    p.renamePoint(B.id, "B");
    p.renamePoint(C.id, "C");
    p.addTriangle(A.id, B.id, C.id);
    return { p, A, B, C };
}

function stepFor(p: Problem, theorem: string) {
    return solutionSteps(p).find(s => s.theorem === theorem);
}

describe("pythagoras formulas", () => {
    it("solving for the hypotenuse substitutes both legs", () => {
        const { p, A, B, C } = rightTriangle();
        p.addCondition({ kind: "triangle", triangle: { p1: A, p2: B, p3: C },
            property: { kind: "right", vertex: A } });
        p.setLength(p.getSegment(A.id, B.id)!, 4);
        p.setLength(p.getSegment(A.id, C.id)!, 3);
        p.setGoal({ kind: "length", segment: p.getSegment(B.id, C.id)! });
        solve(p);
        expect(stepFor(p, "pythagoras")!.formulas).toEqual([
            "BC² = AB² + AC²",
            "BC = √(AB² + AC²)",
            "BC = √(4² + 3²) = 5",
        ]);
    });

    it("solving for a leg moves the other leg to the right", () => {
        const { p, A, B, C } = rightTriangle();
        p.addCondition({ kind: "triangle", triangle: { p1: A, p2: B, p3: C },
            property: { kind: "right", vertex: A } });
        p.setLength(p.getSegment(B.id, C.id)!, 5);
        p.setLength(p.getSegment(A.id, B.id)!, 4);
        p.setGoal({ kind: "length", segment: p.getSegment(A.id, C.id)! });
        solve(p);
        expect(stepFor(p, "pythagoras")!.formulas).toEqual([
            "BC² = AB² + AC²",
            "AC² = BC² − AB²",
            "AC = √(BC² − AB²)",
            "AC = √(5² − 4²) = 3",
        ]);
    });
});

describe("sum formulas", () => {
    it("triangle angle sum moves the known angles to the right", () => {
        const { p, A, B, C } = rightTriangle();
        p.setAngle(p.getAngle(C.id, A.id, B.id)!, 90);
        p.setAngle(p.getAngle(A.id, B.id, C.id)!, 30);
        p.setGoal({ kind: "angle", angle: { vertex: B, thr1: A, thr2: C } });
        solve(p);
        expect(stepFor(p, "triangle_angle_sum")!.formulas).toEqual([
            "∠ABC + ∠ACB + ∠BAC = 180°",
            "∠ABC = 180° − ∠ACB − ∠BAC",
            "∠ABC = 180° − 90° − 30° = 60°",
        ]);
    });

    it("segment addition can also be solved for the whole", () => {
        const p = new Problem();
        const A = p.addPoint(0, 0);
        const M = p.addPoint(60, 0);
        const B = p.addPoint(150, 0);
        p.renamePoint(A.id, "A");
        p.renamePoint(M.id, "M");
        p.renamePoint(B.id, "B");
        p.addSegment(A.id, B.id);
        p.addSegment(A.id, M.id);
        p.addSegment(M.id, B.id);
        p.setLength(p.getSegment(A.id, M.id)!, 6);
        p.setLength(p.getSegment(M.id, B.id)!, 9);
        p.setGoal({ kind: "length", segment: p.getSegment(A.id, B.id)! });
        solve(p);
        expect(stepFor(p, "segment_addition")!.formulas).toEqual([
            "AM + BM = AB",
            "AB = AM + BM",
            "AB = 6 + 9 = 15",
        ]);
    });
});

describe("equal and ratio formulas", () => {
    function twoSegments() {
        const p = new Problem();
        const A = p.addPoint(0, 0);
        const B = p.addPoint(90, 0);
        const C = p.addPoint(0, 90);
        const D = p.addPoint(150, 90);
        p.renamePoint(A.id, "A");
        p.renamePoint(B.id, "B");
        p.renamePoint(C.id, "C");
        p.renamePoint(D.id, "D");
        p.addSegment(A.id, B.id);
        p.addSegment(C.id, D.id);
        return { p, AB: p.getSegment(A.id, B.id)!, CD: p.getSegment(C.id, D.id)! };
    }

    it("equality states the property, then carries the value over", () => {
        const { p, AB, CD } = twoSegments();
        p.addCondition({ kind: "equation", equation: { kind: "segments_equal", a: AB, b: CD } });
        p.setLength(CD, 5);
        p.setGoal({ kind: "length", segment: AB });
        solve(p);
        expect(stepFor(p, "given")!.formulas).toEqual(["AB = CD", "AB = 5"]);
    });

    it("ratio solved for the numerator multiplies", () => {
        const { p, AB, CD } = twoSegments();
        p.addCondition({ kind: "equation", equation: { kind: "segments_ratio", a: AB, b: CD, value: 2 } });
        p.setLength(CD, 3);
        p.setGoal({ kind: "length", segment: AB });
        solve(p);
        expect(stepFor(p, "given")!.formulas).toEqual([
            "AB / CD = 2",
            "AB = 2 · CD",
            "AB = 2 · 3 = 6",
        ]);
    });

    it("ratio solved for the denominator divides", () => {
        const { p, AB, CD } = twoSegments();
        p.addCondition({ kind: "equation", equation: { kind: "segments_ratio", a: AB, b: CD, value: 2 } });
        p.setLength(AB, 6);
        p.setGoal({ kind: "length", segment: CD });
        solve(p);
        expect(stepFor(p, "given")!.formulas).toEqual([
            "AB / CD = 2",
            "CD = AB / 2",
            "CD = 6 / 2 = 3",
        ]);
    });

    it("equal angles keep the degree sign", () => {
        const { p } = twoSegments();
        const E = p.addPoint(300, 300);
        const F = p.addPoint(360, 300);
        const G = p.addPoint(300, 360);
        p.renamePoint(E.id, "E");
        p.renamePoint(F.id, "F");
        p.renamePoint(G.id, "G");
        p.addSegment(E.id, F.id);
        p.addSegment(E.id, G.id);
        const angle = { vertex: E, thr1: F, thr2: G };
        p.addCondition({ kind: "angle_value", angle, value: 40 });
        const H = p.addPoint(500, 300);
        const I = p.addPoint(560, 300);
        const J = p.addPoint(500, 360);
        p.renamePoint(H.id, "H");
        p.renamePoint(I.id, "I");
        p.renamePoint(J.id, "J");
        p.addSegment(H.id, I.id);
        p.addSegment(H.id, J.id);
        const other = { vertex: H, thr1: I, thr2: J };
        p.addCondition({ kind: "equation", equation: { kind: "angles_equal", a: angle, b: other } });
        p.setGoal({ kind: "angle", angle: other });
        solve(p);
        expect(stepFor(p, "given")!.formulas).toEqual(["∠FEG = ∠IHJ", "∠IHJ = 40°"]);
    });
});

describe("goal slice", () => {
    it("keeps only the steps the goal depends on, premises first", () => {
        const { p, A, B, C } = rightTriangle();
        // прямой угол задан через величину: треугольник распознаётся теоремой
        p.setAngle(p.getAngle(A.id, B.id, C.id)!, 90);
        p.setLength(p.getSegment(A.id, B.id)!, 4);
        p.setLength(p.getSegment(A.id, C.id)!, 3);
        p.setGoal({ kind: "length", segment: p.getSegment(B.id, C.id)! });
        solve(p);
        const theorems = solutionSteps(p).map(s => s.theorem);
        expect(theorems).toContain("pythagoras");
        // перпендикулярность выводится, но к длине BC не ведёт
        expect(theorems).not.toContain("perpendicular_from_angle");
        // основание идёт раньше вывода, который на него опирается
        expect(theorems.indexOf("right_triangle_from_angle"))
            .toBeLessThan(theorems.indexOf("pythagoras"));
    });
});
