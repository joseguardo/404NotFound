import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Building2, User, Users, Network } from "lucide-react";
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

  return (
    <div
      className={`bg-white/90 backdrop-blur-md rounded-2xl shadow-xl border border-stone-200 relative overflow-hidden ${className}`}
    >
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2 text-xs font-semibold text-stone-500 uppercase tracking-wider">
        <Network className="h-3.5 w-3.5" />
        Live Org Graph
      </div>

      <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
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
            className={`absolute px-2 py-1 rounded-full border text-xs font-medium shadow-sm transition-all duration-300 ${
              active ? "border-emerald-500 bg-emerald-50 text-emerald-700 scale-105" : "border-stone-200 bg-white"
            } ${node.color}`}
            style={{ left: node.x, top: node.y }}
            animate={{
              scale: active ? 1.08 : 1,
              boxShadow: active ? "0 10px 25px rgba(16,185,129,0.2)" : "0 6px 12px rgba(0,0,0,0.06)",
            }}
          >
            <div className="flex items-center gap-1.5">
              {node.kind === "dept" ? <Users className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
              <span className="truncate max-w-[140px]">{node.label}</span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
