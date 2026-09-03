import { describe, it, expect } from "vitest";
import { Problem } from "../problem";
import { lineDrawStroke, rayDrawStroke } from "../lineStroke";

// The sketch stroke of a drawn line: covers every point lying on the line
// plus a fixed overhang, computed parametrically (verticals included).

describe("lineDrawStroke", () => {
    it("horizontal line extends past a collinear point beyond p2", () => {
        const p = new Problem();
        const a = p.addPoint(100, 100);
        const b = p.addPoint(200, 100);
        p.addPoint(300, 100); // on the line, past b
        p.addPoint(150, 250); // off the line, must be ignored
        const stroke = lineDrawStroke(p, p.addExplicitLine(a.id, b.id), 40)!;
        expect(stroke.x1).toBeCloseTo(60, 6);
        expect(stroke.x2).toBeCloseTo(340, 6);
        expect(stroke.y1).toBeCloseTo(100, 6);
        expect(stroke.y2).toBeCloseTo(100, 6);
    });

    it("vertical line needs no special casing", () => {
        const p = new Problem();
        const a = p.addPoint(90, 30);
        const b = p.addPoint(90, 150);
        const stroke = lineDrawStroke(p, p.addExplicitLine(a.id, b.id), 40)!;
        expect(stroke.y1).toBeCloseTo(-10, 6);
        expect(stroke.y2).toBeCloseTo(190, 6);
        expect(stroke.x1).toBeCloseTo(90, 6);
        expect(stroke.x2).toBeCloseTo(90, 6);
    });

    it("a collinear point before p1 extends the other side", () => {
        const p = new Problem();
        const a = p.addPoint(200, 200);
        const b = p.addPoint(260, 200);
        p.addPoint(80, 200); // before a
        const stroke = lineDrawStroke(p, p.addExplicitLine(a.id, b.id), 30)!;
        expect(stroke.x1).toBeCloseTo(50, 6);
        expect(stroke.x2).toBeCloseTo(290, 6);
    });

    it("overhang is measured in pixels along the line (3-4-5 diagonal)", () => {
        const p = new Problem();
        const a = p.addPoint(0, 0);
        const b = p.addPoint(80, 60); // |d| = 100
        const stroke = lineDrawStroke(p, p.addExplicitLine(a.id, b.id), 50)!; // dt = 0.5
        expect(stroke.x1).toBeCloseTo(-40, 6);
        expect(stroke.y1).toBeCloseTo(-30, 6);
        expect(stroke.x2).toBeCloseTo(120, 6);
        expect(stroke.y2).toBeCloseTo(90, 6);
    });
});

// A ray is drawn like a line, but only forward: it starts exactly at its
// start point and never extends behind it.
describe("rayDrawStroke", () => {
    it("starts exactly at the start point and overhangs only forward", () => {
        const p = new Problem();
        const a = p.addPoint(100, 100);
        const b = p.addPoint(200, 100);
        const stroke = rayDrawStroke(p, p.addExplicitRay(a.id, b.id), 40)!;
        expect(stroke.x1).toBeCloseTo(100, 6); // no overhang behind the start
        expect(stroke.y1).toBeCloseTo(100, 6);
        expect(stroke.x2).toBeCloseTo(240, 6);
        expect(stroke.y2).toBeCloseTo(100, 6);
    });

    it("covers a collinear point beyond the through point", () => {
        const p = new Problem();
        const a = p.addPoint(100, 100);
        const b = p.addPoint(200, 100);
        p.addPoint(300, 100); // further along the ray
        p.addPoint(150, 250); // off the ray, ignored
        const stroke = rayDrawStroke(p, p.addExplicitRay(a.id, b.id), 40)!;
        expect(stroke.x2).toBeCloseTo(340, 6);
    });

    it("a collinear point behind the start does not extend it", () => {
        const p = new Problem();
        const a = p.addPoint(200, 200);
        const b = p.addPoint(260, 200);
        p.addPoint(80, 200); // behind the start — belongs to the opposite ray
        const stroke = rayDrawStroke(p, p.addExplicitRay(a.id, b.id), 30)!;
        expect(stroke.x1).toBeCloseTo(200, 6);
        expect(stroke.x2).toBeCloseTo(290, 6);
    });

    it("the two opposite rays through the same pair are different objects", () => {
        const p = new Problem();
        const a = p.addPoint(0, 0);
        const b = p.addPoint(100, 0);
        const forward = p.addExplicitRay(a.id, b.id);
        const backward = p.addExplicitRay(b.id, a.id);
        expect(forward).not.toBe(backward);
        expect(rayDrawStroke(p, forward, 20)!.x2).toBeCloseTo(120, 6);
        expect(rayDrawStroke(p, backward, 20)!.x2).toBeCloseTo(-20, 6);
    });

    it("a segment's rays stay implicit until drawn", () => {
        const p = new Problem();
        const a = p.addPoint(0, 0);
        const b = p.addPoint(100, 0);
        p.addSegment(a.id, b.id);
        expect(p.getRay(a.id, b.id)!.kind).toBe("implicit");
        expect(p.addExplicitRay(a.id, b.id).kind).toBe("drawn");
        expect(p.getRay(a.id, b.id)!.kind).toBe("drawn"); // same object, promoted
    });
});
