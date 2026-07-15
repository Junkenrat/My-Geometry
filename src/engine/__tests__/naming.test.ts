import { describe, it, expect } from "vitest";
import { Problem } from "../problem";
import { assignLabels, ensureLabel, nextFreeLabel, nextFreeLineLabel } from "../naming";
import { formatLineName } from "../format";

// Naming is presentation: ids are identity, labels are handed out later.

describe("assignLabels", () => {
    it("names unnamed points in geometric order and never renames", () => {
        const p = new Problem();
        const a = p.addPoint(0, 0);
        const b = p.addPoint(120, 120);
        const c = p.addPoint(0, 120);
        const d = p.addPoint(120, 0);
        assignLabels(p);
        // sorted by (x, then y): (0,0) (0,120) (120,0) (120,120)
        expect([a.label, c.label, d.label, b.label]).toEqual(["A", "B", "C", "D"]);
        const e = p.addPoint(60, 60);
        assignLabels(p);
        expect(e.label).toBe("E");
        expect([a.label, c.label, d.label, b.label]).toEqual(["A", "B", "C", "D"]); // untouched
    });

    it("two points at the same position get distinct ids and labels", () => {
        const p = new Problem();
        const first = p.addPoint(0, 0);
        const second = p.addPoint(0, 0);
        expect(first.id).not.toBe(second.id);
        assignLabels(p);
        expect(first.label).not.toBe(second.label);
    });
});

describe("targeted naming helpers", () => {
    it("ensureLabel names only the given point", () => {
        const p = new Problem();
        const a = p.addPoint(0, 0);
        const b = p.addPoint(50, 0);
        ensureLabel(p, b);
        expect(b.label).toBe("A");
        expect(a.label).toBeNull();
    });

    it("nextFreeLabel previews without assigning", () => {
        const p = new Problem();
        const a = p.addPoint(0, 0);
        expect(nextFreeLabel(p)).toBe("A");
        expect(a.label).toBeNull();
        ensureLabel(p, a);
        expect(nextFreeLabel(p)).toBe("B");
    });

    it("nextFreeLineLabel suggests the first free lowercase letter", () => {
        const p = new Problem();
        p.addPoint(0, 0);
        p.addPoint(90, 0);
        const line = p.addExplicitLine("p0", "p1");
        expect(nextFreeLineLabel(p)).toBe("a");
        p.renameLine(line.id, "a");
        expect(nextFreeLineLabel(p)).toBe("b");
    });
});

describe("renamePoint", () => {
    function onePoint() {
        const p = new Problem();
        const point = p.addPoint(0, 0);
        return { p, point };
    }

    it("normalizes to uppercase", () => {
        const { p, point } = onePoint();
        expect(p.renamePoint(point.id, "m")).toBeNull();
        expect(point.label).toBe("M");
    });

    it("rejects a taken name and keeps the label untouched", () => {
        const { p, point } = onePoint();
        const other = p.addPoint(50, 0);
        p.renamePoint(point.id, "M");
        expect(p.renamePoint(other.id, "m")).toMatch(/taken/);
        expect(other.label).toBeNull();
    });

    it("rejects garbage input", () => {
        const { p, point } = onePoint();
        expect(p.renamePoint(point.id, "ab")).not.toBeNull();
        expect(p.renamePoint(point.id, "7")).not.toBeNull();
        expect(p.renamePoint(point.id, "")).not.toBeNull();
    });

    it("renaming to its own name is a no-op success", () => {
        const { p, point } = onePoint();
        p.renamePoint(point.id, "M");
        expect(p.renamePoint(point.id, "M")).toBeNull();
    });

    it("throws for an unknown id (programmer error)", () => {
        const { p } = onePoint();
        expect(() => p.renamePoint("p999", "X")).toThrow();
    });
});

describe("lines", () => {
    it("a segment's line is implicit; drawing promotes without demotion", () => {
        const p = new Problem();
        p.addPoint(0, 0);
        p.addPoint(90, 0);
        p.addSegment("p0", "p1");
        const line = p.getLine("p0", "p1")!;
        expect(line.kind).toBe("implicit");
        expect(p.addExplicitLine("p0", "p1")).toBe(line); // same object, promoted
        expect(line.kind).toBe("drawn");
        p.addSegment("p0", "p1"); // re-adding must not demote
        expect(line.kind).toBe("drawn");
    });

    it("renameLine normalizes to lowercase; point 'M' and line 'm' coexist", () => {
        const p = new Problem();
        const point = p.addPoint(0, 0);
        p.addPoint(90, 0);
        const line = p.addExplicitLine("p0", "p1");
        expect(p.renameLine(line.id, "M")).toBeNull();
        expect(line.label).toBe("m");
        expect(p.renamePoint(point.id, "M")).toBeNull();
        expect(line.label).toBe("m");
    });

    it("an unnamed line displays through its points", () => {
        const p = new Problem();
        const a = p.addPoint(0, 0);
        const b = p.addPoint(90, 0);
        const line = p.addExplicitLine(a.id, b.id);
        p.renamePoint(a.id, "A");
        p.renamePoint(b.id, "B");
        expect(formatLineName(line)).toBe("AB");
        p.renameLine(line.id, "m");
        expect(formatLineName(line)).toBe("m");
    });
});
