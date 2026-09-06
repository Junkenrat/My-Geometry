import ClearIcon from "../assets/icons/Clear.svg?react";
import UndoIcon from "../assets/icons/Undo.svg?react";
import RedoIcon from "../assets/icons/Redo.svg?react";
import EraserIcon from "../assets/icons/Eraser.svg?react";

interface ActionsProps {
  onClear: () => void;
  onErase: () => void;
  eraserActive: boolean;
  // История шагов ещё не реализована
  onUndo?: () => void;
  onRedo?: () => void;
}

export function Actions({ onClear, onErase, eraserActive, onUndo, onRedo }: ActionsProps) {
  return (
    <div className="actions">
      <button className="tool-btn tool-btn-clear" onClick={onClear}>
        <ClearIcon style={{width: '25px', height: '25px'}}/>
      </button>
      <button className={`tool-btn ${eraserActive ? "tool-active" : ""}`} onClick={onErase}>
        <EraserIcon style={{width: '25px', height: '25px'}}/>
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
