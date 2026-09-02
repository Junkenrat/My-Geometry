import type { AnglePoints, Condition, TriangleProperty } from "./conditions";
import type { Goal } from "./facts";
import type { Problem } from "./problem";
import type { Point, Segment } from "./types";

// User-typed statements about segments, angles and triangles:
//   AB = 5              length
//   AB = CD             equal segments
//   AB / CD = 2         ratio of lengths
//   AB ⊥ CD             perpendicular
//   AB ∥ CD             parallel
//   ∠ABC = 60           angle value
//   ∠ABC = ∠DEF         equal angles
//   △ABC right B        right triangle (right angle at B)
//   △ABC equilateral    equilateral
//   △ABC obtuse         obtuse (inert)
//   △ABC acute          acute (inert)
//
// A three-letter object is both an angle and (if its points close a triangle)
// a triangle. The ambiguity is resolved by the relation: "=" reads it as an
// angle, a triangle predicate reads it as a triangle.
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
    | "object"
    | "relation"         // =, /, ⊥, ∥ or a triangle predicate
    | "object-or-value" // right side of "=": an object or a number
    | "equals"           // the "=" of a ratio
    | "value"            // a number
    | "vertex"           // a triangle vertex (right)
    | "done";            // the statement is complete

type TriPred = "right" | "equilateral" | "obtuse" | "acute";

const TRIANGLE_PREDICATES: { pred: TriPred; hint: string; needsVertex: boolean }[] = [
    { pred: "right", hint: "right triangle", needsVertex: true },
    { pred: "equilateral", hint: "equilateral triangle", needsVertex: false },
    { pred: "obtuse", hint: "obtuse triangle (inert)", needsVertex: false },
    { pred: "acute", hint: "acute triangle (inert)", needsVertex: false },
];

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
        // ∠ and △ are only cosmetic: they appear in normalized text and in
        // applied suggestions. The name lives in the letters that follow.
        if (rest[0] === "∠" || rest[0] === "△") {
            pos += 1;
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
// An angle candidate carried through the parse as three points. Identical in
// shape to AnglePoints, so it drops straight into a Condition without a
// materialized Angle (the parser must not mutate the drawing).
type AngleRef = AnglePoints;
type ObjRef = { kind: "Segment", object: Segment } |
    { kind: "Angle", object: AngleRef };

interface ParseData {
    obj1?: ObjRef
    op?: Op;
    obj2?: ObjRef;
    value?: number;
    eqSeen?: boolean; // the "=" of a ratio has been consumed
    tri?: TriPred;    // a triangle predicate was chosen instead of a relation
    vertex?: Point;   // the right-angle vertex of a right triangle
}

function objType(obj: ObjRef): "Segment" | "Angle" {
    return obj.kind;
}

// The three points of a 3-letter object, in case it is read as a triangle.
function trianglePointsOf(obj: ObjRef | undefined): { p1: Point; p2: Point; p3: Point } | null {
    if (obj?.kind !== "Angle") return null;
    return { p1: obj.object.vertex, p2: obj.object.thr1, p3: obj.object.thr2 };
}

// True when a 3-letter object's points close a triangle on the drawing, so
// triangle predicates may be offered next to the angle's "=".
function formsTriangle(problem: Problem, obj: ObjRef | undefined): boolean {
    const t = trianglePointsOf(obj);
    return t !== null && problem.getTriangle(t.p1.id, t.p2.id, t.p3.id) !== undefined;
}

function sameAngleRef(a: AngleRef, b: AngleRef): boolean {
    // resolveAngle / angleCandidates canonicalize arm order, and points are
    // cached in problem.points, so reference equality is enough.
    return a.vertex === b.vertex && a.thr1 === b.thr1 && a.thr2 === b.thr2;
}

function sameObject(a: ObjRef, b: ObjRef): boolean {
    if (a.kind === "Segment" && b.kind === "Segment") return a.object === b.object;
    if (a.kind === "Angle" && b.kind === "Angle") return sameAngleRef(a.object, b.object);
    return false;
}

// Human-readable canonical name for the parts/canonical string.
function objName(obj: ObjRef, typed: string): string {
    return obj.kind === "Angle" ? "∠" + typed.toUpperCase() : typed.toUpperCase();
}

// Every angle visible on the drawing: for each labelled vertex, all pairs of
// its arms (neighbours reachable by a segment or ray). Generated on the fly,
// so an angle the user can see is offered even if no theorem has created it in
// problem.angles yet.
function angleCandidates(problem: Problem): AngleRef[] {
    const arms = new Map<string, Set<Point>>();
    const addArm = (v: Point, a: Point) => {
        if (v === a || v.label === null || a.label === null) return;
        (arms.get(v.id) ?? arms.set(v.id, new Set()).get(v.id)!).add(a);
    };
    for (const seg of problem.segments.values()) {
        addArm(seg.p1, seg.p2);
        addArm(seg.p2, seg.p1);
    }
    for (const ray of problem.rays.values()) {
        addArm(ray.start, ray.through);
    }
    const result: AngleRef[] = [];
    for (const [vid, set] of arms) {
        const vertex = problem.points.get(vid);
        if (vertex === undefined) continue;
        const list = [...set];
        for (let i = 0; i < list.length; i++) {
            for (let j = i + 1; j < list.length; j++) {
                let a = list[i]!, b = list[j]!;
                if (b.id < a.id) [a, b] = [b, a]; // determinism by id
                result.push({ vertex, thr1: a, thr2: b });
            }
        }
    }
    return result;
}

function expectedType(parse: ParseData): "Segment" | "Angle" | "Any" {
    if (parse.obj1 === undefined) return "Any";
    return objType(parse.obj1);
}

function expectedSlot(parse: ParseData): ExpectedSlot {
    if (parse.obj1 === undefined) return "object"
    // A triangle predicate takes over from the relation: "right" still needs
    // its vertex, the others are already complete.
    if (parse.tri !== undefined) {
        const needsVertex = parse.tri === "right";
        return needsVertex && parse.vertex === undefined ? "vertex" : "done";
    }
    if (parse.op === undefined) return "relation";
    if (parse.op === "=") {
        return parse.obj2 !== undefined || parse.value !== undefined ? "done" : "object-or-value";
    }
    if (parse.op === "⊥" || parse.op === "∥") {
        return parse.obj2 === undefined ? "object" : "done";
    }
    // ratio: seg / seg = value
    if (parse.obj2 === undefined) return "object";
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

function resolveAngle(problem: Problem, name: string): AngleRef | undefined {
    const upper = name.toUpperCase();
    const found: Point[] = [];
    if (name.length !== 3 || new Set(upper).size !== upper.length) return undefined;
    for (let i = 0; i < upper.length; i++) {
        for (const point of problem.points.values()) {
            if (point.label === upper[i]) {
                found[i] = point;
                break;
            }
        }
    }
    if (found[0] === undefined || found[1] === undefined || found[2] === undefined) {
        return undefined;
    }
    // Проверяем, построены ли плечи угла: отрезок или луч вершина-точка.
    // Если нет — ошибка. В будущем сделать достройку
    const vertex = found[1];
    const armExists = (arm: Point) =>
        problem.getSegment(vertex.id, arm.id) !== undefined || problem.getRay(vertex.id, arm.id) !== undefined;
    if (!armExists(found[0]) || !armExists(found[2])) {
        return undefined;
    }
    if (found[2].id < found[0].id) [found[2], found[0]] = [found[0], found[2]]; // Детерминизм по id
    return { vertex: found[1], thr1: found[0], thr2: found[2] };
}

// Consumes one token into the parse; pushes its canonical spelling into parts.
// Returns an error message, or null on success.
function consume(problem: Problem, parse: ParseData, token: Token, parts: string[]): string | null {
    const expected = expectedSlot(parse);
    switch (expected) {
        case "object":
        case "object-or-value": {
            if (token.kind === "number") {
                if (expected !== "object-or-value" || parse.obj1 === undefined) {
                    return `Expected an object, got "${token.text}"`;
                }
                if (token.value === undefined) return `Expected a number, got "${token.text}"`;
                const t = objType(parse.obj1);
                if (t === "Segment" && token.value <= 0) return "Length must be positive";
                if (t === "Angle" && (token.value <= 0 || token.value > 180)) {
                    return "Angle must be between 0 and 180";
                }
                parse.value = token.value;
                parts.push(token.text);
                return null;
            }
            if (token.kind !== "letters") return `Expected an object, got "${token.text}"`;
            // Resolve by token length: 2 letters = segment, 3 = angle. The type
            // is not forced by the left operand — that lets a mismatched right
            // operand ("AB = ∠DEF") produce a clear "cannot compare" message.
            let obj: ObjRef | undefined;
            if (token.text.length === 2) {
                const seg = resolveSegment(problem, token.text);
                if (seg !== undefined) obj = { kind: "Segment", object: seg };
            } else if (token.text.length === 3) {
                const ang = resolveAngle(problem, token.text);
                if (ang !== undefined) obj = { kind: "Angle", object: ang };
            }
            if (obj === undefined) {
                const noun = token.text.length === 3 ? "angle" : token.text.length === 2 ? "segment" : "object";
                return `Unknown ${noun} "${token.text.toUpperCase()}"`;
            }
            if (parse.obj1 === undefined) {
                parse.obj1 = obj;
            } else {
                if (objType(obj) !== objType(parse.obj1)) return "Cannot compare a length and an angle";
                if (sameObject(obj, parse.obj1)) return "Both sides refer to the same object";
                parse.obj2 = obj;
            }
            parts.push(objName(obj, token.text));
            return null;
        }
        case "relation": {
            // A triangle predicate (a plain word) reinterprets the 3-letter
            // object as a triangle instead of an angle.
            if (token.kind === "letters") {
                const pred = TRIANGLE_PREDICATES.find(p => p.pred === token.text.toLowerCase());
                if (pred !== undefined && formsTriangle(problem, parse.obj1)) {
                    parse.tri = pred.pred;
                    // the object's canonical name switches ∠ -> △
                    if (parts.length > 0) parts[parts.length - 1] = parts[parts.length - 1]!.replace("∠", "△");
                    parts.push(pred.pred);
                    return null;
                }
                return parse.obj1?.kind === "Angle"
                    ? `Expected a relation or triangle property, got "${token.text}"`
                    : `Expected =, /, ⊥ or ∥, got "${token.text}"`;
            }
            if (token.kind !== "op" || token.op === undefined) {
                return `Expected =, /, ⊥ or ∥, got "${token.text}"`;
            }
            parse.op = token.op;
            parts.push(token.op);
            return null;
        }
        case "vertex": {
            if (token.kind !== "letters" || token.text.length !== 1) {
                return `Expected a triangle vertex, got "${token.text}"`;
            }
            const tri = trianglePointsOf(parse.obj1);
            if (tri === null) return "No triangle";
            const label = token.text.toUpperCase();
            const v = [tri.p1, tri.p2, tri.p3].find(p => p.label === label);
            if (v === undefined) return `"${label}" is not a vertex of the triangle`;
            parse.vertex = v;
            parts.push(label);
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

function incomplete(): never {
    throw new Error("buildCondition called on an incomplete parse");
}

function asSegment(obj: ObjRef): Segment {
    if (obj.kind !== "Segment") throw new Error("expected a segment operand");
    return obj.object;
}

function buildCondition(parse: ParseData): Condition {
    const obj1 = parse.obj1;
    if (obj1 === undefined) incomplete();

    // A triangle predicate: read obj1's three points as a triangle.
    if (parse.tri !== undefined) {
        const tri = trianglePointsOf(obj1);
        if (tri === null) incomplete();
        let property: TriangleProperty;
        if (parse.tri === "right") {
            if (parse.vertex === undefined) incomplete();
            property = { kind: "right", vertex: parse.vertex };
        } else {
            property = { kind: parse.tri };
        }
        return { kind: "triangle", triangle: tri, property };
    }

    // ⊥ / ∥ — segments only (consume never lets an angle reach here).
    if (parse.op === "⊥" || parse.op === "∥") {
        if (parse.obj2 === undefined) incomplete();
        return {
            kind: "fact",
            fact: { kind: parse.op === "⊥" ? "perpendicular" : "parallel",
                seg1: asSegment(obj1), seg2: asSegment(parse.obj2), reason: { kind: "given" } },
        };
    }

    if (parse.op === "=") {
        // Right operand is an object -> equality (segments or angles).
        if (parse.obj2 !== undefined) {
            if (obj1.kind === "Angle" && parse.obj2.kind === "Angle") {
                return { kind: "equation",
                    equation: { kind: "angles_equal", a: obj1.object, b: parse.obj2.object } };
            }
            return { kind: "equation",
                equation: { kind: "segments_equal", a: asSegment(obj1), b: asSegment(parse.obj2) } };
        }
        // Right operand is a number -> value (length or angle measure).
        if (parse.value === undefined) incomplete();
        if (obj1.kind === "Angle") {
            return { kind: "angle_value", angle: obj1.object, value: parse.value };
        }
        return { kind: "value", target: { kind: "length", segment: obj1.object, value: parse.value } };
    }

    // ratio — segments only.
    if (parse.obj2 === undefined || parse.value === undefined) incomplete();
    return { kind: "equation",
        equation: { kind: "segments_ratio", a: asSegment(obj1), b: asSegment(parse.obj2), value: parse.value } };
}

function suggest(
    problem: Problem,
    parse: ParseData,
    expected: ExpectedSlot,
    partial: string,
    parts: string[],
): Suggestion[] {
    const prefix = parts.length > 0 ? parts.join(" ") + " " : "";
    if (expected === "object" || expected === "object-or-value") {
        const want = expectedType(parse);
        const isSecond = parse.obj1 !== undefined;
        // Picking the second operand of ⊥, ∥ or = finishes the statement;
        // in a ratio the "= value" part is still ahead.
        const completes = isSecond && parse.op !== "/";
        const filter = partial.toUpperCase();
        const result: Suggestion[] = [];
        const push = (name: string) => result.push({
            label: name,
            hint: null,
            apply: prefix + name + (completes ? "" : " "),
            completes,
        });
        // Best name for a two-orientation object: the one matching the filter.
        const match = (a: string, b: string): string | null =>
            a.startsWith(filter) ? a : b.startsWith(filter) ? b : null;

        if (want === "Segment" || want === "Any") {
            for (const segment of problem.segments.values()) {
                // Segments with unnamed endpoints cannot be referred to by text
                if (segment.p1.label === null || segment.p2.label === null) continue;
                if (isSecond && parse.obj1!.kind === "Segment" && segment === parse.obj1!.object) continue;
                const name = match(segment.p1.label + segment.p2.label, segment.p2.label + segment.p1.label);
                if (name !== null) push(name);
            }
        }
        if (want === "Angle" || want === "Any") {
            for (const angle of angleCandidates(problem)) {
                if (isSecond && parse.obj1!.kind === "Angle" && sameAngleRef(angle, parse.obj1!.object)) continue;
                const v = angle.vertex.label, a = angle.thr1.label, b = angle.thr2.label;
                if (v === null || a === null || b === null) continue;
                const core = match(a + v + b, b + v + a);
                if (core !== null) push("∠" + core);
            }
        }
        return result;
    }
    if (expected === "relation") {
        // ⊥, ∥ and ratio apply to segments only; an angle offers just "=".
        const forAngle = parse.obj1?.kind === "Angle";
        const filter = partial.toLowerCase();
        const relations: Suggestion[] = RELATION_SUGGESTIONS
            .filter(r => !forAngle || r.op === "=")
            .filter(r => r.typed.some(t => t.startsWith(filter)))
            .map(r => ({
                label: r.label,
                hint: r.op === "=" && forAngle ? "value or equal angle" : r.hint,
                apply: prefix + r.op + " ",
                completes: false,
            }));
        // When the object also closes a triangle, offer the triangle predicates.
        const predicates: Suggestion[] = [];
        if (formsTriangle(problem, parse.obj1)) {
            const triPrefix = prefix.replace("∠", "△");
            for (const p of TRIANGLE_PREDICATES) {
                if (!p.pred.startsWith(filter)) continue;
                predicates.push({
                    label: p.pred,
                    hint: p.hint,
                    apply: triPrefix + p.pred + (p.needsVertex ? " " : ""),
                    completes: !p.needsVertex,
                });
            }
        }
        return [...relations, ...predicates];
    }
    if (expected === "vertex") {
        const tri = trianglePointsOf(parse.obj1);
        if (tri === null) return [];
        const filter = partial.toUpperCase();
        const seen = new Set<string>();
        const result: Suggestion[] = [];
        for (const v of [tri.p1, tri.p2, tri.p3]) {
            if (v.label === null || !v.label.startsWith(filter) || seen.has(v.label)) continue;
            seen.add(v.label);
            result.push({ label: v.label, hint: null, apply: prefix + v.label, completes: true });
        }
        return result;
    }
    if (expected === "equals") {
        if (partial !== "" && !"=".startsWith(partial)) return [];
        return [{ label: "= …", hint: null, apply: prefix + "= ", completes: false }];
    }
    return []; // "value" is typed by hand, "done" needs nothing
}

// Shared walk over the grammar: consume what is complete, keep the unfinished
// tail as a filter, compute the next slot and its suggestions. Both the
// condition box and the goal box start from this.
interface Analysis {
    parse: ParseData;
    canonical: string;
    partial: string;
    expected: ExpectedSlot;
    suggestions: Suggestion[];
    error: string | null;
    complete: boolean; // the whole input is a finished statement
}

function analyze(problem: Problem, text: string): Analysis {
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
            return { parse, canonical: parts.join(" "), partial: "", expected: expectedSlot(parse),
                suggestions: [], error, complete: false };
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
            return { parse, canonical, partial, expected, suggestions: [], complete: false,
                error: `Unexpected "${partial}"` };
        }
        return { parse, canonical, partial: "", expected, suggestions: [], error: null, complete: true };
    }

    const suggestions = suggest(problem, parse, expected, partial, parts);
    // A partial nobody can complete is an error; prefer the message from the
    // exact-match attempt ("Ratio must be positive" beats "cannot complete").
    const error = partial !== "" && suggestions.length === 0
        ? retryError ?? `Cannot complete "${partial}"`
        : null;
    return { parse, canonical, partial, expected, suggestions, error, complete: false };
}

export function parseStatementInput(problem: Problem, text: string): StatementInput {
    const a = analyze(problem, text);
    return { canonical: a.canonical, partial: a.partial, expected: a.expected,
        suggestions: a.suggestions, error: a.error,
        condition: a.complete ? buildCondition(a.parse) : null };
}

// The goal box reads the same grammar two ways: a lone object means "find its
// measure" (the relation list stays open to turn it into a proof instead), a
// full statement means "prove it".
export interface GoalInput {
    canonical: string;
    partial: string;
    expected: ExpectedSlot;
    suggestions: Suggestion[];
    goal: Goal | null;   // set iff the input is a complete goal
    error: string | null;
}

export function parseGoalInput(problem: Problem, text: string): GoalInput {
    const a = analyze(problem, text);
    let goal: Goal | null = null;
    if (a.complete) {
        goal = { kind: "prove", condition: buildCondition(a.parse) };
    } else if (a.expected === "relation" && a.partial === "" && a.error === null) {
        const obj = a.parse.obj1;
        if (obj?.kind === "Segment") goal = { kind: "length", segment: obj.object };
        else if (obj?.kind === "Angle") goal = { kind: "angle", angle: obj.object };
    }
    return { canonical: a.canonical, partial: a.partial, expected: a.expected,
        suggestions: a.suggestions, goal, error: a.error };
}
