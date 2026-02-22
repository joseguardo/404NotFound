import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Building2, User, Users, Network, ZoomIn, ZoomOut, Move } from "lucide-react";
import { api } from "@/services/api";
import { Department } from "@/components/nexus/types";

interface CompanyGraphDynamicProps {
  companyId: number;
  activePeople: string[];
  className?: string;
}

type Node = {
  id: string;
  label: string;
  x: number;
  y: number;
  color: string;
  kind: "dept" | "person";
};

type Edge = { from: string; to: string };

export function CompanyGraphDynamic({ companyId, activePeople, className = "" }: CompanyGraphDynamicProps) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [start, setStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
    api
      .loadStructure(companyId)
      .then(setDepartments)
      .catch(() => setDepartments([]));
  }, [companyId]);

  const { nodes, edges } = useMemo(() => {
    if (departments.length === 0) {
      const center: Node = {
        id: "placeholder",
        label: "Upload to see org graph",
        x: 150,
        y: 120,
        color: "bg-stone-800 text-white",
        kind: "dept",
      };
      return { nodes: [center], edges: [] as Edge[] };
    }

    const maxPeople = Math.max(...departments.map((d) => d.people.length || 1), 1);
    const verticalGap = 70;
    const horizontalGap = 90;

    const nodes: Node[] = [];
    const edges: Edge[] = [];

    departments.forEach((dept, deptIdx) => {
      const deptX = 80 + deptIdx * horizontalGap;
      const deptY = 60;
      const deptId = `dept-${deptIdx}`;
      nodes.push({
        id: deptId,
        label: dept.name,
        x: deptX,
        y: deptY,
        color: "bg-primary/10 text-primary",
        kind: "dept",
      });

      dept.people.forEach((person, personIdx) => {
        const personId = `${deptId}-p-${personIdx}`;
        const personX = deptX + personIdx * 12;
        const personY = deptY + verticalGap + personIdx * (verticalGap / maxPeople);
        nodes.push({
          id: personId,
          label: person.name,
          x: personX,
          y: personY,
          color: "bg-muted text-foreground",
          kind: "person",
        });
        edges.push({ from: deptId, to: personId });
      });
    });

    return { nodes, edges };
  }, [departments]);

  const activeLabels = useMemo(
    () => activePeople.map((p) => p.toLowerCase().trim()).filter(Boolean),
    [activePeople]
  );

  const isActiveNode = (label: string) =>
    activeLabels.length === 0 ? false : activeLabels.some((p) => label.toLowerCase().includes(p));

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom((z) => Math.min(2.5, Math.max(0.5, z + delta)));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsPanning(true);
    setStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    setOffset({ x: e.clientX - start.x, y: e.clientY - start.y });
  };

  const handleMouseUp = () => setIsPanning(false);

  return (
    <div
      className={`bg-white/90 backdrop-blur-md rounded-2xl shadow-xl border border-stone-200 relative overflow-hidden ${className}`}
    >
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2 text-xs font-semibold text-stone-500 uppercase tracking-wider">
        <Network className="h-3.5 w-3.5" />
        Live Org Graph
      </div>
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        <button
          className="h-7 w-7 rounded border border-stone-200 bg-white hover:bg-stone-50 flex items-center justify-center"
          onClick={() => setZoom((z) => Math.min(2.5, z + 0.2))}
          aria-label="Zoom in"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
        <button
          className="h-7 w-7 rounded border border-stone-200 bg-white hover:bg-stone-50 flex items-center justify-center"
          onClick={() => setZoom((z) => Math.max(0.5, z - 0.2))}
          aria-label="Zoom out"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <span className="text-[11px] text-stone-500 font-mono px-2 py-1 rounded border bg-white/80 border-stone-200 flex items-center gap-1">
          <Move className="h-3.5 w-3.5" />
          Drag to pan
        </span>
      </div>

      <svg
        className="absolute inset-0 w-full h-full z-0 cursor-grab"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
          transformOrigin: "center",
        }}
      >
        {edges.map((edge, i) => {
          const fromNode = nodes.find((n) => n.id === edge.from)!;
          const toNode = nodes.find((n) => n.id === edge.to)!;
          const active = isActiveNode(toNode.label);
          return (
            <motion.line
              key={i}
              x1={fromNode.x}
              y1={fromNode.y}
              x2={toNode.x}
              y2={toNode.y}
              stroke={active ? "#10b981" : "#e7e5e4"}
              strokeWidth={active ? 2 : 1}
              strokeDasharray={active ? "0" : "4 4"}
              animate={{
                stroke: active ? "#10b981" : "#e7e5e4",
                strokeWidth: active ? 2 : 1,
              }}
            />
          );
        })}
      </svg>

      {nodes.map((node) => {
        const active = isActiveNode(node.label);
        const Icon = node.kind === "dept" ? Building2 : User;
        return (
          <motion.div
            key={node.id}
            className={`absolute rounded-full border shadow-sm transition-all duration-300 flex items-center justify-center ${
              active
                ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                : "border-stone-200 bg-white text-stone-500"
            }`}
            style={{
              left: node.x,
              top: node.y,
              padding: active || node.kind === "dept" ? "6px 10px" : "6px",
            }}
            animate={{
              scale: active ? 1.1 : 0.9,
              boxShadow: active ? "0 10px 25px rgba(16,185,129,0.2)" : "0 4px 10px rgba(0,0,0,0.05)",
            }}
          >
            {node.kind === "dept" ? (
              <div className="flex items-center gap-1.5 text-xs font-semibold">
                <Users className="h-3.5 w-3.5" />
                <span className="truncate max-w-[150px]">{node.label}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <Icon className="h-3.5 w-3.5" />
                {active && <span className="text-[10px] font-semibold truncate max-w-[120px]">{node.label}</span>}
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
