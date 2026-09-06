import type { Fact, GivenValue, Goal } from "./facts";
import type { Premise, Quantity } from "./quantities";
import type { Problem } from "./problem";
import type { Segment, Angle, Triangle, Line, Point } from "./types";
import { angleName, carrierName, pointName, segmentName, triangleName } from "./types";
import type { Condition } from "./conditions";
import type { Relation } from "./relations";

// Служебные имена теорем и их названия
export const THEOREM_NAMES: Record<string, string> = {
    pythagoras: "Pythagorean theorem",
    intersection: "Point of intersection",
    segment_addition: "Segment addition",
    pointOnSegment: "Point on segment",
    vertical_angles: "Vertical angles",
    linear_pair: "Linear pair",
    triangle_angle_sum: "Sum of angles in a triangle",
    right_angle: "Right angle",
    perpendicular_angles: "Perpendicular segments",
    right_triangle_from_angle: "Right angle in a triangle",
    perpendicular_from_angle: "Perpendicularity from a right angle",
    equilateral: "Equilateral triangle",
    alternate_angles: "Alternate angles at a transversal",
    cointerior_angles: "Co-interior angles at a transversal",
    parallel_from_angles: "Parallel lines from the angles at a transversal",
    perpendicular_through_parallel: "Perpendicular to one of two parallels",
    parallel_transitive: "Both parallel to the same line",
    parallel_from_perpendiculars: "Both perpendicular to the same line",
    given: "By the given condition"
};

// возвращает название теоремы по служебному имени
export function getTheoremName(id: string): string {
    return THEOREM_NAMES[id] ?? id;
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
        return `${formatTriangleName(fact.triangle)} is right-angled at ${pointName(fact.rightAngleAt)}`;
    } else if (fact.kind === "equilateral") {
        return `${formatTriangleName(fact.triangle)} is equilateral`;
    } else if (fact.kind === "obtuse") {
        return `${formatTriangleName(fact.triangle)} is obtuse`;
    } else if (fact.kind === "acute") {
        return `${formatTriangleName(fact.triangle)} is acute`;
    } else if (fact.kind === "between") {
        return `${pointName(fact.point)} is between ${pointName(fact.from)} and ${pointName(fact.to)}`;
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
        return `Find ${formatSegmentName(goal.segment)}`;
    }
    if (goal.kind === "angle") {
        return `Find ${formatAnglePoints(goal.angle)}`;
    }
    return `Prove ${formatConditions(goal.condition) ?? "?"}`;
}

// Как цель выглядит в самом поле ввода: "AB — ?" / "Prove: AB = CD".
export function formatGoalInput(goal: Goal): string {
    if (goal.kind === "length") return `${formatSegmentName(goal.segment)} — ?`;
    if (goal.kind === "angle") return `${formatAnglePoints(goal.angle)} — ?`;
    return `Prove: ${formatConditions(goal.condition) ?? "?"}`;
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
        const t = condition.triangle;
        const name = triangleName(t.p1, t.p2, t.p3);
        const property = condition.property;
        if (property.kind === "right") return `${name} is right-angled at ${pointName(property.vertex)}`;
        return `${name} is ${property.kind}`;
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