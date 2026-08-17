import { Problem } from "./problem";
import type { Point } from "./types";

// Присваивает буквы безымянным точкам - возможно не нужно
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

// Присваивает имя точке в случае сбоя - возможно не нужно
export function ensureLabel(problem: Problem, point: Point): void {
    if (point.label !== null) return;
    point.label = firstFreeLabel(usedLabels(problem));
}

// Буква, которую получит следующий неназванный элемент от assignLabels, 
// используется для предварительного просмотра.
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
