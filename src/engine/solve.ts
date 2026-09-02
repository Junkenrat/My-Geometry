import { Problem } from "./problem";
import { propagate } from "./relations";
import { factsEqual } from "./facts";
import type { Condition } from "./conditions";
import {
    betweennessLength, equilateralTriangle, intersections, linearPairs,
    pointOnSegment, perpendicularAngles, perpendicularFromAngle, pythagoras,
    rightTriangleFromAngle, triangleAngleSum, verticalAngles,
} from "./theorems";

const THEOREMS = [
    intersections, pointOnSegment, betweennessLength, perpendicularAngles,
    verticalAngles, linearPairs, triangleAngleSum, equilateralTriangle,
    rightTriangleFromAngle, pythagoras, perpendicularFromAngle,
];
const MAX_ITERATIONS = 200;
const EPS = 0.000001;

// Whether a statement is established: a fact is on record, or every measure it
// mentions is known and the numbers agree. This is what a "Prove …" goal checks.
export function conditionHolds(problem: Problem, c: Condition): boolean {
    const known = (id: string) => problem.quantities.value(id);
    if (c.kind === "fact") {
        return problem.facts.some(f => factsEqual(f, c.fact));
    }
    if (c.kind === "value") {
        const g = c.target;
        const v = known(g.kind === "length" ? problem.lengthId(g.segment) : problem.angleId(g.angle));
        return v !== null && Math.abs(v - g.value) < EPS;
    }
    if (c.kind === "angle_value") {
        const v = known(problem.angleIdOf(c.angle));
        return v !== null && Math.abs(v - c.value) < EPS;
    }
    if (c.kind === "triangle") {
        const t = problem.getTriangle(c.triangle.p1.id, c.triangle.p2.id, c.triangle.p3.id);
        if (t === undefined) return false;
        const prop = c.property;
        return problem.facts.some(f => {
            if (prop.kind === "right") {
                return f.kind === "right_triangle" && f.triangle === t && f.rightAngleAt === prop.vertex;
            }
            return (f.kind === "equilateral" || f.kind === "obtuse" || f.kind === "acute")
                && f.kind === prop.kind && f.triangle === t;
        });
    }
    const e = c.equation;
    if (e.kind === "angles_equal") {
        const va = known(problem.angleIdOf(e.a)), vb = known(problem.angleIdOf(e.b));
        return va !== null && vb !== null && Math.abs(va - vb) < EPS;
    }
    const va = known(problem.lengthId(e.a)), vb = known(problem.lengthId(e.b));
    if (va === null || vb === null) return false;
    return e.kind === "segments_equal" ? Math.abs(va - vb) < EPS : Math.abs(va - e.value * vb) < EPS;
}

export function isSolved(problem: Problem): boolean {
    const goal = problem.goal;
    if (goal === null) return false;
    if (goal.kind === "length") {
        return problem.quantities.value(problem.lengthId(goal.segment)) !== null;
    }
    if (goal.kind === "angle") {
        return problem.quantities.value(problem.angleIdOf(goal.angle)) !== null;
    }
    return conditionHolds(problem, goal.condition);
}

export function solve(problem: Problem): boolean {
    for (let i = 0; i < MAX_ITERATIONS; i++) {
        const factCount = problem.facts.length;
        const relationCount = problem.relations.size;
        const assignmentCount = problem.quantities.assignments.length;
        // Пробуем все теоремы и генерируем новые факты
        for (const theorem of THEOREMS) {
            theorem(problem);
        }
        // Вычисляем все возможные значения, используя отношения
        propagate(problem.quantities, problem.relations.values());
        if (problem.facts.length === factCount &&
            problem.relations.size === relationCount &&
            problem.quantities.assignments.length === assignmentCount) {
            break;
        }
    }
    return isSolved(problem);
}
