import type { Fact, GivenValue } from "./facts";
import type { Segment } from "./types";

// Факты, которые может ввести пользователь:
export type Condition = 
    | { kind: "fact", fact: Fact } // обычное утверждение -> addFact
    | { kind: "value", target: GivenValue } // присвоить числовое значение объекту (AB = 5...)
    | { kind: "equation"; equation: Equation }; // связь между двумя объектами

// Cвязь между объектами -> создает relation:
export type Equation =
    | { kind: "segments_equal"; a: Segment; b: Segment } // равенство (AB = CD)
    // a / b = value
    | { kind: "segments_ratio"; a: Segment; b: Segment; value: number }; // отношение (AB / CD = 1 / 2)
   