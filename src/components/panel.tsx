import { formatFact, formatGoal, formatQuantity } from "../engine/format";
import { Problem } from "../engine/problem";
import { AddStatement } from "./addStatement";
import { SetGoal } from "./setGoal";
import { useState } from "react";
import { Solution } from "./solution";
import type { Conflict } from "../engine/validate";
// import type { Point } from "../engine/types";

interface PanelProps {
    problem: Problem;
    onSolve: () => void;
    isSolved: boolean;
    conflicts: Conflict[];
    onAdd: () => void;
    onSetGoal: () => void;
}

export function Panel({problem, onSolve, isSolved, conflicts, onAdd, onSetGoal}: PanelProps) {
    const [activeTab, setActiveTab] = useState<"problem" | "solution">("problem");
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
                    <div className="status">
                        Status: {isSolved ? "Solved" : "Not enough info"}
                    </div>
                    <h3 className="section-title">Statements</h3>
                    <div className="statements-list">
                        {problem.facts.map((fact, index) => {
                            const text = formatFact(fact);
                            if (text === null) return null;
                            return (
                                <div key={`fact-${index}`} className="statement">
                                    {text}
                                </div>
                            );
                        })}
                        {problem.quantities.assignments
                            .filter(a => a.reason.kind === "given")
                            .map((a, index) => (
                                <div key={`given-${index}`} className="statement">
                                    {formatQuantity(a.quantity)}
                                </div>
                            ))}
                    </div>
                    
                    <AddStatement problem={problem} onAdd={onAdd} />

                    <h3 className="section-title">Goal</h3>
                    
                    <div className="goal-display">
                        {problem.goal ? formatGoal(problem.goal) : "no goal"}
                    </div>

                    <SetGoal problem={problem} onSet={onSetGoal} />
                    
                    <button className="btn btn-primary" onClick={onSolve}>Solve</button>
                    {/* <div className="solve-row">
                        <button className="btn btn-primary" onClick={onSolve}>Solve</button>
                    </div> */}
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