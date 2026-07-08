import { Problem } from "./problem";
import type { Point } from "./types";

// Hands out letters to points that don't have a name yet. Using geometric order determinism
export function assignLabels(problem: Problem): void {
    const used = usedLabels(problem);
    const unnamed = Array.from(problem.points.values())
        .filter(point => point.label === null)
        .sort((a, b) => a.x - b.x || a.y - b.y);
    for (const point of unnamed) {
        const label = firstFreeLabel(used);
        used.add(label);
        point.label = label;
    }
}

// Targeted fallback: name a single point (and only it), e.g. when the user
// skips its naming dialog while other points are still waiting for theirs
export function ensureLabel(problem: Problem, point: Point): void {
    if (point.label !== null) return;
    point.label = firstFreeLabel(usedLabels(problem));
}

// Suggested name for the next line; first free lowercase letter
export function nextFreeLineLabel(problem: Problem): string {
    const used = new Set<string>();
    for (const line of problem.lines.values()) {
        if (line.label !== null) used.add(line.label);
    }
    for (let index = 0; ; index++) {
        const label = letterAt(index).toLowerCase();
        if (!used.has(label)) return label;
    }
}

// The letter the next unnamed point would receive from assignLabels. Used for the preview
export function nextFreeLabel(problem: Problem): string {
    return firstFreeLabel(usedLabels(problem));
}

function usedLabels(problem: Problem): Set<string> {
    const used = new Set<string>();
    for (const point of problem.points.values()) {
        if (point.label !== null) used.add(point.label);
    }
    return used;
}

function firstFreeLabel(used: Set<string>): string {
    for (let index = 0; ; index++) {
        const label = letterAt(index);
        if (!used.has(label)) return label;
    }
}

// A, B, ..., Z, A1, B1, ..., Z1, A2, ...
function letterAt(index: number): string {
    const letter = String.fromCharCode(65 + (index % 26));
    const round = Math.floor(index / 26);
    return round === 0 ? letter : `${letter}${round}`;
}
