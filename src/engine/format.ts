import type { Fact, GivenValue, Goal } from "./facts";
import type { Premise, Quantity } from "./quantities";
import type { Problem } from "./problem";
import type { Segment, Angle, Triangle, Line } from "./types";
import { pointName } from "./types";
import type { Condition } from "./conditions";

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
    given: "By the given condition"
};

export function getTheoremName(id: string): string {
    return THEOREM_NAMES[id] ?? id;
}

function formatNumber(value: number): number {
    return Math.round(value * 1e6) / 1e6;
}

export function formatSegmentName(seg: Segment): string {
    return `${pointName(seg.p1)}${pointName(seg.p2)}`;
}

export function formatLineName(line: Line): string {
    return line.label ?? `${pointName(line.p1)}${pointName(line.p2)}`;
}

export function formatAngleName(angle: Angle): string {
    return `∠${pointName(angle.ray1.through)}${pointName(angle.vertex)}${pointName(angle.ray2.through)}`;
}

export function formatTriangleName(triangle: Triangle): string {
    return `△${pointName(triangle.p1)}${pointName(triangle.p2)}${pointName(triangle.p3)}`;
}

export function formatFact(fact: Fact): string | null {
    if (fact.kind === "perpendicular") {
        return `${formatSegmentName(fact.seg1)} ⟂ ${formatSegmentName(fact.seg2)}`;
    } else if (fact.kind === "right_triangle") {
        return `${formatTriangleName(fact.triangle)} is right-angled at ${pointName(fact.rightAngleAt)}`;
    } else if (fact.kind === "between") {
        return `${pointName(fact.point)} is between ${pointName(fact.from)} and ${pointName(fact.to)}`;
    } else {
        return null;
    }
}

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

export function formatGoal(goal: Goal): string {
    if (goal.kind === "length") {
        return `Find ${formatSegmentName(goal.segment)}`;
    }
    if (goal.kind === "angle") {
        return `Find ${formatAngleName(goal.angle)}`;
    }
    return `Prove ${formatSegmentName(goal.seg1)} ⟂ ${formatSegmentName(goal.seg2)}`;
}

export function formatConditions(condition: Condition): string | null{
    if (condition.kind === "fact") {
        return formatFact(condition.fact);
    } else if (condition.kind === "equation") {
        return `${formatSegmentName(condition.equation.a)} = ${formatSegmentName(condition.equation.b)}`;
    } else if (condition.kind === "value") {
        return (formatGivenValue(condition.target))
    }
    return null;
}