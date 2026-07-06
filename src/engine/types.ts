export interface Point {
    // Identity: stable, generated (p0, p1, ...). Never shown to the user.
    readonly id: string;
    // Name: assigned later by the presentation layer (naming.ts). May not exist yet.
    label: string | null; // Changeable
    readonly x: number;
    readonly y: number;
}

// Display name for a point that may not have been named yet.
export function pointName(p: Point): string {
    return p.label ?? p.id;
}

export interface Line {
    readonly id: string;
    label: string | null; 
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

export interface Circle {
    readonly center: Point | null;
    readonly through: Point | null;
}

export type Tool = "point" | "segment" | "cursor";
