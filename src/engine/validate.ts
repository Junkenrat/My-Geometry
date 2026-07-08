import type { Conflict } from "./quantities";
import { propagate } from "./relations";
import type { Problem } from "./problem";
export type { Conflict } from "./quantities";

export function validate(problem: Problem): Conflict[] {
    propagate(problem.quantities, problem.relations.values());
    return problem.quantities.conflicts;
}
