import { describe, it, expect } from "vitest";
import { Problem } from "../problem";

// The eraser: erasing a point cascades to everything touching it; erasing a
// line/segment/circle removes only that object and keeps the points.

describe("erasePoint", () => {
    it("removes every segment touching the point, and the point itself", () => {
        const p = new Problem();
        const A = p.addPoint(0, 0);
        const B = p.addPoint(90, 0);
        const C = p.addPoint(0, 90);
        p.addSegment(A.id, B.id);
        p.addSegment(A.id, C.id);
        p.addSegment(B.id, C.id);
        p.erasePoint(A);
        expect(p.points.has(A.id)).toBe(false);
        expect(p.points.has(B.id)).toBe(true);
        expect(p.points.has(C.id)).toBe(true);
        // only BC survives (AB, AC touched A)
        expect(p.getSegment(B.id, C.id)).toBeDefined();
        expect(p.getSegment(A.id, B.id)).toBeUndefined();
        expect(p.getSegment(A.id, C.id)).toBeUndefined();
    });

    it("removes a circle centred at the point but not one centred elsewhere", () => {
        const p = new Problem();
        const O = p.addPoint(100, 100);
        const Q = p.addPoint(300, 100);
        p.addCircle(O.id, 50);
        p.addCircle(Q.id, 50);
        p.erasePoint(O);
        expect(p.circles.size).toBe(1);
        expect([...p.circles.values()][0]!.center).toBe(Q);
    });

    it("prunes a condition that references the erased point", () => {
        const p = new Problem();
        const A = p.addPoint(0, 0);
        const B = p.addPoint(90, 0);
        p.addSegment(A.id, B.id);
        p.setLength(p.getSegment(A.id, B.id)!, 5);
        expect(p.conditions).toHaveLength(1);
        p.erasePoint(A);
        expect(p.conditions).toHaveLength(0);
    });
});

describe("eraseSegment", () => {
    it("removes the segment and any triangle using it, keeping the points", () => {
        const p = new Problem();
        const A = p.addPoint(0, 0);
        const B = p.addPoint(90, 0);
        const C = p.addPoint(0, 90);
        p.addTriangle(A.id, B.id, C.id);
        expect(p.triangles.size).toBe(1);
        p.eraseSegment(p.getSegment(A.id, B.id)!);
        expect(p.getSegment(A.id, B.id)).toBeUndefined();
        expect(p.getSegment(B.id, C.id)).toBeDefined(); // other sides remain
        expect(p.triangles.size).toBe(0);               // triangle is gone
        expect(p.points.size).toBe(3);                  // all points remain
    });
});

describe("eraseCircle", () => {
    it("removes only the circle, keeping its center point", () => {
        const p = new Problem();
        const O = p.addPoint(100, 100);
        const circle = p.addCircle(O.id, 50);
        p.eraseCircle(circle);
        expect(p.circles.size).toBe(0);
        expect(p.points.has(O.id)).toBe(true);
    });
});

describe("eraseLine / eraseRay", () => {
    it("demotes a drawn line to implicit so it stops rendering, points stay", () => {
        const p = new Problem();
        const A = p.addPoint(0, 0);
        const B = p.addPoint(90, 0);
        const line = p.addExplicitLine(A.id, B.id);
        expect(line.kind).toBe("drawn");
        p.eraseLine(line);
        expect(line.kind).toBe("implicit");
        expect(p.points.size).toBe(2);
    });

    it("demotes a drawn ray to implicit", () => {
        const p = new Problem();
        const A = p.addPoint(0, 0);
        const B = p.addPoint(90, 0);
        const ray = p.addExplicitRay(A.id, B.id);
        expect(ray.kind).toBe("drawn");
        p.eraseRay(ray);
        expect(ray.kind).toBe("implicit");
    });
});

// movePoint: объекты держат ссылку на точку, поэтому присоединённые к ней
// переезжают сами, а те, что лишь проходят через неё, остаются на месте.
describe("movePoint", () => {
    it("drags the endpoints of attached segments, leaves other segments alone", () => {
        const p = new Problem();
        const A = p.addPoint(0, 0);
        const B = p.addPoint(90, 0);
        const C = p.addPoint(0, 90);
        const D = p.addPoint(200, 200);
        const E = p.addPoint(260, 200);
        p.addSegment(A.id, B.id);
        p.addSegment(D.id, E.id); // не связан с A
        p.movePoint(A, 30, 45);
        const AB = p.getSegment(A.id, B.id)!;
        expect([AB.p1.x, AB.p1.y]).toEqual([30, 45]); // конец уехал вместе с точкой
        expect([AB.p2.x, AB.p2.y]).toEqual([90, 0]);  // второй конец на месте
        const DE = p.getSegment(D.id, E.id)!;
        expect([DE.p1.x, DE.p1.y, DE.p2.x, DE.p2.y]).toEqual([200, 200, 260, 200]);
        expect([C.x, C.y]).toEqual([0, 90]);
    });

    it("moves a circle centred at the point, but not one the point merely lies on", () => {
        const p = new Problem();
        const O = p.addPoint(100, 100);
        const onArc = p.addPoint(500, 300); // лежит на второй окружности
        p.addCircle(O.id, 50);              // центр — движимая точка
        const other = p.addPoint(400, 300);
        p.addCircle(other.id, 100);         // проходит через onArc, но не им задана
        p.movePoint(O, 220, 140);
        const centred = [...p.circles.values()].find(c => c.center === O)!;
        expect([centred.center.x, centred.center.y]).toEqual([220, 140]); // окружность уехала
        expect(centred.radius).toBe(50);
        p.movePoint(onArc, 505, 310);
        const still = [...p.circles.values()].find(c => c.center === other)!;
        expect([still.center.x, still.center.y]).toEqual([400, 300]); // проходящая — на месте
        expect(still.radius).toBe(100);
    });
});
