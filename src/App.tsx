import { Problem } from "./engine/problem";
import { Canvas } from "./components/canvas";
import { Panel } from "./components/panel";
import { useEffect, useState } from "react";
import type { Point } from "./engine/types";
import { isSolved, solve } from "./engine/solve";
import { assignLabels, ensureLabel, nextFreeLabel, nextFreeLineLabel } from "./engine/naming";
import { Tools } from "./components/tools";
import { NameDialog } from "./components/nameDialog";
import "./App.css";
import { validate } from "./engine/validate";

const GRID = 30;
const LINE_GRID_RADIUS = 8;

// Nearest to (qx, qy) intersection of the p1-p2 line with the grid lines.
// Where the line passes through a true grid node both candidates coincide,
// so nodes attract automatically.
function snapToGridAlongLine(
  p1: Point, p2: Point, qx: number, qy: number, clampToSegment: boolean,
): { x: number; y: number } | null {
  const dx = p2.x - p1.x, dy = p2.y - p1.y;
  let best: { x: number; y: number } | null = null;
  let bestDist = LINE_GRID_RADIUS;
  const tryCandidate = (t: number) => {
    if (clampToSegment && (t <= 0 || t >= 1)) return; // stay inside the segment
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
  // if still unnamed, lines legitimately stay unnamed.
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
  | { mode: "naming_queue"; queue: NamingTask[]; returnTo: "segment_start" | "line_start" }
  | { mode: "line_start" }
  | { mode: "line_end"; first: Point; created: boolean };

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
      return interaction.returnTo === "line_start" ? "line" : "segment";
    case "idle":
      return "cursor";
    case "line_start":
    case "line_end":
      return "line";
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
  let best: { qx: number; qy: number; p1: Point; p2: Point; clamp: boolean } | null = null;
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
      best = { qx, qy, p1: seg.p1, p2: seg.p2, clamp: true };
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
      best = { qx, qy, p1: line.p1, p2: line.p2, clamp: false };
    }
  }
  if (best === null) return null;
  const crossing = snapToGridAlongLine(best.p1, best.p2, best.qx, best.qy, best.clamp);
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
    } else  {
      setInteraction({ mode: "idle" });
    }
  }

  function handleMove(e: React.MouseEvent<SVGSVGElement>) {
    const svg = e.currentTarget;
    const coords = svg.getBoundingClientRect();
    const x = e.clientX - coords.left;
    const y = e.clientY - coords.top;
    setSnapped(snapPosition(x, y, problem));
  }

  function handleMouseLeave() {
    setSnapped(null);
  }

  function handleClick(e: React.MouseEvent<SVGSVGElement>) {
    const svg = e.currentTarget;
    const coords = svg.getBoundingClientRect();
    const x = e.clientX - coords.left;
    const y = e.clientY - coords.top;
    const snappedCoords = snapPosition(x, y, problem);
    const snappedX = snappedCoords.x;
    const snappedY = snappedCoords.y;
    
    switch (interaction.mode) {
      case "idle":
        return;
      case "placing_point": {
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
        const line = problem.addExplicitLine(interaction.first.id, second.id);
        const queue: NamingTask[] = [];
        if (interaction.first.label === null) queue.push(pointNamingTask(interaction.first, "Name the first point"));
        if (second.label === null) queue.push(pointNamingTask(second, "Name the second point"));
        if (line.label === null) {
          queue.push({
            key: line.id,
            title: "Name the line",
            placeholder: () => nextFreeLineLabel(problem),
            submit: (value) => problem.renameLine(line.id, value),
            auto: () => { problem.renameLine(line.id, nextFreeLineLabel(problem)); }
          });
        }
        if (queue.length > 0) {
          setInteraction({ mode: "naming_queue", queue, returnTo: "line_start" });
        } else {
          setInteraction({ mode: "line_start" });
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
      (interaction.mode === "line_end" && interaction.created)
    ) {
      problem.removePoint(interaction.first.id);
    }
  }

  function handleCancel() {
    if ((interaction.mode === "segment_end" && interaction.created) ||
    (interaction.mode === "line_end" && interaction.created)) {
      problem.removePoint(interaction.first.id);
      if (interaction.mode === "segment_end") setInteraction({ mode: "segment_start"});
      if (interaction.mode === "line_end") setInteraction({ mode: "line_start"});
    } else {
      setInteraction({ mode: "idle" });
    }
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
        firstPoint={interaction.mode === "segment_end" || interaction.mode === "line_end" ? interaction.first : null}
        curSnapped={curSnapped}
        Tool={tool}
      />
      {getHint() && (
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