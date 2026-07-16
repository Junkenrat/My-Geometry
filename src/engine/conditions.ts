import type { Fact, GivenValue } from "./facts";
import type { Segment } from "./types";

export type Condition = 
    | { kind: "fact", fact: Fact }
    | { kind: "value", target: GivenValue }
    | { kind: "equation"; equation: Equation };

export type Equation =
    | { kind: "segments_equal"; a: Segment; b: Segment }
    // a / b = value
    | { kind: "segments_ratio"; a: Segment; b: Segment; value: number };
   