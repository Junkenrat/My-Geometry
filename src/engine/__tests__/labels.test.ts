import { describe, it, expect } from "vitest";
import { Problem } from "../problem";
import { labelDirections } from "../labels";
import type { Point } from "../types";

function place(p: Problem, label: string, x: number, y: number) {
    const point = p.addPoint(x, y);
    p.renamePoint(point.id, label);
    return point;
}

// Куда смотрит имя точки, в градусах: 0 — вправо, 90 — вниз (ось y экранная).
function bearing(p: Problem, point: Point): number {
    const direction = labelDirections(p).get(point)!;
    const degrees = (Math.atan2(direction.y, direction.x) * 180) / Math.PI;
    return Math.round(((degrees % 360) + 360) % 360);
}

describe("labelDirections", () => {
    it("у одинокой точки имя уходит вверх-вправо", () => {
        const p = new Problem();
        const A = place(p, "A", 0, 0);
        expect(bearing(p, A)).toBe(315);
    });

    it("имя уходит в сторону, противоположную единственному отрезку", () => {
        const p = new Problem();
        // Отрезок под 45° вверх-вправо — тот самый случай, где буква
        // оказывалась перечёркнутой.
        const A = place(p, "A", 0, 0), B = place(p, "B", 100, -100);
        p.addSegment(A.id, B.id);
        expect(bearing(p, A)).toBe(135);   // вниз-влево
        expect(bearing(p, B)).toBe(315);   // вверх-вправо
    });

    it("в вершине треугольника имя уходит наружу, между сторонами", () => {
        const p = new Problem();
        const A = place(p, "A", 0, 0), B = place(p, "B", 100, 0), C = place(p, "C", 50, -80);
        p.addSegment(A.id, B.id);
        p.addSegment(B.id, C.id);
        p.addSegment(C.id, A.id);
        // Из A стороны идут вправо и вверх-вправо, значит имя — влево-вниз.
        const fromA = bearing(p, A);
        expect(fromA).toBeGreaterThan(90);
        expect(fromA).toBeLessThan(270);
    });

    it("у точки внутри отрезка имя встаёт поперёк и наружу чертежа", () => {
        const p = new Problem();
        const A = place(p, "A", 0, 0), B = place(p, "B", 200, 0);
        const C = place(p, "C", 100, -60);
        p.addSegment(A.id, B.id);
        p.addSegment(A.id, C.id);
        p.addSegment(C.id, B.id);
        const M = place(p, "M", 100, 0);   // ложится внутрь AB и делит его
        // Обе половинки AB коллинеарны, просветы равны — выбирается тот, что
        // дальше от центра чертежа, то есть вниз, прочь от вершины C.
        expect(bearing(p, M)).toBe(90);
    });

    it("нарисованная прямая занимает направление, служебная — нет", () => {
        const drawn = new Problem();
        const A = place(drawn, "A", 0, 0), B = place(drawn, "B", 100, 0);
        drawn.addExplicitLine(A.id, B.id);
        // Прямая горизонтальна и продолжается в обе стороны — имя уходит
        // строго поперёк.
        expect([90, 270]).toContain(bearing(drawn, A));

        // Служебная прямая на чертеже не видна и букве не мешает: остаётся
        // направление по умолчанию.
        const implicit = new Problem();
        const C = place(implicit, "C", 0, 0), D = place(implicit, "D", 100, 0);
        implicit.addLine(C.id, D.id);
        expect(bearing(implicit, C)).toBe(315);
    });

    it("нарисованный луч не занимает направление позади своего начала", () => {
        const p = new Problem();
        const A = place(p, "A", 0, 0), B = place(p, "B", 100, 0);
        p.addExplicitRay(A.id, B.id);
        // Луч идёт из A вправо, назад ничего не нарисовано — самый широкий
        // просвет смотрит влево.
        expect(bearing(p, A)).toBe(180);
    });
});
