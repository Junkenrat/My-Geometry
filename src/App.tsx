import { Problem } from "./engine/problem";
import { Canvas } from "./components/canvas";
import { Panel } from "./components/panel";
import { useEffect, useRef, useState } from "react";
import type { Point } from "./engine/types";
import { isSolved, solve } from "./engine/solve";
import { assignLabels, ensureLabel, nextFreeLabel } from "./engine/naming";
import { Tools } from "./components/tools";
import { NameDialog } from "./components/nameDialog";
import { Actions } from "./components/actions";
import "./App.css";
import { validate } from "./engine/validate";

const GRID = 30;
const LINE_GRID_RADIUS = 8;

// Насколько далеко носитель тянется вдоль своего направления.
type Extent = "segment" | "ray" | "line";

// Nearest to (qx, qy) intersection of the p1-p2 line with the grid lines.
// Where the line passes through a true grid node both candidates coincide,
// so nodes attract automatically.
function snapToGridAlongLine(
  p1: Point, p2: Point, qx: number, qy: number, limit: Extent,
): { x: number; y: number } | null {
  const dx = p2.x - p1.x, dy = p2.y - p1.y;
  let best: { x: number; y: number } | null = null;
  let bestDist = LINE_GRID_RADIUS;
  const tryCandidate = (t: number) => {
    // отрезок живёт между концами, луч — только вперёд от начала, прямая — везде
    if (limit === "segment" && (t <= 0 || t >= 1)) return;
    if (limit === "ray" && t <= 0) return;
    const cand = { x: p1.x + t * dx, y: p1.y + t * dy };
    const dist = Math.hypot(qx - cand.x, qy - cand.y);
    if (dist < bestDist) {
      bestDist = dist;
      best = cand;
    }
  };
  if (dx !== 0) tryCandidate((Math.round(qx / GRID) * GRID - p1.x) / dx); // vertical grid line
  if (dy !== 0) tryCandidate((Math.round(qy / GRID) * GRID - p1.y) / dy); // horizontal grid line
  return best;
}

interface NamingTask {
  key: string;
  title: string;
  placeholder: () => string;
  submit: (value: string) => string | null;
  // What happens when the dialog closes: points get a fallback letter
  // if still unnamed.
  auto: () => void;
}

type Interaction =
  | { mode: "idle" }
  | { mode: "placing_point" }
  | { mode: "segment_start" }
  // "created" remembers whether the first endpoint was made for this
  // segment (and so must be removed if the segment is cancelled).
  | { mode: "segment_end"; first: Point; created: boolean }
  // naming: point tool; naming_queue: endpoints created on empty space,
  // asked one after another once the figure is placed. "returnTo" is where
  // the engine goes after the last dialog
  | { mode: "naming"; point: Point }
  | { mode: "naming_queue"; queue: NamingTask[]; returnTo: "segment_start" | "line_start" | "ray_start" }
  | { mode: "line_start" }
  | { mode: "line_end"; first: Point; created: boolean }
  // Луч строится как прямая, но первый клик задаёт начало, а не просто точку на ней.
  | { mode: "ray_start" }
  | { mode: "ray_end"; first: Point; created: boolean };

type Tool = "point" | "segment" | "cursor" | "line" | "ray";

// The active tool is derived from the interaction state, not stored separately.
function toolOf(interaction: Interaction): Tool {
  switch (interaction.mode) {
    case "placing_point":
    case "naming":
      return "point";
    case "segment_start":
    case "segment_end":
      return "segment";
    case "naming_queue":
      if (interaction.returnTo === "line_start") return "line";
      if (interaction.returnTo === "ray_start") return "ray";
      return "segment";
    case "idle":
      return "cursor";
    case "line_start":
    case "line_end":
      return "line";
    case "ray_start":
    case "ray_end":
      return "ray";
  }
}

function findPointAt(x: number, y: number, hitRadius: number, problem: Problem): Point | null {
  for (const point of problem.points.values()) {
    if (Math.hypot(x - point.x, y - point.y) < hitRadius)  {
      return point;
    }
  }
  return null;
}

function findLineAt(x: number, y:number, hitRadius: number, problem: Problem): {x: number, y: number, kind: "line"} | null {
  // The winner remembers its carrier so the projection can then be snapped
  // to the carrier's grid crossings.
  let best: { qx: number; qy: number; p1: Point; p2: Point; limit: Extent } | null = null;
  let minDist = hitRadius;
  for (const seg of problem.segments.values()) {
    const dx = seg.p2.x - seg.p1.x, dy = seg.p2.y - seg.p1.y;
    const len2 = dx * dx + dy * dy;
    if (len2 === 0) continue;
    let t =((x - seg.p1.x) * dx + (y - seg.p1.y) * dy) / len2;
    t = Math.max(0, Math.min(1, t))
    const qx = seg.p1.x + t * dx;
    const qy = seg.p1.y + t * dy;
    const dist = Math.hypot(x - qx, y - qy);
    if (dist < minDist) {
      minDist = dist;
      best = { qx, qy, p1: seg.p1, p2: seg.p2, limit: "segment" };
    }
  }
  for (const line of problem.lines.values()) {
    if (line.kind !== "drawn") continue;
    const dx = line.p2.x - line.p1.x, dy = line.p2.y - line.p1.y;
    const len2 = dx * dx + dy * dy;
    if (len2 === 0) continue;
    const t =((x - line.p1.x) * dx + (y - line.p1.y) * dy) / len2;
    const qx = line.p1.x + t * dx;
    const qy = line.p1.y + t * dy;
    const dist = Math.hypot(x - qx, y - qy);
    if (dist < minDist) {
      minDist = dist;
      best = { qx, qy, p1: line.p1, p2: line.p2, limit: "line" };
    }
  }
  for (const ray of problem.rays.values()) {
    if (ray.kind !== "drawn") continue;
    const dx = ray.through.x - ray.start.x, dy = ray.through.y - ray.start.y;
    const len2 = dx * dx + dy * dy;
    if (len2 === 0) continue;
    // луч не продолжается назад, поэтому проекция ограничена началом
    const t = Math.max(0, ((x - ray.start.x) * dx + (y - ray.start.y) * dy) / len2);
    const qx = ray.start.x + t * dx;
    const qy = ray.start.y + t * dy;
    const dist = Math.hypot(x - qx, y - qy);
    if (dist < minDist) {
      minDist = dist;
      best = { qx, qy, p1: ray.start, p2: ray.through, limit: "ray" };
    }
  }
  if (best === null) return null;
  const crossing = snapToGridAlongLine(best.p1, best.p2, best.qx, best.qy, best.limit);
  return crossing !== null
    ? { x: crossing.x, y: crossing.y, kind: "line" }
    : { x: best.qx, y: best.qy, kind: "line" };
}

function snapPosition(x: number, y: number, problem: Problem): {x: number, y: number, kind: "existingPoint" | "grid" | "line"} {
  // 1st priority: near point
  const existingPoint = findPointAt(x, y, 15, problem); 
  if (existingPoint !== null) return { x: existingPoint.x, y: existingPoint.y, kind: "existingPoint"}
  // 2nd priority: near segment or line
  const pointOnTheNearestLine = findLineAt(x, y, 12, problem); 
  if (pointOnTheNearestLine !== null) return pointOnTheNearestLine;
  // last priority: grid
  return { x: Math.round(x / GRID) * GRID, y: Math.round(y / GRID) * GRID, kind: "grid" } 
}

function App() {
  const [problem] = useState(() => new Problem());
  const [interaction, setInteraction] = useState<Interaction>({ mode: "idle" });

  // Dev-only escape hatch: poke the engine from the browser console
  // (window.__problem.addExplicitLine(...) etc.), then switch a tool
  // to trigger a re-render.
  useEffect(() => {
    if (import.meta.env.DEV) {
      (window as { __problem?: Problem }).__problem = problem;
    }
  }, [problem]);
  const [, setVersion] = useState(0);
  const [curSnapped, setSnapped] = useState<{x: number, y: number, kind: "grid" | "existingPoint" | "line"} | null>(null);
  // Сдвиг чертежа относительно экрана: чертёж таскается мышью в режиме курсора,
  // как карта. Координаты задачи не меняются — двигается только вид.
  const [view, setView] = useState({ x: 0, y: 0 });
  const [panning, setPanning] = useState(false);
  // Запрос подтверждения на стирание: показывается в плашке-подсказке.
  const [confirmClear, setConfirmClear] = useState(false);
  // Точка захвата: где нажали мышь и каким был сдвиг в этот момент.
  const panFrom = useRef<{ mx: number; my: number; vx: number; vy: number } | null>(null);

  const tool = toolOf(interaction);

  function pointNamingTask(point: Point, title: string): NamingTask {
    return {
      key: point.id,
      title,
      placeholder: () => nextFreeLabel(problem),
      submit: (value) => problem.renamePoint(point.id, value),
      auto: () => ensureLabel(problem, point),
    };
  }

  function handleToolChange(t: Tool) {
    discardPendingPoint();
    if (t === "point") {
      setInteraction({ mode: "placing_point" });
    } else if (t === "segment") {
      setInteraction({ mode: "segment_start" });
    } else if (t === "line") {
      setInteraction({ mode: "line_start"})
    } else if (t === "ray") {
      setInteraction({ mode: "ray_start"})
    } else  {
      setInteraction({ mode: "idle" });
    }
  }

  // Экранная точка события в координатах задачи.
  function worldCoords(e: React.MouseEvent<SVGSVGElement>): { x: number; y: number } {
    const coords = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - coords.left - view.x, y: e.clientY - coords.top - view.y };
  }

  // Перетаскивание доступно только курсором: у остальных инструментов
  // нажатие — это построение.
  function handleMouseDown(e: React.MouseEvent<SVGSVGElement>) {
    if (tool !== "cursor") return;
    panFrom.current = { mx: e.clientX, my: e.clientY, vx: view.x, vy: view.y };
    setPanning(true);
  }

  function handleMouseUp() {
    panFrom.current = null;
    setPanning(false);
  }

  function handleMove(e: React.MouseEvent<SVGSVGElement>) {
    const from = panFrom.current;
    if (from !== null) {
      setView({ x: from.vx + (e.clientX - from.mx), y: from.vy + (e.clientY - from.my) });
      return;
    }
    const { x, y } = worldCoords(e);
    setSnapped(snapPosition(x, y, problem));
  }

  function handleMouseLeave() {
    handleMouseUp();
    setSnapped(null);
  }

  function handleClick(e: React.MouseEvent<SVGSVGElement>) {
    // Пока висит вопрос о стирании, построение приостановлено.
    if (confirmClear) return;
    const { x, y } = worldCoords(e);
    const snappedCoords = snapPosition(x, y, problem);
    const snappedX = snappedCoords.x;
    const snappedY = snappedCoords.y;
    
    switch (interaction.mode) {
      case "idle":
        return;
      case "placing_point": {
        // В этом месте точка уже есть — дубль не создаём. Обратная связь
        // даётся заранее: призрачная точка под курсором краснеет.
        if (snappedCoords.kind === "existingPoint") return;
        // The point is born unnamed; the naming dialog (or the fallback
        // naming pass on skip) gives it a label.
        const point = problem.addPoint(snappedX, snappedY);
        setInteraction({ mode: "naming", point });
        setVersion(v => v + 1);
        return;
      }
      case "segment_start": {
        const existing = findPointAt(snappedX, snappedY, 7, problem);
        const first = existing ?? problem.addPoint(snappedX, snappedY);
        setInteraction({ mode: "segment_end", first, created: existing === null });
        setVersion(v => v + 1);
        return;
      }
      case "segment_end": {
        const existing = findPointAt(snappedX, snappedY, 7, problem);
        if (existing === interaction.first) return;
        const second = existing ?? problem.addPoint(snappedX, snappedY);
        problem.addSegment(interaction.first.id, second.id);
        // Both endpoints are placed; now ask names for the new ones, in order.
        const queue: NamingTask[] = [];
        if (interaction.first.label === null) queue.push(pointNamingTask(interaction.first, "Name the first point"));
        if (second.label === null) queue.push(pointNamingTask(second, "Name the second point"));
        if (queue.length > 0) {
          setInteraction({ mode: "naming_queue", queue, returnTo: "segment_start" });
        } else {
          setInteraction({ mode: "segment_start" });
        }
        setVersion(v => v + 1);
        return;
      }
      case "line_start": {
        const existing = findPointAt(snappedX, snappedY, 7, problem);
        const first = existing ?? problem.addPoint(snappedX, snappedY);
        setInteraction({ mode: "line_end", first, created: existing === null });
        setVersion(v => v + 1);
        return;
      }
      case "line_end": {
        const existing = findPointAt(snappedX, snappedY, 7, problem);
        if (existing === interaction.first) return;
        const second = existing ?? problem.addPoint(snappedX, snappedY);
        problem.addExplicitLine(interaction.first.id, second.id);
        // The line itself has no name — it is referred to through its points,
        // so only the endpoints may need naming.
        const queue: NamingTask[] = [];
        if (interaction.first.label === null) queue.push(pointNamingTask(interaction.first, "Name the first point"));
        if (second.label === null) queue.push(pointNamingTask(second, "Name the second point"));
        if (queue.length > 0) {
          setInteraction({ mode: "naming_queue", queue, returnTo: "line_start" });
        } else {
          setInteraction({ mode: "line_start" });
        }
        setVersion(v => v + 1);
        return;
      }
      case "ray_start": {
        const existing = findPointAt(snappedX, snappedY, 7, problem);
        const first = existing ?? problem.addPoint(snappedX, snappedY);
        setInteraction({ mode: "ray_end", first, created: existing === null });
        setVersion(v => v + 1);
        return;
      }
      case "ray_end": {
        const existing = findPointAt(snappedX, snappedY, 7, problem);
        if (existing === interaction.first) return;
        const second = existing ?? problem.addPoint(snappedX, snappedY);
        // Порядок важен: первая точка — начало луча.
        problem.addExplicitRay(interaction.first.id, second.id);
        const queue: NamingTask[] = [];
        if (interaction.first.label === null) queue.push(pointNamingTask(interaction.first, "Name the start of the ray"));
        if (second.label === null) queue.push(pointNamingTask(second, "Name the second point"));
        if (queue.length > 0) {
          setInteraction({ mode: "naming_queue", queue, returnTo: "ray_start" });
        } else {
          setInteraction({ mode: "ray_start" });
        }
        setVersion(v => v + 1);
        return;
      }
      case "naming":
      case "naming_queue":
        // Canvas is inert while the dialog is open.
        return;
    }
  }

  // Called on both confirm and skip
  function handleNamingClose() {
    switch (interaction.mode) {
      case "naming":
        setInteraction({ mode: "placing_point" });
        break;
      case "naming_queue": {
        const [, ...rest] = interaction.queue;
        if (rest.length > 0) {
          setInteraction({ mode: "naming_queue", queue: rest, returnTo: interaction.returnTo });
        } else {
          setInteraction({ mode: interaction.returnTo });
        }
        break;
      }
      default:
        break;
    }
    setVersion(v => v + 1);
  }

  function discardPendingPoint() {
    if ((interaction.mode === "segment_end" && interaction.created) ||
      (interaction.mode === "line_end" && interaction.created) ||
      (interaction.mode === "ray_end" && interaction.created)
    ) {
      problem.removePoint(interaction.first.id);
    }
  }

  function handleCancel() {
    if ((interaction.mode === "segment_end" && interaction.created) ||
    (interaction.mode === "line_end" && interaction.created) ||
    (interaction.mode === "ray_end" && interaction.created)) {
      problem.removePoint(interaction.first.id);
      if (interaction.mode === "segment_end") setInteraction({ mode: "segment_start"});
      if (interaction.mode === "line_end") setInteraction({ mode: "line_start"});
      if (interaction.mode === "ray_end") setInteraction({ mode: "ray_start"});
    } else {
      setInteraction({ mode: "idle" });
    }
    setVersion(v => v + 1);
  }

  // Стирает весь чертёж. Действие необратимое, поэтому спрашиваем
  // подтверждение — истории шагов (undo) пока нет.
  // Стирание необратимо (истории шагов пока нет), поэтому спрашиваем
  // подтверждение в той же плашке, что и остальные вопросы к пользователю.
  function handleClearRequest() {
    if (problem.points.size === 0 && problem.conditions.length === 0) return;
    setConfirmClear(true);
  }

  function handleClearConfirmed() {
    problem.clear();
    setConfirmClear(false);
    setView({ x: 0, y: 0 });
    setInteraction({ mode: "idle" });
    setSnapped(null);
    setVersion(v => v + 1);
  }

  function handleSolve() {
    solve(problem);
    assignLabels(problem);
    setVersion(v => v + 1);
  }

  function handleAdd() {
    setVersion(v => v + 1);
  }

  function handleSetGoal() {
    setVersion(v => v + 1);
  }

  function getHint(): string | null {
    switch (interaction.mode) {
      case "idle":
        return null;
      case "placing_point":
        return "Click anywhere to place a point";
      case "segment_start":
        return "Select or create the starting point of the segment";
      case "segment_end":
        return "Select or create the endpoint of the segment";
      case "line_start":
        return "Select or create the first point on the new line";
      case "line_end":
        return "Select or create the second point on the new line";
      case "ray_start":
        return "Select or create the starting point of the ray";
      case "ray_end":
        return "Select or create a second point the ray passes through";
      case "naming":
      case "naming_queue":
        return null; // the dialog is the hint
    }
  }


  const conflicts = validate(problem);
  return (
    <div className="app">
      <h1 className="app-title">My Geometry</h1>
      <Canvas
        problem={problem}
        onClick={handleClick}
        onMouseMove={handleMove}
        onMouseLeave={handleMouseLeave}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        view={view}
        panning={panning}
        firstPoint={interaction.mode === "segment_end" || interaction.mode === "line_end"
          || interaction.mode === "ray_end" ? interaction.first : null}
        curSnapped={curSnapped}
        Tool={tool}
      />
      {confirmClear ? (
        <div className="hint">
          <div className="hint-content">Are you sure you want to erase the whole drawing?</div>
          <div className="hint-actions">
            <button className="hint-btn-done" style={{marginTop: "10px"}} onClick={handleClearConfirmed}>
              Erase
            </button>
            <button className="hint-btn-cancel" style={{marginTop: "10px"}} onClick={() => setConfirmClear(false)}>
              Cancel
            </button>
          </div>
        </div>
      ) : getHint() && (
        <div className="hint">
          <div className="hint-content">{getHint()}</div>
          {/* <hr className="hint-divider" /> */}
          <div className="hint-actions">
            <button className="hint-btn-cancel" style={{marginTop: "10px"}} onClick={handleCancel}>
              Cancel
            </button>
          </div>
        </div>
      )}
      {interaction.mode === "naming" && (
        <NameDialog
          key={interaction.point.id}
          title="Name the new point"
          placeholder={nextFreeLabel(problem)}
          onSubmit={(value) => problem.renamePoint(interaction.point.id, value)}
          onClose={handleNamingClose}
          onAuto={() => ensureLabel(problem, interaction.point)}
        />
      )}
      {interaction.mode === "naming_queue" && interaction.queue[0] !== undefined && (
        <NameDialog
          key={interaction.queue[0].key}
          title={interaction.queue[0].title}
          placeholder={interaction.queue[0].placeholder()}
          onSubmit={interaction.queue[0].submit}
          onClose={handleNamingClose}
          onAuto={interaction.queue[0].auto}
        />
      )}
      <Tools tool={tool} setTool={handleToolChange} />
      <Actions onClear={handleClearRequest} />
      <Panel
        problem={problem}
        onSolve={handleSolve}
        isSolved={isSolved(problem)}
        conflicts={conflicts}
        onAdd={handleAdd}
        onSetGoal={handleSetGoal}
      />
    </div>
  )
}

export default App;