import type { Problem } from "./problem";
import type { Point } from "./types";

const EPS = 0.001;

export interface Direction {
    readonly x: number;
    readonly y: number;
}

// Куда отодвинуть имя точки, если рядом нет ни одной линии: вверх-вправо,
// как повелось.
const DEFAULT_DIRECTION: Direction = { x: Math.SQRT1_2, y: -Math.SQRT1_2 };

// Лежит ли точка на прямой, заданной двумя точками.
function onLine(a: Point, b: Point, p: Point): boolean {
    const dx = b.x - a.x, dy = b.y - a.y;
    const length = Math.hypot(dx, dy);
    if (length < EPS) return false;
    return Math.abs((p.x - a.x) * dy - (p.y - a.y) * dx) / length < EPS;
}

// Направления всех линий, выходящих из точки или проходящих через неё. Имя
// точки ставится в стороне от них, иначе линия перечёркивает букву.
function occupiedDirections(problem: Problem, point: Point): number[] {
    const angles: number[] = [];
    const add = (dx: number, dy: number) => {
        if (Math.hypot(dx, dy) < EPS) return;
        angles.push(Math.atan2(dy, dx));
    };
    const addBoth = (dx: number, dy: number) => { add(dx, dy); add(-dx, -dy); };

    // Отрезок занимает направление только если точка — его конец: точка внутри
    // отрезка делит его надвое, и обе половинки придут сюда сами.
    for (const seg of problem.segments.values()) {
        if (seg.p1 === point) add(seg.p2.x - point.x, seg.p2.y - point.y);
        else if (seg.p2 === point) add(seg.p1.x - point.x, seg.p1.y - point.y);
    }

    // Прямая продолжается в обе стороны, луч — только вперёд, но если точка
    // не его начало, то позади неё луч тоже нарисован.
    for (const line of problem.lines.values()) {
        if (line.kind !== "drawn" || !onLine(line.p1, line.p2, point)) continue;
        addBoth(line.p2.x - line.p1.x, line.p2.y - line.p1.y);
    }
    for (const ray of problem.rays.values()) {
        if (ray.kind !== "drawn") continue;
        const dx = ray.through.x - ray.start.x, dy = ray.through.y - ray.start.y;
        if (!onLine(ray.start, ray.through, point)) continue;
        // Позади начала луча ничего не нарисовано.
        if ((point.x - ray.start.x) * dx + (point.y - ray.start.y) * dy < -EPS) continue;
        add(dx, dy);
        if (ray.start !== point) add(-dx, -dy);
    }

    // Окружность в точке касания идёт поперёк радиуса — в обе стороны.
    for (const circle of problem.circles.values()) {
        const dx = point.x - circle.center.x, dy = point.y - circle.center.y;
        if (Math.abs(Math.hypot(dx, dy) - circle.radius) > EPS) continue;
        addBoth(-dy, dx);
    }

    return angles;
}

// Просветы считаются одинаковыми, если различаются меньше чем на это.
const GAP_TIE = 0.05;

// Середина самого широкого просвета между занятыми направлениями. Равные
// просветы — обычное дело: точка внутри отрезка делит круг ровно пополам.
// Ничью разрешаем в сторону outward, иначе имя встанет то снаружи фигуры,
// то внутри неё без всякой причины.
function widestGap(angles: number[], outward: Direction | null): Direction {
    const sorted = [...angles].sort((a, b) => a - b);
    const gaps = sorted.map((from, i) => {
        const to = i + 1 < sorted.length ? sorted[i + 1]! : sorted[0]! + 2 * Math.PI;
        return { size: to - from, middle: from + (to - from) / 2 };
    });
    const widest = Math.max(...gaps.map(gap => gap.size));
    const outwardness = (middle: number) => outward === null ? 0
        : Math.cos(middle) * outward.x + Math.sin(middle) * outward.y;
    const best = gaps
        .filter(gap => gap.size > widest - GAP_TIE)
        .reduce((a, b) => outwardness(b.middle) > outwardness(a.middle) ? b : a);
    return { x: Math.cos(best.middle), y: Math.sin(best.middle) };
}

// Середина чертежа. Числовые подписи и имена точек уводятся от неё, чтобы
// ложиться снаружи фигуры, а не внутрь.
export function drawingCenter(problem: Problem): { x: number; y: number } | null {
    let sumX = 0, sumY = 0, count = 0;
    for (const point of problem.points.values()) {
        sumX += point.x; sumY += point.y; count++;
    }
    return count === 0 ? null : { x: sumX / count, y: sumY / count };
}

// Куда отодвигать имя каждой названной точки. Единичный вектор; насколько
// далеко отодвигать — дело холста.
export function labelDirections(problem: Problem): Map<Point, Direction> {
    const center = drawingCenter(problem);
    const result = new Map<Point, Direction>();
    for (const point of problem.points.values()) {
        if (point.label === null) continue;
        const occupied = occupiedDirections(problem, point);
        if (occupied.length === 0) {
            result.set(point, DEFAULT_DIRECTION);
            continue;
        }
        const away = center === null ? null : normalized(point.x - center.x, point.y - center.y);
        result.set(point, widestGap(occupied, away));
    }
    return result;
}

function normalized(dx: number, dy: number): Direction | null {
    const length = Math.hypot(dx, dy);
    return length < EPS ? null : { x: dx / length, y: dy / length };
}
