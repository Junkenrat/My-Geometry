import { describe, it, expect } from "vitest";
import { Problem } from "../problem";
import { parseGoalInput, parseStatementInput } from "../statements";

// The statement input: one grammar walk both parses typed text and produces
// the suggestion list, so picking from the dropdown and typing the syntax
// must always agree.

// A, B, C, D named; E unnamed. Segments: AB, CD, AE.
function makeProblem() {
    const p = new Problem();
    const A = p.addPoint(0, 0);
    const B = p.addPoint(90, 0);
    const C = p.addPoint(0, 90);
    const D = p.addPoint(150, 90);
    const E = p.addPoint(300, 300);
    p.renamePoint(A.id, "A");
    p.renamePoint(B.id, "B");
    p.renamePoint(C.id, "C");
    p.renamePoint(D.id, "D");
    p.addSegment(A.id, B.id);
    p.addSegment(C.id, D.id);
    p.addSegment(A.id, E.id);
    const AB = p.getSegment(A.id, B.id)!;
    const CD = p.getSegment(C.id, D.id)!;
    return { p, AB, CD };
}

describe("suggestions", () => {
    it("empty input suggests named segments only", () => {
        const { p } = makeProblem();
        const state = parseStatementInput(p, "");
        expect(state.expected).toBe("object");
        // no angles yet (no shared vertex with two arms); AE has an unnamed endpoint
        expect(state.suggestions.map(s => s.label)).toEqual(["AB", "CD"]);
        expect(state.condition).toBeNull();
        expect(state.error).toBeNull();
    });

    it("a partial letter filters segments, in either orientation", () => {
        const { p } = makeProblem();
        expect(parseStatementInput(p, "c").suggestions.map(s => s.label)).toEqual(["CD"]);
        expect(parseStatementInput(p, "b").suggestions.map(s => s.label)).toEqual(["BA"]);
    });

    it("a complete segment name opens the relation list", () => {
        const { p } = makeProblem();
        const state = parseStatementInput(p, "AB");
        expect(state.expected).toBe("relation");
        expect(state.suggestions.map(s => s.hint)).toEqual([
            "length or equal segment", "ratio", "perpendicular", "parallel",
        ]);
    });

    it("a partial word filters relations by their typed aliases", () => {
        const { p } = makeProblem();
        expect(parseStatementInput(p, "AB p").suggestions.map(s => s.label)).toEqual(["⊥ …", "∥ …"]);
        expect(parseStatementInput(p, "AB pe").suggestions.map(s => s.label)).toEqual(["⊥ …"]);
        expect(parseStatementInput(p, "AB |").suggestions.map(s => s.label)).toEqual(["∥ …"]);
        expect(parseStatementInput(p, "AB _|").suggestions.map(s => s.label)).toEqual(["⊥ …"]);
    });

    it("the second-segment slot excludes the first segment and marks completion", () => {
        const { p } = makeProblem();
        const state = parseStatementInput(p, "AB ⊥ ");
        expect(state.suggestions.map(s => s.label)).toEqual(["CD"]);
        expect(state.suggestions[0]!.completes).toBe(true);
        expect(state.suggestions[0]!.apply).toBe("AB ⊥ CD");
    });

    it("in a ratio the second segment does not complete the statement", () => {
        const { p } = makeProblem();
        const state = parseStatementInput(p, "AB / ");
        expect(state.suggestions[0]!.completes).toBe(false);
        expect(state.suggestions[0]!.apply).toBe("AB / CD ");
        const next = parseStatementInput(p, "AB / CD ");
        expect(next.expected).toBe("equals");
        expect(next.suggestions.map(s => s.apply)).toEqual(["AB / CD = "]);
    });

    it("after '=' both segments and hand-typed numbers are allowed", () => {
        const { p } = makeProblem();
        const state = parseStatementInput(p, "AB = ");
        expect(state.expected).toBe("object-or-value");
        expect(state.suggestions.map(s => s.label)).toEqual(["CD"]);
    });
});

describe("parsing complete statements", () => {
    it("perpendicularity, typed as a word and normalized", () => {
        const { p, AB, CD } = makeProblem();
        const state = parseStatementInput(p, "ab perp cd");
        expect(state.canonical).toBe("AB ⊥ CD");
        expect(state.error).toBeNull();
        expect(state.condition).toEqual({
            kind: "fact",
            fact: { kind: "perpendicular", seg1: AB, seg2: CD, reason: { kind: "given" } },
        });
    });

    it("symbol spellings: || and _|_", () => {
        const { p } = makeProblem();
        const par = parseStatementInput(p, "AB||CD");
        expect(par.condition).toMatchObject({ kind: "fact", fact: { kind: "parallel" } });
        const perp = parseStatementInput(p, "AB_|_CD");
        expect(perp.condition).toMatchObject({ kind: "fact", fact: { kind: "perpendicular" } });
    });

    it("segment names work in both orientations", () => {
        const { p, AB, CD } = makeProblem();
        const state = parseStatementInput(p, "ba par dc");
        expect(state.condition).toEqual({
            kind: "fact",
            fact: { kind: "parallel", seg1: AB, seg2: CD, reason: { kind: "given" } },
        });
    });

    it("length: AB = 5", () => {
        const { p, AB } = makeProblem();
        const state = parseStatementInput(p, "AB = 5");
        expect(state.condition).toEqual({
            kind: "value",
            target: { kind: "length", segment: AB, value: 5 },
        });
    });

    it("equal segments: AB = CD", () => {
        const { p, AB, CD } = makeProblem();
        const state = parseStatementInput(p, "AB = CD");
        expect(state.condition).toEqual({
            kind: "equation",
            equation: { kind: "segments_equal", a: AB, b: CD },
        });
    });

    it("ratio: AB / CD = 2.5", () => {
        const { p, AB, CD } = makeProblem();
        const state = parseStatementInput(p, "AB/CD=2.5");
        expect(state.canonical).toBe("AB / CD = 2.5");
        expect(state.condition).toEqual({
            kind: "equation",
            equation: { kind: "segments_ratio", a: AB, b: CD, value: 2.5 },
        });
    });
});

// A, B, C with segments AB and BC -> angle ∠ABC at B (never created in
// problem.angles, only reachable on the fly). D, E, F -> ∠DEF.
function makeAngleProblem() {
    const p = new Problem();
    const pts: Record<string, string> = {};
    const place = (label: string, x: number, y: number) => {
        const pt = p.addPoint(x, y);
        p.renamePoint(pt.id, label);
        pts[label] = pt.id;
    };
    place("A", 0, 0);
    place("B", 90, 0);
    place("C", 90, 90);
    place("D", 300, 0);
    place("E", 390, 0);
    place("F", 390, 90);
    p.addSegment(pts.A!, pts.B!);
    p.addSegment(pts.B!, pts.C!);
    p.addSegment(pts.D!, pts.E!);
    p.addSegment(pts.E!, pts.F!);
    return { p };
}

describe("angles", () => {
    it("offers an angle candidate that never entered problem.angles", () => {
        const { p } = makeAngleProblem();
        expect(p.angles.size).toBe(0); // nothing created it
        const labels = parseStatementInput(p, "").suggestions.map(s => s.label);
        expect(labels).toContain("∠ABC");
        expect(labels).toContain("∠DEF");
    });

    it("resolves an angle in both orientations to one condition", () => {
        const { p } = makeAngleProblem();
        const abc = parseStatementInput(p, "ABC = 60");
        const cba = parseStatementInput(p, "CBA = 60");
        expect(abc.canonical).toBe("∠ABC = 60");
        expect(abc.condition).not.toBeNull();
        expect(abc.condition).toEqual(cba.condition); // canonicalized arms
    });

    it("angle value builds an angle_value condition", () => {
        const { p } = makeAngleProblem();
        const state = parseStatementInput(p, "ABC = 60");
        expect(state.condition).toMatchObject({ kind: "angle_value", value: 60 });
    });

    it("equal angles build an angles_equal equation", () => {
        const { p } = makeAngleProblem();
        const state = parseStatementInput(p, "ABC = DEF");
        expect(state.canonical).toBe("∠ABC = ∠DEF");
        expect(state.condition).toMatchObject({
            kind: "equation", equation: { kind: "angles_equal" },
        });
    });

    it("the right operand inherits the angle type (no segments offered)", () => {
        const { p } = makeAngleProblem();
        const state = parseStatementInput(p, "ABC = ");
        expect(state.expected).toBe("object-or-value");
        expect(state.suggestions.every(s => s.label.startsWith("∠"))).toBe(true);
    });

    it("an angle offers only '=' as a relation", () => {
        const { p } = makeAngleProblem();
        const state = parseStatementInput(p, "ABC");
        expect(state.expected).toBe("relation");
        expect(state.suggestions.map(s => s.label)).toEqual(["= …"]);
    });

    it("rejects a value outside (0, 180]", () => {
        const { p } = makeAngleProblem();
        expect(parseStatementInput(p, "ABC = 0").error).toContain("between");
        expect(parseStatementInput(p, "ABC = 200").error).toContain("between");
        expect(parseStatementInput(p, "ABC = 90").error).toBeNull();
    });

    it("rejects a mix of a length and an angle", () => {
        const { p } = makeAngleProblem();
        expect(parseStatementInput(p, "AB = ABC").error).toContain("compare");
        expect(parseStatementInput(p, "ABC = AB").error).toContain("compare");
    });

    it("three points with no arms from the vertex are not an angle", () => {
        const { p } = makeAngleProblem();
        // A, C, D exist but share no vertex with two arms -> ∠ACD invalid
        expect(parseStatementInput(p, "ACD = 60").error).not.toBeNull();
    });
});

// Closed triangle ABC (all three sides) -> getTriangle succeeds, so triangle
// predicates are offered. The bare angle case reuses makeAngleProblem above.
function makeTriangleProblem() {
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
    return { p };
}

describe("triangles", () => {
    it("a closed triangle offers '=' plus the four predicates", () => {
        const { p } = makeTriangleProblem();
        const state = parseStatementInput(p, "ABC");
        expect(state.expected).toBe("relation");
        expect(state.suggestions.map(s => s.label)).toEqual([
            "= …", "right", "equilateral", "obtuse", "acute",
        ]);
    });

    it("an angle that does not close a triangle offers only '='", () => {
        const { p } = makeAngleProblem(); // AB, BC -> ∠ABC but no side CA
        const state = parseStatementInput(p, "ABC");
        expect(state.suggestions.map(s => s.label)).toEqual(["= …"]);
    });

    it("equilateral needs no vertex and is normalized with △", () => {
        const { p } = makeTriangleProblem();
        const state = parseStatementInput(p, "ABC equilateral");
        expect(state.canonical).toBe("△ABC equilateral");
        expect(state.condition).toMatchObject({
            kind: "triangle", property: { kind: "equilateral" },
        });
    });

    it("right needs a vertex; the vertex slot offers the triangle's corners", () => {
        const { p } = makeTriangleProblem();
        const mid = parseStatementInput(p, "ABC right ");
        expect(mid.expected).toBe("vertex");
        expect(mid.suggestions.map(s => s.label).sort()).toEqual(["A", "B", "C"]);
        expect(mid.condition).toBeNull();
        const done = parseStatementInput(p, "ABC right B");
        expect(done.canonical).toBe("△ABC right B");
        expect(done.condition).toMatchObject({
            kind: "triangle", property: { kind: "right" },
        });
        expect(done.condition?.kind === "triangle"
            && done.condition.property.kind === "right"
            && done.condition.property.vertex.label).toBe("B");
    });

    it("a partial predicate filters (eq -> equilateral)", () => {
        const { p } = makeTriangleProblem();
        expect(parseStatementInput(p, "ABC eq").suggestions.map(s => s.label)).toEqual(["equilateral"]);
    });

    it("rejects a vertex that is not a corner of the triangle", () => {
        const { p } = makeTriangleProblem();
        const D = p.addPoint(400, 400);
        p.renamePoint(D.id, "D");
        expect(parseStatementInput(p, "ABC right D").error).not.toBeNull();
    });

    it("the same three letters still parse as an angle before '='", () => {
        const { p } = makeTriangleProblem();
        const state = parseStatementInput(p, "ABC = 60");
        expect(state.condition).toMatchObject({ kind: "angle_value", value: 60 });
    });
});

describe("errors", () => {
    it("unknown segment", () => {
        const { p } = makeProblem();
        expect(parseStatementInput(p, "XY ").error).toContain("XY");
    });

    it("the same segment on both sides", () => {
        const { p } = makeProblem();
        expect(parseStatementInput(p, "AB ⊥ AB").error).toContain("same object");
    });

    it("non-positive values", () => {
        const { p } = makeProblem();
        expect(parseStatementInput(p, "AB = 0").error).toContain("positive");
        expect(parseStatementInput(p, "AB / CD = 0").error).toContain("positive");
    });

    it("garbage after a complete statement", () => {
        const { p } = makeProblem();
        expect(parseStatementInput(p, "AB = 5 CD").error).toContain("Unexpected");
    });

    it("an unfinished token nobody can complete", () => {
        const { p } = makeProblem();
        const state = parseStatementInput(p, "AB xq");
        expect(state.condition).toBeNull();
        expect(state.error).not.toBeNull();
    });
});

describe("goal input", () => {
    it("a lone segment is a find goal, with the relation list still open", () => {
        const { p, AB } = makeProblem();
        const state = parseGoalInput(p, "AB");
        expect(state.goal).toEqual({ kind: "length", segment: AB });
        expect(state.suggestions.length).toBeGreaterThan(0);
    });

    it("a lone angle is a find-angle goal", () => {
        const { p } = makeAngleProblem();
        expect(parseGoalInput(p, "ABC").goal).toMatchObject({ kind: "angle" });
    });

    it("a full statement is a prove goal", () => {
        const { p } = makeProblem();
        expect(parseGoalInput(p, "AB ⊥ CD").goal).toMatchObject({ kind: "prove", condition: { kind: "fact" } });
        expect(parseGoalInput(p, "AB = CD").goal).toMatchObject({ kind: "prove", condition: { kind: "equation" } });
    });

    it("a half-typed relation is not a goal yet", () => {
        const { p } = makeProblem();
        expect(parseGoalInput(p, "AB p").goal).toBeNull();
        expect(parseGoalInput(p, "AB ⊥ ").goal).toBeNull();
    });
});
