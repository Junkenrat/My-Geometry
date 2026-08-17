import { useState } from "react";

interface NameDialogProps {
    // Название сообщения вроде "Name the first point" или "Name the second point".
    title: string;
    // Имя точки, которое она получит при нажатии "Auto".
    // Оно же отображается серым в окне ввода.
    placeholder: string;
    // Попытка переименовать - возвращает null либо строку с ошибкой.
    onSubmit: (value: string) => string | null;
    // Присваивает точке букву по дефолту
    onAuto: () => void;
    // Нужно переделать под onCancel!
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
                {/* <button className="hint-btn-cancel" style={{ marginLeft: "auto" }} onClick={onClose}>Skip</button> */}
                {/* Кнопку "Skip" пока решил убрать, т.к. не ясно, что делать с безымянными объектами */}
            </div>
        </div>
    );
}
