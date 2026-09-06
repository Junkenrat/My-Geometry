import type { Point, Line, Ray, Segment, Angle, Triangle, Circle } from "./types";
import { angleName, segmentName } from "./types";
import type { Fact, GivenValue, Goal, Reason } from "./facts";
import { factsEqual, factPoints, sameDirectionFact } from "./facts";
import type { Quantity, QuantityId } from "./quantities";
import { QuantityStore } from "./quantities";
import type { Relation } from "./relations";
import { relationKey } from "./relations";
import type { AnglePoints, Condition, TrianglePoints, TriangleProperty } from "./conditions";
import { conditionPoints } from "./conditions";
import { t } from "../i18n";

const EPS = 0.000001;

export class Problem {
    points: Map<string, Point> = new Map();
    lines: Map<string, Line> = new Map();
    segments: Map<string, Segment> = new Map();
    rays: Map<string, Ray> = new Map();
    angles: Map<string, Angle> = new Map();
    triangles: Map<string, Triangle> = new Map();
    circles: Map<string, Circle> = new Map();
    facts: Fact[] = [];
    relations: Map<string, Relation> = new Map();
    quantities: QuantityStore = new QuantityStore();
    conditions: Condition[] = [];
    goal: Goal | null = null;
    private nextPointNumber = 0;
    private nextLineNumber = 0;
    private nextCircleNumber = 0;

    // Все аргументы add/get через id точек

    // Сторона угла — это направление из вершины, а не конкретная точка на нём.
    // Если E и G лежат на одном луче из H, то ∠AHE и ∠AHG — один и тот же угол,
    // и ключ у них обязан совпасть. Направление нормируем и округляем: точки,
    // поставленные на прямую, дают геометрически одинаковый вектор, а вот
    // побитово он может разойтись в последних разрядах.
    private directionKey(vertex: Point, through: Point): string {
        const dx = through.x - vertex.x, dy = through.y - vertex.y;
        const len = Math.hypot(dx, dy);
        if (len === 0) return "0:0";
        const unit = (v: number) => Math.round((v / len) * 1e6) / 1e6;
        return `${unit(dx)}:${unit(dy)}`;
    }

    // Ближайшая к вершине точка того же направления: ей и называем сторону,
    // потому что ∠AHG читается естественнее, чем ∠AHE через дальнюю точку.
    // На ключ выбор не влияет, так что более близкая точка, появившаяся позже,
    // ничего не ломает.
    private nearestOnArm(vertex: Point, through: Point): Point {
        const dx = through.x - vertex.x, dy = through.y - vertex.y;
        let best = through, bestDist = Math.hypot(dx, dy);
        for (const p of this.points.values()) {
            if (p === vertex || p === through) continue;
            const px = p.x - vertex.x, py = p.y - vertex.y;
            if (Math.abs(dx * py - dy * px) > EPS) continue; // не на той прямой
            if (px * dx + py * dy <= 0) continue;            // противоположный луч
            const dist = Math.hypot(px, py);
            if (dist < bestDist) { bestDist = dist; best = p; }
        }
        return best;
    }

    getAngleKey(vertex: string, thr1: string, thr2: string): string {
        const v = this.points.get(vertex);
        const a = this.points.get(thr1), b = this.points.get(thr2);
        if (v === undefined || a === undefined || b === undefined) {
            const raw = [`${vertex}>${thr1}`, `${vertex}>${thr2}`].sort();
            return `${vertex}:${raw[0]}|${raw[1]}`;
        }
        const dirs = [this.directionKey(v, a), this.directionKey(v, b)].sort();
        return `${vertex}:${dirs[0]}|${dirs[1]}`;
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

    // Каждый раз создает новую точку
    addPoint(x: number, y: number): Point {
        const id = `p${this.nextPointNumber}`;
        this.nextPointNumber += 1;
        const newPoint: Point = { id, label: null, x, y };
        this.points.set(id, newPoint);
        this.splitSegmentsAt(newPoint);
        return newPoint;
    }

    // Лежит ли точка строго внутри отрезка, не совпадая с его концами.
    private isInside(point: Point, seg: Segment): boolean {
        if (point === seg.p1 || point === seg.p2) return false;
        const dx = seg.p2.x - seg.p1.x, dy = seg.p2.y - seg.p1.y;
        const px = point.x - seg.p1.x, py = point.y - seg.p1.y;
        if (Math.abs(dx * py - dy * px) > EPS) return false; // не на прямой
        const len2 = dx * dx + dy * dy;
        if (len2 === 0) return false;
        const t = (px * dx + py * dy) / len2;
        return t > EPS && t < 1 - EPS;
    }

    // Точка на отрезке делит его надвое. Подотрезки существуют геометрически,
    // поэтому создаём их сразу: иначе на угол при такой точке нельзя сослаться,
    // пока решение не запущено (раньше их создавала теорема аддитивности).
    private splitSegmentsAt(point: Point): void {
        for (const seg of Array.from(this.segments.values())) {
            if (!this.isInside(point, seg)) continue;
            this.addSplitPart(seg.p1.id, point.id);
            this.addSplitPart(point.id, seg.p2.id);
        }
    }

    renamePoint(id: string, label: string): string | null {
        const new_p = this.requirePoint(id);
        label = label.toUpperCase();
        if (!(/^[a-zA-Z]$/.test(label))) {
            return t("naming.errorSingleLetter");
        }
        for (const point of this.points.values()) {
            if (point.id === id) continue;
            if (point.label === label) {
                return t("naming.errorTaken", { label });
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

    // Коллинеарные прямые, проходящие через разные пары точек - разные объекты!
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

    addRay(start: string, thr: string): Ray {
        const key = `${start}>${thr}`;
        const existing = this.rays.get(key);
        if (existing !== undefined) {
            return existing;
        }
        const newRay: Ray = {
            start: this.requirePoint(start),
            through: this.requirePoint(thr),
            line: this.addLine(start, thr),
            kind: "implicit"
        };
        this.rays.set(key, newRay);
        return newRay;
    }

    // Луч, построенный пользователем: повышает существующий служебный до "drawn".
    addExplicitRay(start: string, thr: string): Ray {
        const ray = this.addRay(start, thr);
        ray.kind = "drawn";
        return ray;
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
            line: this.addLine(p1, p2),
            kind: "drawn"
        };
        this.segments.set(key, newSegment);
        this.detectTriangles(newSegment);
        // Отрезок мог накрыть уже стоящие точки — делится так же, как при
        // постановке новой точки.
        for (const point of Array.from(this.points.values())) {
            if (!this.isInside(point, newSegment)) continue;
            this.addSplitPart(newSegment.p1.id, point.id);
            this.addSplitPart(point.id, newSegment.p2.id);
        }
        return newSegment;
    }

    // Половинка отрезка: если такой отрезок уже построен пользователем,
    // происхождение не понижаем — он не должен исчезнуть при переезде точки.
    private addSplitPart(a: string, b: string): void {
        if (this.getSegment(a, b) !== undefined) return;
        this.addSegment(a, b).kind = "split";
    }

    // Третья точка, соединённая с обоими концами, замыкает треугольник —
    // если только тройка не вырождена в прямую.
    private detectTriangles(seg: Segment): void {
        for (const third of Array.from(this.points.values())) {
            if (third === seg.p1 || third === seg.p2) continue;
            if (this.getSegment(third.id, seg.p1.id) === undefined) continue;
            if (this.getSegment(third.id, seg.p2.id) === undefined) continue;
            if (this.isCollinear(seg.p1, seg.p2, third)) continue;
            this.addTriangle(seg.p1.id, seg.p2.id, third.id);
        }
    }

    private isCollinear(a: Point, b: Point, c: Point): boolean {
        const area = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
        return Math.abs(area) <= EPS;
    }

    addAngle(vertex: string, thr1: string, thr2: string): Angle {
        const key = this.getAngleKey(vertex, thr1, thr2);
        const existing = this.angles.get(key);
        if (existing !== undefined) {
            return existing;
        }
        const v = this.requirePoint(vertex);
        const newAngle: Angle = {
            vertex: v,
            ray1: this.addRay(vertex, this.nearestOnArm(v, this.requirePoint(thr1)).id),
            ray2: this.addRay(vertex, this.nearestOnArm(v, this.requirePoint(thr2)).id)
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

    // A circle centred at `center` with the given radius. Keyed by centre +
    // radius, so drawing the same circle again returns the existing one.
    addCircle(center: string, radius: number): Circle {
        const key = `${center}>${radius}`;
        const existing = this.circles.get(key);
        if (existing !== undefined) {
            return existing;
        }
        const id = `c${this.nextCircleNumber}`;
        this.nextCircleNumber += 1;
        const newCircle: Circle = {
            id,
            center: this.requirePoint(center),
            radius,
        };
        this.circles.set(key, newCircle);
        return newCircle;
    }

    // Двигает точку. Всё, что ссылается на неё (концы отрезков/лучей/прямых,
    // центр окружности), переезжает автоматически; объекты, лишь проходящие
    // через точку, не меняются, так как её не упоминают. Выведенное состояние
    // зависит от координат, поэтому пересчитываем его заново.
    movePoint(point: Point, x: number, y: number): void {
        point.x = x;
        point.y = y;
        this.refreshGeometry();
        this.resetDerived();
    }

    // Проходит ли отрезок s через весь кусочек piece (совпадение тоже считается).
    // Нужно, чтобы понять, какие отрезки перестают существовать, когда из линии
    // вырезают её часть.
    private covers(s: Segment, piece: Segment): boolean {
        const dx = s.p2.x - s.p1.x, dy = s.p2.y - s.p1.y;
        const len2 = dx * dx + dy * dy;
        if (len2 === 0) return false;
        const along = (p: Point): number | null => {
            if (Math.abs(dx * (p.y - s.p1.y) - dy * (p.x - s.p1.x)) > EPS) return null;
            return ((p.x - s.p1.x) * dx + (p.y - s.p1.y) * dy) / len2;
        };
        const t1 = along(piece.p1), t2 = along(piece.p2);
        if (t1 === null || t2 === null) return false;
        return Math.min(t1, t2) >= -EPS && Math.max(t1, t2) <= 1 + EPS;
    }

    // Половинка жива, пока её оправдывает исходный отрезок: у одного её конца
    // есть отрезок, внутрь которого попадает другой конец. Сторона уже
    // построенного треугольника тоже считается основанием — её удалять нельзя.
    private isJustifiedPart(part: Segment): boolean {
        for (const triangle of this.triangles.values()) {
            const ids = [triangle.p1, triangle.p2, triangle.p3];
            if (ids.includes(part.p1) && ids.includes(part.p2)) return true;
        }
        for (const seg of this.segments.values()) {
            if (seg === part) continue;
            if ((seg.p1 === part.p1 || seg.p2 === part.p1) && this.isInside(part.p2, seg)) return true;
            if ((seg.p1 === part.p2 || seg.p2 === part.p2) && this.isInside(part.p1, seg)) return true;
        }
        return false;
    }

    // Что с чем соединено, переезд точки не меняет. Меняется выведенное из
    // координат: попадания точек на отрезки и невырожденность треугольников.
    // Это и пересобираем.
    // Треугольник держится на трёх своих сторонах и на невырожденности.
    private dropInvalidTriangles(): void {
        for (const [key, t] of Array.from(this.triangles)) {
            const sides: [Point, Point][] = [[t.p1, t.p2], [t.p2, t.p3], [t.p3, t.p1]];
            const sideGone = sides.some(([a, b]) => this.getSegment(a.id, b.id) === undefined);
            if (sideGone || this.isCollinear(t.p1, t.p2, t.p3)) this.triangles.delete(key);
        }
    }

    private refreshGeometry(): void {
        this.dropInvalidTriangles();
        // Половинки без основания уходят. Одна может держаться на другой,
        // поэтому повторяем, пока список не перестанет меняться.
        let removed = true;
        while (removed) {
            removed = false;
            for (const [key, seg] of Array.from(this.segments)) {
                if (seg.kind !== "split" || this.isJustifiedPart(seg)) continue;
                this.segments.delete(key);
                removed = true;
            }
        }
        // Вместе с половинками могли уйти стороны треугольников.
        this.dropInvalidTriangles();
        // Новые попадания точек на отрезки дают новые половинки.
        for (const point of Array.from(this.points.values())) this.splitSegmentsAt(point);
        for (const seg of Array.from(this.segments.values())) this.detectTriangles(seg);
    }

    // --- eraser -----------------------------------------------------------
    // Каждый метод удаляет ровно один нарисованный объект. Линию/луч не
    // выбрасываем, а понижаем до implicit: они перестают рисоваться, но
    // остаются доступны построениям.

    eraseCircle(circle: Circle): void {
        for (const [key, c] of this.circles) {
            if (c === circle) { this.circles.delete(key); return; }
        }
    }

    eraseLine(line: Line): void {
        line.kind = "implicit";
    }

    eraseRay(ray: Ray): void {
        ray.kind = "implicit";
    }

    // Стирает кусочек линии. Вместе с ним уходит всё, что через него проходит:
    // иначе кусочек тут же восстановился бы как половинка родительского отрезка.
    // Части линии по обе стороны от выреза остаются — и становятся
    // самостоятельными отрезками, раз накрывавшего их целого больше нет.
    eraseSegment(seg: Segment): void {
        for (const [key, s] of Array.from(this.segments)) {
            // Уходит и то, что проходит через кусочек (иначе он восстановится),
            // и то, что лежит внутри него (стирается вся его длина).
            if (this.covers(s, seg) || this.covers(seg, s)) this.segments.delete(key);
        }
        const remaining = Array.from(this.segments.values());
        for (const part of remaining) {
            if (part.kind !== "split") continue;
            if (remaining.some(other => other !== part && this.covers(other, part))) continue;
            part.kind = "drawn"; // накрывать больше нечему — часть живёт сама по себе
        }
        this.refreshGeometry();
        this.resetDerived();
    }

    // Удаляет точку и всё, что на неё опирается: отрезки/лучи/прямые с концом в
    // ней, треугольники и углы с этой вершиной, окружности с этим центром, а
    // также данные условия, ссылающиеся на неё.
    erasePoint(point: Point): void {
        for (const [k, s] of this.segments) if (s.p1 === point || s.p2 === point) this.segments.delete(k);
        for (const [k, r] of this.rays) if (r.start === point || r.through === point) this.rays.delete(k);
        for (const [k, l] of this.lines) if (l.p1 === point || l.p2 === point) this.lines.delete(k);
        for (const [k, t] of this.triangles) if (t.p1 === point || t.p2 === point || t.p3 === point) this.triangles.delete(k);
        for (const [k, a] of this.angles) if (a.vertex === point || a.ray1.through === point || a.ray2.through === point) this.angles.delete(k);
        for (const [k, c] of this.circles) if (c.center === point) this.circles.delete(k);
        this.facts = this.facts.filter(f => f.reason.kind !== "given" || !factPoints(f).includes(point));
        this.conditions = this.conditions.filter(c => !conditionPoints(c).includes(point));
        this.points.delete(point.id);
        // Вместе с точкой ушли её отрезки — половинки, что на них держались,
        // тоже могли потерять основание.
        this.refreshGeometry();
        this.resetDerived();
    }

    addFact(fact: Fact): void {
        if (this.facts.some(existing => factsEqual(existing, fact)
            || sameDirectionFact(existing, fact))) {
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

    // quantities & relations ---------------------------------------

    lengthId(seg: Segment): QuantityId {
        return `len:${[seg.p1.id, seg.p2.id].sort().join("-")}`;
    }

    angleId(angle: Angle): QuantityId {
        return `ang:${this.getAngleKey(angle.vertex.id, angle.ray1.through.id, angle.ray2.through.id)}`;
    }

    // The same id from three points — lets goals/conditions refer to an angle
    // without materializing it.
    angleIdOf(a: AnglePoints): QuantityId {
        return `ang:${this.getAngleKey(a.vertex.id, a.thr1.id, a.thr2.id)}`;
    }

    lengthQuantity(seg: Segment): Quantity {
        return this.quantities.ensure(this.lengthId(seg),
            () => segmentName(seg.p1, seg.p2));
    }

    angleQuantity(angle: Angle): Quantity {
        return this.quantities.ensure(this.angleId(angle),
            () => angleName(angle.vertex, angle.ray1.through, angle.ray2.through));
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

    // The angle in a condition is stored as three points; materialize it here
    // (addAngle is idempotent) so the parser never has to touch the drawing.
    private materializeAngle(a: AnglePoints): Angle {
        return this.addAngle(a.vertex.id, a.thr1.id, a.thr2.id);
    }

    // Same idea for triangles: the condition carries points, the geometry is
    // built here, then the corresponding structural fact is recorded. Theorems
    // (equilateral, pythagoras) read that fact and derive equalities.
    private applyTriangleCondition(t: TrianglePoints, property: TriangleProperty): void {
        const triangle = this.addTriangle(t.p1.id, t.p2.id, t.p3.id);
        const reason: Reason = { kind: "given" };
        if (property.kind === "right") {
            this.addFact({ kind: "right_triangle", triangle, rightAngleAt: property.vertex, reason });
        } else if (property.kind === "equilateral") {
            this.addFact({ kind: "equilateral", triangle, reason });
        } else if (property.kind === "obtuse") {
            this.addFact({ kind: "obtuse", triangle, reason });
        } else {
            this.addFact({ kind: "acute", triangle, reason });
        }
    }

    private applyCondition(condition: Condition): void {
        if (condition.kind === "value") {
            this.applyGivenValue(condition.target);
        } else if (condition.kind === "angle_value") {
            const angle = this.materializeAngle(condition.angle);
            this.quantities.assign(this.angleQuantity(angle).id, condition.value, { kind: "given" });
        } else if (condition.kind === "triangle") {
            this.applyTriangleCondition(condition.triangle, condition.property);
        } else if (condition.kind === "equation") {
            // Equations connect quantities (lengths or angle measures): the
            // relation refers to quantity ids, not geometry ids. lengthQuantity
            // / angleQuantity also ensure both quantities exist in the store
            // before propagate touches them.
            const equation = condition.equation;
            if (equation.kind === "segments_equal") {
                this.addRelation({
                    kind: "equal",
                    a: this.lengthQuantity(equation.a).id,
                    b: this.lengthQuantity(equation.b).id,
                    reason: { theorem: "given", premises: [] }
                })
            } else if (equation.kind === "segments_ratio") {
                this.addRelation({
                    kind: "ratio",
                    a: this.lengthQuantity(equation.a).id,
                    b: this.lengthQuantity(equation.b).id,
                    value: equation.value,
                    reason: { theorem: "given", premises: [] }
                })
            } else {
                this.addRelation({
                    kind: "equal",
                    a: this.angleQuantity(this.materializeAngle(equation.a)).id,
                    b: this.angleQuantity(this.materializeAngle(equation.b)).id,
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

    // Полный сброс: чертёж, условия, выводы и цель. Необратимо —
    // истории шагов пока нет.
    clear(): void {
        this.points.clear();
        this.lines.clear();
        this.segments.clear();
        this.rays.clear();
        this.angles.clear();
        this.triangles.clear();
        this.circles.clear();
        this.facts = [];
        this.relations.clear();
        this.quantities = new QuantityStore();
        this.conditions = [];
        this.goal = null;
        this.nextPointNumber = 0;
        this.nextLineNumber = 0;
        this.nextCircleNumber = 0;
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
