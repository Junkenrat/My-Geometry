import type { Fact, GivenValue } from "./facts";
import { factPoints } from "./facts";
import type { Point, Segment } from "./types";

// Угол, заданный тремя точками (вершина посередине). Условие несёт именно
// точки, а не объект Angle: парсер не имеет права мутировать чертёж, поэтому
// сам угол материализуется через addAngle только в applyCondition.
export type AnglePoints = { vertex: Point; thr1: Point; thr2: Point };

// Треугольник тремя точками — материализуется через addTriangle в applyCondition.
export type TrianglePoints = { p1: Point; p2: Point; p3: Point };

// Свойство треугольника, задаваемое пользователем.
export type TriangleProperty =
    | { kind: "right"; vertex: Point }      // прямой угол при vertex
    | { kind: "equilateral" }               // равносторонний
    | { kind: "obtuse" }                    // тупоугольный (инертно)
    | { kind: "acute" };                    // остроугольный (инертно)

// Факты, которые может ввести пользователь:
export type Condition =
    | { kind: "fact", fact: Fact } // обычное утверждение -> addFact
    | { kind: "value", target: GivenValue } // присвоить числовое значение объекту (AB = 5...)
    | { kind: "angle_value"; angle: AnglePoints; value: number } // ∠ABC = 60
    | { kind: "triangle"; triangle: TrianglePoints; property: TriangleProperty } // △ABC right B ...
    | { kind: "equation"; equation: Equation }; // связь между двумя объектами

// Cвязь между объектами -> создает relation:
export type Equation =
    | { kind: "segments_equal"; a: Segment; b: Segment } // равенство (AB = CD)
    // a / b = value
    | { kind: "segments_ratio"; a: Segment; b: Segment; value: number } // отношение (AB / CD = 1 / 2)
    | { kind: "angles_equal"; a: AnglePoints; b: AnglePoints }; // равенство углов (∠ABC = ∠DEF)

// Все точки, на которые ссылается условие — для чистки при удалении точки.
function anglePts(a: AnglePoints): Point[] {
    return [a.vertex, a.thr1, a.thr2];
}

export function conditionPoints(c: Condition): Point[] {
    switch (c.kind) {
        case "fact":
            return factPoints(c.fact);
        case "value":
            return c.target.kind === "length"
                ? [c.target.segment.p1, c.target.segment.p2]
                : [c.target.angle.vertex, c.target.angle.ray1.through, c.target.angle.ray2.through];
        case "angle_value":
            return anglePts(c.angle);
        case "triangle": {
            const pts = [c.triangle.p1, c.triangle.p2, c.triangle.p3];
            if (c.property.kind === "right") pts.push(c.property.vertex);
            return pts;
        }
        case "equation":
            return c.equation.kind === "angles_equal"
                ? [...anglePts(c.equation.a), ...anglePts(c.equation.b)]
                : [c.equation.a.p1, c.equation.a.p2, c.equation.b.p1, c.equation.b.p2];
    }
}
