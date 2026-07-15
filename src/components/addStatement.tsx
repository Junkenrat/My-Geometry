import { useState } from "react";
import { Problem } from "../engine/problem";
import { formatAngleName, formatSegmentName, formatTriangleName } from "../engine/format";
import { pointName } from "../engine/types";


interface AddStatementProps {
    problem: Problem;
    onAdd: () => void;
}

export function AddStatement({ problem, onAdd }: AddStatementProps) {
    type StatementKind = "length" | "angle" | "right_triangle" | "equal_segments";
    const [kind, setKind] = useState<StatementKind>("length");
    const [selectedSegment, setSelectedSegment] = useState<string | null>(null);
    const [selectedSegment2, setSelectedSegment2] = useState<string | null>(null);
    const [selectedAngle, setSelectedAngle] = useState<string | null>(null);
    const [selectedTriangle, setSelectedTriangle] = useState<string | null>(null);
    const [selectedRightVertex, setSelectedRightVertex] = useState<string | null>(null);
    const [value, setValue] = useState<string>("");

    function handleAdd() {
        if (kind === "length") {
            if (selectedSegment === null || value === "") return;
            const chosenSegment = problem.segments.get(selectedSegment);
            if (chosenSegment === undefined) return;
            if (!Number.isNaN(Number(value))) {
                problem.setLength(chosenSegment, Number(value));
            }
        } else if (kind === "angle") {
            if (selectedAngle === null || value === "") return;
            const chosenAngle = problem.angles.get(selectedAngle);
            if (chosenAngle === undefined) return;
            if (!Number.isNaN(Number(value))) {
                problem.setAngle(chosenAngle, Number(value));
            }
        } else if (kind === "right_triangle") {
            if (selectedTriangle === null || selectedRightVertex === null) return;
            const chosenTriangle = problem.triangles.get(selectedTriangle);
            const chosenVertex = problem.points.get(selectedRightVertex);
            if (chosenTriangle === undefined || chosenVertex === undefined) return;
            problem.addCondition({
                kind: "fact",
                fact: { kind: "right_triangle", triangle: chosenTriangle, rightAngleAt: chosenVertex, reason: { kind: "given" } },
            });
        } else if (kind === "equal_segments") {
            if (selectedSegment === null || selectedSegment2 === null) return;
            if (selectedSegment === selectedSegment2) return;
            const a = problem.segments.get(selectedSegment);
            const b = problem.segments.get(selectedSegment2);
            if (a === undefined || b === undefined) return;
            problem.addCondition({
                kind: "equation",
                equation: { kind: "segments_equal", a, b },
            });
        }

        setSelectedSegment(null);
        setSelectedSegment2(null);
        setSelectedAngle(null);
        setSelectedTriangle(null);
        setSelectedRightVertex(null);
        setValue("");
        onAdd();
    }

    return (
    <div className="form">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <select className="select"
                value={kind}
                onChange={(e) => setKind(e.target.value as StatementKind)}
            >
                {["length", "angle", "right_triangle", "equal_segments"].map((key) => (
                    <option key={key} value={key}>{key}</option>
                ))}
            </select>

            {kind === "length" && (
                <>
                    <select className="select"
                        value={selectedSegment ?? ""}
                        onChange={(e) => setSelectedSegment(e.target.value || null)}
                    >
                        <option value="">— select segment —</option>
                        {Array.from(problem.segments.entries()).map(([key, seg]) => (
                            <option key={key} value={key}>{formatSegmentName(seg)}</option>
                        ))}
                    </select>
                    <input className="input"
                        type="number" 
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        placeholder="length">
                    </input>
                </>
            )}

            {kind === "angle" && (
                <>
                    <select className="select"
                        value={selectedAngle ?? ""}
                        onChange={(e) => setSelectedAngle(e.target.value || null)}
                    >
                        <option value="">— select angle —</option>
                        {Array.from(problem.angles.entries()).map(([key, angle]) => (
                            <option key={key} value={key}>{formatAngleName(angle)}</option>
                        ))}
                    </select>
                    <input className="input"
                        type="number" 
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        placeholder="angle value">
                    </input>
                </>
            )}

            {kind === "equal_segments" && (
                <>
                    <select className="select"
                        value={selectedSegment ?? ""}
                        onChange={(e) => setSelectedSegment(e.target.value || null)}
                    >
                        <option value="">— first segment —</option>
                        {Array.from(problem.segments.entries()).map(([key, seg]) => (
                            <option key={key} value={key}>{formatSegmentName(seg)}</option>
                        ))}
                    </select>
                    <select className="select"
                        value={selectedSegment2 ?? ""}
                        onChange={(e) => setSelectedSegment2(e.target.value || null)}
                    >
                        <option value="">— equals segment —</option>
                        {Array.from(problem.segments.entries())
                            .filter(([key]) => key !== selectedSegment)
                            .map(([key, seg]) => (
                                <option key={key} value={key}>{formatSegmentName(seg)}</option>
                            ))}
                    </select>
                </>
            )}

            {kind === "right_triangle" && (
                <>
                    <select className="select"
                        value={selectedTriangle ?? ""}
                        onChange={(e) => setSelectedTriangle(e.target.value || null)}
                    >
                        <option value="">— select triangle —</option>
                        {Array.from(problem.triangles.entries()).map(([key, triangle]) => (
                            <option key={key} value={key}>{formatTriangleName(triangle)}</option>
                        ))}
                    </select>
                    <select className="select"
                        value={selectedRightVertex ?? ""} 
                        onChange={(e) => setSelectedRightVertex(e.target.value || null)}
                    >
                        <option value="">— right triangle vertex —</option>
                        {Array.from(problem.points.values()).map((point) => (
                            <option key={point.id} value={point.id}>{pointName(point)}</option>
                        ))}
                    </select>
                </>
            )}
        </div>

        <div>
            <button className="btn" onClick={handleAdd}>Add</button>
        </div>
    </div>
    );
}