import { formatConditions, formatFact, formatGoal, formatQuantity } from "../engine/format";
import { isMeaningfulFact } from "../engine/facts";
import { Problem } from "../engine/problem";
import { AddStatement } from "./addStatement";
import { SetGoal } from "./setGoal";
import { useState } from "react";
import { Solution } from "./solution";
import type { Conflict } from "../engine/validate";

interface PanelProps {
    problem: Problem;
    onSolve: () => void;
    isSolved: boolean;
    conflicts: Conflict[];
    onAdd: () => void;
    onSetGoal: () => void;
}

// isSolved is not destructured while the status line is commented out.
export function Panel({problem, onSolve, conflicts, onAdd, onSetGoal}: PanelProps) {
    const [activeTab, setActiveTab] = useState<"problem" | "solution">("problem");
    const givenItems = problem.conditions.map((condition, index) => ({
        text: formatConditions(condition) ?? "",
        remove: () => problem.removeCondition(index),
    }));

    // Removal drops the condition and forgets everything derived;
    // re-solve immediately so Found reflects the remaining conditions.
    function handleRemove(item: { remove: () => void }) {
        item.remove();
        onSolve();
    }
    const foundItems: string[] = [
        ...problem.quantities.assignments
            .filter(a => a.reason.kind === "derived")
            .map(a => formatQuantity(a.quantity)),
        ...problem.facts
            .filter(f => f.reason.kind === "derived" && isMeaningfulFact(f))
            .map(f => formatFact(f))
            .filter((s): s is string => s !== null),
    ];

    return (
        <div className="panel">

            <div className="tabs">
                <button className={`tab ${activeTab === "problem" ? "tab-active" : ""}`}
                onClick={() => setActiveTab("problem")}>Problem</button>
                <button className={`tab ${activeTab === "solution" ? "tab-active" : ""}`}
                onClick={() => setActiveTab("solution")}>Solution</button>
            </div>

            {activeTab === "problem" && (
                <>
                    {/* <div className="status">
                        Status: {isSolved ? "Solved" : "Not enough info"}
                    </div> */}
                    <h3 className="section-title">Given</h3>
                    <div className="statements-list">
                        {givenItems.length === 0 && (
                            <div className="statement-empty">No conditions yet</div>
                        )}
                        {givenItems.map((item, index) => (
                            <div key={`given-${index}`} className="statement statement-given">
                                <span>{item.text}</span>
                                <button
                                    className="statement-remove"
                                    aria-label="Remove condition"
                                    onClick={() => handleRemove(item)}
                                >
                                    ×
                                </button>
                            </div>
                        ))}
                    </div>

                    <AddStatement problem={problem} onAdd={onAdd} />

                    <h3 className="section-title">Found</h3>
                    <div className="statements-list">
                        {foundItems.length === 0 && (
                            <div className="statement-empty">
                                If we can find any new values we'll show them here
                            </div>
                        )}
                        {foundItems.map((text, index) => (
                            <div key={`found-${index}`} className="statement statement-found">
                                {text}
                            </div>
                        ))}
                    </div>

                    <h3 className="section-title">Goal</h3>

                    <div className="goal-display">
                        {problem.goal ? formatGoal(problem.goal) : "no goal"}
                    </div>

                    <SetGoal problem={problem} onSet={onSetGoal} />

                    <button className="btn btn-primary" onClick={onSolve}>Solve</button>
                </>
            )}

            {activeTab === "solution" && (
                <>
                    <Solution problem={problem}/>
                </>
            )}

            {conflicts.length > 0 && (
                <div className="conflicts">
                    {conflicts.map((c, i) => (
                        <div key={i} className="conflict">{c.message}</div>
                    ))}
                </div>
            )}
        </div>
    )
}
