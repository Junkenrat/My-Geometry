import { Problem } from "../engine/problem";
import type { Point } from "../engine/types";
import { lineDrawStroke, rayDrawStroke } from "../engine/lineStroke";

interface CanvasProps {
    problem: Problem;
    onClick: (e: React.MouseEvent<SVGSVGElement>) => void;
    onMouseMove: (e: React.MouseEvent<SVGSVGElement>) => void;
    onMouseLeave: () => void;
    onMouseDown: (e: React.MouseEvent<SVGSVGElement>) => void;
    onMouseUp: () => void;
    view: { x: number; y: number };
    panning: boolean;
    firstPoint: Point | null;
    // Уже поставленные вершины строящейся фигуры (треугольник/четырёхугольник).
    previewVertices: Point[];
    // Замыкать ли контур ребром от текущей точки к первой вершине.
    previewClose: boolean;
    curSnapped: { x: number; y: number; kind: "grid" | "existingPoint" | "line" } | null;
    Tool: "point" | "segment" | "ray" | "cursor" | "line" | "triangle" | "quad";
}

// Продлевает прямые с kind = "drawn" за пределы холста
const getExtendedCoordinates = (
    x1: number, 
    y1: number, 
    x2: number, 
    y2: number, 
    extendLength: number = 10000
) => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy);

    if (len === 0) {
        return { x1, y1, x2, y2 };
    }
    const dirX = dx / len;
    const dirY = dy / len;

    return {
        x1: x1 - dirX * extendLength,
        y1: y1 - dirY * extendLength,
        x2: x2 + dirX * extendLength,
        y2: y2 + dirY * extendLength
    };
};

export function Canvas({ problem, onClick, onMouseMove, onMouseLeave, onMouseDown, onMouseUp,
                        view, panning, firstPoint, previewVertices, previewClose, curSnapped, Tool }: CanvasProps) {
    return (
        <svg
            className={`canvas ${Tool === "cursor" ? (panning ? "canvas-panning" : "canvas-pannable") : ""}`}
            width="100%"
            height="100%"
            onClick={onClick}
            onMouseMove={onMouseMove}
            onMouseLeave={onMouseLeave}
            onMouseDown={onMouseDown}
            onMouseUp={onMouseUp}
        >
            <defs>
                <pattern id="grid" x="0" y="0" width="30" height="30" patternUnits="userSpaceOnUse"
                         patternTransform={`translate(${view.x}, ${view.y})`}>
                    <line x1="0" y1="0" x2="30" y2="0" stroke="#000000" strokeWidth="1" opacity={0.07} />
                    <line x1="0" y1="0" x2="0" y2="30" stroke="#000000" strokeWidth="1" opacity={0.07} />
                </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />

            {/* Всё содержимое чертежа сдвигается целиком */}
            <g transform={`translate(${view.x}, ${view.y})`}>

            {/* Проведенные линии проходят под отрезками */}
            {Array.from(problem.lines.values())
                .filter((line) => line.kind === "drawn")
                .map((line) => {
                    const stroke = lineDrawStroke(problem, line);
                    if (stroke === null) return null;
                    const extended = getExtendedCoordinates(stroke.x1, stroke.y1, stroke.x2, stroke.y2);
                    return (
                        <g key={line.id}>
                            <line
                                x1={stroke.x1}
                                y1={stroke.y1}
                                x2={stroke.x2}
                                y2={stroke.y2}
                                stroke="#6B5C39"
                                strokeWidth={1.5}
                            />
                            {(Tool === "point" || Tool === "segment" || Tool === "line" || Tool === "ray" || Tool === "triangle" || Tool === "quad") && (
                                <line
                                    x1={extended.x1}
                                    y1={extended.y1}
                                    x2={extended.x2}
                                    y2={extended.y2}
                                    stroke="#6B5C39"
                                    strokeWidth={1.5}
                                    opacity={0.25}
                                />
                            )}
                        </g>
                    );
                })}

            {Array.from(problem.rays.values())
                .filter((ray) => ray.kind === "drawn")
                .map((ray) => {
                    const stroke = rayDrawStroke(problem, ray);
                    if (stroke === null) return null;
                    const dx = stroke.x2 - stroke.x1, dy = stroke.y2 - stroke.y1;
                    const len = Math.hypot(dx, dy);
                    const k = len === 0 ? 0 : 10000 / len;
                    return (
                        <g key={`${ray.start.id}>${ray.through.id}`}>
                            <line
                                x1={stroke.x1}
                                y1={stroke.y1}
                                x2={stroke.x2}
                                y2={stroke.y2}
                                stroke="#6B5C39"
                                strokeWidth={1.5}
                            />
                            {(Tool === "point" || Tool === "segment" || Tool === "line" || Tool === "ray" || Tool === "triangle" || Tool === "quad") && (
                                <line
                                    x1={stroke.x2}
                                    y1={stroke.y2}
                                    x2={stroke.x2 + dx * k}
                                    y2={stroke.y2 + dy * k}
                                    stroke="#6B5C39"
                                    strokeWidth={1.5}
                                    opacity={0.25}
                                />
                            )}
                        </g>
                    );
                })}

            {Array.from(problem.segments.values()).map((seg) => (
                <line
                    key={`${seg.p1.id}-${seg.p2.id}`}
                    x1={seg.p1.x}
                    y1={seg.p1.y}
                    x2={seg.p2.x}
                    y2={seg.p2.y}
                    stroke="#6B5C39"
                    strokeWidth={2}
                />
            ))}

            {Array.from(problem.points.values()).map((p) => (
                <circle
                    key={p.id}
                    cx={p.x}
                    cy={p.y}
                    r={5}
                    fill={"#6B5C39"}
                />
            ))}

            {Array.from(problem.points.values())
                .filter((p) => p.label !== null)
                .map((p) => (
                    <text
                        key={`label-${p.id}`}
                        x={p.x + 10}
                        y={p.y - 10}
                        fontSize={16}
                        fill="#322508"
                    >
                        {p.label}
                    </text>
                ))}

            {curSnapped !== null && (Tool === "point" || Tool === "segment" || Tool === "line" || Tool === "ray" || Tool === "triangle" || Tool === "quad") && (() => {
                const blocked = Tool === "point" && curSnapped.kind === "existingPoint";
                return (
                    <circle
                        cx={curSnapped.x}
                        cy={curSnapped.y}
                        r={5}
                        fill={blocked ? "#b3261e" : curSnapped.kind === "existingPoint" ? "#1F8A70" : "gray"}
                        opacity={curSnapped.kind === "existingPoint" ? "1" : "0.4"}
                    />
                );
            })()}
            {curSnapped !== null && firstPoint !== null && Tool === "segment" && (
                <line
                    x1={firstPoint.x}
                    y1={firstPoint.y}
                    x2={curSnapped.x}
                    y2={curSnapped.y}
                    stroke="gray"
                    strokeWidth={2}
                    opacity={0.18}
                />
            )}
            {/* предпросмотр луча: от начала вперёд через текущую точку */}
            {curSnapped !== null && firstPoint !== null && Tool === "ray" && (() => {
                const dx = curSnapped.x - firstPoint.x;
                const dy = curSnapped.y - firstPoint.y;
                if (dx === 0 && dy === 0) return null;
                const k = 10000 / Math.hypot(dx, dy);
                return (
                    <line
                        x1={firstPoint.x}
                        y1={firstPoint.y}
                        x2={firstPoint.x + dx * k}
                        y2={firstPoint.y + dy * k}
                        stroke="gray"
                        strokeWidth={2}
                        opacity={0.18}
                    />
                );
            })()}
            {/* только при строительстве: продлевает прямую, 
            чтобы пользователь мог видеть, через какие точки она пройдет*/}
            {curSnapped !== null && firstPoint !== null && Tool === "line" && (() => {
                const dx = curSnapped.x - firstPoint.x;
                const dy = curSnapped.y - firstPoint.y;
                if (dx === 0 && dy === 0) return null;
                const k = 10000 / Math.hypot(dx, dy);
                return (
                    <line
                        x1={firstPoint.x - dx * k}
                        y1={firstPoint.y - dy * k}
                        x2={firstPoint.x + dx * k}
                        y2={firstPoint.y + dy * k}
                        stroke="gray"
                        strokeWidth={2}
                        opacity={0.18}
                    />
                );
            })()}
            {/* предпросмотр фигуры: рёбра между поставленными вершинами и от
                последней к текущей точке; на последнем шаге контур замыкается */}
            {curSnapped !== null && (Tool === "triangle" || Tool === "quad") && previewVertices.length > 0 && (() => {
                const pts = [...previewVertices, curSnapped];
                const edges: [{ x: number; y: number }, { x: number; y: number }][] = [];
                for (let i = 0; i < pts.length - 1; i++) edges.push([pts[i]!, pts[i + 1]!]);
                if (previewClose) edges.push([pts[pts.length - 1]!, pts[0]!]);
                return edges.map((e, i) => (
                    <line key={`poly-preview-${i}`}
                        x1={e[0].x} y1={e[0].y} x2={e[1].x} y2={e[1].y}
                        stroke="gray" strokeWidth={2} opacity={0.18} />
                ));
            })()}
            </g>
        </svg>
    );
}