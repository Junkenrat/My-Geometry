import { useState } from "react";
import { Problem } from "../engine/problem";
import { parseStatementInput } from "../engine/statements";

interface StatementBoxProps {
    problem: Problem;
    onAdd: () => void;
}

export function StatementBox({ problem, onAdd }: StatementBoxProps) {
    const [text, setText] = useState("");
    const [highlighted, setHighlighted] = useState(0);
    const [focused, setFocused] = useState(false);

    const state = parseStatementInput(problem, text);
    const suggestions = state.suggestions;
    const active = Math.max(0, Math.min(highlighted, suggestions.length - 1));
    // "AB = " accepts a hand-typed number too — say so under the segment list
    const numberNote = state.expected === "segment-or-value" || state.expected === "value";

    function commit(conditionText: string) {
        const done = parseStatementInput(problem, conditionText);
        if (done.condition === null) return;
        problem.addCondition(done.condition);
        setText("");
        setHighlighted(0);
        onAdd();
    }

    function apply(index: number, commitIfComplete: boolean) {
        const suggestion = suggestions[index];
        if (suggestion === undefined) return;
        if (suggestion.completes && commitIfComplete) {
            commit(suggestion.apply);
            return;
        }
        setText(suggestion.apply);
        setHighlighted(0);
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
        if (e.key === "Tab" && suggestions.length > 0) {
            e.preventDefault();
            apply(active, false);
        } else if (e.key === "Enter") {
            if (state.condition !== null) {
                commit(text);
            } else if (suggestions.length > 0) {
                apply(active, true);
            }
        } else if (e.key === "ArrowDown" && suggestions.length > 0) {
            e.preventDefault();
            setHighlighted((active + 1) % suggestions.length);
        } else if (e.key === "ArrowUp" && suggestions.length > 0) {
            e.preventDefault();
            setHighlighted((active + suggestions.length - 1) % suggestions.length);
        } else if (e.key === "Escape") {
            e.currentTarget.blur();
        }
    }

    const open = focused && (suggestions.length > 0 || numberNote);
    return (
        <div className="statement-box">
            <input
                className={`input ${state.error !== null ? "statement-input-error" : ""}`}
                value={text}
                placeholder="Select the object or type: AB ⊥ CD"
                onChange={(e) => { setText(e.target.value); setHighlighted(0); }}
                onKeyDown={handleKeyDown}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
            />
            {state.condition !== null && (
                <span className="statement-ready" aria-hidden="true">↵</span>
            )}
            {open && (
                <div className="statement-suggestions">
                    {suggestions.map((suggestion, index) => (
                        <div
                            key={suggestion.apply}
                            className={`statement-suggestion ${index === active ? "statement-suggestion-active" : ""}`}
                            // mousedown, not click: click would land after the
                            // input's blur has already closed the list
                            onMouseDown={(e) => { e.preventDefault(); apply(index, true); }}
                            onMouseEnter={() => setHighlighted(index)}
                        >
                            <span>
                                {suggestion.label}
                                {suggestion.hint !== null && (
                                    <span className="statement-suggestion-hint"> ({suggestion.hint})</span>
                                )}
                            </span>
                            {suggestion.completes && <span className="statement-suggestion-check">✓</span>}
                        </div>
                    ))}
                    {numberNote && (
                        <div className="statement-note">… or type a number</div>
                    )}
                </div>
            )}
            {state.error !== null && (
                <div className="statement-error">{state.error}</div>
            )}
        </div>
    );
}
