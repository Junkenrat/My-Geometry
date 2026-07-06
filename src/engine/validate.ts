import type { Conflict } from "./quantities";
import { propagate } from "./relations";
import type { Problem } from "./problem";

export type { Conflict } from "./quantities";

// Contradictions are detected by the propagation engine itself: a relation
// whose slots are all known checks the equation, and assigning a second,
// different value to a known quantity is reported instead of overwriting.
export function validate(problem: Problem): Conflict[] {
    propagate(problem.quantities, problem.relations.values());
    return problem.quantities.conflicts;
}
