export interface Point {
    readonly id: string;
    // Name -> naming.ts; may not exist!
    label: string | null; // Changeable
    // Координаты изменяемы: инструмент move двигает саму точку, а всё, что на
    // неё ссылается (отрезки, лучи, прямые, окружность с этим центром),
    // переезжает вместе с ней само собой.
    x: number;
    y: number;
}

// Display name for a point that may not have been named yet
export function pointName(p: Point): string {
    return p.label ?? p.id;
}

// Имя объекта не должно зависеть от того, в каком порядке его точки попали
// в модель (её задаёт случайность построения): буквы всегда идут по алфавиту.
// У угла вершина обязана остаться в середине, поэтому сортируются только стороны.
export function segmentName(p1: Point, p2: Point): string {
    return [pointName(p1), pointName(p2)].sort().join("");
}

export function angleName(vertex: Point, a: Point, b: Point): string {
    const [first, second] = [pointName(a), pointName(b)].sort();
    return `∠${first}${pointName(vertex)}${second}`;
}

// Носитель направления: отрезок, луч и прямая — все задаются парой точек, и
// свойства «параллельны»/«перпендикулярны» относятся именно к направлению,
// а не к длине. Длина же есть только у отрезка.
export type Carrier = Segment | Ray | Line;

export function carrierPoints(c: Carrier): [Point, Point] {
    return "start" in c ? [c.start, c.through] : [c.p1, c.p2];
}

// Лежат ли носители на одной прямой. Подотрезок, луч и прямая вдоль одного
// направления — одна линия, хотя объекты разные.
export function sameCarrierLine(c1: Carrier, c2: Carrier): boolean {
    const [a1, b1] = carrierPoints(c1);
    const [a2, b2] = carrierPoints(c2);
    const dx = b1.x - a1.x, dy = b1.y - a1.y;
    if (Math.abs(dx) < 1e-6 && Math.abs(dy) < 1e-6) return false;
    const on = (p: Point) => Math.abs(dx * (p.y - a1.y) - dy * (p.x - a1.x)) < 1e-6;
    return on(a2) && on(b2);
}

export function carrierName(c: Carrier): string {
    const [a, b] = carrierPoints(c);
    return segmentName(a, b);
}

export function triangleName(p1: Point, p2: Point, p3: Point): string {
    return `△${[pointName(p1), pointName(p2), pointName(p3)].sort().join("")}`;
}

// Lines have no name of their own: they are always referred to
// through two of their points, like segments.
export interface Line {
    readonly id: string;
    readonly p1: Point;
    readonly p2: Point;
    kind: "drawn" | "implicit";
}

export interface Segment {
    readonly p1: Point;
    readonly p2: Point;
    readonly line: Line;
    // "drawn" — часть построенной фигуры; "split" — половинка, появившаяся
    // оттого, что точка легла внутрь другого отрезка. Вторые существуют лишь
    // пока это попадание в силе, поэтому при переезде точки пересматриваются.
    kind: "drawn" | "split";
}

export interface Ray {
    readonly start: Point;
    readonly through: Point;
    readonly line: Line;
    // "drawn" — луч построен пользователем и рисуется; "implicit" — служебный,
    // созданный отрезком или углом.
    kind: "drawn" | "implicit";
}

export interface Angle {
    readonly vertex: Point;
    readonly ray1: Ray;
    readonly ray2: Ray;
}

export interface Triangle {
    readonly p1: Point;
    readonly p2: Point;
    readonly p3: Point;
}

export interface Square {
    readonly p1: Point;
    readonly p2: Point;
    readonly p3: Point;
    readonly p4: Point;
}

// A circle has no name of its own; it is a center and a radius. The point that
// fixed the radius is not stored — it only lives on the drawing if it already
// existed as a point of its own.
export interface Circle {
    readonly id: string;
    readonly center: Point;
    readonly radius: number;
}

export type Tool = "point" | "segment" | "cursor";
