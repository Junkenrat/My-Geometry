import { Problem } from "./problem";
import type { Angle } from "./types";
import { segmentIntersection } from "./geometry";

const EPS = 0.000001;

// right_triangle at C with legs a, b and hypotenuse c  =>  a² + b² = c², ∠C = 90°
export function pythagoras(problem: Problem): void {
    for (const fact of problem.facts) {
        if (fact.kind !== "right_triangle") continue;
        const allPoints = [fact.triangle.p1, fact.triangle.p2, fact.triangle.p3];
        const acutes = allPoints.filter(p => p !== fact.rightAngleAt);
        if (acutes.length !== 2) continue;
        const [first, second] = acutes;
        if (!first || !second) continue;
        const leg1 = problem.getSegment(first.id, fact.rightAngleAt.id);
        const leg2 = problem.getSegment(second.id, fact.rightAngleAt.id);
        const hyp = problem.getSegment(first.id, second.id);
        if (!leg1 || !leg2 || !hyp) continue;
        problem.addRelation({
            kind: "pythagoras",
            legs: [problem.lengthQuantity(leg1).id, problem.lengthQuantity(leg2).id],
            hyp: problem.lengthQuantity(hyp).id,
            reason: { theorem: "pythagoras", premises: [{ kind: "fact", fact }] },
        });
        const rightAngle = problem.getAngle(fact.rightAngleAt.id, first.id, second.id);
        if (rightAngle !== undefined) {
            problem.quantities.assign(problem.angleQuantity(rightAngle).id, 90, {
                kind: "derived",
                theorem: "right_angle",
                premises: [{ kind: "fact", fact }],
            });
        }
    }
}

export function intersections(problem: Problem): void {
    const segs = Array.from(problem.segments.values());
    for (let i = 0; i < segs.length; i++) {
        for (let j = i + 1; j < segs.length; j++) {
            const segA = segs[i], segB = segs[j];
            if (!segA || !segB) continue;
            const ip = segmentIntersection(segA, segB);
            if (ip === null) continue;
            // A materialized point exists without a name; naming is a
            // separate presentation pass (naming.ts).
            const point = problem.getPointAt(ip.x, ip.y) ?? problem.addPoint(ip.x, ip.y);
            problem.addFact({ kind: "between", point, from: segA.p1, to: segA.p2,
                reason: { kind: "derived", theorem: "intersection", premises: [] } });
            problem.addFact({ kind: "between", point, from: segB.p1, to: segB.p2,
                reason: { kind: "derived", theorem: "intersection", premises: [] } });
        }
    }
}

export function pointOnSegment(problem: Problem): void {
    for (const seg of problem.segments.values()) {
        for (const P of problem.points.values()) {
            if (P === seg.p1 || P === seg.p2) continue;
            const AB = { x: seg.p2.x - seg.p1.x, y: seg.p2.y - seg.p1.y };
            const AP = { x: P.x - seg.p1.x, y: P.y - seg.p1.y };
            const cross = AB.x * AP.y - AB.y * AP.x;
            if (Math.abs(cross) > EPS) continue;
            const t = (AP.x * AB.x + AP.y * AB.y) / (AB.x ** 2 + AB.y ** 2);
            if (t <= EPS || t >= 1 - EPS) continue;
            problem.addFact({ kind: "between", point: P, from: seg.p1, to: seg.p2,
                reason: { kind: "derived", theorem: "pointOnSegment", premises: [] } });
        }
    }
}

// E between A,B and E between C,D (four distinct endpoints)
// =>  ∠AEC = ∠BED and ∠AED = ∠BEC
export function verticalAngles(problem: Problem): void {
    const betweens = problem.facts.filter(f => f.kind === "between");
    for (const f1 of betweens) {
        for (const f2 of betweens) {
            if (f1 === f2) continue;
            if (f1.point !== f2.point) continue;
            const E = f1.point;
            const A = f1.from, B = f1.to, C = f2.from, D = f2.to;
            if (new Set([A, B, C, D]).size !== 4) continue;
            const pairs: [Angle, Angle][] = [
                [problem.addAngle(E.id, A.id, C.id), problem.addAngle(E.id, B.id, D.id)],
                [problem.addAngle(E.id, A.id, D.id), problem.addAngle(E.id, B.id, C.id)],
            ];
            for (const [ang1, ang2] of pairs) {
                problem.addRelation({
                    kind: "equal",
                    a: problem.angleQuantity(ang1).id,
                    b: problem.angleQuantity(ang2).id,
                    reason: {
                        theorem: "vertical_angles",
                        premises: [{ kind: "fact", fact: f1 }, { kind: "fact", fact: f2 }],
                    },
                });
            }
        }
    }
}

// E between A,B plus a segment EC  =>  ∠AEC + ∠CEB = 180
export function linearPairs(problem: Problem): void {
    for (const fact of problem.facts) {
        if (fact.kind !== "between") continue;
        const { point: E, from: A, to: B } = fact;
        for (const C of problem.points.values()) {
            if (C === A || C === B || C === E) continue;
            if (problem.getSegment(E.id, C.id) === undefined
                && problem.getRay(E.id, C.id) === undefined) continue;
            const aec = problem.addAngle(E.id, A.id, C.id);
            const ceb = problem.addAngle(E.id, C.id, B.id);
            problem.addRelation({
                kind: "sum",
                parts: [problem.angleQuantity(aec).id, problem.angleQuantity(ceb).id],
                total: 180,
                reason: { theorem: "linear_pair", premises: [{ kind: "fact", fact }] },
            });
        }
    }
}

// triangle ABC  =>  ∠A + ∠B + ∠C = 180
export function triangleAngleSum(problem: Problem): void {
    for (const fact of problem.facts) {
        if (fact.kind !== "triangle") continue;
        const { p1, p2, p3 } = fact.triangle;
        const angleA = problem.getAngle(p1.id, p2.id, p3.id);
        const angleB = problem.getAngle(p2.id, p1.id, p3.id);
        const angleC = problem.getAngle(p3.id, p1.id, p2.id);
        if (angleA === undefined || angleB === undefined || angleC === undefined) continue;
        problem.addRelation({
            kind: "sum",
            parts: [
                problem.angleQuantity(angleA).id,
                problem.angleQuantity(angleB).id,
                problem.angleQuantity(angleC).id,
            ],
            total: 180,
            reason: { theorem: "triangle_angle_sum", premises: [{ kind: "fact", fact }] },
        });
    }
}

// E between A,B  =>  AE + EB = AB
export function betweennessLength(problem: Problem): void {
    for (const fact of problem.facts) {
        if (fact.kind !== "between") continue;
        const { point: E, from: A, to: B } = fact;
        const segAE = problem.ensureSegment(A.id, E.id);
        const segEB = problem.ensureSegment(E.id, B.id);
        const segAB = problem.getSegment(A.id, B.id);
        if (!segAB) continue;
        problem.addRelation({
            kind: "sum",
            parts: [problem.lengthQuantity(segAE).id, problem.lengthQuantity(segEB).id],
            total: problem.lengthQuantity(segAB).id,
            reason: { theorem: "segment_addition", premises: [{ kind: "fact", fact }] },
        });
    }
}
