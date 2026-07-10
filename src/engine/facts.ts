import type { Segment, Angle, Triangle, Point } from "./types";

export type Reason =
  | { kind: "given" }
  | { kind: "derived"; theorem: string; premises: Fact[] };

export type GivenValue =
  | { kind: "length"; segment: Segment; value: number }
  | { kind: "angle"; angle: Angle; value: number };

// Structural facts about the configuration
export interface TriangleFact {
    readonly kind: "triangle";
    readonly triangle: Triangle;
    readonly reason: Reason;
}

export interface RightTriangleFact {
    readonly kind: "right_triangle";
    readonly triangle: Triangle;
    readonly rightAngleAt: Point;
    readonly reason: Reason;
}

export interface PerpendicularFact {
    readonly kind: "perpendicular";
    readonly seg1: Segment;
    readonly seg2: Segment;
    readonly reason: Reason;
}

export interface BetweenFact {
    readonly kind: "between";
    readonly point: Point;
    readonly from: Point;
    readonly to: Point;
    readonly reason: Reason;
}

export type Fact = TriangleFact | RightTriangleFact | PerpendicularFact | BetweenFact;

export type Goal =
    | { kind: "length"; segment: Segment }
    | { kind: "angle"; angle: Angle }
    | { kind: "perpendicular"; seg1: Segment; seg2: Segment };

// Whether a fact carries information the user cares about or it's only used by the engine
export function isMeaningfulFact(fact: Fact): boolean {
    return fact.kind === "perpendicular" || fact.kind === "right_triangle";
}

export function factsEqual(a: Fact, b: Fact): boolean {
    if (a.kind !== b.kind) return false;
    if (a.kind === "perpendicular" && b.kind === "perpendicular") {
        if (a.seg1 === b.seg1 && a.seg2 === b.seg2) {
            return true;
        }
        if (a.seg1 === b.seg2 && a.seg2 === b.seg1) {
            return true;
        }
    }
    if (a.kind === "right_triangle" && b.kind === "right_triangle") {
        if (a.rightAngleAt === b.rightAngleAt && a.triangle === b.triangle) {
            return true;
        }
    }
    if (a.kind === "triangle" && b.kind === "triangle") {
        if (a.triangle === b.triangle) {
            return true;
        }
    }
    if (a.kind === "between" && b.kind === "between") {
        if (a.point === b.point) {
            if ((a.from === b.to && a.to === b.from) ||
                (a.from === b.from && a.to === b.to)) {
                    return true;
            }
        }
    }
    return false;
}
