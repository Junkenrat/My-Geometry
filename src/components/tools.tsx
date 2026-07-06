import PointIcon from "../assets/icons/Point.svg?react";
import SegmentIcon from "../assets/icons/Segment.svg?react";
import RayIcon from "../assets/icons/Ray.svg?react";
import LineIcon from "../assets/icons/Line.svg?react";
import TriangleIcon from "../assets/icons/Triangle.svg?react";
import QuadIcon from "../assets/icons/Quad.svg?react";
import CircleIcon from "../assets/icons/Circle.svg?react";
import CursorIcon from "../assets/icons/Cursor.svg?react";
import MoveIcon from "../assets/icons/Move.svg?react";

type Tool = "point" | "segment" | "ray" | "cursor" | "line";

interface ToolsProps {
  tool: Tool;
  setTool: (t: Tool) => void;
}

export function Tools({ tool, setTool }: ToolsProps) {
  return (
    <div className="tools">
      <button className={`tool-btn ${tool === "point" ? "tool-active" : ""}`} onClick={() => setTool("point")}>
        <PointIcon className="tool-icon-small" />
      </button>
      <button className={`tool-btn ${tool === "segment" ? "tool-active" : ""}`} onClick={() => setTool("segment")}>
        <SegmentIcon />
      </button>
      <button className={`tool-btn ${tool === "ray" ? "tool-active" : ""}`} onClick={() => setTool("ray")} disabled>
        <RayIcon />
      </button>
      <button className={`tool-btn ${tool === "line" ? "tool-active" : ""}`} onClick={() => setTool("line")}>
        <LineIcon />
      </button>
      
      <div className="tool-divider" />
      
      <button className="tool-btn" disabled>
        <TriangleIcon />
      </button>
      <button className="tool-btn" disabled>
        <QuadIcon />
      </button>
      <button className="tool-btn" disabled>
        <CircleIcon />
      </button>
      
      <div className="tool-divider" />
      
      <button className={`tool-btn ${tool === "cursor" ? "tool-active" : ""}`} onClick={() => setTool("cursor")}>
        <CursorIcon />
      </button>
      <button className="tool-btn" disabled>
        <MoveIcon />
      </button>
    </div>
  );
}