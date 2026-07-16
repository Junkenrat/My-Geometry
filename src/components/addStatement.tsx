import { useState } from "react";
import { Problem } from "../engine/problem";
import { formatAngleName, formatTriangleName } from "../engine/format";
import { pointName } from "../engine/types";
import { StatementBox } from "./statementBox";


interface AddStatementProps {
    problem: Problem;
    onAdd: () => void;
}

// Segment statements (length, equality, ratio, ⊥, ∥) go through the
// StatementBox combobox; the selects below remain for angle value and
// right triangle until the grammar covers those too.
export function AddStatement({ problem, onAdd }: AddStatementProps) {
    type StatementKind = "angle" | "right_triangle";
    const [kind, setKind] = useState<StatementKind>("angle");
    const [selectedAngle, setSelectedAngle] = useState<string | null>(null);
    const [selectedTriangle, setSelectedTriangle] = useState<string | null>(null);
    const [selectedRightVertex, setSelectedRightVertex] = useState<string | null>(null);
    const [value, setValue] = useState<string>("");

    function handleAdd() {
        if (kind === "angle") {
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
        }

        setSelectedAngle(null);
        setSelectedTriangle(null);
        setSelectedRightVertex(null);
        setValue("");
        onAdd();
    }

    return (
    <div className="form">
        <StatementBox problem={problem} onAdd={onAdd} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <select className="select"
                value={kind}
                onChange={(e) => setKind(e.target.value as StatementKind)}
            >
                {["angle", "right_triangle"].map((key) => (
                    <option key={key} value={key}>{key}</option>
                ))}
            </select>

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
