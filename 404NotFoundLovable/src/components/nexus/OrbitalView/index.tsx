import { useCallback, useRef, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Minus, Maximize2 } from "lucide-react";
import {
  Department,
  Person,
  Connection,
  NodePosition,
  DEPT_COLORS,
} from "../types";

interface OrbitalViewProps {
  departments: Department[];
  connections: Connection[];
  expandedDepts: Set<string>;
  nodePositions: Map<string, NodePosition>;
  selectedPersonId: string | null;
  onToggleDept: (id: string) => void;
  onSelectPerson: (person: Person, dept: Department) => void;
  onNodeDrag: (id: string, x: number, y: number) => void;
  onOpenCommandPalette: () => void;
}

export function OrbitalView({
  departments,
  connections,
  expandedDepts,
  nodePositions,
  selectedPersonId,
  onToggleDept,
  onSelectPerson,
  onNodeDrag,
  onOpenCommandPalette,
}: OrbitalViewProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<{
    id: string;
    offsetX: number;
    offsetY: number;
  } | null>(null);

  // Track if drag occurred to prevent click after drag
  const didDragRef = useRef(false);
  const startPosRef = useRef({ x: 0, y: 0 });
  const DRAG_THRESHOLD = 5; // pixels

  const [zoom, setZoom] = useState(1);

  const cx = 420,
    cy = 320;

  const getSVGPoint = useCallback(
    (clientX: number, clientY: number) => {
      const svg = svgRef.current;
      if (!svg) return { x: 0, y: 0 };
      const pt = svg.createSVGPoint();
      pt.x = clientX;
      pt.y = clientY;
      const ctm = svg.getScreenCTM();
      if (!ctm) return { x: 0, y: 0 };
      const svgP = pt.matrixTransform(ctm.inverse());
      return { x: svgP.x, y: svgP.y };
    },
    []
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, id: string) => {
      e.stopPropagation();
      e.preventDefault();
      const pos = nodePositions.get(id);
      if (!pos) return;
      const svgP = getSVGPoint(e.clientX, e.clientY);
      dragRef.current = {
        id,
        offsetX: pos.x - svgP.x,
        offsetY: pos.y - svgP.y,
      };
      // Track start position for drag detection
      startPosRef.current = { x: e.clientX, y: e.clientY };
      didDragRef.current = false;
      (e.target as Element).setPointerCapture?.(e.pointerId);
    },
    [nodePositions, getSVGPoint]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragRef.current) return;

      // Check if moved beyond threshold to mark as drag
      const moved = Math.hypot(
        e.clientX - startPosRef.current.x,
        e.clientY - startPosRef.current.y
      );
      if (moved > DRAG_THRESHOLD) {
        didDragRef.current = true;
      }

      const svgP = getSVGPoint(e.clientX, e.clientY);
      onNodeDrag(
        dragRef.current.id,
        svgP.x + dragRef.current.offsetX,
        svgP.y + dragRef.current.offsetY
      );
    },
    [getSVGPoint, onNodeDrag]
  );

  const handlePointerUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  // Build person positions from expanded depts
  const personPositions = useMemo(() => {
    const map = new Map<string, NodePosition>();
    departments.forEach((dept) => {
      if (!expandedDepts.has(dept.id)) return;
      dept.people.forEach((p) => {
        const pos = nodePositions.get(p.id);
        if (pos) map.set(p.id, pos);
      });
    });
    return map;
  }, [departments, expandedDepts, nodePositions]);

  const allPersonPos = useMemo(() => {
    const map = new Map<string, NodePosition>();
    departments.forEach((dept) => {
      const deptPos = nodePositions.get(dept.id);
      if (!deptPos) return;
      dept.people.forEach((p) => {
        if (personPositions.has(p.id)) {
          map.set(p.id, personPositions.get(p.id)!);
        } else {
          map.set(p.id, deptPos);
        }
      });
    });
    return map;
  }, [departments, personPositions, nodePositions]);

  const anyExpanded = expandedDepts.size > 0;

  // Node dimensions
  const deptW = 130,
    deptH = 52;
  const personW = 110,
    personH = 42;
  const centerW = 100,
    centerH = 48;

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.25, 2));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.25, 0.5));
  const handleResetZoom = () => setZoom(1);

  // Empty state
  if (departments.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-background animate-in fade-in duration-500">
        <div className="text-6xl text-muted-foreground/30">◉</div>
        <h2 className="text-xl font-bold text-muted-foreground">
          Start building your organization
        </h2>
        <p className="text-sm text-muted-foreground flex items-center gap-2">
          Press{" "}
          <kbd className="px-2 py-1 text-xs bg-muted border rounded">⌘K</kbd>{" "}
          to begin
        </p>
        <Button onClick={onOpenCommandPalette} className="mt-2">
          <Plus className="h-4 w-4 mr-2" />
          Create Department
        </Button>
      </div>
    );
  }

  return (
    <div className="flex-1 relative bg-background overflow-hidden">
      {/* Zoom controls */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-1">
        <Button
          variant="secondary"
          size="icon"
          className="h-8 w-8"
          onClick={handleZoomIn}
          aria-label="Zoom in"
        >
          <Plus className="h-4 w-4" />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          className="h-8 w-8"
          onClick={handleZoomOut}
          aria-label="Zoom out"
        >
          <Minus className="h-4 w-4" />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          className="h-8 w-8"
          onClick={handleResetZoom}
          aria-label="Reset zoom"
        >
          <Maximize2 className="h-4 w-4" />
        </Button>
      </div>

      {/* SVG Canvas */}
      <svg
        ref={svgRef}
        viewBox={`0 0 840 640`}
        className="w-full h-full"
        style={{
          cursor: dragRef.current ? "grabbing" : "default",
          transform: `scale(${zoom})`,
          transformOrigin: "center center",
        }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <defs>
          {/* Subtle dot pattern for clean background */}
          <pattern
            id="dotPattern"
            width="24"
            height="24"
            patternUnits="userSpaceOnUse"
          >
            <circle
              cx="12"
              cy="12"
              r="1"
              fill="hsl(var(--border))"
              opacity="0.3"
            />
          </pattern>
          <filter id="nodeShadow">
            <feDropShadow
              dx="0"
              dy="2"
              stdDeviation="4"
              floodColor="black"
              floodOpacity="0.15"
            />
          </filter>
        </defs>

        {/* Clean background with subtle dots */}
        <rect width="840" height="640" fill="hsl(var(--background))" />
        <rect width="840" height="640" fill="url(#dotPattern)" />

        {/* Connection arcs */}
        {connections.map((conn, i) => {
          const from = allPersonPos.get(conn.from);
          const to = allPersonPos.get(conn.to);
          if (!from || !to) return null;
          const mx = (from.x + to.x) / 2,
            my = (from.y + to.y) / 2;
          const dx = to.x - from.x,
            dy = to.y - from.y;
          const len = Math.sqrt(dx * dx + dy * dy);
          if (len === 0) return null;
          const off = Math.min(len * 0.3, 60);
          const cpx = mx + (-dy / len) * off,
            cpy = my + (dx / len) * off;
          return (
            <g key={i}>
              <path
                d={`M ${from.x} ${from.y} Q ${cpx} ${cpy} ${to.x} ${to.y}`}
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth={1.5}
                strokeDasharray="6 4"
                opacity={0.4}
              />
              <text
                x={cpx}
                y={cpy - 6}
                textAnchor="middle"
                fill="hsl(var(--primary))"
                fontSize={9}
                fontFamily="inherit"
                opacity={0.7}
              >
                {conn.label}
              </text>
            </g>
          );
        })}

        {/* Dept-to-center lines */}
        {departments.map((dept) => {
          const pos = nodePositions.get(dept.id);
          if (!pos) return null;
          return (
            <line
              key={dept.id}
              x1={cx}
              y1={cy}
              x2={pos.x}
              y2={pos.y}
              stroke="hsl(var(--border))"
              strokeWidth={1}
              strokeDasharray="4 4"
            />
          );
        })}

        {/* Center node */}
        <g>
          <rect
            x={cx - centerW / 2}
            y={cy - centerH / 2}
            width={centerW}
            height={centerH}
            rx={12}
            fill="hsl(var(--card))"
            stroke="hsl(var(--primary))"
            strokeWidth={1.5}
            filter="url(#nodeShadow)"
          />
          <text
            x={cx}
            y={cy - 4}
            textAnchor="middle"
            fill="hsl(var(--card-foreground))"
            fontSize={13}
            fontWeight="600"
            fontFamily="inherit"
          >
            Nexus
          </text>
          <text
            x={cx}
            y={cy + 12}
            textAnchor="middle"
            fill="hsl(var(--muted-foreground))"
            fontSize={9}
            fontFamily="inherit"
          >
            Organization
          </text>
        </g>

        {/* Department nodes */}
        {departments.map((dept) => {
          const pos = nodePositions.get(dept.id);
          if (!pos) return null;
          const c = DEPT_COLORS[dept.colorIdx % DEPT_COLORS.length];
          const expanded = expandedDepts.has(dept.id);

          return (
            <g key={dept.id}>
              {/* Lines to people */}
              {expanded &&
                dept.people.map((p, pi) => {
                  const pPos = personPositions.get(p.id);
                  if (!pPos) return null;
                  return (
                    <line
                      key={pi}
                      x1={pos.x}
                      y1={pos.y}
                      x2={pPos.x}
                      y2={pPos.y}
                      stroke={c.border}
                      strokeWidth={0.8}
                      strokeDasharray="3 3"
                    />
                  );
                })}

              {/* Department rect */}
              <g
                style={{ cursor: "grab" }}
                onPointerDown={(e) => handlePointerDown(e, dept.id)}
                onClick={() => {
                  if (didDragRef.current) return; // Skip if was dragging
                  onToggleDept(dept.id);
                }}
                role="button"
                aria-label={`${dept.name} department. Click to ${expanded ? "collapse" : "expand"}`}
                tabIndex={0}
              >
                <rect
                  x={pos.x - deptW / 2}
                  y={pos.y - deptH / 2}
                  width={deptW}
                  height={deptH}
                  rx={10}
                  fill="hsl(var(--card))"
                  stroke={c.dot}
                  strokeWidth={1.5}
                  filter="url(#nodeShadow)"
                />
                <circle
                  cx={pos.x - deptW / 2 + 16}
                  cy={pos.y - 4}
                  r={4}
                  fill={c.dot}
                />
                <text
                  x={pos.x - deptW / 2 + 26}
                  y={pos.y}
                  fill="hsl(var(--card-foreground))"
                  fontSize={11}
                  fontWeight="600"
                  fontFamily="inherit"
                >
                  {dept.name}
                </text>
                <text
                  x={pos.x - deptW / 2 + 16}
                  y={pos.y + 14}
                  fill="hsl(var(--muted-foreground))"
                  fontSize={9}
                  fontFamily="inherit"
                >
                  {dept.people.length} people
                </text>
              </g>
            </g>
          );
        })}

        {/* People nodes */}
        {departments.map((dept) => {
          if (!expandedDepts.has(dept.id)) return null;
          const c = DEPT_COLORS[dept.colorIdx % DEPT_COLORS.length];

          return dept.people.map((p) => {
            const pos = personPositions.get(p.id);
            if (!pos) return null;
            const isSelected = selectedPersonId === p.id;
            const firstName = p.name.split(" ")[0];

            return (
              <g
                key={p.id}
                style={{ cursor: "grab" }}
                onPointerDown={(e) => handlePointerDown(e, p.id)}
                onClick={(e) => {
                  e.stopPropagation();
                  if (didDragRef.current) return; // Skip if was dragging
                  onSelectPerson(p, dept);
                }}
                role="button"
                aria-label={`${p.name}, ${p.role}`}
                aria-pressed={isSelected}
                tabIndex={0}
              >
                <rect
                  x={pos.x - personW / 2}
                  y={pos.y - personH / 2}
                  width={personW}
                  height={personH}
                  rx={8}
                  fill="hsl(var(--card))"
                  stroke={isSelected ? "hsl(var(--primary))" : c.dot}
                  strokeWidth={isSelected ? 2 : 1}
                  filter="url(#nodeShadow)"
                  className="transition-all duration-200"
                />
                <text
                  x={pos.x}
                  y={pos.y - 3}
                  textAnchor="middle"
                  fill="hsl(var(--card-foreground))"
                  fontSize={10}
                  fontWeight="500"
                  fontFamily="inherit"
                >
                  {firstName}
                </text>
                <text
                  x={pos.x}
                  y={pos.y + 10}
                  textAnchor="middle"
                  fill="hsl(var(--muted-foreground))"
                  fontSize={8}
                  fontFamily="inherit"
                >
                  {p.role.length > 16 ? p.role.slice(0, 14) + "…" : p.role}
                </text>
                {p.isHead && (
                  <rect
                    x={pos.x + personW / 2 - 14}
                    y={pos.y - personH / 2 - 4}
                    width={8}
                    height={8}
                    rx={2}
                    fill="hsl(var(--primary))"
                  />
                )}
              </g>
            );
          });
        })}
      </svg>

      {/* Hint text */}
      {!anyExpanded && departments.length > 0 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-sm text-muted-foreground animate-in fade-in duration-1000">
          Click a department to expand · Drag nodes to rearrange
        </div>
      )}
    </div>
  );
}
