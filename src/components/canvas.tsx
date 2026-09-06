import { useEffect, useRef } from "react";
import { Problem } from "../engine/problem";
import type { Angle, Point, Segment } from "../engine/types";
import { angleValueLabels, equalAngleMarks, equalSegmentMarks, rightAngleMarks,
         segmentValueLabels, type Mark, type ValueLabel } from "../engine/marks";
import { drawingCenter, labelDirections } from "../engine/labels";
import type { EraseTarget } from "../App";
import { lineDrawStroke, rayDrawStroke } from "../engine/lineStroke";

const ERASE_RED = "#b3261e";

// Пометки равных отрезков. Цвет говорит о происхождении равенства: коричневые
// задал пользователь, зелёные вывел движок. Вид штриха различает классы внутри
// одного цвета: одна, две, три прямые чёрточки, затем одна, две, три
// волнистые — а дальше счёт начинается заново.
const MARK_KINDS = 6;
const MARK_GIVEN = "#6B5C39";
const MARK_DERIVED = "#1F8A70";
const MARK_HALF = 6;        // половина длины чёрточки, поперёк отрезка
const MARK_GAP = 5;         // просвет между прямыми чёрточками
const WAVE_GAP = 8;         // у волнистых шире: сама волна занимает место
const MARK_WIDTH = 1.5;
const WAVE_SWING = 2.5;     // размах волны вдоль отрезка
const WAVE_STEPS = 16;

// Номер класса -> сколько значков, какие и каким цветом.
function markStyle(mark: Mark): { count: number; wavy: boolean; color: string } {
    const kind = mark.index % MARK_KINDS;
    return {
        count: (kind % 3) + 1,
        wavy: kind >= MARK_KINDS / 2,
        color: mark.derived ? MARK_DERIVED : MARK_GIVEN,
    };
}

// Чёрточки ставятся посередине отрезка и перпендикулярно ему.
function EqualityMark({ seg, mark }: { seg: Segment; mark: Mark }) {
    const dx = seg.p2.x - seg.p1.x, dy = seg.p2.y - seg.p1.y;
    const length = Math.hypot(dx, dy);
    if (length === 0) return null;
    const alongX = dx / length, alongY = dy / length;
    const acrossX = -alongY, acrossY = alongX;
    const midX = (seg.p1.x + seg.p2.x) / 2, midY = (seg.p1.y + seg.p2.y) / 2;

    const { count, wavy, color } = markStyle(mark);
    const gap = wavy ? WAVE_GAP : MARK_GAP;

    return (
        <>
            {Array.from({ length: count }, (_, i) => {
                const offset = (i - (count - 1) / 2) * gap;
                const cx = midX + alongX * offset, cy = midY + alongY * offset;
                if (!wavy) {
                    return (
                        <line
                            key={i}
                            x1={cx - acrossX * MARK_HALF} y1={cy - acrossY * MARK_HALF}
                            x2={cx + acrossX * MARK_HALF} y2={cy + acrossY * MARK_HALF}
                            stroke={color} strokeWidth={MARK_WIDTH} strokeLinecap="round"
                        />
                    );
                }
                const points: string[] = [];
                for (let step = 0; step <= WAVE_STEPS; step++) {
                    const across = -MARK_HALF + (2 * MARK_HALF * step) / WAVE_STEPS;
                    const swing = WAVE_SWING * Math.sin((2 * Math.PI * step) / WAVE_STEPS);
                    points.push(`${cx + acrossX * across + alongX * swing},`
                        + `${cy + acrossY * across + alongY * swing}`);
                }
                return (
                    <polyline
                        key={i} points={points.join(" ")} fill="none"
                        stroke={color} strokeWidth={MARK_WIDTH} strokeLinecap="round"
                    />
                );
            })}
        </>
    );
}

// Равные углы помечают дугами у вершины — столько же, сколько чёрточек у
// равных отрезков, и тем же цветом.
const ARC_RADIUS = 17;      // радиус первой дуги
const ARC_GAP = 4;          // просвет между вложенными дугами
const ARC_REACH = 0.4;      // дуги не должны уходить дальше этой доли плеча
const ARC_STEPS = 24;
const ARC_WAVES = 3;        // периодов волны вдоль дуги

function AngleMark({ angle, mark }: { angle: Angle; mark: Mark }) {
    const vx = angle.vertex.x, vy = angle.vertex.y;
    const arm1 = Math.hypot(angle.ray1.through.x - vx, angle.ray1.through.y - vy);
    const arm2 = Math.hypot(angle.ray2.through.x - vx, angle.ray2.through.y - vy);
    const { count, wavy, color } = markStyle(mark);

    // Дуги должны умещаться в более коротком плече, иначе вылезут за угол.
    const span = (count - 1) * ARC_GAP + (wavy ? WAVE_SWING : 0);
    const base = Math.min(ARC_RADIUS, Math.min(arm1, arm2) * ARC_REACH - span);
    if (base <= 2) return null;

    const start = Math.atan2(angle.ray1.through.y - vy, angle.ray1.through.x - vx);
    const end = Math.atan2(angle.ray2.through.y - vy, angle.ray2.through.x - vx);
    // Из двух дуг между лучами берём меньшую — она и есть сам угол.
    let sweep = end - start;
    while (sweep <= -Math.PI) sweep += 2 * Math.PI;
    while (sweep > Math.PI) sweep -= 2 * Math.PI;

    return (
        <>
            {Array.from({ length: count }, (_, i) => {
                const radius = base + i * ARC_GAP;
                if (wavy) {
                    const points: string[] = [];
                    for (let step = 0; step <= ARC_STEPS; step++) {
                        const t = step / ARC_STEPS;
                        const a = start + sweep * t;
                        const r = radius + WAVE_SWING * Math.sin(2 * Math.PI * ARC_WAVES * t);
                        points.push(`${vx + r * Math.cos(a)},${vy + r * Math.sin(a)}`);
                    }
                    return (
                        <polyline key={i} points={points.join(" ")} fill="none"
                            stroke={color} strokeWidth={MARK_WIDTH} strokeLinecap="round" />
                    );
                }
                const x1 = vx + radius * Math.cos(start), y1 = vy + radius * Math.sin(start);
                const x2 = vx + radius * Math.cos(start + sweep);
                const y2 = vy + radius * Math.sin(start + sweep);
                return (
                    <path
                        key={i}
                        d={`M ${x1} ${y1} A ${radius} ${radius} 0 0 ${sweep > 0 ? 1 : 0} ${x2} ${y2}`}
                        fill="none" stroke={color} strokeWidth={MARK_WIDTH} strokeLinecap="round"
                    />
                );
            })}
        </>
    );
}

const CORNER_SIZE = 11;     // сторона уголка при прямом угле
const CORNER_REACH = 0.35;  // и та же оговорка про короткое плечо

// Прямой угол помечают не дугой, а уголком: два отрезка на сторонах,
// замыкающие квадрат у вершины.
function RightAngleMark({ angle, derived }: { angle: Angle; derived: boolean }) {
    const vx = angle.vertex.x, vy = angle.vertex.y;
    const d1x = angle.ray1.through.x - vx, d1y = angle.ray1.through.y - vy;
    const d2x = angle.ray2.through.x - vx, d2y = angle.ray2.through.y - vy;
    const arm1 = Math.hypot(d1x, d1y), arm2 = Math.hypot(d2x, d2y);
    if (arm1 === 0 || arm2 === 0) return null;

    const size = Math.min(CORNER_SIZE, Math.min(arm1, arm2) * CORNER_REACH);
    if (size <= 2) return null;
    const a1x = (d1x / arm1) * size, a1y = (d1y / arm1) * size;
    const a2x = (d2x / arm2) * size, a2y = (d2y / arm2) * size;

    return (
        <polyline
            points={`${vx + a1x},${vy + a1y} ${vx + a1x + a2x},${vy + a1y + a2y} `
                + `${vx + a2x},${vy + a2y}`}
            fill="none" stroke={derived ? MARK_DERIVED : MARK_GIVEN}
            strokeWidth={MARK_WIDTH} strokeLinejoin="round"
        />
    );
}

// Числовые подписи. Цвет тот же, что у пометок равенства: коричневое задал
// пользователь, зелёное вывел движок.
// Насколько имя точки отодвинуто от неё самой. Направление выбирает
// labelDirections — в самый широкий просвет между линиями.
const LABEL_RADIUS = 15;

const VALUE_FONT = 13;
const VALUE_OFFSET = 16;     // отступ подписи от отрезка, поперёк него
// Подпись угла уходит дальше: у вершины уже стоят буква (её рисуют со
// смещением ~27px по диагонали) и дуги равенства, и с ними нельзя пересечься.
const VALUE_RADIUS = 42;
const VALUE_REACH = 0.55;    // но не дальше этой доли короткого плеча

// Длина — посередине отрезка, сбоку: середину занимают чёрточки равенства.
function SegmentValue(
    { seg, label, center }:
    { seg: Segment; label: ValueLabel; center: { x: number; y: number } | null },
) {
    const dx = seg.p2.x - seg.p1.x, dy = seg.p2.y - seg.p1.y;
    const length = Math.hypot(dx, dy);
    if (length === 0) return null;
    const acrossX = -dy / length, acrossY = dx / length;
    const midX = (seg.p1.x + seg.p2.x) / 2, midY = (seg.p1.y + seg.p2.y) / 2;
    // Нормаль смотрит в произвольную сторону — разворачиваем её от центра.
    const outward = center === null ? 1
        : ((midX - center.x) * acrossX + (midY - center.y) * acrossY) < 0 ? -1 : 1;
    return (
        <text
            x={midX + acrossX * VALUE_OFFSET * outward}
            y={midY + acrossY * VALUE_OFFSET * outward}
            fontSize={VALUE_FONT} textAnchor="middle" dominantBaseline="central"
            fill={label.derived ? MARK_DERIVED : MARK_GIVEN}
        >
            {label.text}
        </text>
    );
}

// Величина угла — на биссектрисе, за дугами равенства.
function AngleValue({ angle, label }: { angle: Angle; label: ValueLabel }) {
    const vx = angle.vertex.x, vy = angle.vertex.y;
    const d1x = angle.ray1.through.x - vx, d1y = angle.ray1.through.y - vy;
    const d2x = angle.ray2.through.x - vx, d2y = angle.ray2.through.y - vy;
    const arm1 = Math.hypot(d1x, d1y), arm2 = Math.hypot(d2x, d2y);
    if (arm1 === 0 || arm2 === 0) return null;

    const u1x = d1x / arm1, u1y = d1y / arm1;
    const u2x = d2x / arm2, u2y = d2y / arm2;
    let bx = u1x + u2x, by = u1y + u2y;
    const bisector = Math.hypot(bx, by);
    if (bisector < 0.001) {
        // Лучи почти противоположны — биссектриса вырождается, уводим вбок.
        bx = -u1y; by = u1x;
    } else {
        bx /= bisector; by /= bisector;
    }
    const radius = Math.min(VALUE_RADIUS, Math.min(arm1, arm2) * VALUE_REACH);
    return (
        <text
            x={vx + bx * radius} y={vy + by * radius}
            fontSize={VALUE_FONT} textAnchor="middle" dominantBaseline="central"
            fill={label.derived ? MARK_DERIVED : MARK_GIVEN}
        >
            {label.text}
        </text>
    );
}

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
    const svgRef = useRef<SVGSVGElement>(null);
    // Куда отодвинуть имя каждой точки, чтобы его не перечёркивала линия.
    const labelAway = labelDirections(problem);

    // Колесо над холстом не прокручивает страницу: чертёж живёт в своих
    // координатах, и увод содержимого под курсором только мешает.
    // Слушатель нативный и непассивный — у React-обработчика onWheel
    // preventDefault не срабатывает.
    useEffect(() => {
        const element = svgRef.current;
        if (element === null) return;
        const block = (e: WheelEvent) => { e.preventDefault(); };
        element.addEventListener("wheel", block, { passive: false });
        return () => { element.removeEventListener("wheel", block); };
    }, []);

    return (
        <svg
            ref={svgRef}
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

            {Array.from(equalSegmentMarks(problem)).map(([seg, mark]) => (
                <EqualityMark key={`mark-${seg.p1.id}-${seg.p2.id}`} seg={seg} mark={mark} />
            ))}

            {Array.from(equalAngleMarks(problem)).map(([angle, mark]) => (
                <AngleMark
                    key={`arc-${angle.vertex.id}-${angle.ray1.through.id}-${angle.ray2.through.id}`}
                    angle={angle} mark={mark}
                />
            ))}

            {Array.from(rightAngleMarks(problem)).map(([angle, { derived }]) => (
                <RightAngleMark
                    key={`right-${angle.vertex.id}-${angle.ray1.through.id}-${angle.ray2.through.id}`}
                    angle={angle} derived={derived}
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
                        x={p.x + (labelAway.get(p)?.x ?? 0) * LABEL_RADIUS}
                        y={p.y + (labelAway.get(p)?.y ?? 0) * LABEL_RADIUS}
                        fontSize={16}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fill="#322508"
                    >
                        {p.label}
                    </text>
                ))}

            {(() => {
                const center = drawingCenter(problem);
                return Array.from(segmentValueLabels(problem)).map(([seg, label]) => (
                    <SegmentValue key={`len-${seg.p1.id}-${seg.p2.id}`}
                        seg={seg} label={label} center={center} />
                ));
            })()}

            {Array.from(angleValueLabels(problem)).map(([angle, label]) => (
                <AngleValue
                    key={`deg-${angle.vertex.id}-${angle.ray1.through.id}-${angle.ray2.through.id}`}
                    angle={angle} label={label}
                />
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