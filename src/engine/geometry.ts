import type { Point, Segment } from "./types";

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