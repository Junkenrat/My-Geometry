import type { Condition } from "./conditions";
import type { Problem } from "./problem";
import type { Point, Segment } from "./types";

// User-typed statements about segments:
//   AB = 5        length
//   AB = CD       equal segments
//   AB / CD = 2   ratio of lengths
//   AB ⊥ CD       perpendicular
//   AB ∥ CD       parallel
//
// The input is re-parsed from scratch on every change. The same grammar walk
// both parses the completed tokens and produces the suggestion list for the
// next slot, so the dropdown and the keyboard syntax can never disagree.
// The unfinished tail of the input is not an error: it filters the
// suggestions, and if it already matches a valid token exactly it is consumed
// as if confirmed.

export interface Suggestion {
    label: string;       // shown in the dropdown: "∥ …", "CD"
    hint: string | null; // extra explanation: "parallel"
    apply: string;       // the whole input text after picking this suggestion
    completes: boolean;  // picking it makes the statement complete
}

export type ExpectedSlot =
    | "segment"          // a segment name
    | "relation"         // =, /, ⊥ or ∥
    | "segment-or-value" // right side of "=": a segment or a number
    | "equals"           // the "=" of a ratio
    | "value"            // a number
    | "done";            // the statement is complete

export interface StatementInput {
    canonical: string;            // normalized consumed prefix: "AB ⊥ CD"
    partial: string;              // unfinished tail filtering the suggestions
    expected: ExpectedSlot;
    suggestions: Suggestion[];
    condition: Condition | null;  // set iff the input is a complete statement
    error: string | null;
}

type Op = "⊥" | "∥" | "=" | "/";

interface Token {
    readonly text: string; // raw lexeme as typed
    readonly kind: "letters" | "number" | "op";
    readonly op?: Op;
    readonly value?: number;
}

// Keyboard-friendly spellings of the relation symbols
const WORD_OPS: Record<string, Op> = {
    perp: "⊥", perpendicular: "⊥",
    par: "∥", parallel: "∥",
};

const RELATION_SUGGESTIONS: { op: Op; label: string; hint: string; typed: string[] }[] = [
    { op: "=", label: "= …", hint: "length or equal segment", typed: ["="] },
    { op: "/", label: "/ … = …", hint: "ratio", typed: ["/"] },
    { op: "⊥", label: "⊥ …", hint: "perpendicular", typed: ["⊥", "_|_", "perp", "perpendicular"] },
    { op: "∥", label: "∥ …", hint: "parallel", typed: ["∥", "||", "par", "parallel"] },
];

// Tokens the lexer recognizes; anything it cannot match becomes the tail —
// an unfinished token like "_|" that only filters suggestions.
function tokenize(text: string): { tokens: Token[]; tail: string } {
    const tokens: Token[] = [];
    let pos = 0;
    while (pos < text.length) {
        const rest = text.slice(pos);
        const space = rest.match(/^\s+/);
        if (space !== null) {
            pos += space[0].length;
            continue;
        }
        const letters = rest.match(/^[A-Za-z]+/);
        if (letters !== null) {
            const word = letters[0];
            const op = WORD_OPS[word.toLowerCase()];
            tokens.push(op !== undefined
                ? { text: word, kind: "op", op }
                : { text: word, kind: "letters" });
            pos += word.length;
            continue;
        }
        const number = rest.match(/^\d+\.?\d*/);
        if (number !== null) {
            tokens.push({ text: number[0], kind: "number", value: Number(number[0]) });
            pos += number[0].length;
            continue;
        }
        const symbol = rest.match(/^(_\|_|\|\||[⊥∥=/])/);
        if (symbol !== null) {
            const op = (symbol[0] === "_|_" ? "⊥" : symbol[0] === "||" ? "∥" : symbol[0]) as Op;
            tokens.push({ text: symbol[0], kind: "op", op });
            pos += symbol[0].length;
            continue;
        }
        return { tokens, tail: rest };
    }
    return { tokens, tail: "" };
}

interface ParseData {
    seg1?: Segment;
    op?: Op;
    seg2?: Segment;
    value?: number;
    eqSeen?: boolean; // the "=" of a ratio has been consumed
}

function expectedSlot(parse: ParseData): ExpectedSlot {
    if (parse.seg1 === undefined) return "segment";
    if (parse.op === undefined) return "relation";
    if (parse.op === "=") {
        return parse.seg2 !== undefined || parse.value !== undefined ? "done" : "segment-or-value";
    }
    if (parse.op === "⊥" || parse.op === "∥") {
        return parse.seg2 === undefined ? "segment" : "done";
    }
    // ratio: seg / seg = value
    if (parse.seg2 === undefined) return "segment";
    if (parse.eqSeen !== true) return "equals";
    return parse.value === undefined ? "value" : "done";
}

function resolveSegment(problem: Problem, name: string): Segment | undefined {
    if (name.length !== 2) return undefined;
    const found: Point[] = [];
    for (const letter of name.toUpperCase()) {
        for (const point of problem.points.values()) {
            if (point.label === letter) {
                found.push(point);
                break;
            }
        }
    }
    if (found.length !== 2 || found[0] === undefined || found[1] === undefined) return undefined;
    return problem.getSegment(found[0].id, found[1].id);
}

// Consumes one token into the parse; pushes its canonical spelling into parts.
// Returns an error message, or null on success.
function consume(problem: Problem, parse: ParseData, token: Token, parts: string[]): string | null {
    const expected = expectedSlot(parse);
    switch (expected) {
        case "segment":
        case "segment-or-value": {
            if (token.kind === "number" && expected === "segment-or-value") {
                if (token.value === undefined || token.value <= 0) return "Length must be positive";
                parse.value = token.value;
                parts.push(token.text);
                return null;
            }
            if (token.kind !== "letters") return `Expected a segment, got "${token.text}"`;
            const segment = resolveSegment(problem, token.text);
            if (segment === undefined) return `Unknown segment "${token.text.toUpperCase()}"`;
            if (parse.seg1 === undefined) {
                parse.seg1 = segment;
            } else {
                if (segment === parse.seg1) return "Both sides refer to the same segment";
                parse.seg2 = segment;
            }
            parts.push(token.text.toUpperCase());
            return null;
        }
        case "relation": {
            if (token.kind !== "op" || token.op === undefined) {
                return `Expected =, /, ⊥ or ∥, got "${token.text}"`;
            }
            parse.op = token.op;
            parts.push(token.op);
            return null;
        }
        case "equals": {
            if (token.kind !== "op" || token.op !== "=") return `Expected "=", got "${token.text}"`;
            parse.eqSeen = true;
            parts.push("=");
            return null;
        }
        case "value": {
            if (token.kind !== "number") return `Expected a number, got "${token.text}"`;
            if (token.value === undefined || token.value <= 0) return "Ratio must be positive";
            parse.value = token.value;
            parts.push(token.text);
            return null;
        }
        case "done":
            return `Unexpected "${token.text}"`;
    }
}

function buildCondition(parse: ParseData): Condition {
    const seg1 = parse.seg1;
    if (seg1 === undefined) throw new Error("buildCondition called on an incomplete parse");
    if (parse.op === "⊥" || parse.op === "∥") {
        if (parse.seg2 === undefined) throw new Error("buildCondition called on an incomplete parse");
        return {
            kind: "fact",
            fact: { kind: parse.op === "⊥" ? "perpendicular" : "parallel",
                seg1, seg2: parse.seg2, reason: { kind: "given" } },
        };
    }
    if (parse.op === "=") {
        if (parse.seg2 !== undefined) {
            return { kind: "equation", equation: { kind: "segments_equal", a: seg1, b: parse.seg2 } };
        }
        if (parse.value === undefined) throw new Error("buildCondition called on an incomplete parse");
        return { kind: "value", target: { kind: "length", segment: seg1, value: parse.value } };
    }
    if (parse.seg2 === undefined || parse.value === undefined) {
        throw new Error("buildCondition called on an incomplete parse");
    }
    return { kind: "equation", equation: { kind: "segments_ratio", a: seg1, b: parse.seg2, value: parse.value } };
}

function suggest(
    problem: Problem,
    parse: ParseData,
    expected: ExpectedSlot,
    partial: string,
    parts: string[],
): Suggestion[] {
    const prefix = parts.length > 0 ? parts.join(" ") + " " : "";
    if (expected === "segment" || expected === "segment-or-value") {
        const isSecond = parse.seg1 !== undefined;
        // Picking the second segment of ⊥, ∥ or = finishes the statement;
        // in a ratio the "= value" part is still ahead.
        const completes = isSecond && parse.op !== "/";
        const filter = partial.toUpperCase();
        const result: Suggestion[] = [];
        for (const segment of problem.segments.values()) {
            // Segments with unnamed endpoints cannot be referred to by text
            if (segment.p1.label === null || segment.p2.label === null) continue;
            if (isSecond && segment === parse.seg1) continue;
            const forward = segment.p1.label + segment.p2.label;
            const backward = segment.p2.label + segment.p1.label;
            const name = forward.startsWith(filter) ? forward
                : backward.startsWith(filter) ? backward : null;
            if (name === null) continue;
            result.push({
                label: name,
                hint: null,
                apply: prefix + name + (completes ? "" : " "),
                completes,
            });
        }
        return result;
    }
    if (expected === "relation") {
        const filter = partial.toLowerCase();
        return RELATION_SUGGESTIONS
            .filter(r => r.typed.some(t => t.startsWith(filter)))
            .map(r => ({
                label: r.label,
                hint: r.hint,
                apply: prefix + r.op + " ",
                completes: false,
            }));
    }
    if (expected === "equals") {
        if (partial !== "" && !"=".startsWith(partial)) return [];
        return [{ label: "= …", hint: null, apply: prefix + "= ", completes: false }];
    }
    return []; // "value" is typed by hand, "done" needs nothing
}

export function parseStatementInput(problem: Problem, text: string): StatementInput {
    const { tokens, tail } = tokenize(text);
    // Without a trailing space the last token may still be typed further:
    // it is a partial, but if it is already a valid token it gets consumed.
    let partialToken: Token | null = null;
    if (tail === "" && !/\s$/.test(text) && tokens.length > 0) {
        partialToken = tokens.pop() ?? null;
    }

    const parse: ParseData = {};
    const parts: string[] = [];
    for (const token of tokens) {
        const error = consume(problem, parse, token, parts);
        if (error !== null) {
            return { canonical: parts.join(" "), partial: "", expected: expectedSlot(parse),
                suggestions: [], condition: null, error };
        }
    }

    let partial = tail;
    let retryError: string | null = null;
    if (partialToken !== null) {
        const attempt: ParseData = { ...parse };
        const attemptParts = [...parts];
        retryError = consume(problem, attempt, partialToken, attemptParts);
        if (retryError === null) {
            Object.assign(parse, attempt);
            parts.length = 0;
            parts.push(...attemptParts);
        } else {
            partial = partialToken.text;
        }
    }

    const canonical = parts.join(" ");
    const expected = expectedSlot(parse);
    if (expected === "done") {
        if (partial !== "") {
            return { canonical, partial, expected, suggestions: [], condition: null,
                error: `Unexpected "${partial}"` };
        }
        return { canonical, partial: "", expected, suggestions: [],
            condition: buildCondition(parse), error: null };
    }

    const suggestions = suggest(problem, parse, expected, partial, parts);
    // A partial nobody can complete is an error; prefer the message from the
    // exact-match attempt ("Ratio must be positive" beats "cannot complete").
    const error = partial !== "" && suggestions.length === 0
        ? retryError ?? `Cannot complete "${partial}"`
        : null;
    return { canonical, partial, expected, suggestions, condition: null, error };
}
