import { useState } from "react";
import type { ExpectedSlot, Suggestion } from "../engine/statements";

// Состояние разбора, которое комбобокс получает от парсера: что предложить,
// готов ли результат (условие или цель) и есть ли ошибка.
export interface BoxState<T> {
    expected: ExpectedSlot;
    suggestions: Suggestion[];
    result: T | null;
    error: string | null;
}

interface StatementBoxProps<T> {
    parse: (text: string) => BoxState<T>;
    onCommit: (result: T) => void;
    placeholder: string;
    // Живая расшифровка того, что сделает Enter (например "Find AB").
    preview?: (result: T) => string;
    // Раскрывать список вверх — для поля, прижатого к низу панели.
    dropUp?: boolean;
}

// Усовершенствованный приемник новых фактов - через динамический ввод
// и навигационный список на основе введенного. Один и тот же компонент
// обслуживает и условия, и цель — различаются только parse/onCommit.
export function StatementBox<T>({ parse, onCommit, placeholder, preview, dropUp }: StatementBoxProps<T>) {
    const [text, setText] = useState("");
    const [highlighted, setHighlighted] = useState(0);
    const [focused, setFocused] = useState(false);

    const state = parse(text);
    const suggestions = state.suggestions;
    const active = Math.max(0, Math.min(highlighted, suggestions.length - 1));
    // "AB = " принимает и любое число, о чем сообщается в списке.
    const numberNote = state.expected === "object-or-value" || state.expected === "value";

    // Окончательно проверяет ввод и фиксирует результат, либо выходит, ничего не делая.
    function commit(inputText: string) {
        const done = parse(inputText);
        if (done.result === null) return;
        onCommit(done.result);
        setText("");
        setHighlighted(0);
    }

    // Выбирает подсказку из выпадающего списка
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
            if (state.result !== null) {
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
                placeholder={placeholder}
                onChange={(e) => { setText(e.target.value); setHighlighted(0); }}
                onKeyDown={handleKeyDown}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
            />
            {state.result !== null && (
                <span className="statement-ready" aria-hidden="true">↵</span>
            )}
            {open && (
                <div className={`statement-suggestions ${dropUp ? "statement-suggestions-up" : ""}`}>
                    {suggestions.map((suggestion, index) => (
                        <div
                            key={suggestion.apply}
                            className={`statement-suggestion ${index === active ? "statement-suggestion-active" : ""}`}
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
            {state.result !== null && preview !== undefined && (
                <div className="statement-preview">{preview(state.result)} — Enter</div>
            )}
            {state.error !== null && (
                <div className="statement-error">{state.error}</div>
            )}
        </div>
    );
}
