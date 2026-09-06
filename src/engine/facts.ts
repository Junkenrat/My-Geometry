import type { Segment, Angle, Triangle, Point, Carrier } from "./types";
import { carrierPoints, sameCarrierLine } from "./types";
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

// a и b — носители: отрезок, луч или прямая. Перпендикулярность и
// параллельность — свойства направления, поэтому длина здесь ни при чём.
export interface PerpendicularFact {
    readonly kind: "perpendicular";
    readonly a: Carrier;
    readonly b: Carrier;
    readonly reason: Reason;
}

export interface ParallelFact {
    readonly kind: "parallel";
    readonly a: Carrier;
    readonly b: Carrier;
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

// Все точки, на которые ссылается факт — для чистки при удалении точки ластиком.
export function factPoints(fact: Fact): Point[] {
    switch (fact.kind) {
        case "right_triangle":
            return [fact.triangle.p1, fact.triangle.p2, fact.triangle.p3, fact.rightAngleAt];
        case "equilateral":
        case "obtuse":
        case "acute":
            return [fact.triangle.p1, fact.triangle.p2, fact.triangle.p3];
        case "perpendicular":
        case "parallel":
            return [...carrierPoints(fact.a), ...carrierPoints(fact.b)];
        case "between":
            return [fact.point, fact.from, fact.to];
    }
}

// Говорят ли два факта о направлении одно и то же. ⊥ и ∥ — свойства прямых,
// поэтому "AK ∥ DL" про подотрезки и "AB ∥ CD" про целые отрезки — одно
// утверждение, и держать в базе оба незачем.
export function sameDirectionFact(x: Fact, y: Fact): boolean {
    if (x.kind !== y.kind) return false;
    if (x.kind !== "perpendicular" && x.kind !== "parallel") return false;
    if (y.kind !== "perpendicular" && y.kind !== "parallel") return false;
    return (sameCarrierLine(x.a, y.a) && sameCarrierLine(x.b, y.b))
        || (sameCarrierLine(x.a, y.b) && sameCarrierLine(x.b, y.a));
}

// Сравнение фактов
export function factsEqual(a: Fact, b: Fact): boolean {
    if (a.kind !== b.kind) return false;
    if ((a.kind === "perpendicular" && b.kind === "perpendicular")
        || (a.kind === "parallel" && b.kind === "parallel")) {
        if (a.a === b.a && a.b === b.b) {
            return true;
        }
        if (a.a === b.b && a.b === b.a) {
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
