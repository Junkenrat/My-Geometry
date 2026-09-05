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
