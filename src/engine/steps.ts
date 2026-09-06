import type { Problem } from "./problem";
import type { Condition } from "./conditions";
import type { Fact, Goal, Reason } from "./facts";
import { factsEqual } from "./facts";
import type { Premise, QuantityId, QuantityStore, QReason } from "./quantities";
import type { Relation } from "./relations";
import { formatFact, formatNumber, formatQuantity } from "./format";
import { isSolved } from "./solve";

// Один шаг решения так, как его читает человек:
//   "Для △ABC, по теореме Пифагора:"   <- claim
//   AB² = AC² + BC²                    <- прямо из свойства
//   AB = √(AC² + BC²)                  <- преобразование
//   AB = √(5² + 4²) = 6.4031           <- подстановка и итог
export interface SolutionStep {
    // Служебное имя теоремы; человеческое берётся через getTheoremName.
    theorem: string;
    // На чём шаг основан ("△ABC is right-angled at C"), если основание есть.
    source: string | null;
    // Первая формула — из свойства, последняя — результат шага.
    formulas: string[];
}

// Посылки у фактов — сами факты, у величин — размеченные Premise.
// Приводим к одному виду.
function factOfPremise(premise: Fact | Premise): Fact | null {
    if (premise.kind === "fact") return premise.fact;
    if (premise.kind === "quantity") return null;
    return premise;
}

// Из какого факта выведен шаг: берём первую посылку-факт.
function sourceOf(reason: Reason | QReason): string | null {
    if (reason.kind !== "derived") return null;
    for (const premise of reason.premises) {
        const fact = factOfPremise(premise);
        if (fact === null) continue;
        const text = formatFact(fact);
        if (text !== null) return text;
    }
    return null;
}

// Градусы дописываются только к углам — тип величины виден по её id.
function unitOf(id: QuantityId): string {
    return id.startsWith("ang:") ? "°" : "";
}

// Известное значение величины с единицей: "90°", "4".
function valueOf(store: QuantityStore, id: QuantityId): string {
    return `${formatNumber(store.value(id) ?? 0)}${unitOf(id)}`;
}

// Результат шага с единицей.
function resultOf(target: QuantityId, value: number): string {
    return `${formatNumber(value)}${unitOf(target)}`;
}

// c² = a² + b², решённое относительно найденной величины.
function pythagorasFormulas(
    store: QuantityStore,
    rel: Relation & { kind: "pythagoras" },
    target: QuantityId,
    value: number,
): string[] {
    const [leg1, leg2] = rel.legs;
    const hyp = store.label(rel.hyp);
    const a = store.label(leg1);
    const b = store.label(leg2);
    const num = (id: QuantityId) => valueOf(store, id);
    const general = `${hyp}² = ${a}² + ${b}²`;

    if (target === rel.hyp) {
        return [
            general,
            `${hyp} = √(${a}² + ${b}²)`,
            `${hyp} = √(${num(leg1)}² + ${num(leg2)}²) = ${resultOf(target, value)}`,
        ];
    }
    // Ищем катет: переносим второй катет вправо и извлекаем корень.
    const leg = store.label(target);
    const other = target === leg1 ? leg2 : leg1;
    const otherLabel = store.label(other);
    return [
        general,
        `${leg}² = ${hyp}² − ${otherLabel}²`,
        `${leg} = √(${hyp}² − ${otherLabel}²)`,
        `${leg} = √(${num(rel.hyp)}² − ${num(other)}²) = ${resultOf(target, value)}`,
    ];
}

// a + b + ... = total, решённое относительно найденной величины.
// Одна форма обслуживает сумму углов треугольника (total = 180), смежные углы
// и аддитивность отрезков (там total — тоже величина, а не константа).
function sumFormulas(
    store: QuantityStore,
    rel: Relation & { kind: "sum" },
    target: QuantityId,
    value: number,
): string[] {
    const num = (id: QuantityId) => valueOf(store, id);
    const total = rel.total;
    // Слагаемые попадают в отношение в порядке построения фигуры; для показа
    // упорядочиваем по имени, иначе запись прыгает от задачи к задаче.
    const parts = [...rel.parts].sort((a, b) => store.label(a).localeCompare(store.label(b)));
    const names = parts.map(id => store.label(id)).join(" + ");
    const totalLabel = typeof total === "number"
        ? `${formatNumber(total)}${unitOf(parts[0] ?? "")}`
        : store.label(total);
    const general = `${names} = ${totalLabel}`;

    // Ищем целое — оно известно только когда это отдельная величина.
    if (typeof total === "string" && target === total) {
        return [
            general,
            `${totalLabel} = ${names}`,
            `${totalLabel} = ${parts.map(num).join(" + ")} = ${resultOf(target, value)}`,
        ];
    }
    // Ищем слагаемое: переносим остальные вправо.
    const others = parts.filter(id => id !== target);
    const label = store.label(target);
    const totalNum = typeof total === "number" ? totalLabel : num(total);
    return [
        general,
        `${label} = ${totalLabel}${others.map(id => ` − ${store.label(id)}`).join("")}`,
        `${label} = ${totalNum}${others.map(id => ` − ${num(id)}`).join("")}`
            + ` = ${resultOf(target, value)}`,
    ];
}

// a = b: свойство и сразу перенос известного значения.
function equalFormulas(
    store: QuantityStore,
    rel: Relation & { kind: "equal" },
    target: QuantityId,
    value: number,
): string[] {
    const [first, second] = [store.label(rel.a), store.label(rel.b)].sort();
    return [
        `${first} = ${second}`,
        `${store.label(target)} = ${resultOf(target, value)}`,
    ];
}

// a / b = value, решённое относительно найденной величины.
function ratioFormulas(
    store: QuantityStore,
    rel: Relation & { kind: "ratio" },
    target: QuantityId,
    value: number,
): string[] {
    const a = store.label(rel.a);
    const b = store.label(rel.b);
    const k = `${formatNumber(rel.value)}`;
    const general = `${a} / ${b} = ${k}`;

    if (target === rel.a) {
        return [
            general,
            `${a} = ${k} · ${b}`,
            `${a} = ${k} · ${valueOf(store, rel.b)} = ${resultOf(target, value)}`,
        ];
    }
    return [
        general,
        `${b} = ${a} / ${k}`,
        `${b} = ${valueOf(store, rel.a)} / ${k} = ${resultOf(target, value)}`,
    ];
}

// Выкладка шага. Отношения, для которых она расписана, перечислены ниже;
// для остальных показываем сам результат.
function formulasFor(
    store: QuantityStore, reason: QReason, target: QuantityId, value: number, fallback: string,
): string[] {
    if (reason.kind !== "derived" || reason.relation === undefined) return [fallback];
    const rel = reason.relation;
    if (rel.kind === "pythagoras") return pythagorasFormulas(store, rel, target, value);
    if (rel.kind === "sum") return sumFormulas(store, rel, target, value);
    if (rel.kind === "equal") return equalFormulas(store, rel, target, value);
    if (rel.kind === "ratio") return ratioFormulas(store, rel, target, value);
    return [fallback];
}

// Узел вывода: либо структурный факт, либо найденное число.
type Node = { kind: "fact"; fact: Fact } | { kind: "quantity"; id: QuantityId };

function nodeOfPremise(premise: Fact | Premise): Node {
    if (premise.kind === "fact") return { kind: "fact", fact: premise.fact };
    if (premise.kind === "quantity") return { kind: "quantity", id: premise.id };
    return { kind: "fact", fact: premise };
}

// Что должно быть установлено, чтобы условие считалось выполненным.
function conditionNodes(problem: Problem, condition: Condition): Node[] {
    const asFact = (found: Fact | undefined): Node[] =>
        found === undefined ? [] : [{ kind: "fact", fact: found }];

    if (condition.kind === "fact") {
        return asFact(problem.facts.find(f => factsEqual(f, condition.fact)));
    }
    if (condition.kind === "value") {
        const given = condition.target;
        return [{ kind: "quantity", id: given.kind === "length"
            ? problem.lengthId(given.segment) : problem.angleId(given.angle) }];
    }
    if (condition.kind === "angle_value") {
        return [{ kind: "quantity", id: problem.angleIdOf(condition.angle) }];
    }
    if (condition.kind === "triangle") {
        const triangle = problem.getTriangle(condition.triangle.p1.id,
            condition.triangle.p2.id, condition.triangle.p3.id);
        if (triangle === undefined) return [];
        const property = condition.property;
        return asFact(problem.facts.find(f => property.kind === "right"
            ? f.kind === "right_triangle" && f.triangle === triangle && f.rightAngleAt === property.vertex
            : f.kind === property.kind && "triangle" in f && f.triangle === triangle));
    }
    const equation = condition.equation;
    if (equation.kind === "angles_equal") {
        return [{ kind: "quantity", id: problem.angleIdOf(equation.a) },
                { kind: "quantity", id: problem.angleIdOf(equation.b) }];
    }
    return [{ kind: "quantity", id: problem.lengthId(equation.a) },
            { kind: "quantity", id: problem.lengthId(equation.b) }];
}

function goalNodes(problem: Problem, goal: Goal): Node[] {
    if (goal.kind === "length") return [{ kind: "quantity", id: problem.lengthId(goal.segment) }];
    if (goal.kind === "angle") return [{ kind: "quantity", id: problem.angleIdOf(goal.angle) }];
    return conditionNodes(problem, goal.condition);
}

function reasonOf(problem: Problem, node: Node): Reason | QReason | null {
    if (node.kind === "fact") return node.fact.reason;
    return problem.quantities.get(node.id)?.reason ?? null;
}

// Обход вглубь от заданных узлов: каждый выведенный узел попадает в список
// ПОСЛЕ своих посылок, поэтому шаги сразу выходят в порядке зависимостей.
// Данные пользователем узлы шагами не являются и обход на них останавливается.
function derivationOrder(problem: Problem, roots: Node[]): Node[] {
    const seen = new Set<Fact | QuantityId>();
    const ordered: Node[] = [];

    const visit = (node: Node): void => {
        const key = node.kind === "fact" ? node.fact : node.id;
        if (seen.has(key)) return;
        seen.add(key); // до рекурсии: взаимные ссылки не должны зациклить обход
        const reason = reasonOf(problem, node);
        if (reason === null || reason.kind !== "derived") return;
        for (const premise of reason.premises) visit(nodeOfPremise(premise));
        ordered.push(node);
    };

    for (const root of roots) visit(root);
    return ordered;
}

function stepOf(problem: Problem, node: Node): SolutionStep | null {
    if (node.kind === "fact") {
        const result = formatFact(node.fact);
        if (result === null || node.fact.reason.kind !== "derived") return null;
        return { theorem: node.fact.reason.theorem, source: sourceOf(node.fact.reason), formulas: [result] };
    }
    const quantity = problem.quantities.get(node.id);
    if (quantity === undefined || quantity.reason === null
        || quantity.reason.kind !== "derived" || quantity.value === null) return null;
    return {
        theorem: quantity.reason.theorem,
        source: sourceOf(quantity.reason),
        formulas: formulasFor(problem.quantities, quantity.reason, node.id,
            quantity.value, formatQuantity(quantity)),
    };
}

export function solutionSteps(problem: Problem): SolutionStep[] {
    // Цель достигнута — показываем только то, что к ней ведёт. Пока не достигнута,
    // полезнее видеть всё выведенное: так понятно, на чём решение застряло.
    const goal = problem.goal;
    const roots: Node[] = goal !== null && isSolved(problem)
        ? goalNodes(problem, goal)
        : [
            ...problem.facts.map((fact): Node => ({ kind: "fact", fact })),
            ...problem.quantities.assignments.map((a): Node => ({ kind: "quantity", id: a.quantity.id })),
        ];
    return derivationOrder(problem, roots)
        .map(node => stepOf(problem, node))
        .filter((step): step is SolutionStep => step !== null);
}
