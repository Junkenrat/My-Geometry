import type { Segment, Angle, Triangle, Point } from "./types";

// Откуда взялся факт - либо задан по условию (given),
// либо выведен программой через теоремы (derived).
export type Reason =
  | { kind: "given" }
  // theorem - имя теоремы источника; premises - список фактов, которые использовала эта теорема.
  | { kind: "derived"; theorem: string; premises: Fact[] };
  
// Числовой факт
export type GivenValue =
  | { kind: "length"; segment: Segment; value: number }
  | { kind: "angle"; angle: Angle; value: number };

// Структурные факты о чертеже - теоремы обращаются именно к ним.
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

export interface ParallelFact {
    readonly kind: "parallel";
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

export type Fact = RightTriangleFact | PerpendicularFact | ParallelFact | BetweenFact;

// Цель задачи - значение объекта или факт.
export type Goal =
    | { kind: "length"; segment: Segment }
    | { kind: "angle"; angle: Angle }
    | { kind: "perpendicular"; seg1: Segment; seg2: Segment };

// Флаг, показывающий содержит ли факт информацию, полезную для пользователя, или использующуюсю только движком.
export function isMeaningfulFact(fact: Fact): boolean {
    return fact.kind === "perpendicular" || fact.kind === "parallel" || fact.kind === "right_triangle";
}

// Сравнение фактов
export function factsEqual(a: Fact, b: Fact): boolean {
    if (a.kind !== b.kind) return false;
    if ((a.kind === "perpendicular" && b.kind === "perpendicular")
        || (a.kind === "parallel" && b.kind === "parallel")) {
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
