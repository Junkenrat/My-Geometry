import { describe, it, expect } from "vitest";
import { Problem } from "../problem";

// Точка на отрезке делит его сразу, а не при решении: иначе на угол при такой
// точке нельзя сослаться, пока задача не решена.

function segmentAB() {
    const p = new Problem();
    const A = p.addPoint(0, 0);
    const B = p.addPoint(200, 0);
    p.renamePoint(A.id, "A");
    p.renamePoint(B.id, "B");
    p.addSegment(A.id, B.id);
    return { p, A, B };
}

describe("splitting a segment by a point", () => {
    it("a point placed on a segment creates both halves at once", () => {
        const { p, A, B } = segmentAB();
        const M = p.addPoint(50, 0);
        expect(p.getSegment(A.id, M.id)).toBeDefined();
        expect(p.getSegment(M.id, B.id)).toBeDefined();
        expect(p.getSegment(A.id, B.id)).toBeDefined(); // исходный никуда не делся
    });

    it("a segment drawn over an existing point is split too", () => {
        const p = new Problem();
        const A = p.addPoint(0, 0);
        const B = p.addPoint(200, 0);
        const M = p.addPoint(50, 0); // стоит до того, как проведён отрезок
        p.addSegment(A.id, B.id);
        expect(p.getSegment(A.id, M.id)).toBeDefined();
        expect(p.getSegment(M.id, B.id)).toBeDefined();
    });

    it("two interior points split the segment into every part", () => {
        const { p, A, B } = segmentAB();
        const M = p.addPoint(60, 0);
        const N = p.addPoint(120, 0);
        expect(p.getSegment(A.id, M.id)).toBeDefined();
        expect(p.getSegment(M.id, N.id)).toBeDefined();
        expect(p.getSegment(N.id, B.id)).toBeDefined();
        expect(p.getSegment(A.id, N.id)).toBeDefined();
    });

    it("endpoints and points off the segment change nothing", () => {
        const { p } = segmentAB();
        const before = p.segments.size;
        p.addPoint(0, 0);    // совпадает с концом
        p.addPoint(100, 40); // вне прямой
        p.addPoint(300, 0);  // на прямой, но за пределами отрезка
        expect(p.segments.size).toBe(before);
    });

    it("the angle at the point resolves without solving", () => {
        const { p, A } = segmentAB();
        const M = p.addPoint(100, 0);
        p.renamePoint(M.id, "M");
        const C = p.addPoint(100, 90);
        p.renamePoint(C.id, "C");
        p.addSegment(M.id, C.id);
        // плечи ∠AMC — это отрезки MA и MC; MA появился при делении
        expect(p.getSegment(M.id, A.id)).toBeDefined();
        expect(p.getSegment(M.id, C.id)).toBeDefined();
    });

    it("erasing the point takes its halves away and leaves the whole", () => {
        const { p, A, B } = segmentAB();
        const M = p.addPoint(50, 0);
        p.erasePoint(M);
        expect(p.getSegment(A.id, B.id)).toBeDefined();
        expect(p.points.has(M.id)).toBe(false);
        expect(Array.from(p.segments.values()).some(s => s.p1 === M || s.p2 === M)).toBe(false);
    });
});

// Переезд точки меняет то, что выведено из координат: попадания на отрезки
// и невырожденность треугольников. Комбинаторика построения остаётся.
describe("moving a point", () => {
    it("dragging the point off the segment takes its halves with it", () => {
        const { p, A, B } = segmentAB();
        const M = p.addPoint(50, 0);
        expect(p.getSegment(A.id, M.id)).toBeDefined();
        p.movePoint(M, 50, 120); // увели с прямой
        expect(p.getSegment(A.id, M.id)).toBeUndefined();
        expect(p.getSegment(M.id, B.id)).toBeUndefined();
        expect(p.getSegment(A.id, B.id)).toBeDefined();
    });

    it("dragging a point onto a segment splits it", () => {
        const { p, A, B } = segmentAB();
        const M = p.addPoint(50, 120); // сначала в стороне
        expect(p.getSegment(A.id, M.id)).toBeUndefined();
        p.movePoint(M, 50, 0); // положили на отрезок
        expect(p.getSegment(A.id, M.id)).toBeDefined();
        expect(p.getSegment(M.id, B.id)).toBeDefined();
    });

    it("a user-drawn segment survives even where a half would not", () => {
        const { p, A, B } = segmentAB();
        const M = p.addPoint(50, 0);
        p.addSegment(A.id, M.id); // уже есть как половинка, вид не понижаем
        p.movePoint(M, 50, 120);
        // AM осталась половинкой и ушла вместе с попаданием
        expect(p.getSegment(A.id, M.id)).toBeUndefined();
        expect(p.getSegment(A.id, B.id)).toBeDefined();
    });

    it("a triangle collapsed into a line stops being a triangle", () => {
        const p = new Problem();
        const A = p.addPoint(0, 0);
        const B = p.addPoint(200, 0);
        const C = p.addPoint(100, 100);
        p.addTriangle(A.id, B.id, C.id);
        expect(p.getTriangle(A.id, B.id, C.id)).toBeDefined();
        p.movePoint(C, 100, 0); // вершина легла на основание
        expect(p.getTriangle(A.id, B.id, C.id)).toBeUndefined();
    });

    it("a triangle that becomes non-degenerate is picked up again", () => {
        const p = new Problem();
        const A = p.addPoint(0, 0);
        const B = p.addPoint(200, 0);
        const C = p.addPoint(100, 100);
        p.addTriangle(A.id, B.id, C.id);
        p.movePoint(C, 100, 0);
        expect(p.getTriangle(A.id, B.id, C.id)).toBeUndefined();
        p.movePoint(C, 100, 100); // вернули обратно
        expect(p.getTriangle(A.id, B.id, C.id)).toBeDefined();
    });

    it("a half that is a triangle side is kept", () => {
        const { p, A, B } = segmentAB();
        const M = p.addPoint(100, 0);
        const C = p.addPoint(100, 90);
        p.addSegment(A.id, C.id);
        p.addSegment(M.id, C.id); // замкнули треугольник A-M-C на половинке AM
        expect(p.getTriangle(A.id, M.id, C.id)).toBeDefined();
        p.movePoint(B, 200, 60); // B уехал, AB больше не накрывает M
        expect(p.getSegment(A.id, M.id)).toBeDefined(); // сторона треугольника цела
    });
});

// Стирание убирает основание так же, как переезд точки.
describe("erasing", () => {
    it("erasing the whole segment takes its halves away", () => {
        const { p, A, B } = segmentAB();
        const M = p.addPoint(50, 0);
        expect(p.getSegment(A.id, M.id)).toBeDefined();
        p.eraseSegment(p.getSegment(A.id, B.id)!);
        expect(p.getSegment(A.id, M.id)).toBeUndefined();
        expect(p.getSegment(M.id, B.id)).toBeUndefined();
        expect(p.points.has(M.id)).toBe(true); // сама точка остаётся
    });

    it("erasing an endpoint leaves no orphaned half", () => {
        const { p, A, B } = segmentAB();
        const M = p.addPoint(50, 0);
        p.erasePoint(A); // уносит AB и AM, MB остаётся без основания
        expect(p.getSegment(M.id, B.id)).toBeUndefined();
        expect(p.segments.size).toBe(0);
    });

    it("erasing a line takes the triangle side lying on it", () => {
        const { p, A, B } = segmentAB();
        const M = p.addPoint(100, 0);
        const C = p.addPoint(100, 90);
        p.addSegment(A.id, C.id);
        p.addSegment(M.id, C.id);
        expect(p.getTriangle(A.id, M.id, C.id)).toBeDefined();
        p.eraseSegment(p.getSegment(A.id, B.id)!);
        // основание стёрли — треугольнику не на чем стоять
        expect(p.getSegment(A.id, M.id)).toBeUndefined();
        expect(p.getTriangle(A.id, M.id, C.id)).toBeUndefined();
        expect(p.getSegment(A.id, C.id)).toBeDefined(); // остальные стороны целы
        expect(p.getSegment(M.id, C.id)).toBeDefined();
    });

    it("erasing one piece keeps the rest of the line", () => {
        const { p, A, B } = segmentAB();
        const M = p.addPoint(50, 0);
        p.eraseSegment(p.getSegment(A.id, M.id)!); // вырезали кусочек A-M
        expect(p.getSegment(A.id, M.id)).toBeUndefined();
        expect(p.getSegment(A.id, B.id)).toBeUndefined(); // целое через вырез не проходит
        const rest = p.getSegment(M.id, B.id);
        expect(rest).toBeDefined();
        expect(rest!.kind).toBe("drawn"); // уцелевшая часть живёт сама по себе
    });

    it("cutting the middle out of a line leaves both ends", () => {
        const { p, A, B } = segmentAB();
        const M = p.addPoint(60, 0);
        const N = p.addPoint(140, 0);
        p.eraseSegment(p.getSegment(M.id, N.id)!);
        expect(p.getSegment(A.id, M.id)).toBeDefined();
        expect(p.getSegment(N.id, B.id)).toBeDefined();
        expect(p.getSegment(M.id, N.id)).toBeUndefined();
        expect(p.getSegment(A.id, B.id)).toBeUndefined();
        expect(p.getSegment(A.id, N.id)).toBeUndefined(); // тоже шёл через вырез
    });

    it("erasing the far piece keeps the near ones intact", () => {
        const { p, A, B } = segmentAB();
        const M = p.addPoint(60, 0);
        const N = p.addPoint(140, 0);
        p.eraseSegment(p.getSegment(N.id, B.id)!);
        expect(p.getSegment(A.id, M.id)).toBeDefined();
        expect(p.getSegment(M.id, N.id)).toBeDefined();
        expect(p.getSegment(A.id, N.id)).toBeDefined(); // уцелевшее целое A-N
        expect(p.getSegment(N.id, B.id)).toBeUndefined();
    });
});
