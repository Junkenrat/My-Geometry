import { Problem } from "../engine/problem";
import type { Point } from "../engine/types";
import { lineDrawStroke } from "../engine/lineStroke";

interface CanvasProps {
    problem: Problem;
    onClick: (e: React.MouseEvent<SVGSVGElement>) => void;
    onMouseMove: (e: React.MouseEvent<SVGSVGElement>) => void;
    onMouseLeave: () => void;
    firstPoint: Point | null;
    curSnapped: { x: number; y: number; kind: "grid" | "existingPoint" | "line" } | null;
    Tool: "point" | "segment" | "ray" | "cursor" | "line";
}

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
        // Subtract to extend backward past the first point
        x1: x1 - dirX * extendLength,
        y1: y1 - dirY * extendLength,
        // Add to extend forward past the second point
        x2: x2 + dirX * extendLength,
        y2: y2 + dirY * extendLength
    };
};

export function Canvas({ problem, onClick, onMouseMove, onMouseLeave, firstPoint, curSnapped, Tool }: CanvasProps) {
    return (
        <svg
            className="canvas"
            width="100%"
            height="100%"
            onClick={onClick}
            onMouseMove={onMouseMove}
            onMouseLeave={onMouseLeave}
        >
            <defs>
                <pattern id="grid" x="0" y="0" width="30" height="30" patternUnits="userSpaceOnUse">
                    <line x1="0" y1="0" x2="30" y2="0" stroke="#000000" strokeWidth="1" opacity={0.07} />
                    <line x1="0" y1="0" x2="0" y2="30" stroke="#000000" strokeWidth="1" opacity={0.07} />
                </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />

            {/* drawn lines go under segments: overlapping parts read as the
                segment, the overhangs read as its continuation */}
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
                            {(Tool === "point" || Tool === "segment" || Tool === "line") && (
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
                            {line.label !== null && (
                                <text
                                    x={stroke.labelX}
                                    y={stroke.labelY}
                                    fontSize={16}
                                    fontStyle="italic"
                                    fill="#322508"
                                >
                                    {line.label}
                                </text>
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

            {curSnapped !== null && (Tool === "point" || Tool === "segment" || Tool === "line") && (
                <circle
                    cx={curSnapped.x}
                    cy={curSnapped.y}
                    r={curSnapped.kind === "existingPoint" ? 6 : 4}
                    fill={curSnapped.kind === "existingPoint" ? "#1F8A70" : "gray"}
                    opacity={curSnapped.kind === "existingPoint" ? "1" : "0.4"}
                />
            )}
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
            {/* the line preview runs across the whole canvas so the user
                sees it is a line and what it will pass through */}
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
        </svg>
    );
}