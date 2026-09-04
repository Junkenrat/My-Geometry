import type { Point, Segment } from "./types";

export type Vec = { readonly x: number; readonly y: number };

const EPS = 1e-9;

// Пересечения окружности (центр c, радиус r) с прямой-носителем через a и b.
// Носитель ограничен параметром t = точка a + t·(b−a): отрезок → [0,1],
// луч → [0,∞), прямая → (−∞,∞). tMin/tMax задают этот диапазон.
export function circleLineIntersections(
    c: Vec, r: number, a: Vec, b: Vec, tMin: number, tMax: number,
): Vec[] {
    const dx = b.x - a.x, dy = b.y - a.y;
    const A = dx * dx + dy * dy;
    if (A === 0) return [];
    const fx = a.x - c.x, fy = a.y - c.y;
    const B = 2 * (fx * dx + fy * dy);
    const C = fx * fx + fy * fy - r * r;
    const disc = B * B - 4 * A * C;
    if (disc < -EPS) return [];
    const inRange = (t: number) => t >= tMin - EPS && t <= tMax + EPS;
    const at = (t: number): Vec => ({ x: a.x + t * dx, y: a.y + t * dy });
    // disc ≈ 0 — касание: единственный корень (иначе вернулись бы две копии).
    if (disc < EPS) {
        const t = -B / (2 * A);
        return inRange(t) ? [at(t)] : [];
    }
    const sq = Math.sqrt(disc);
    const result: Vec[] = [];
    for (const t of [(-B - sq) / (2 * A), (-B + sq) / (2 * A)]) {
        if (inRange(t)) result.push(at(t));
    }
    return result;
}

// Точки пересечения двух окружностей (0, 1 при касании, или 2).
export function circleCircleIntersections(c1: Vec, r1: number, c2: Vec, r2: number): Vec[] {
    const dx = c2.x - c1.x, dy = c2.y - c1.y;
    const d = Math.hypot(dx, dy);
    if (d < EPS) return [];                        // концентрические
    if (d > r1 + r2 + EPS) return [];              // слишком далеко
    if (d < Math.abs(r1 - r2) - EPS) return [];    // одна внутри другой
    const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d);
    const h2 = r1 * r1 - a * a;
    const h = h2 > 0 ? Math.sqrt(h2) : 0;
    const mx = c1.x + (a * dx) / d, my = c1.y + (a * dy) / d;
    if (h < EPS) return [{ x: mx, y: my }];        // касание — одна точка
    const ox = (-dy / d) * h, oy = (dx / d) * h;
    return [{ x: mx + ox, y: my + oy }, { x: mx - ox, y: my - oy }];
}

// Пересекаются ли отрезки p1p2 и p3p4 во ВНУТРЕННИХ точках (строго): общая
// вершина или касание концом пересечением не считаются. Нужно для запрета
// самопересекающегося («бабочка») четырёхугольника.
export function segmentsCross(p1: Point, p2: Point, p3: Point, p4: Point): boolean {
    const denom = (p1.x - p2.x) * (p3.y - p4.y) - (p1.y - p2.y) * (p3.x - p4.x);
    if (denom === 0) return false;
    const t = ((p1.x - p3.x) * (p3.y - p4.y) - (p1.y - p3.y) * (p3.x - p4.x)) / denom;
    const u = ((p1.x - p3.x) * (p1.y - p2.y) - (p1.y - p3.y) * (p1.x - p2.x)) / denom;
    return t > 0 && t < 1 && u > 0 && u < 1;
}

// Возвращает точку пересечения двух отрезков
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