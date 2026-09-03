import { Problem } from "../engine/problem";
import { parseGoalInput } from "../engine/statements";
import { formatGoal, formatGoalInput } from "../engine/format";
import { StatementBox } from "./statementBox";

interface SetGoalProps {
    problem: Problem;
    onSet: () => void;
}

// Цель вводится тем же комбобоксом, что и условия: одиночный объект (AB, ∠ABC)
// значит «найти», полное утверждение (AB ⊥ CD, △ABC right B) — «доказать».
// Enter или клик по завершающей подсказке ставит цель; отдельной кнопки нет.
export function SetGoal({ problem, onSet }: SetGoalProps) {
    return (
        <div className="form">
            <StatementBox
                parse={(text) => {
                    const s = parseGoalInput(problem, text);
                    return { expected: s.expected, suggestions: s.suggestions, result: s.goal, error: s.error };
                }}
                onCommit={(goal) => { problem.setGoal(goal); onSet(); }}
                placeholder="Object to find or statement to prove..."
                preview={formatGoal}
                dropUp
                restingText={problem.goal !== null ? formatGoalInput(problem.goal) : ""}
            />
        </div>
    );
}
