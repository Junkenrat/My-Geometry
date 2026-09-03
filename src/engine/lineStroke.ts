import { Problem } from "./problem";
import type { Line, Ray } from "./types";

// Как далеко прямая выходит за крайнюю точку
export const LINE_OVERHANG = 55;
const EPS = 0.000001;

export interface LineStroke {
    x1: number; y1: number;
    x2: number; y2: number;
}

// Рисует прямую
export function lineDrawStroke(problem: Problem, line: Line, overhang: number = LINE_OVERHANG): LineStroke | null {
    const { p1, p2 } = line;
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len2 = dx * dx + dy * dy;
    if (len2 === 0) return null;
    let tMin = 0;
    let tMax = 1;
    for (const point of problem.points.values()) {
        const px = point.x - p1.x;
        const py = point.y - p1.y;
        const cross = dx * py - dy * px;
        if (Math.abs(cross) > EPS) continue;
        const t = (px * dx + py * dy) / len2;
        if (t < tMin) tMin = t;
        if (t > tMax) tMax = t;
    }
    const len = Math.sqrt(len2);
    const dt = overhang / len;
    const t1 = tMin - dt;
    const t2 = tMax + dt;
    return {
        x1: p1.x + t1 * dx,
        y1: p1.y + t1 * dy,
        x2: p1.x + t2 * dx,
        y2: p1.y + t2 * dy,
    };
}

// Рисует луч: от начала вперёд, за самую дальнюю лежащую на нём точку.
// Назад, за начало, луч не продолжается — этим он и отличается от прямой.
export function rayDrawStroke(problem: Problem, ray: Ray, overhang: number = LINE_OVERHANG): LineStroke | null {
    const { start, through } = ray;
    const dx = through.x - start.x;
    const dy = through.y - start.y;
    const len2 = dx * dx + dy * dy;
    if (len2 === 0) return null;
    let tMax = 1;
    for (const point of problem.points.values()) {
        const px = point.x - start.x;
        const py = point.y - start.y;
        const cross = dx * py - dy * px;
        if (Math.abs(cross) > EPS) continue;
        const t = (px * dx + py * dy) / len2;
        if (t > tMax) tMax = t;
    }
    const t2 = tMax + overhang / Math.sqrt(len2);
    return {
        x1: start.x,
        y1: start.y,
        x2: start.x + t2 * dx,
        y2: start.y + t2 * dy,
    };
}
