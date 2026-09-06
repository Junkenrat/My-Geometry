import { describe, it, expect } from "vitest";
import { Problem } from "../problem";
import { solve } from "../solve";
import { angleValueLabels, equalAngleMarks, equalSegmentMarks, rightAngleMarks,
         segmentValueLabels } from "../marks";

function place(p: Problem, label: string, x: number, y: number) {
    const point = p.addPoint(x, y);
    p.renamePoint(point.id, label);
    return point;
}

// Три попарно не связанных отрезка: есть что объявить равным и что оставить
// одиночкой.
function threeSegments() {
    const p = new Problem();
    const A = place(p, "A", 0, 0), B = place(p, "B", 100, 0);
    const C = place(p, "C", 0, 50), D = place(p, "D", 100, 50);
    const E = place(p, "E", 0, 100), F = place(p, "F", 60, 100);
    p.addSegment(A.id, B.id);
    p.addSegment(C.id, D.id);
    p.addSegment(E.id, F.id);
    return {
        p,
        AB: p.getSegment(A.id, B.id)!,
        CD: p.getSegment(C.id, D.id)!,
        EF: p.getSegment(E.id, F.id)!,
    };
}

function equilateral() {
    const p = new Problem();
    const A = place(p, "A", 0, 0), B = place(p, "B", 100, 0), C = place(p, "C", 50, 87);
    p.addSegment(A.id, B.id);
    p.addSegment(B.id, C.id);
    p.addSegment(C.id, A.id);
    p.addCondition({
        kind: "triangle",
        triangle: { p1: A, p2: B, p3: C },
        property: { kind: "equilateral" },
    });
    solve(p);
    return { p, A, B, C };
}

describe("equalSegmentMarks", () => {
    it("отмечает равные отрезки одним классом, одиночный оставляет без пометки", () => {
        const { p, AB, CD, EF } = threeSegments();
        p.addCondition({ kind: "equation", equation: { kind: "segments_equal", a: AB, b: CD } });
        solve(p);
        const marks = equalSegmentMarks(p);
        expect(marks.get(AB)?.index).toBe(marks.get(CD)?.index);
        expect(marks.has(EF)).toBe(false);
    });

    it("равенство из условия считает пользовательским", () => {
        const { p, AB, CD } = threeSegments();
        p.addCondition({ kind: "equation", equation: { kind: "segments_equal", a: AB, b: CD } });
        solve(p);
        expect(equalSegmentMarks(p).get(AB)?.derived).toBe(false);
    });

    it("совпавшие числа тоже дают класс", () => {
        const { p, AB, CD } = threeSegments();
        p.setLength(AB, 5);
        p.setLength(CD, 5);
        solve(p);
        const marks = equalSegmentMarks(p);
        expect(marks.get(AB)?.index).toBe(marks.get(CD)?.index);
        expect(marks.get(AB)?.derived).toBe(false);
    });

    it("равенство сторон равностороннего треугольника выведено движком", () => {
        const { p, A, B, C } = equilateral();
        const sides = [
            p.getSegment(A.id, B.id)!,
            p.getSegment(B.id, C.id)!,
            p.getSegment(C.id, A.id)!,
        ];
        const marks = equalSegmentMarks(p);
        for (const side of sides) expect(marks.get(side)?.derived).toBe(true);
        expect(new Set(sides.map(side => marks.get(side)?.index)).size).toBe(1);
    });
});

describe("equalAngleMarks", () => {
    it("углы равностороннего треугольника попадают в один класс и помечены как вывод", () => {
        const { p, A, B, C } = equilateral();
        const atA = p.getAngle(A.id, B.id, C.id)!;
        const atB = p.getAngle(B.id, A.id, C.id)!;
        const atC = p.getAngle(C.id, A.id, B.id)!;
        const marks = equalAngleMarks(p);
        expect(marks.get(atA)?.index).toBe(marks.get(atB)?.index);
        expect(marks.get(atB)?.index).toBe(marks.get(atC)?.index);
        expect(marks.get(atA)?.derived).toBe(true);
    });

    it("развёрнутый угол не помечается", () => {
        const p = new Problem();
        const A = place(p, "A", 0, 0), M = place(p, "M", 50, 0), B = place(p, "B", 100, 0);
        const C = place(p, "C", 0, 60), N = place(p, "N", 50, 60), D = place(p, "D", 100, 60);
        p.addSegment(A.id, B.id);
        p.addSegment(C.id, D.id);
        const straightA = p.addAngle(M.id, A.id, B.id);
        const straightC = p.addAngle(N.id, C.id, D.id);
        p.setAngle(straightA, 180);
        p.setAngle(straightC, 180);
        solve(p);
        const marks = equalAngleMarks(p);
        expect(marks.has(straightA)).toBe(false);
        expect(marks.has(straightC)).toBe(false);
    });
});

describe("rightAngleMarks", () => {
    // Прямоугольный треугольник: прямой угол при A, катеты по осям.
    function rightTriangle() {
        const p = new Problem();
        const A = place(p, "A", 0, 0), B = place(p, "B", 0, 90), C = place(p, "C", 120, 0);
        p.addSegment(A.id, B.id);
        p.addSegment(A.id, C.id);
        p.addSegment(B.id, C.id);
        return { p, A, B, C };
    }

    it("угол, заданный пользователем как 90°, помечается уголком", () => {
        const { p, A, B, C } = rightTriangle();
        p.setAngle(p.addAngle(A.id, B.id, C.id), 90);
        solve(p);
        const atA = p.getAngle(A.id, B.id, C.id)!;
        expect(rightAngleMarks(p).get(atA)?.derived).toBe(false);
    });

    it("прямой угол, выведенный движком, отличается происхождением", () => {
        const { p, A, B, C } = rightTriangle();
        p.addCondition({
            kind: "triangle",
            triangle: { p1: A, p2: B, p3: C },
            property: { kind: "right", vertex: A },
        });
        solve(p);
        const atA = p.getAngle(A.id, B.id, C.id)!;
        expect(rightAngleMarks(p).get(atA)?.derived).toBe(true);
    });

    it("прямой угол не получает вдобавок дугу равенства", () => {
        const { p, A, B, C } = rightTriangle();
        p.setAngle(p.addAngle(A.id, B.id, C.id), 90);
        solve(p);
        const atA = p.getAngle(A.id, B.id, C.id)!;
        expect(rightAngleMarks(p).has(atA)).toBe(true);
        expect(equalAngleMarks(p).has(atA)).toBe(false);
    });

    it("угол с неизвестной величиной уголка не получает", () => {
        const { p, A, B, C } = rightTriangle();
        const atA = p.addAngle(A.id, B.id, C.id);
        solve(p);
        expect(rightAngleMarks(p).has(atA)).toBe(false);
    });
});

describe("нумерация классов", () => {
    it("заданные и выведенные считаются отдельно — цвет уже их различает", () => {
        const { p, A, B } = equilateral();
        const D = place(p, "D", 200, 0), E = place(p, "E", 300, 0);
        const F = place(p, "F", 200, 40), G = place(p, "G", 300, 40);
        p.addSegment(D.id, E.id);
        p.addSegment(F.id, G.id);
        const DE = p.getSegment(D.id, E.id)!, FG = p.getSegment(F.id, G.id)!;
        p.addCondition({ kind: "equation", equation: { kind: "segments_equal", a: DE, b: FG } });
        solve(p);
        const marks = equalSegmentMarks(p);
        const AB = p.getSegment(A.id, B.id)!;
        expect(marks.get(AB)?.derived).toBe(true);
        expect(marks.get(DE)?.derived).toBe(false);
        // Оба класса первые в своём цвете, поэтому оба получают одну чёрточку.
        expect(marks.get(AB)?.index).toBe(0);
        expect(marks.get(DE)?.index).toBe(0);
    });
});

describe("подписи величин", () => {
    function triangleABC() {
        const p = new Problem();
        const A = place(p, "A", 0, 0), B = place(p, "B", 0, 90), C = place(p, "C", 120, 0);
        p.addSegment(A.id, B.id);
        p.addSegment(A.id, C.id);
        p.addSegment(B.id, C.id);
        return { p, A, B, C };
    }

    it("длина показывается только у отрезка с известным числом", () => {
        const { p, AB, CD } = threeSegments();
        p.setLength(AB, 5);
        solve(p);
        const labels = segmentValueLabels(p);
        expect(labels.get(AB)?.text).toBe("5");
        expect(labels.get(AB)?.derived).toBe(false);
        expect(labels.has(CD)).toBe(false);
    });

    it("выведенная длина отличается происхождением", () => {
        const { p, AB, CD } = threeSegments();
        p.setLength(AB, 5);
        p.addCondition({ kind: "equation", equation: { kind: "segments_equal", a: AB, b: CD } });
        solve(p);
        const labels = segmentValueLabels(p);
        expect(labels.get(CD)?.text).toBe("5");
        expect(labels.get(CD)?.derived).toBe(true);
    });

    it("величина угла подписывается с градусом", () => {
        const { p, A, B, C } = triangleABC();
        p.setAngle(p.addAngle(A.id, B.id, C.id), 60);
        solve(p);
        expect(angleValueLabels(p).get(p.getAngle(A.id, B.id, C.id)!)?.text).toBe("60°");
    });

    it("прямой угол числа не получает — за него говорит уголок", () => {
        const { p, A, B, C } = triangleABC();
        const atA = p.addAngle(A.id, B.id, C.id);
        p.setAngle(atA, 90);
        solve(p);
        expect(angleValueLabels(p).has(atA)).toBe(false);
        expect(rightAngleMarks(p).has(atA)).toBe(true);
    });

    it("развёрнутый угол не подписывается", () => {
        const p = new Problem();
        const A = place(p, "A", 0, 0), M = place(p, "M", 50, 0), B = place(p, "B", 100, 0);
        p.addSegment(A.id, B.id);
        const straight = p.addAngle(M.id, A.id, B.id);
        p.setAngle(straight, 180);
        solve(p);
        expect(angleValueLabels(p).has(straight)).toBe(false);
    });
});
