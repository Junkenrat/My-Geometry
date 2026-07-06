import type { Segment } from "./types";

export function segmentIntersection(a: Segment, b: Segment): {x: number, y: number} | null {
    const denom = (a.p1.x - a.p2.x) * (b.p1.y - b.p2.y) - (a.p1.y - a.p2.y) * (b.p1.x - b.p2.x);
    if (denom === 0) return null;
    const t = ((a.p1.x - b.p1.x) * (b.p1.y - b.p2.y) - (a.p1.y - b.p1.y) * (b.p1.x - b.p2.x)) / denom;
    const u = ((a.p1.x - b.p1.x) * (a.p1.y - a.p2.y) - (a.p1.y - b.p1.y) * (a.p1.x - a.p2.x)) / denom;
    if (t > 0 && t < 1 && u > 0 && u < 1) {
        const intersectX = a.p1.x + t * (a.p2.x - a.p1.x);
        const intersectY = a.p1.y + t * (a.p2.y - a.p1.y);
        return { x: intersectX, y: intersectY };
    }
    return null;
}   