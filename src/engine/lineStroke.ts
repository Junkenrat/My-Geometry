import { Problem } from "./problem";
import type { Line } from "./types";

// How far a drawn line extends past the outermost point lying on it
export const LINE_OVERHANG = 55;
const EPS = 0.000001;

export interface LineStroke {
    x1: number; y1: number;
    x2: number; y2: number;
    labelX: number; labelY: number;
}

// Endpoints for drawing an infinite line as a sketch stroke: cover every
// problem point lying on the line, plus a fixed overhang on both sides.
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
    const x2 = p1.x + t2 * dx;
    const y2 = p1.y + t2 * dy;
    return {
        x1: p1.x + t1 * dx,
        y1: p1.y + t1 * dy,
        x2,
        y2,
        // label sits at the far overhang end, nudged off the stroke
        labelX: x2 - (dy / len) * 12,
        labelY: y2 + (dx / len) * 12,
    };
}
