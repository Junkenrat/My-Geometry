import { Problem } from "../engine/problem";
import { parseStatementInput } from "../engine/statements";
import { StatementBox } from "./statementBox";

interface AddStatementProps {
    problem: Problem;
    onAdd: () => void;
}

// All statements (segments, angles, triangles) are entered through the
// StatementBox combobox; a finished statement becomes a condition.
export function AddStatement({ problem, onAdd }: AddStatementProps) {
    return (
        <div className="form">
            <StatementBox
                parse={(text) => {
                    const s = parseStatementInput(problem, text);
                    return { expected: s.expected, suggestions: s.suggestions, result: s.condition, error: s.error };
                }}
                onCommit={(condition) => { problem.addCondition(condition); onAdd(); }}
                placeholder="Start entering the condition..."
            />
        </div>
    );
}
