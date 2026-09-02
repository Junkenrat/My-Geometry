import type { Segment, Angle, Triangle, Point } from "./types";
import type { AnglePoints, Condition } from "./conditions";

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

// Равносторонний: все стороны равны, все углы 60°.
export interface EquilateralFact {
    readonly kind: "equilateral";
    readonly triangle: Triangle;
    readonly reason: Reason;
}

// Тупоугольный / остроугольный — распознаются и хранятся, но пока инертны:
// движок оперирует равенствами, а это ограничения-неравенства (угол > 90 и т.п.).
export interface ObtuseFact {
    readonly kind: "obtuse";
    readonly triangle: Triangle;
    readonly reason: Reason;
}

export interface AcuteFact {
    readonly kind: "acute";
    readonly triangle: Triangle;
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

export type Fact = RightTriangleFact | EquilateralFact
    | ObtuseFact | AcuteFact | PerpendicularFact | ParallelFact | BetweenFact;

// Цель задачи - значение объекта или факт.
export type Goal =
    | { kind: "length"; segment: Segment }      // найти длину
    | { kind: "angle"; angle: AnglePoints }     // найти величину угла
    | { kind: "prove"; condition: Condition };  // доказать утверждение

// Флаг, показывающий содержит ли факт информацию, полезную для пользователя, или использующуюсю только движком.
export function isMeaningfulFact(fact: Fact): boolean {
    return fact.kind !== "between";
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
    if ((a.kind === "equilateral" && b.kind === "equilateral")
        || (a.kind === "obtuse" && b.kind === "obtuse")
        || (a.kind === "acute" && b.kind === "acute")) {
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
