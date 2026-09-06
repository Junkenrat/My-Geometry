import { formatAnglePoints, formatConditions, formatNumber, formatSegmentName,
         getTheoremName } from "../engine/format";
import { conditionHolds } from "../engine/solve";
import { solutionSteps } from "../engine/steps";
import { Problem } from "../engine/problem";

interface SolutionProps {
    problem: Problem;
}

// Итог задачи: найденное значение или отметка о доказанности.
function answerOf(problem: Problem): string | null {
    const goal = problem.goal;
    if (goal === null) return null;
    if (goal.kind === "length") {
        const value = problem.quantities.value(problem.lengthId(goal.segment));
        return value === null ? null : `${formatSegmentName(goal.segment)} = ${formatNumber(value)}`;
    }
    if (goal.kind === "angle") {
        const value = problem.quantities.value(problem.angleIdOf(goal.angle));
        return value === null ? null : `${formatAnglePoints(goal.angle)} = ${formatNumber(value)}°`;
    }
    if (!conditionHolds(problem, goal.condition)) return null;
    return `${formatConditions(goal.condition) ?? "?"} — proved`;
}

// Пошаговая выкладка: номер, использованное свойство обычным шрифтом,
// затем формулы крупно — от общей записи свойства до итога шага.
export function Solution({ problem }: SolutionProps) {
    const steps = solutionSteps(problem);
    const answer = answerOf(problem);

    if (steps.length === 0) {
        return <div className="statement-empty">No derivation steps yet — press Solve.</div>;
    }
    return (
        <div className="solution">
            <h3 className="section-title">Solution</h3>
            {steps.map((step, index) => (
                <div className="solution-step" key={index}>
                    <div className="step-number">{index + 1}</div>
                    <div className="step-body">
                        <div className="step-claim">
                            {step.source !== null && (
                                <>For <span className="step-source">{step.source}</span>, according to </>
                            )}
                            <span className="step-theorem">{getTheoremName(step.theorem)}:</span>
                        </div>
                        {step.formulas.map((formula, i) => (
                            <div className="step-formula" key={i}>{formula}</div>
                        ))}
                    </div>
                </div>
            ))}
            {answer !== null && (
                <div className="solution-answer">
                    <div className="answer-label">Answer</div>
                    <div className="answer-value">{answer}</div>
                </div>
            )}
        </div>
    );
}
