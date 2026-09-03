import ClearIcon from "../assets/icons/Clear.svg?react";
import UndoIcon from "../assets/icons/Undo.svg?react";
import RedoIcon from "../assets/icons/Redo.svg?react";

interface ActionsProps {
  onClear: () => void;
  // История шагов ещё не реализована: без обработчика кнопка выключена.
  onUndo?: () => void;
  onRedo?: () => void;
}

// Нижняя левая плашка: стереть всё и шаги назад/вперёд.
export function Actions({ onClear, onUndo, onRedo }: ActionsProps) {
  return (
    <div className="actions">
      <button className="tool-btn" onClick={onClear}>
        <ClearIcon />
      </button>

      <div className="action-divider" />

      <button className="tool-btn" onClick={onUndo} disabled={onUndo === undefined}>
        <UndoIcon />
      </button>
      <button className="tool-btn" onClick={onRedo} disabled={onRedo === undefined}>
        <RedoIcon />
      </button>
    </div>
  );
}
