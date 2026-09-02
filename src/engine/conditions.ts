import type { Fact, GivenValue } from "./facts";
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
