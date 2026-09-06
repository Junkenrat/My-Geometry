import type { Fact, GivenValue, Goal } from "./facts";
import type { Premise, Quantity } from "./quantities";
import type { Problem } from "./problem";
import type { Segment, Angle, Triangle, Line, Point } from "./types";
import { angleName, carrierName, pointName, segmentName, triangleName } from "./types";
import type { Condition } from "./conditions";
import type { Relation } from "./relations";
import { t, type Key } from "../i18n";

// Служебные имена теорем и ключи их названий в словаре. Ключ, а не готовая
// строка: таблица создаётся один раз при импорте, а язык может смениться позже.
const THEOREM_KEYS: Record<string, Key> = {
    pythagoras: "theorem.pythagoras",
    intersection: "theorem.intersection",
    segment_addition: "theorem.segment_addition",
    pointOnSegment: "theorem.pointOnSegment",
    vertical_angles: "theorem.vertical_angles",
    linear_pair: "theorem.linear_pair",
    triangle_angle_sum: "theorem.triangle_angle_sum",
    right_angle: "theorem.right_angle",
    perpendicular_angles: "theorem.perpendicular_angles",
    right_triangle_from_angle: "theorem.right_triangle_from_angle",
    perpendicular_from_angle: "theorem.perpendicular_from_angle",
    equilateral: "theorem.equilateral",
    alternate_angles: "theorem.alternate_angles",
    cointerior_angles: "theorem.cointerior_angles",
    parallel_from_angles: "theorem.parallel_from_angles",
    perpendicular_through_parallel: "theorem.perpendicular_through_parallel",
    parallel_transitive: "theorem.parallel_transitive",
    parallel_from_perpendiculars: "theorem.parallel_from_perpendiculars",
    given: "theorem.given",
};

// Свойства треугольника, которым хватает одного имени фигуры.
const TRIANGLE_PROPERTY_KEYS: Record<"equilateral" | "obtuse" | "acute", Key> = {
    equilateral: "fact.equilateral",
    obtuse: "fact.obtuse",
    acute: "fact.acute",
};

// возвращает название теоремы по служебному имени
export function getTheoremName(id: string): string {
    const key = THEOREM_KEYS[id];
    return key === undefined ? id : t(key);
}

// Округление до 6 знаков после запятой
export function formatNumber(value: number): number {
    return Math.round(value * 1e6) / 1e6;
}

// Возвращают имя объекта 
export function formatSegmentName(seg: Segment): string {
    return segmentName(seg.p1, seg.p2);
}

export function formatLineName(line: Line): string {
    return segmentName(line.p1, line.p2);
}

export function formatAngleName(angle: Angle): string {
    return angleName(angle.vertex, angle.ray1.through, angle.ray2.through);
}

export function formatTriangleName(triangle: Triangle): string {
    return triangleName(triangle.p1, triangle.p2, triangle.p3);
}

// Преобразует факт в читаемую строку
export function formatFact(fact: Fact): string | null {
    if (fact.kind === "perpendicular") {
        return `${carrierName(fact.a)} ⟂ ${carrierName(fact.b)}`;
    } else if (fact.kind === "parallel") {
        return `${carrierName(fact.a)} ∥ ${carrierName(fact.b)}`;
    } else if (fact.kind === "right_triangle") {
        return t("fact.rightTriangle", {
            name: formatTriangleName(fact.triangle),
            vertex: pointName(fact.rightAngleAt),
        });
    } else if (fact.kind === "equilateral" || fact.kind === "obtuse" || fact.kind === "acute") {
        return t(TRIANGLE_PROPERTY_KEYS[fact.kind], { name: formatTriangleName(fact.triangle) });
    } else if (fact.kind === "between") {
        return t("fact.between", {
            point: pointName(fact.point),
            from: pointName(fact.from),
            to: pointName(fact.to),
        });
    } else {
        return null;
    }
}

// Преобразует числовой факт в читаемую строку
export function formatQuantity(quantity: Quantity): string {
    const unit = quantity.id.startsWith("ang:") ? "°" : "";
    if (quantity.value === null) return `${quantity.labelOf()} = ?`;
    return `${quantity.labelOf()} = ${formatNumber(quantity.value)}${unit}`;
}

export function formatGivenValue(given: GivenValue): string {
    if (given.kind === "length") {
        return `${formatSegmentName(given.segment)} = ${formatNumber(given.value)}`;
    }
    return `${formatAngleName(given.angle)} = ${formatNumber(given.value)}°`;
}

export function formatPremise(problem: Problem, premise: Premise): string | null {
    if (premise.kind === "fact") return formatFact(premise.fact);
    const quantity = problem.quantities.get(premise.id);
    return quantity !== undefined ? formatQuantity(quantity) : premise.id;
}

// Равенство величин, выведенное теоремой: "∠AHG = ∠DGH". Остальные виды
// отношений (суммы, отношение, Пифагор) — рабочая механика решения, читать их
// в списке выводов пользы мало.
export function formatRelation(problem: Problem, rel: Relation): string | null {
    if (rel.kind !== "equal") return null;
    return `${problem.quantities.label(rel.a)} = ${problem.quantities.label(rel.b)}`;
}

export function formatGoal(goal: Goal): string {
    if (goal.kind === "length") {
        return t("goal.find", { object: formatSegmentName(goal.segment) });
    }
    if (goal.kind === "angle") {
        return t("goal.find", { object: formatAnglePoints(goal.angle) });
    }
    return t("goal.prove", { statement: formatConditions(goal.condition) ?? "?" });
}

// Как цель выглядит в самом поле ввода: "AB — ?" / "Prove: AB = CD".
export function formatGoalInput(goal: Goal): string {
    if (goal.kind === "length") return t("goal.inputFind", { object: formatSegmentName(goal.segment) });
    if (goal.kind === "angle") return t("goal.inputFind", { object: formatAnglePoints(goal.angle) });
    return t("goal.inputProve", { statement: formatConditions(goal.condition) ?? "?" });
}

export function formatAnglePoints(a: { vertex: Point; thr1: Point; thr2: Point }): string {
    return angleName(a.vertex, a.thr1, a.thr2);
}

export function formatConditions(condition: Condition): string | null {
    if (condition.kind === "fact") {
        return formatFact(condition.fact);
    } else if (condition.kind === "angle_value") {
        return `${formatAnglePoints(condition.angle)} = ${formatNumber(condition.value)}°`;
    } else if (condition.kind === "triangle") {
        const tri = condition.triangle;
        const name = triangleName(tri.p1, tri.p2, tri.p3);
        const property = condition.property;
        if (property.kind === "right") {
            return t("fact.rightTriangle", { name, vertex: pointName(property.vertex) });
        }
        return t(TRIANGLE_PROPERTY_KEYS[property.kind], { name });
    } else if (condition.kind === "equation") {
        const equation = condition.equation;
        if (equation.kind === "segments_ratio") {
            return `${formatSegmentName(equation.a)} / ${formatSegmentName(equation.b)} = ${formatNumber(equation.value)}`;
        }
        if (equation.kind === "angles_equal") {
            return `${formatAnglePoints(equation.a)} = ${formatAnglePoints(equation.b)}`;
        }
        return `${formatSegmentName(equation.a)} = ${formatSegmentName(equation.b)}`;
    } else if (condition.kind === "value") {
        return (formatGivenValue(condition.target))
    }
    return null;
}