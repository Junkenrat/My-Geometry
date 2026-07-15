import { describe, it, expect } from "vitest";
import { Problem } from "../problem";
import { lineDrawStroke } from "../lineStroke";

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
