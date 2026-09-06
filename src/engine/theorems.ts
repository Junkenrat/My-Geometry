import { Problem } from "./problem";
import type { Angle, Carrier, Point, Ray, Segment } from "./types";
import { carrierPoints, sameCarrierLine } from "./types";
import type { Fact, ParallelFact, PerpendicularFact } from "./facts";
import { segmentIntersection } from "./geometry";

const EPS = 0.000001;

// right_triangle at C with legs a, b and hypotenuse c
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
// The triangle's existence lives in problem.triangles, not in a fact.
export function triangleAngleSum(problem: Problem): void {
    for (const { p1, p2, p3 } of problem.triangles.values()) {
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
            reason: { theorem: "triangle_angle_sum", premises: [] },
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

// Лежит ли точка на носителе. Отрезок ограничен обоими концами, луч — только
// началом, прямая не ограничена ничем.
function isOnCarrier(p: Point, c: Carrier): boolean {
    const [a, b] = carrierPoints(c);
    if (p === a || p === b) return true;
    const dx = b.x - a.x, dy = b.y - a.y;
    const len2 = dx * dx + dy * dy;
    if (len2 === 0) return false;
    if (Math.abs(crossOf(dx, dy, p.x - a.x, p.y - a.y)) > EPS) return false;
    const t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
    if ("start" in c) return t >= -EPS;              // луч
    if ("id" in c) return true;                       // прямая
    return t >= -EPS && t <= 1 + EPS;                 // отрезок
}

// Точка носителя, отличная от вершины: задаёт направление стороны угла.
// Если вершина лежит внутри, годится любой конец — при перпендикулярности
// все четыре угла прямые.
function neighborOn(c: Carrier, v: Point): Point {
    const [a, b] = carrierPoints(c);
    return a === v ? b : a;
}
 
export function perpendicularAngles(problem: Problem): void {
    for (const fact of problem.facts) {
        if (fact.kind !== "perpendicular") continue;
        if (fact.a === fact.b) continue;
        for (const v of problem.points.values()) {
            if (isOnCarrier(v, fact.a) && isOnCarrier(v, fact.b)) {
                const n1 = neighborOn(fact.a, v);
                const n2 = neighborOn(fact.b, v);
                if (n1 === v || n2 === v) continue;
                const angle = problem.addAngle(v.id, n1.id, n2.id);
                problem.quantities.assign(problem.angleQuantity(angle).id, 90, {
                    kind: "derived",
                    theorem: "perpendicular_angles",
                    premises: [{ kind: "fact", fact }],
                });
            }
        }
    }
}

// A 90° angle between two segments sharing the vertex  =>  the segments are
// perpendicular. The reverse of perpendicularAngles; together they terminate
// because addFact dedupes and assign never re-assigns a known value.
// Makes the "Prove ⊥" goal achievable.
export function perpendicularFromAngle(problem: Problem): void {
    for (const angle of problem.angles.values()) {
        const value = problem.quantities.value(problem.angleId(angle));
        if (value === null || Math.abs(value - 90) > EPS) continue;
        const v = angle.vertex;
        const s1 = problem.getSegment(v.id, angle.ray1.through.id);
        const s2 = problem.getSegment(v.id, angle.ray2.through.id);
        if (!s1 || !s2) continue;
        problem.addFact({
            kind: "perpendicular",
            a: widestAlong(problem, s1),
            b: widestAlong(problem, s2),
            reason: { kind: "derived", theorem: "perpendicular_from_angle", premises: [] },
        });
    }
}

// equilateral ABC  =>  AB = BC = CA and every angle = 60°
export function equilateralTriangle(problem: Problem): void {
    for (const fact of problem.facts) {
        if (fact.kind !== "equilateral") continue;
        const { p1, p2, p3 } = fact.triangle;
        const s12 = problem.ensureSegment(p1.id, p2.id);
        const s23 = problem.ensureSegment(p2.id, p3.id);
        const s31 = problem.ensureSegment(p3.id, p1.id);
        const premises = [{ kind: "fact" as const, fact }];
        problem.addRelation({ kind: "equal", a: problem.lengthQuantity(s12).id,
            b: problem.lengthQuantity(s23).id, reason: { theorem: "equilateral", premises } });
        problem.addRelation({ kind: "equal", a: problem.lengthQuantity(s23).id,
            b: problem.lengthQuantity(s31).id, reason: { theorem: "equilateral", premises } });
        const corners: [Point, Point, Point][] = [[p1, p2, p3], [p2, p1, p3], [p3, p1, p2]];
        for (const [v, a, b] of corners) {
            const angle = problem.getAngle(v.id, a.id, b.id) ?? problem.addAngle(v.id, a.id, b.id);
            problem.quantities.assign(problem.angleQuantity(angle).id, 60, {
                kind: "derived", theorem: "equilateral", premises });
        }
    }
}

// Векторное произведение: знак говорит, с какой стороны от направления (ax,ay)
// лежит точка (bx,by).
function crossOf(ax: number, ay: number, bx: number, by: number): number {
    return ax * by - ay * bx;
}

function isOnLine(p: Point, a: Point, b: Point): boolean {
    return Math.abs(crossOf(b.x - a.x, b.y - a.y, p.x - a.x, p.y - a.y)) < EPS;
}

// Точки на прямой, несущей объект. Берём именно прямую, а не сам объект:
// угол при секущей образуют и точки за концом отрезка.
function pointsOnCarrierLine(problem: Problem, c: Carrier): Point[] {
    const [a, b] = carrierPoints(c);
    return Array.from(problem.points.values()).filter(p => isOnLine(p, a, b));
}

// Секущая PQ пересекает параллельные в P и Q. Для точки A на первой прямой и
// B на второй достаточно посмотреть, по одну ли сторону от секущей они лежат:
// по разные — углы накрест лежащие (равны), по одну — односторонние (в сумме 180°).
function transversalAngles(problem: Problem, fact: Fact & { kind: "parallel" },
                           P: Point, Q: Point): void {
    const tx = Q.x - P.x, ty = Q.y - P.y;
    const [l1a, l1b] = carrierPoints(fact.a);
    // секущая, параллельная самим прямым, углов не образует
    if (Math.abs(crossOf(l1b.x - l1a.x, l1b.y - l1a.y, tx, ty)) < EPS) return;
    const premises = [{ kind: "fact" as const, fact }];

    for (const A of pointsOnCarrierLine(problem, fact.a)) {
        if (A === P) continue;
        const sideA = Math.sign(crossOf(tx, ty, A.x - P.x, A.y - P.y));
        if (sideA === 0) continue;
        for (const B of pointsOnCarrierLine(problem, fact.b)) {
            if (B === Q) continue;
            const sideB = Math.sign(crossOf(tx, ty, B.x - Q.x, B.y - Q.y));
            if (sideB === 0) continue;
            const atP = problem.angleQuantity(problem.addAngle(P.id, A.id, Q.id)).id;
            const atQ = problem.angleQuantity(problem.addAngle(Q.id, B.id, P.id)).id;
            if (sideA !== sideB) {
                problem.addRelation({ kind: "equal", a: atP, b: atQ,
                    reason: { theorem: "alternate_angles", premises } });
            } else {
                problem.addRelation({ kind: "sum", parts: [atP, atQ], total: 180,
                    reason: { theorem: "cointerior_angles", premises } });
            }
        }
    }
}

// Лежит ли точка на луче: то же направление и не позади начала.
function isOnRay(p: Point, ray: Ray): boolean {
    const dx = ray.through.x - ray.start.x, dy = ray.through.y - ray.start.y;
    const px = p.x - ray.start.x, py = p.y - ray.start.y;
    if (Math.abs(crossOf(dx, dy, px, py)) > EPS) return false;
    return px * dx + py * dy >= -EPS;
}

// Построенный носитель, проходящий через обе точки. Секущей может быть
// отрезок, луч или прямая: у прямой и луча собственные точки лежат вне
// параллельных, поэтому спрашиваем не про их концы, а про прохождение.
// Отрезок предпочтительнее — он конкретнее, и на него ссылаться привычнее.
function carrierBetween(problem: Problem, P: Point, Q: Point): Carrier | undefined {
    const seg = problem.getSegment(P.id, Q.id);
    if (seg !== undefined) return seg;
    for (const ray of problem.rays.values()) {
        if (ray.kind !== "drawn") continue;
        if (isOnRay(P, ray) && isOnRay(Q, ray)) return ray;
    }
    for (const line of problem.lines.values()) {
        if (line.kind !== "drawn") continue;
        if (isOnLine(P, line.p1, line.p2) && isOnLine(Q, line.p1, line.p2)) return line;
    }
    return undefined;
}

// a ∥ b и секущая через них => равенства и суммы углов при секущей.
export function parallelAngles(problem: Problem): void {
    for (const fact of problem.facts) {
        if (fact.kind !== "parallel") continue;
        // Секущая опознаётся по паре точек: одна на первой прямой, другая на
        // второй, и через обе проходит что-то построенное.
        for (const P of pointsOnCarrierLine(problem, fact.a)) {
            for (const Q of pointsOnCarrierLine(problem, fact.b)) {
                if (P === Q) continue;
                if (carrierBetween(problem, P, Q) === undefined) continue;
                transversalAngles(problem, fact, P, Q);
            }
        }
    }
}

// Из всех носителей, содержащих обе точки, самый «крупный»: прямая шире луча,
// луч шире отрезка, а из отрезков берём длиннейший. Параллельность — свойство
// направления, поэтому называть её случайным огрызком линии не стоит.
function widestCarrierThrough(problem: Problem, X: Point, Y: Point): Carrier | undefined {
    for (const line of problem.lines.values()) {
        if (line.kind !== "drawn") continue;
        if (isOnLine(X, line.p1, line.p2) && isOnLine(Y, line.p1, line.p2)) return line;
    }
    for (const ray of problem.rays.values()) {
        if (ray.kind !== "drawn") continue;
        if (isOnRay(X, ray) && isOnRay(Y, ray)) return ray;
    }
    let best: Segment | undefined;
    let bestLength = -1;
    for (const seg of problem.segments.values()) {
        if (!isOnCarrier(X, seg) || !isOnCarrier(Y, seg)) continue;
        const length = Math.hypot(seg.p2.x - seg.p1.x, seg.p2.y - seg.p1.y);
        if (length > bestLength) { bestLength = length; best = seg; }
    }
    return best;
}

// Самый крупный носитель на той же прямой. Факт о направлении называем именно
// им: "AB ∥ CD" читается, а "AK ∥ DL" про случайные огрызки — нет.
function widestAlong(problem: Problem, c: Carrier): Carrier {
    for (const line of problem.lines.values()) {
        if (line.kind === "drawn" && sameCarrierLine(line, c)) return line;
    }
    const [ca, cb] = carrierPoints(c);
    for (const ray of problem.rays.values()) {
        if (ray.kind !== "drawn" || !sameCarrierLine(ray, c)) continue;
        if (isOnRay(ca, ray) && isOnRay(cb, ray)) return ray;
    }
    if ("id" in c || "start" in c) return c; // прямая или луч уже шире отрезка
    let best: Carrier = c;
    let bestLength = Math.hypot(cb.x - ca.x, cb.y - ca.y);
    for (const seg of problem.segments.values()) {
        if (!sameCarrierLine(seg, c)) continue;
        const length = Math.hypot(seg.p2.x - seg.p1.x, seg.p2.y - seg.p1.y);
        if (length > bestLength) { bestLength = length; best = seg; }
    }
    return best;
}

// Обратное к parallelAngles: если накрест лежащие углы при секущей равны, а
// односторонние дают в сумме 180°, то носители параллельны. Пара с прямой
// теоремой и делает достижимой цель «доказать ∥».
export function parallelFromAngles(problem: Problem): void {
    const points = Array.from(problem.points.values());
    // Носитель между парой точек ищется многократно, поэтому запоминаем.
    const cache = new Map<string, Carrier | undefined>();
    const between = (X: Point, Y: Point): Carrier | undefined => {
        const key = [X.id, Y.id].sort().join("|");
        if (!cache.has(key)) cache.set(key, carrierBetween(problem, X, Y));
        return cache.get(key);
    };
    const measure = (vertex: Point, arm: Point, other: Point): number | null => {
        const angle = problem.getAngle(vertex.id, arm.id, other.id);
        return angle === undefined ? null : problem.quantities.value(problem.angleId(angle));
    };

    for (const P of points) {
        for (const Q of points) {
            if (P === Q || between(P, Q) === undefined) continue;
            const cut = between(P, Q);
            const tx = Q.x - P.x, ty = Q.y - P.y;
            for (const A of points) {
                if (A === P || A === Q) continue;
                // Точка на самой секущей стороны не задаёт — угла там нет.
                const sideA = Math.sign(crossOf(tx, ty, A.x - P.x, A.y - P.y));
                if (sideA === 0) continue;
                const first = widestCarrierThrough(problem, P, A);
                if (first === undefined || first === cut) continue;
                const atP = measure(P, A, Q);
                if (atP === null) continue;
                for (const B of points) {
                    if (B === P || B === Q) continue;
                    const sideB = Math.sign(crossOf(tx, ty, B.x - Q.x, B.y - Q.y));
                    if (sideB === 0) continue;
                    const second = widestCarrierThrough(problem, Q, B);
                    if (second === undefined || second === cut || second === first) continue;
                    const atQ = measure(Q, B, P);
                    if (atQ === null) continue;
                    const holds = sideA !== sideB
                        ? Math.abs(atP - atQ) < EPS          // накрест лежащие
                        : Math.abs(atP + atQ - 180) < EPS;   // односторонние
                    if (!holds) continue;
                    // premises: [] — основанием служат значения углов, а посылками
                    // факта могут быть только факты (тот же известный долг, что и
                    // у rightTriangleFromAngle).
                    problem.addFact({ kind: "parallel",
                        a: widestAlong(problem, first), b: widestAlong(problem, second),
                        reason: { kind: "derived", theorem: "parallel_from_angles", premises: [] } });
                }
            }
        }
    }
}

// Обе стороны факта о направлении: сначала как опорная, потом как переносимая.
function sides(fact: ParallelFact | PerpendicularFact): [Carrier, Carrier][] {
    return [[fact.a, fact.b], [fact.b, fact.a]];
}

function directionFacts<K extends "parallel" | "perpendicular">(
    problem: Problem, kind: K,
): (K extends "parallel" ? ParallelFact : PerpendicularFact)[] {
    // Снимок: теоремы дописывают факты, а перебирать нужно исходный набор.
    return problem.facts.filter(f => f.kind === kind) as never;
}

// a ∥ b и c ⊥ a  =>  c ⊥ b. Перпендикулярность — свойство направления, а у
// параллельных направление общее, поэтому она переносится с одной на другую.
export function perpendicularThroughParallel(problem: Problem): void {
    for (const par of directionFacts(problem, "parallel")) {
        for (const perp of directionFacts(problem, "perpendicular")) {
            for (const [from, to] of sides(par)) {
                for (const [x, y] of sides(perp)) {
                    if (!sameCarrierLine(x, from)) continue;
                    if (sameCarrierLine(y, to)) continue; // сама себе не перпендикулярна
                    problem.addFact({ kind: "perpendicular",
                        a: widestAlong(problem, y), b: widestAlong(problem, to),
                        reason: { kind: "derived", theorem: "perpendicular_through_parallel",
                                  premises: [par, perp] } });
                }
            }
        }
    }
}

// a ∥ b и b ∥ c  =>  a ∥ c. Параллельность — это совпадение направлений,
// а совпадение транзитивно.
export function parallelTransitive(problem: Problem): void {
    const parallels = directionFacts(problem, "parallel");
    for (const first of parallels) {
        for (const second of parallels) {
            if (first === second) continue;
            for (const [common, restFirst] of sides(first)) {
                for (const [other, restSecond] of sides(second)) {
                    if (!sameCarrierLine(common, other)) continue; // общее звено
                    if (sameCarrierLine(restFirst, restSecond)) continue; // это одна прямая
                    problem.addFact({ kind: "parallel",
                        a: widestAlong(problem, restFirst), b: widestAlong(problem, restSecond),
                        reason: { kind: "derived", theorem: "parallel_transitive",
                                  premises: [first, second] } });
                }
            }
        }
    }
}

// a ⊥ c и b ⊥ c  =>  a ∥ b. На плоскости два перпендикуляра к одной прямой
// смотрят в одну сторону. Ещё один путь доказать параллельность — без углов.
export function parallelFromPerpendiculars(problem: Problem): void {
    const perpendiculars = directionFacts(problem, "perpendicular");
    for (const first of perpendiculars) {
        for (const second of perpendiculars) {
            if (first === second) continue;
            for (const [common, restFirst] of sides(first)) {
                for (const [other, restSecond] of sides(second)) {
                    if (!sameCarrierLine(common, other)) continue; // общий перпендикуляр
                    if (sameCarrierLine(restFirst, restSecond)) continue;
                    problem.addFact({ kind: "parallel",
                        a: widestAlong(problem, restFirst), b: widestAlong(problem, restSecond),
                        reason: { kind: "derived", theorem: "parallel_from_perpendiculars",
                                  premises: [first, second] } });
                }
            }
        }
    }
}

export function rightTriangleFromAngle(problem: Problem): void {
    for (const triangle of problem.triangles.values()) {
        const p1_id = triangle.p1.id, p2_id = triangle.p2.id, p3_id = triangle.p3.id;
        const a1 = problem.getAngle(p1_id, p2_id, p3_id);
        const a2 = problem.getAngle(p2_id, p1_id, p3_id);
        const a3 = problem.getAngle(p3_id, p1_id, p2_id);
        if (a1 === undefined || a2 === undefined || a3 === undefined) continue;
        for (const angle of [a1, a2, a3]) {
            const value = problem.quantities.value(problem.angleId(angle));
            if (value === null) continue;
            if (Math.abs(value - 90) < EPS) {
                // premises: [] — the basis is a quantity value, and fact
                // premises can only be facts (known debt).
                problem.addFact({
                    kind: "right_triangle",
                    triangle: triangle,
                    rightAngleAt: angle.vertex,
                    reason: { kind: "derived", theorem: "right_triangle_from_angle", premises: [] }
                })
            }
        }
    }
}