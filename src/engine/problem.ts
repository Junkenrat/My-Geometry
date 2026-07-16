import type { Point, Line, Ray, Segment, Angle, Triangle } from "./types";
import { pointName } from "./types";
import type { Fact, GivenValue, Goal } from "./facts";
import { factsEqual } from "./facts";
import type { Quantity, QuantityId } from "./quantities";
import { QuantityStore } from "./quantities";
import type { Relation } from "./relations";
import { relationKey } from "./relations";
import type { Condition } from "./conditions";

const EPS = 0.000001;

export class Problem {
    points: Map<string, Point> = new Map();
    lines: Map<string, Line> = new Map();
    segments: Map<string, Segment> = new Map();
    rays: Map<string, Ray> = new Map();
    angles: Map<string, Angle> = new Map();
    triangles: Map<string, Triangle> = new Map();
    facts: Fact[] = [];
    relations: Map<string, Relation> = new Map();
    quantities: QuantityStore = new QuantityStore();
    conditions: Condition[] = [];
    goal: Goal | null = null;
    private nextPointNumber = 0;
    private nextLineNumber = 0;

    // All string arguments of get/add below are point ids

    getAngleKey(vertex: string, thr1: string, thr2: string): string {
        const keyA = `${vertex}>${thr1}`;
        const keyB = `${vertex}>${thr2}`;
        const sortedKeys: string[] = [keyA, keyB].sort();
        return `${vertex}:${sortedKeys[0]}|${sortedKeys[1]}`;
    }

    getLine(p1: string, p2: string): Line | undefined {
        const key = [p1, p2].sort().join("-");
        return this.lines.get(key);
    }

    getRay(start: string, through: string): Ray | undefined {
        const key = `${start}>${through}`;
        return this.rays.get(key);
    }

    getSegment(p1: string, p2: string): Segment | undefined {
        const key = [p1, p2].sort().join("-");
        return this.segments.get(key);
    }

    getAngle(vertex: string, thr1: string, thr2: string) {
        const key = this.getAngleKey(vertex, thr1, thr2);
        return this.angles.get(key);
    }

    getTriangle(p1: string, p2: string, p3: string) {
        const key = [p1, p2, p3].sort().join("-");
        return this.triangles.get(key);
    }

    // Creates a new point every time
    addPoint(x: number, y: number): Point {
        const id = `p${this.nextPointNumber}`;
        this.nextPointNumber += 1;
        const newPoint: Point = { id, label: null, x, y };
        this.points.set(id, newPoint);
        return newPoint;
    }

    removePoint(id: string): void {
        const point = this.requirePoint(id);
        const isReferenced =
            Array.from(this.lines.values()).some(l => l.p1 === point || l.p2 === point)
            || Array.from(this.rays.values()).some(r => r.start === point || r.through === point)
            || Array.from(this.segments.values()).some(s => s.p1 === point || s.p2 === point)
            || Array.from(this.triangles.values()).some(t => t.p1 === point || t.p2 === point || t.p3 === point)
            || this.facts.some(f =>
                (f.kind === "between" && (f.point === point || f.from === point || f.to === point))
                || (f.kind === "right_triangle" && f.rightAngleAt === point));
        if (isReferenced) {
            throw new Error(`Point "${id}" is referenced by other objects and cannot be removed.`);
        }
        this.points.delete(id);
    }

    renamePoint(id: string, label: string): string | null {
        const new_p = this.requirePoint(id);
        label = label.toUpperCase();
        if (!(/^[a-zA-Z]$/.test(label))) {
            return "Must be a single letter A-Z";
        }
        for (const point of this.points.values()) {
            if (point.id === id) continue;
            if (point.label === label) {
                return `Name "${label}" is already taken`;
            }
        }
        new_p.label = label;
        return null;
    }

    private requirePoint(id: string): Point {
        const p = this.points.get(id);
        if (p === undefined) {
            throw new Error(`Point "${id}" does not exist. Create it via addPoint first.`);
        }
        return p;
    }

    // Collinear lines passing through different pairs of points form different objects!
    addLine(p1: string, p2: string): Line {
        const key = [p1, p2].sort().join("-");
        const existing = this.lines.get(key);
        if (existing !== undefined) {
            return existing;
        }
        const id = `l${this.nextLineNumber}`;
        this.nextLineNumber += 1;
        const newLine: Line = {
            p1: this.requirePoint(p1),
            p2: this.requirePoint(p2),
            label: null,
            id: id,
            kind: "implicit"
        };
        this.lines.set(key, newLine);
        return newLine;
    }

    addExplicitLine(p1: string, p2: string): Line {
        const line = this.addLine(p1, p2);
        line.kind = "drawn";
        return line;
    }

    renameLine(id: string, label: string): string | null {
        const new_l = this.requireLine(id);
        label = label.toLowerCase();
        if (!(/^[a-z]$/.test(label))) {
            return "Must be a single letter a-z";
        }
        for (const line of this.lines.values()) {
            if (line.id === id) continue;
            if (line.label === label) {
                return `Name "${label}" is already taken`;
            }
        }
        new_l.label = label;
        return null;
    }

    private requireLine(id: string): Line {
        for (const line of this.lines.values()) {
            if (line.id === id) {
                return line;
            }
        }
        throw new Error(`Line "${id}" does not exist. Create it via addLine first.`);
    }


    addRay(start: string, thr: string): Ray {
        const key = `${start}>${thr}`;
        const existing = this.rays.get(key);
        if (existing !== undefined) {
            return existing;
        }
        const newRay: Ray = {
            start: this.requirePoint(start),
            through: this.requirePoint(thr),
            line: this.addLine(start, thr)
        };
        this.rays.set(key, newRay);
        return newRay;
    }

    addSegment(p1: string, p2: string): Segment {
        const key = [p1, p2].sort().join("-");
        const existing = this.segments.get(key);
        if (existing !== undefined) {
            return existing;
        }
        this.addRay(p1, p2);
        this.addRay(p2, p1);
        const newSegment: Segment = {
            p1: this.requirePoint(p1),
            p2: this.requirePoint(p2),
            line: this.addLine(p1, p2)
        };
        this.segments.set(key, newSegment);
        for (const thirdPoint of this.points.values()) {
            if (thirdPoint.id !== p1 && thirdPoint.id !== p2) {
                if (this.getSegment(thirdPoint.id, p1) !== undefined
                && this.getSegment(thirdPoint.id, p2) !== undefined) {
                    const area = (newSegment.p2.x - newSegment.p1.x) *
                        (thirdPoint.y - newSegment.p1.y) -
                        (newSegment.p2.y - newSegment.p1.y) *
                        (thirdPoint.x - newSegment.p1.x);
                    if (Math.abs(area) > EPS) {
                        this.addTriangle(p1, p2, thirdPoint.id);
                    }
                }
            }
        }
        return newSegment;
    }

    addAngle(vertex: string, thr1: string, thr2: string): Angle {
        const key = this.getAngleKey(vertex, thr1, thr2);
        const existing = this.angles.get(key);
        if (existing !== undefined) {
            return existing;
        }
        const newAngle: Angle = {
            vertex: this.requirePoint(vertex),
            ray1: this.addRay(vertex, thr1),
            ray2: this.addRay(vertex, thr2)
        };
        this.angles.set(key, newAngle);
        return newAngle;
    }

    addTriangle(p1: string, p2: string, p3: string): Triangle {
        const key = [p1, p2, p3].sort().join("-");
        const existing = this.triangles.get(key);
        if (existing !== undefined) {
            return existing;
        }
        this.addSegment(p1, p2);
        this.addSegment(p2, p3);
        this.addSegment(p3, p1);
        this.addAngle(p1, p2, p3);
        this.addAngle(p2, p1, p3);
        this.addAngle(p3, p1, p2);
        const newTriangle: Triangle = {
            p1: this.requirePoint(p1),
            p2: this.requirePoint(p2),
            p3: this.requirePoint(p3)
        }
        this.triangles.set(key, newTriangle);
        return newTriangle;
    }

    addFact(fact: Fact): void {
        if (this.facts.some(existing => factsEqual(existing, fact))) {
            return;
        }
        this.facts.push(fact);
    }

    getPointAt(x: number, y: number): Point | undefined {
        for (const point of this.points.values()) {
            if (Math.hypot(x - point.x, y - point.y) < EPS)  {
            return point;
            }
        }
        return undefined;
    }

    ensureSegment(p1: string, p2: string): Segment {
        return this.getSegment(p1, p2) ?? this.addSegment(p1, p2);
    }

    // --- quantities & relations -------------------------------------------

    lengthId(seg: Segment): QuantityId {
        return `len:${[seg.p1.id, seg.p2.id].sort().join("-")}`;
    }

    angleId(angle: Angle): QuantityId {
        return `ang:${this.getAngleKey(angle.vertex.id, angle.ray1.through.id, angle.ray2.through.id)}`;
    }

    lengthQuantity(seg: Segment): Quantity {
        return this.quantities.ensure(this.lengthId(seg),
            () => `${pointName(seg.p1)}${pointName(seg.p2)}`);
    }

    angleQuantity(angle: Angle): Quantity {
        return this.quantities.ensure(this.angleId(angle),
            () => `∠${pointName(angle.ray1.through)}${pointName(angle.vertex)}${pointName(angle.ray2.through)}`);
    }

    private applyGivenValue(given: GivenValue): void {
        if (given.kind === "length") {
            this.quantities.assign(this.lengthQuantity(given.segment).id, given.value, { kind: "given" });
        } else {
            this.quantities.assign(this.angleQuantity(given.angle).id, given.value, { kind: "given" });
        }
    }

    addCondition(condition: Condition): void {
        this.conditions.push(condition);
        this.applyCondition(condition);
    }

    private applyCondition(condition: Condition): void {
        if (condition.kind === "value") {
            this.applyGivenValue(condition.target);
        } else if (condition.kind === "equation") {
            // Equations connect segment LENGTHS: the relation refers to
            // quantity ids, not geometry ids. lengthQuantity also ensures both
            // quantities exist in the store before propagate touches them.
            const equation = condition.equation;
            if (equation.kind === "segments_equal") {
                this.addRelation({
                    kind: "equal",
                    a: this.lengthQuantity(equation.a).id,
                    b: this.lengthQuantity(equation.b).id,
                    reason: { theorem: "given", premises: [] }
                })
            } else {
                this.addRelation({
                    kind: "ratio",
                    a: this.lengthQuantity(equation.a).id,
                    b: this.lengthQuantity(equation.b).id,
                    value: equation.value,
                    reason: { theorem: "given", premises: [] }
                })
            }
        } else {
            this.addFact(condition.fact);
        }
    }

    removeCondition(index: number): void {
        const condition = this.conditions[index];
        if (condition === undefined) return;
        this.conditions.splice(index, 1);
        if (condition.kind === "fact") {
            this.facts = this.facts.filter(f => f !== condition.fact);
        }
        this.resetDerived();
    }

    setLength(seg: Segment, value: number): void {
        this.addCondition({ kind: "value", target: { kind: "length", segment: seg, value } });
    }

    setAngle(angle: Angle, value: number): void {
        this.addCondition({ kind: "value", target: { kind: "angle", angle, value } });
    }

    resetDerived(): void {
        this.facts = this.facts.filter(f => f.reason.kind === "given");
        this.relations.clear();
        this.quantities = new QuantityStore();
        for (const condition of this.conditions) {
            this.applyCondition(condition);
        }
    }

    setGoal(goal: Goal | null): void {
        this.goal = goal;
    }

    addRelation(rel: Relation): void {
        const key = relationKey(rel);
        if (!this.relations.has(key)) {
            this.relations.set(key, rel);
        }
    }
}
