import { Problem } from "../engine/problem";
import type { Point } from "../engine/types";
import type { EraseTarget } from "../App";
import { lineDrawStroke, rayDrawStroke } from "../engine/lineStroke";

const ERASE_RED = "#b3261e";

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
    // Поставленный центр строящейся окружности (радиус тянется к курсору).
    circleCenter: Point | null;
    // id точки, через которую сейчас идёт «касание» — подсветить зелёным.
    touchPointId: string | null;
    // Призрак точки касания к окружности (её ещё нет) — зелёный кружок.
    touchGhost: { x: number; y: number } | null;
    // id точки, чьё имя запрашивают, — мигает зелёным, пока не названа.
    blinkPointId: string | null;
    // Объект под ластиком — рисуется красным.
    eraseHover: EraseTarget | null;
    // Перетаскивание точки: силуэт её нового положения и всего, что за ней
    // тянется. blocked — место занято другой точкой, бросок запрещён.
    movePreview: { point: Point; to: { x: number; y: number }; blocked: boolean } | null;
    // id точки, которую нужно обвести контуром (наведение/захват инструментом move).
    outlinePointId: string | null;
    curSnapped: { x: number; y: number; kind: "grid" | "existingPoint" | "line" } | null;
    Tool: "point" | "segment" | "ray" | "cursor" | "line" | "triangle" | "quad" | "circle" | "eraser" | "move";
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
                        view, panning, firstPoint, previewVertices, previewClose, circleCenter,
                        touchPointId, touchGhost, blinkPointId, eraseHover, movePreview, outlinePointId, curSnapped, Tool }: CanvasProps) {
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
                    const color = eraseHover?.kind === "line" && eraseHover.line === line ? ERASE_RED : "#6B5C39";
                    return (
                        <g key={line.id}>
                            <line
                                x1={stroke.x1}
                                y1={stroke.y1}
                                x2={stroke.x2}
                                y2={stroke.y2}
                                stroke={color}
                                strokeWidth={1.5}
                            />
                            {(Tool === "point" || Tool === "segment" || Tool === "line" || Tool === "ray" || Tool === "triangle" || Tool === "quad") && (
                                <line
                                    x1={extended.x1}
                                    y1={extended.y1}
                                    x2={extended.x2}
                                    y2={extended.y2}
                                    stroke={color}
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
                    const color = eraseHover?.kind === "ray" && eraseHover.ray === ray ? ERASE_RED : "#6B5C39";
                    return (
                        <g key={`${ray.start.id}>${ray.through.id}`}>
                            <line
                                x1={stroke.x1}
                                y1={stroke.y1}
                                x2={stroke.x2}
                                y2={stroke.y2}
                                stroke={color}
                                strokeWidth={1.5}
                            />
                            {(Tool === "point" || Tool === "segment" || Tool === "line" || Tool === "ray" || Tool === "triangle" || Tool === "quad") && (
                                <line
                                    x1={stroke.x2}
                                    y1={stroke.y2}
                                    x2={stroke.x2 + dx * k}
                                    y2={stroke.y2 + dy * k}
                                    stroke={color}
                                    strokeWidth={1.5}
                                    opacity={0.25}
                                />
                            )}
                        </g>
                    );
                })}

            {Array.from(problem.circles.values()).map((c) => (
                <circle
                    key={c.id}
                    cx={c.center.x}
                    cy={c.center.y}
                    r={c.radius}
                    fill="none"
                    stroke={eraseHover?.kind === "circle" && eraseHover.circle === c ? ERASE_RED : "#6B5C39"}
                    strokeWidth={2}
                />
            ))}

            {Array.from(problem.segments.values()).map((seg) => (
                <line
                    key={`${seg.p1.id}-${seg.p2.id}`}
                    x1={seg.p1.x}
                    y1={seg.p1.y}
                    x2={seg.p2.x}
                    y2={seg.p2.y}
                    stroke={eraseHover?.kind === "segment" && eraseHover.segment === seg ? ERASE_RED : "#6B5C39"}
                    strokeWidth={2}
                />
            ))}

            {Array.from(problem.points.values()).map((p) => {
                const blinking = p.id === blinkPointId;
                const highlighted = p.id === touchPointId;
                const erasing = eraseHover?.kind === "point" && eraseHover.point === p;
                const fill = erasing ? ERASE_RED : blinking || highlighted ? "#1F8A70" : "#6B5C39";
                return (
                    <circle
                        key={p.id}
                        className={blinking ? "point-blink" : undefined}
                        cx={p.x}
                        cy={p.y}
                        r={blinking || highlighted || erasing ? 6 : 5}
                        fill={fill}
                    />
                );
            })}

            {/* контур вокруг самой точки: зазор в 1px между точкой (r=5) и
                кольцом, поэтому внутренний край кольца на радиусе 6 */}
            {outlinePointId !== null && (() => {
                const p = problem.points.get(outlinePointId);
                if (p === undefined) return null;
                return (
                    <circle cx={p.x} cy={p.y} r={6.5} fill="none" stroke="#6B5C39" strokeWidth={1} />
                );
            })()}

            {/* призрак точки касания к окружности (точки ещё нет) */}
            {touchGhost !== null && (
                <circle cx={touchGhost.x} cy={touchGhost.y} r={5} fill="#1F8A70" opacity={0.7} />
            )}

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

            {curSnapped !== null && (Tool === "point" || Tool === "segment" || Tool === "line" || Tool === "ray" || Tool === "triangle" || Tool === "quad" || Tool === "circle") && (() => {
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
            {/* предпросмотр окружности: от центра радиусом до текущей точки */}
            {curSnapped !== null && Tool === "circle" && circleCenter !== null && (
                <circle
                    cx={circleCenter.x}
                    cy={circleCenter.y}
                    r={Math.hypot(curSnapped.x - circleCenter.x, curSnapped.y - circleCenter.y)}
                    fill="none"
                    stroke="gray"
                    strokeWidth={2}
                    opacity={0.18}
                />
            )}

            {/* силуэт перетаскиваемой точки и всего, что тянется за ней: концы
                отрезков/лучей/прямых и окружность с этим центром. Объекты,
                лишь проходящие через точку, её не упоминают и потому не едут. */}
            {movePreview !== null && (() => {
                const { point, to, blocked } = movePreview;
                return (
                    <>
                        {Array.from(problem.segments.values())
                            .filter((s) => s.p1 === point || s.p2 === point)
                            .map((s) => {
                                const other = s.p1 === point ? s.p2 : s.p1;
                                return (
                                    <line key={`mv-s-${s.p1.id}-${s.p2.id}`}
                                        x1={other.x} y1={other.y} x2={to.x} y2={to.y}
                                        stroke="gray" strokeWidth={2} opacity={0.18} />
                                );
                            })}
                        {Array.from(problem.rays.values())
                            .filter((r) => r.kind === "drawn" && (r.start === point || r.through === point))
                            .map((r) => {
                                const start = r.start === point ? to : r.start;
                                const through = r.through === point ? to : r.through;
                                const dx = through.x - start.x, dy = through.y - start.y;
                                const len = Math.hypot(dx, dy);
                                const k = len === 0 ? 0 : 10000 / len;
                                return (
                                    <line key={`mv-r-${r.start.id}>${r.through.id}`}
                                        x1={start.x} y1={start.y}
                                        x2={start.x + dx * k} y2={start.y + dy * k}
                                        stroke="gray" strokeWidth={2} opacity={0.18} />
                                );
                            })}
                        {Array.from(problem.lines.values())
                            .filter((l) => l.kind === "drawn" && (l.p1 === point || l.p2 === point))
                            .map((l) => {
                                const a = l.p1 === point ? to : l.p1;
                                const b = l.p2 === point ? to : l.p2;
                                const ext = getExtendedCoordinates(a.x, a.y, b.x, b.y);
                                return (
                                    <line key={`mv-l-${l.id}`}
                                        x1={ext.x1} y1={ext.y1} x2={ext.x2} y2={ext.y2}
                                        stroke="gray" strokeWidth={2} opacity={0.18} />
                                );
                            })}
                        {Array.from(problem.circles.values())
                            .filter((c) => c.center === point)
                            .map((c) => (
                                <circle key={`mv-c-${c.id}`} cx={to.x} cy={to.y} r={c.radius}
                                    fill="none" stroke="gray" strokeWidth={2} opacity={0.18} />
                            ))}
                        <circle cx={to.x} cy={to.y} r={5}
                            fill={blocked ? ERASE_RED : "gray"} opacity={blocked ? 0.8 : 0.5} />
                    </>
                );
            })()}
            </g>
        </svg>
    );
}