import { Problem } from "./problem";
import { propagate } from "./relations";
import {
    betweennessLength, intersections, linearPairs, pointOnSegment,
    pythagoras, triangleAngleSum, verticalAngles,
} from "./theorems";

const THEOREMS = [
    intersections, pointOnSegment, betweennessLength,
    verticalAngles, linearPairs, triangleAngleSum, pythagoras,
];
const MAX_ITERATIONS = 200;

export function isSolved(problem: Problem): boolean {
    const goal = problem.goal;
    if (goal === null) return false;
    if (goal.kind === "length") {
        return problem.quantities.value(problem.lengthId(goal.segment)) !== null;
    }
    if (goal.kind === "angle") {
        return problem.quantities.value(problem.angleId(goal.angle)) !== null;
    }
    return problem.facts.some(f => f.kind === "perpendicular" &&
        ((f.seg1 === goal.seg1 && f.seg2 === goal.seg2) ||
         (f.seg1 === goal.seg2 && f.seg2 === goal.seg1)));
}

export function solve(problem: Problem): boolean {
    for (let i = 0; i < MAX_ITERATIONS; i++) {
        const factCount = problem.facts.length;
        const relationCount = problem.relations.size;
        const assignmentCount = problem.quantities.assignments.length;
        // 1. Theorems recognize configurations and emit facts/relations
        for (const theorem of THEOREMS) {
            theorem(problem);
        }
        // 2. The propagation engine computes every value the relations pin down
        propagate(problem.quantities, problem.relations.values());
        if (problem.facts.length === factCount &&
            problem.relations.size === relationCount &&
            problem.quantities.assignments.length === assignmentCount) {
            break;
        }
    }
    return isSolved(problem);
}
