import { describe, it, expect } from "vitest";
import { Problem } from "../problem";
import { solve } from "../solve";
import { formatRelation } from "../format";
import { parseStatementInput } from "../statements";

// Углы при секущей. Конфигурация: две горизонтальные параллельные и наклонная
// секущая PQ. Точки на прямых лежат по обе стороны от секущей, поэтому
// встречаются оба случая — накрест лежащие и односторонние.
//
//   A ---- P ---- B      (y = 0,   P = 50)
//          \
//   C ------ Q ---- D    (y = 100, Q = 150)
function parallelPair() {
    const p = new Problem();
    const place = (label: string, x: number, y: number) => {
        const point = p.addPoint(x, y);
        p.renamePoint(point.id, label);
        return point;
    };
    const A = place("A", 0, 0);
    const P = place("P", 50, 0);
    const B = place("B", 200, 0);
    const C = place("C", 0, 100);
    const Q = place("Q", 150, 100);
    const D = place("D", 200, 100);
    p.addSegment(A.id, B.id);
    p.addSegment(C.id, D.id);
    p.addSegment(P.id, Q.id);
    const AB = p.getSegment(A.id, B.id)!;
    const CD = p.getSegment(C.id, D.id)!;
    return { p, A, B, C, D, P, Q, AB, CD };
}

function statedParallel(p: Problem, AB: ReturnType<Problem["getSegment"]>, CD: ReturnType<Problem["getSegment"]>) {
    p.addCondition({ kind: "fact",
        fact: { kind: "parallel", a: AB!, b: CD!, reason: { kind: "given" } } });
}

describe("parallelAngles", () => {
    it("alternate angles are equal, co-interior ones add up to 180", () => {
        const { p, A, C, D, P, Q, AB, CD } = parallelPair();
        statedParallel(p, AB, CD);
        p.setAngle(p.addAngle(P.id, A.id, Q.id), 50); // ∠APQ
        solve(p);
        // D лежит по другую сторону секущей, чем A -> накрест лежащие
        expect(p.quantities.value(p.angleId(p.getAngle(Q.id, D.id, P.id)!))).toBeCloseTo(50, 6);
        // C — по ту же сторону, что и A -> односторонние
        expect(p.quantities.value(p.angleId(p.getAngle(Q.id, C.id, P.id)!))).toBeCloseTo(130, 6);
    });

    it("works from the other line as well", () => {
        const { p, B, C, P, Q, AB, CD } = parallelPair();
        statedParallel(p, AB, CD);
        p.setAngle(p.addAngle(Q.id, C.id, P.id), 40); // ∠CQP
        solve(p);
        // B и C по разные стороны -> накрест лежащие
        expect(p.quantities.value(p.angleId(p.getAngle(P.id, B.id, Q.id)!))).toBeCloseTo(40, 6);
    });

    it("derives nothing until the segments are stated parallel", () => {
        const { p, A, D, P, Q } = parallelPair();
        p.setAngle(p.addAngle(P.id, A.id, Q.id), 50);
        solve(p);
        expect(p.quantities.value(p.angleId(p.getAngle(Q.id, D.id, P.id)!))).toBeNull();
    });

    it("a transversal parallel to the lines forms no angles", () => {
        const { p, A, B, C, D, AB, CD } = parallelPair();
        statedParallel(p, AB, CD);
        // отрезок вдоль первой прямой секущей не является
        p.addSegment(A.id, B.id);
        solve(p);
        expect(p.quantities.conflicts).toHaveLength(0);
        expect(p.getAngle(A.id, B.id, C.id)).toBeUndefined();
        expect(p.getAngle(C.id, D.id, A.id)).toBeUndefined();
    });

    it("the step is explained by the parallel fact", () => {
        const { p, A, P, Q, AB, CD } = parallelPair();
        statedParallel(p, AB, CD);
        p.setAngle(p.addAngle(P.id, A.id, Q.id), 50);
        solve(p);
        const named = p.quantities.assignments
            .filter(a => a.reason.kind === "derived")
            .map(a => a.reason.kind === "derived" ? a.reason.theorem : "");
        expect(named).toContain("alternate_angles");
        expect(named).toContain("cointerior_angles");
    });
});

describe("what the parallel fact yields on its own", () => {
    it("states the equalities even when no angle is known yet", () => {
        const { p, AB, CD } = parallelPair();
        statedParallel(p, AB, CD);
        solve(p);
        // ни одного числа — параллельность даёт связи, а не значения
        expect(p.quantities.assignments).toHaveLength(0);
        const equalities = Array.from(p.relations.values())
            .filter(r => r.kind === "equal" && r.reason.theorem === "alternate_angles")
            .map(r => formatRelation(p, r));
        expect(equalities).toContain("∠APQ = ∠DQP");
        expect(equalities).toContain("∠BPQ = ∠CQP");
    });

    it("formatRelation ignores relations that are not equalities", () => {
        const { p, AB, CD } = parallelPair();
        statedParallel(p, AB, CD);
        solve(p);
        const sums = Array.from(p.relations.values()).filter(r => r.kind === "sum");
        expect(sums.length).toBeGreaterThan(0);
        expect(sums.every(r => formatRelation(p, r) === null)).toBe(true);
    });
});

// Секущей может быть не только отрезок. У прямой и луча собственные точки
// лежат в стороне, поэтому распознавание идёт по прохождению через P и Q.
describe("transversals other than a segment", () => {
    // AB и CD горизонтальные; P на первой, Q на второй.
    function pairWithCrossingPoints() {
        const p = new Problem();
        const place = (label: string, x: number, y: number) => {
            const point = p.addPoint(x, y);
            p.renamePoint(point.id, label);
            return point;
        };
        const A = place("A", 0, 0);
        const P = place("P", 50, 0);
        const B = place("B", 200, 0);
        const C = place("C", 0, 100);
        const Q = place("Q", 150, 100);
        const D = place("D", 200, 100);
        p.addSegment(A.id, B.id);
        p.addSegment(C.id, D.id);
        const AB = p.getSegment(A.id, B.id)!;
        const CD = p.getSegment(C.id, D.id)!;
        p.addCondition({ kind: "fact",
            fact: { kind: "parallel", a: AB, b: CD, reason: { kind: "given" } } });
        return { p, A, B, C, D, P, Q };
    }

    it("a drawn line through both points works as a transversal", () => {
        const { p, A, D, P, Q } = pairWithCrossingPoints();
        // концы прямой — за пределами параллельных, на самих прямых не лежат
        const E = p.addPoint(0, -100);
        const F = p.addPoint(250, 200);
        p.renamePoint(E.id, "E");
        p.renamePoint(F.id, "F");
        p.addExplicitLine(P.id, Q.id);
        expect(p.getSegment(P.id, Q.id)).toBeUndefined(); // отрезка PQ нет
        p.setAngle(p.addAngle(P.id, A.id, Q.id), 50);
        solve(p);
        expect(p.quantities.value(p.angleId(p.getAngle(Q.id, D.id, P.id)!))).toBeCloseTo(50, 6);
    });

    it("a drawn ray works as a transversal", () => {
        const { p, A, D, P, Q } = pairWithCrossingPoints();
        p.addExplicitRay(P.id, Q.id);
        expect(p.getSegment(P.id, Q.id)).toBeUndefined();
        p.setAngle(p.addAngle(P.id, A.id, Q.id), 50);
        solve(p);
        expect(p.quantities.value(p.angleId(p.getAngle(Q.id, D.id, P.id)!))).toBeCloseTo(50, 6);
    });

    it("an implicit ray is not a transversal — nothing was drawn there", () => {
        const { p, A, P, Q } = pairWithCrossingPoints();
        p.addRay(P.id, Q.id); // служебный луч, не построенный пользователем
        p.setAngle(p.addAngle(P.id, A.id, Q.id), 50);
        solve(p);
        const fromParallel = Array.from(p.relations.values()).filter(r =>
            r.reason.theorem === "alternate_angles" || r.reason.theorem === "cointerior_angles");
        expect(fromParallel).toHaveLength(0);
    });
});

// ⊥ и ∥ — свойства направления, поэтому их можно заявлять и про луч, и про
// прямую. Длины у них нет, так что "=" и отношение им недоступны.
describe("stating parallelism between lines and rays", () => {
    // Две параллельные прямые, проведённые инструментом "прямая", без отрезков.
    function drawnLines() {
        const p = new Problem();
        const place = (label: string, x: number, y: number) => {
            const point = p.addPoint(x, y);
            p.renamePoint(point.id, label);
            return point;
        };
        const A = place("A", 0, 0);
        const B = place("B", 200, 0);
        const C = place("C", 0, 100);
        const D = place("D", 200, 100);
        p.addExplicitLine(A.id, B.id);
        p.addExplicitLine(C.id, D.id);
        return { p, A, B, C, D };
    }

    it("two drawn lines can be stated parallel", () => {
        const { p } = drawnLines();
        const state = parseStatementInput(p, "AB || CD");
        expect(state.error).toBeNull();
        expect(state.condition).toMatchObject({ kind: "fact", fact: { kind: "parallel" } });
    });

    it("a drawn line is offered in the object list", () => {
        const { p } = drawnLines();
        expect(parseStatementInput(p, "").suggestions.map(s => s.label)).toContain("AB");
    });

    it("a line offers only the direction relations", () => {
        const { p } = drawnLines();
        const state = parseStatementInput(p, "AB");
        expect(state.suggestions.map(s => s.hint)).toEqual(["perpendicular", "parallel"]);
    });

    it("a line has no length", () => {
        const { p } = drawnLines();
        expect(parseStatementInput(p, "AB = 5").error).toContain("no length");
        expect(parseStatementInput(p, "AB / CD = 2").error).toContain("no length");
    });

    it("a segment and a line may be stated parallel to each other", () => {
        const { p } = drawnLines();
        const E = p.addPoint(0, 200);
        const F = p.addPoint(200, 200);
        p.renamePoint(E.id, "E");
        p.renamePoint(F.id, "F");
        p.addSegment(E.id, F.id);
        const state = parseStatementInput(p, "EF || AB");
        expect(state.error).toBeNull();
        expect(state.condition).toMatchObject({ kind: "fact", fact: { kind: "parallel" } });
    });

    it("angles at a transversal follow from parallel lines", () => {
        const { p, A, D } = drawnLines();
        // точки пересечения с секущей и сама секущая-прямая
        const P = p.addPoint(50, 0);
        const Q = p.addPoint(150, 100);
        p.renamePoint(P.id, "P");
        p.renamePoint(Q.id, "Q");
        p.addExplicitLine(P.id, Q.id);
        p.addCondition(parseStatementInput(p, "AB || CD").condition!);
        p.setAngle(p.addAngle(P.id, A.id, Q.id), 50);
        solve(p);
        expect(p.quantities.value(p.angleId(p.getAngle(Q.id, D.id, P.id)!))).toBeCloseTo(50, 6);
    });
});

// Обратный ход: из углов при секущей выводим параллельность. Это и делает
// достижимой цель «доказать ∥».
describe("parallelFromAngles", () => {
    // Та же картинка, но параллельность НЕ задана — её предстоит вывести.
    function unstatedPair() {
        const p = new Problem();
        const place = (label: string, x: number, y: number) => {
            const point = p.addPoint(x, y);
            p.renamePoint(point.id, label);
            return point;
        };
        const A = place("A", 0, 0);
        const P = place("P", 50, 0);
        const B = place("B", 200, 0);
        const C = place("C", 0, 100);
        const Q = place("Q", 150, 100);
        const D = place("D", 200, 100);
        p.addSegment(A.id, B.id);
        p.addSegment(C.id, D.id);
        p.addSegment(P.id, Q.id);
        return { p, A, B, C, D, P, Q,
                 AB: p.getSegment(A.id, B.id)!, CD: p.getSegment(C.id, D.id)! };
    }

    const isParallel = (p: Problem) => p.facts.some(f => f.kind === "parallel");

    it("equal alternate angles make the lines parallel", () => {
        const { p, A, D, P, Q } = unstatedPair();
        // A и D по разные стороны секущей — углы накрест лежащие
        p.setAngle(p.addAngle(P.id, A.id, Q.id), 50);
        p.setAngle(p.addAngle(Q.id, D.id, P.id), 50);
        solve(p);
        expect(isParallel(p)).toBe(true);
    });

    it("co-interior angles adding to 180 make them parallel too", () => {
        const { p, A, C, P, Q } = unstatedPair();
        // A и C по одну сторону — углы односторонние
        p.setAngle(p.addAngle(P.id, A.id, Q.id), 50);
        p.setAngle(p.addAngle(Q.id, C.id, P.id), 130);
        solve(p);
        expect(isParallel(p)).toBe(true);
    });

    it("angles that do not match leave the lines unrelated", () => {
        const { p, A, D, P, Q } = unstatedPair();
        p.setAngle(p.addAngle(P.id, A.id, Q.id), 50);
        p.setAngle(p.addAngle(Q.id, D.id, P.id), 70);
        solve(p);
        expect(isParallel(p)).toBe(false);
    });

    it("one known angle is not enough", () => {
        const { p, A, P, Q } = unstatedPair();
        p.setAngle(p.addAngle(P.id, A.id, Q.id), 50);
        solve(p);
        expect(isParallel(p)).toBe(false);
    });

    it("the Prove ∥ goal becomes reachable", () => {
        const { p, A, D, P, Q, AB, CD } = unstatedPair();
        p.setGoal({ kind: "prove", condition: { kind: "fact",
            fact: { kind: "parallel", a: AB, b: CD, reason: { kind: "given" } } } });
        expect(solve(p)).toBe(false);
        p.setAngle(p.addAngle(P.id, A.id, Q.id), 50);
        p.setAngle(p.addAngle(Q.id, D.id, P.id), 50);
        expect(solve(p)).toBe(true);
    });

    it("the derived parallelism then drives the forward theorem", () => {
        const { p, A, B, C, D, P, Q } = unstatedPair();
        p.setAngle(p.addAngle(P.id, A.id, Q.id), 50);
        p.setAngle(p.addAngle(Q.id, D.id, P.id), 50);
        solve(p);
        // ∠BPQ и ∠CQP никто не задавал — они получены уже из параллельности
        expect(p.quantities.value(p.angleId(p.getAngle(P.id, B.id, Q.id)!))).toBeCloseTo(130, 6);
        expect(p.quantities.value(p.angleId(p.getAngle(Q.id, C.id, P.id)!))).toBeCloseTo(130, 6);
    });
});

// Перпендикулярность переносится на параллельную: направление у них общее.
describe("perpendicularThroughParallel", () => {
    // AB ∥ CD (горизонтальные), EF — вертикальная секущая через P и Q.
    function pairWithVerticalCut() {
        const p = new Problem();
        const place = (label: string, x: number, y: number) => {
            const point = p.addPoint(x, y);
            p.renamePoint(point.id, label);
            return point;
        };
        const A = place("A", 0, 0);
        const P = place("P", 100, 0);
        const B = place("B", 200, 0);
        const C = place("C", 0, 100);
        const Q = place("Q", 100, 100);
        const D = place("D", 200, 100);
        p.addSegment(A.id, B.id);
        p.addSegment(C.id, D.id);
        p.addSegment(P.id, Q.id);
        return { p, A, B, C, D, P, Q,
                 AB: p.getSegment(A.id, B.id)!, CD: p.getSegment(C.id, D.id)!,
                 PQ: p.getSegment(P.id, Q.id)! };
    }

    const perpendiculars = (p: Problem) => p.facts.filter(f => f.kind === "perpendicular");

    it("carries perpendicularity over to the parallel line", () => {
        const { p, AB, CD, PQ } = pairWithVerticalCut();
        p.addCondition({ kind: "fact",
            fact: { kind: "parallel", a: AB, b: CD, reason: { kind: "given" } } });
        p.addCondition({ kind: "fact",
            fact: { kind: "perpendicular", a: PQ, b: AB, reason: { kind: "given" } } });
        solve(p);
        const derived = perpendiculars(p).filter(f => f.reason.kind === "derived"
            && f.reason.theorem === "perpendicular_through_parallel");
        expect(derived.length).toBeGreaterThan(0);
    });

    it("the transferred perpendicularity makes the Prove goal reachable", () => {
        const { p, AB, CD, PQ } = pairWithVerticalCut();
        p.setGoal({ kind: "prove", condition: { kind: "fact",
            fact: { kind: "perpendicular", a: PQ, b: CD, reason: { kind: "given" } } } });
        p.addCondition({ kind: "fact",
            fact: { kind: "perpendicular", a: PQ, b: AB, reason: { kind: "given" } } });
        expect(solve(p)).toBe(false); // пока параллельность не заявлена — не выводится
        p.addCondition({ kind: "fact",
            fact: { kind: "parallel", a: AB, b: CD, reason: { kind: "given" } } });
        expect(solve(p)).toBe(true);
    });

    it("the transferred fact then yields the right angle itself", () => {
        const { p, C, P, Q, AB, CD, PQ } = pairWithVerticalCut();
        p.addCondition({ kind: "fact",
            fact: { kind: "parallel", a: AB, b: CD, reason: { kind: "given" } } });
        p.addCondition({ kind: "fact",
            fact: { kind: "perpendicular", a: PQ, b: AB, reason: { kind: "given" } } });
        solve(p);
        // при Q секущая встречает CD — этот угол прямой, хотя PQ ⊥ CD никто не задавал
        expect(p.quantities.value(p.angleId(p.getAngle(Q.id, C.id, P.id)!))).toBeCloseTo(90, 6);
    });

    it("without the parallel fact nothing is carried over", () => {
        const { p, AB, PQ } = pairWithVerticalCut();
        p.addCondition({ kind: "fact",
            fact: { kind: "perpendicular", a: PQ, b: AB, reason: { kind: "given" } } });
        solve(p);
        expect(perpendiculars(p).every(f => f.reason.kind === "given"
            || f.reason.theorem !== "perpendicular_through_parallel")).toBe(true);
    });
});

// Два правила «через общее звено»: параллельность транзитивна, а два
// перпендикуляра к одной прямой параллельны между собой.
describe("parallelism through a shared line", () => {
    // Три горизонтали и одна вертикаль, пересекающая все три.
    function threeLines() {
        const p = new Problem();
        const place = (label: string, x: number, y: number) => {
            const point = p.addPoint(x, y);
            p.renamePoint(point.id, label);
            return point;
        };
        const A = place("A", 0, 0), K = place("K", 100, 0), B = place("B", 200, 0);
        const C = place("C", 0, 100), L = place("L", 100, 100), D = place("D", 200, 100);
        const E = place("E", 0, 200), M = place("M", 100, 200), F = place("F", 200, 200);
        p.addSegment(A.id, B.id);
        p.addSegment(C.id, D.id);
        p.addSegment(E.id, F.id);
        p.addSegment(K.id, M.id); // вертикаль через все три
        return { p,
            AB: p.getSegment(A.id, B.id)!, CD: p.getSegment(C.id, D.id)!,
            EF: p.getSegment(E.id, F.id)!, KM: p.getSegment(K.id, M.id)!, L };
    }

    const given = (p: Problem, fact: Parameters<Problem["addCondition"]>[0]) => p.addCondition(fact);
    const byTheorem = (p: Problem, theorem: string) =>
        p.facts.filter(f => f.reason.kind === "derived" && f.reason.theorem === theorem);

    it("parallelism is transitive", () => {
        const { p, AB, CD, EF } = threeLines();
        given(p, { kind: "fact", fact: { kind: "parallel", a: AB, b: CD, reason: { kind: "given" } } });
        given(p, { kind: "fact", fact: { kind: "parallel", a: CD, b: EF, reason: { kind: "given" } } });
        solve(p);
        expect(byTheorem(p, "parallel_transitive").length).toBeGreaterThan(0);
    });

    it("two perpendiculars to the same line are parallel", () => {
        // Отдельно стоящая вертикаль: она ничего не пересекает, поэтому углов
        // при секущей нет и вывод может прийти только от перпендикуляров.
        const p = new Problem();
        const place = (label: string, x: number, y: number) => {
            const point = p.addPoint(x, y);
            p.renamePoint(point.id, label);
            return point;
        };
        const A = place("A", 0, 0), B = place("B", 200, 0);
        const C = place("C", 0, 100), D = place("D", 200, 100);
        const K = place("K", 400, 0), M = place("M", 400, 200);
        p.addSegment(A.id, B.id);
        p.addSegment(C.id, D.id);
        p.addSegment(K.id, M.id);
        const AB = p.getSegment(A.id, B.id)!, CD = p.getSegment(C.id, D.id)!;
        const KM = p.getSegment(K.id, M.id)!;
        p.addCondition({ kind: "fact",
            fact: { kind: "perpendicular", a: KM, b: AB, reason: { kind: "given" } } });
        p.addCondition({ kind: "fact",
            fact: { kind: "perpendicular", a: KM, b: CD, reason: { kind: "given" } } });
        solve(p);
        expect(p.quantities.assignments).toHaveLength(0); // ни одного угла не появилось
        expect(byTheorem(p, "parallel_from_perpendiculars").length).toBeGreaterThan(0);
    });

    it("the conclusion holds even when another route reaches it first", () => {
        const { p, AB, CD, KM } = threeLines();
        given(p, { kind: "fact", fact: { kind: "perpendicular", a: KM, b: AB, reason: { kind: "given" } } });
        given(p, { kind: "fact", fact: { kind: "perpendicular", a: KM, b: CD, reason: { kind: "given" } } });
        solve(p);
        expect(p.facts.some(f => f.kind === "parallel" && f.reason.kind === "derived")).toBe(true);
    });

    it("that route makes the Prove ∥ goal reachable without any angle given", () => {
        const { p, AB, CD, KM } = threeLines();
        p.setGoal({ kind: "prove", condition: { kind: "fact",
            fact: { kind: "parallel", a: AB, b: CD, reason: { kind: "given" } } } });
        given(p, { kind: "fact", fact: { kind: "perpendicular", a: KM, b: AB, reason: { kind: "given" } } });
        expect(solve(p)).toBe(false); // одного перпендикуляра мало
        given(p, { kind: "fact", fact: { kind: "perpendicular", a: KM, b: CD, reason: { kind: "given" } } });
        expect(solve(p)).toBe(true);
    });

    it("perpendiculars to different lines say nothing about each other", () => {
        const { p, AB, CD, EF, KM } = threeLines();
        // KM ⊥ AB и EF ⊥ CD — общего звена нет
        given(p, { kind: "fact", fact: { kind: "perpendicular", a: KM, b: AB, reason: { kind: "given" } } });
        given(p, { kind: "fact", fact: { kind: "perpendicular", a: EF, b: CD, reason: { kind: "given" } } });
        solve(p);
        expect(byTheorem(p, "parallel_from_perpendiculars")).toHaveLength(0);
    });
});
