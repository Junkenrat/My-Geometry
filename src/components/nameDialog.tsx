import { useState } from "react";

interface NameDialogProps {
    // What is being named, e.g. "Name the first point", "Name the line".
    // The dialog doesn't know the flow — the parent tells it everything.
    title: string;
    // What the object will be called if the user skips.
    placeholder: string;
    // Attempts the rename; returns an error message to display, or null.
    onSubmit: (value: string) => string | null;
    // Called on both successful confirm and skip; the parent decides
    // what happens to an object left unnamed.
    onAuto: () => void;
    onClose: () => void;
}

export function NameDialog({ title, placeholder, onSubmit, onClose, onAuto}: NameDialogProps) {
    const [value, setValue] = useState("");
    const [error, setError] = useState<string | null>(null);

    function handleConfirm() {
        if (value.trim() === "") {
            setError(`Please enter a name or choose "Auto"`);
            return;
        }
        const err = onSubmit(value.trim());
        if (err !== null) {
            setError(err);
            return;
        }
        onClose();
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
        if (e.key === "Enter") handleConfirm();
        if (e.key === "Escape") onClose();
    }

    return (
        <div className="name-dialog">
            <div className="hint-content">{title}</div>
            {error !== null && <div className="name-dialog-error">{error}</div>}
            <input
                className="input"
                autoFocus
                maxLength={1}
                value={value}
                placeholder={placeholder}
                onChange={(e) => {
                    setValue(e.target.value);
                    setError(null);
                }}
                onKeyDown={handleKeyDown}
            />
            <div className="hint-actions">
                <button className="hint-btn-done" onClick={handleConfirm}>Done</button>
                <button className="hint-btn-cancel" onClick={() => {onAuto(); onClose();}}>Auto</button>
                <button className="hint-btn-cancel" style={{ marginLeft: "auto"}}>Cancel</button> 
                {/*A task for the future is to implement the eraser tool. 
                The undo button here deletes the shape that has just been drawn*/}
                {/* <button className="hint-btn-cancel" style={{ marginLeft: "auto" }} onClick={onClose}>Skip</button> */}
            </div>
        </div>
    );
}
