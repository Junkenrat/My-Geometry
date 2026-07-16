import { describe, it, expect } from "vitest";
import { Problem } from "../problem";
import { parseStatementInput } from "../statements";

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
        expect(state.expected).toBe("segment");
        expect(state.suggestions.map(s => s.label)).toEqual(["AB", "CD"]); // AE has an unnamed endpoint
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
        expect(state.expected).toBe("segment-or-value");
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

describe("errors", () => {
    it("unknown segment", () => {
        const { p } = makeProblem();
        expect(parseStatementInput(p, "XY ").error).toContain("XY");
    });

    it("the same segment on both sides", () => {
        const { p } = makeProblem();
        expect(parseStatementInput(p, "AB ⊥ AB").error).toContain("same segment");
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
