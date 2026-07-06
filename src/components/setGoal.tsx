import type { Goal } from "../engine/facts";
import { Problem } from "../engine/problem";
import { formatAngleName, formatSegmentName } from "../engine/format";
import { useState } from "react";

interface SetGoalProps {
  problem: Problem;
  onSet: () => void;
}

export function SetGoal({problem, onSet}: SetGoalProps) {
    const [selectedObject, setSelectedObject] = useState<string | null>(null);
    const [selectedAction, setSelectedAction] = useState<string | null>(null);

    function getActionsFor(selectedObject: string | null): {value: string, label: string}[] {
        const actions: {value: string, label: string}[] = [];
        if (selectedObject === null) return [];
        if (selectedObject.startsWith("segment:")) {
            actions.push({value: "find_length", label: "Find length"});
            const key = selectedObject.slice("segment:".length);
            const segment = problem.segments.get(key);
            if (segment === undefined) return actions;
            for (const [otherKey, otherSegment] of problem.segments.entries()) {
                if (key === otherKey) continue;
                actions.push({
                    value: `prove_perp:${otherKey}`,
                    label: `Prove ${formatSegmentName(segment)}⊥${formatSegmentName(otherSegment)}`
                })
            }
        }
        if (selectedObject.startsWith("angle:")) {
            actions.push({value: "find_angle", label: "Find angle"});
        }
        return actions;
    }

    function handleSet() {
        if (selectedObject === null || selectedAction === null) return;
        if (selectedAction === "find_length" ) {
            const key = selectedObject.slice("segment:".length);
            const object = problem.segments.get(key);
            if (object === undefined) return;
            const goal: Goal = {kind: "length", segment: object};
            problem.setGoal(goal);
        } else if (selectedAction === "find_angle") {
            const key = selectedObject.slice("angle:".length);
            const object = problem.angles.get(key);
            if (object === undefined) return;
            const goal: Goal = {kind: "angle", angle: object};
            problem.setGoal(goal);
        } else if (selectedAction.startsWith("prove_perp:")) {
            const key1 = selectedObject.slice("segment:".length);
            const key2 = selectedAction.slice("prove_perp:".length);
            const object1 = problem.segments.get(key1);
            const object2 = problem.segments.get(key2);
            if (object1 === undefined || object2 === undefined) return;
            const goal: Goal = {kind: "perpendicular", seg1: object1, seg2: object2};
            problem.setGoal(goal);
        } else {
            return;
        }
        setSelectedObject(null);
        setSelectedAction(null);
        onSet();
    }
    
    return (
        <div className="form">
            <select className="select" value={selectedObject ?? ""} onChange={(e) => {
                setSelectedObject(e.target.value || null);
                setSelectedAction(null);
            }}>
                <option value="">-select object-</option>
                {Array.from(problem.segments.entries()).map(([key, seg]) => (
                    <option key={`seg:${key}`} value={`segment:${key}`}>Segment {formatSegmentName(seg)}</option>
                ))}
                {Array.from(problem.angles.entries()).map(([key, angle]) => (
                    <option key={`ang:${key}`} value={`angle:${key}`}>Angle {formatAngleName(angle)}</option>
                ))}
            </select>
            {selectedObject !== null && (
                <select className="select" value={selectedAction ?? ""} onChange={(e) => {
                    setSelectedAction(e.target.value || null);
                }}>
                    <option value="">-what to do-</option>
                    {getActionsFor(selectedObject).map(({value, label}) =>(
                        <option key={value} value={value}>{label}</option>
                    ))}
                </select>
            )}
            <button className="btn btn-primary" onClick={handleSet}>Set goal</button>
        </div>
    )
}