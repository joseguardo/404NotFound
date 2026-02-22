import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Clock } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";

type Category = "food" | "venue" | "tech" | "marketing" | "budget";

interface Meeting {
  id: string;
  title: string;
  timestamp: Date;
  category: Category;
  x: number;
  y: number;
  dependencies: string[];
}

interface ProjectColor {
  id: Category;
  color: string;
  label: string;
  twColor: string;
  hex: string;
}

const PROJECTS: ProjectColor[] = [
  { id: "food", color: "bg-red-500", label: "Food & Bev", twColor: "text-red-600", hex: "#ef4444" },
  { id: "venue", color: "bg-green-500", label: "Venue Ops", twColor: "text-green-600", hex: "#22c55e" },
  { id: "tech", color: "bg-blue-500", label: "Tech Stack", twColor: "text-blue-600", hex: "#3b82f6" },
  { id: "marketing", color: "bg-yellow-500", label: "Marketing", twColor: "text-yellow-600", hex: "#eab308" },
  { id: "budget", color: "bg-purple-500", label: "Budget & Finance", twColor: "text-purple-600", hex: "#a855f7" },
];

const TITLES: Record<Category, string[]> = {
  food: [
    "Catering Sync",
    "Snack Selection",
    "Pizza Order Finalization",
    "Coffee Vendor Call",
    "Dietary Restrictions Check",
    "Midnight Snack Plan",
    "Breakfast Bagels Run",
    "Water Station Setup",
  ],
  venue: [
    "Room Layout",
    "Chair Arrangement",
    "Stage Setup",
    "Lighting Check",
    "Security Briefing",
    "Registration Desk Prep",
    "Signage Placement",
    "Cleanup Crew Sync",
  ],
  tech: [
    "Wifi Stress Test",
    "Server Deployment",
    "API Key Gen",
    "Projector Test",
    "Live Stream Setup",
    "Discord Server Rules",
    "Submission Portal Test",
    "Hardware Lab Setup",
  ],
  marketing: [
    "Social Blast",
    "Email Newsletter",
    "Sponsor Shoutout",
    "Swag Design",
    "T-Shirt Printing",
    "Sticker Order",
    "Press Release",
    "Photography Brief",
  ],
  budget: [
    "Sponsor Funds Received",
    "Venue Deposit",
    "Catering Payment",
    "Swag Invoice",
    "Emergency Fund Allocation",
    "Prize Money Transfer",
    "Travel Reimbursements",
    "Final Budget Review",
  ],
};

const randomItem = <T,>(items: T[]): T => items[Math.floor(Math.random() * items.length)];

const generateMeetings = (count: number): Meeting[] => {
  const meetings: Meeting[] = [];
  const startDate = new Date();
  startDate.setHours(9, 0, 0, 0);

  for (let i = 0; i < count; i++) {
    const category = randomItem(PROJECTS).id;
    const title = randomItem(TITLES[category]);
    const timeOffset = Math.random() * 14 * 24 * 60 * 60 * 1000;
    const timestamp = new Date(startDate.getTime() + timeOffset);

    meetings.push({
      id: `m-${i}`,
      title,
      timestamp,
      category,
      x: 0,
      y: 0,
      dependencies: [],
    });
  }

  meetings.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  let currentY = 90;
  let idx = 0;
  const laneXs = [14, 30, 46, 62, 78, 88];

  while (idx < meetings.length) {
    const rowSize = Math.min(
      meetings.length - idx,
      Math.max(2, Math.min(4, 2 + Math.floor(Math.random() * 3)))
    );
    const rowSlots = laneXs
      .slice()
      .sort(() => Math.random() - 0.5)
      .slice(0, rowSize)
      .sort((a, b) => a - b);

    for (let i = 0; i < rowSize; i++) {
      const meeting = meetings[idx + i];
      meeting.x = rowSlots[i] + (Math.random() * 4 - 2);
      meeting.y = currentY + (Math.random() * 14 - 7);
    }

    currentY += 82 + Math.random() * 24;
    idx += rowSize;
  }

  meetings.forEach((m, i) => {
    if (i === 0 || Math.random() <= 0.4) return;

    const potentialParents = meetings.slice(Math.max(0, i - 10), i);
    if (potentialParents.length === 0) return;

    const sameCategory = potentialParents.filter((p) => p.category === m.category);
    if (sameCategory.length > 0 && Math.random() > 0.2) {
      m.dependencies.push(sameCategory[sameCategory.length - 1].id);
    }

    if (Math.random() > 0.7) {
      const differentCategory = potentialParents.filter((p) => p.category !== m.category);
      if (differentCategory.length > 0) {
        const randomParent = randomItem(differentCategory);
        if (!m.dependencies.includes(randomParent.id)) {
          m.dependencies.push(randomParent.id);
        }
      }
    }

    if (m.dependencies.length === 1 && Math.random() > 0.8) {
      const anyParent = randomItem(potentialParents);
      if (!m.dependencies.includes(anyParent.id)) {
        m.dependencies.push(anyParent.id);
      }
    }
  });

  return meetings;
};

const Arrow: React.FC<{
  start: { x: number; y: number };
  end: { x: number; y: number };
  color: string;
}> = ({ start, end, color }) => {
  const midY = (start.y + end.y) / 2;
  const path = `M ${start.x} ${start.y} C ${start.x} ${midY}, ${end.x} ${midY}, ${end.x} ${end.y}`;

  return (
    <motion.path
      d={path}
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeDasharray="5,5"
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{ pathLength: 1, opacity: 0.6 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
      markerEnd={`url(#arrowhead-${color.replace("#", "")})`}
    />
  );
};

export default function MeetingOverview() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const companyName = params.get("companyName") || "Organization";

  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [activeCategory, setActiveCategory] = useState<Category | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerDimensions, setContainerDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const data = generateMeetings(40);
    setMeetings(data);

    const lastMeeting = data[data.length - 1];
    const height = lastMeeting ? lastMeeting.y + 200 : 2000;

    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerDimensions({
          width: entry.contentRect.width,
          height,
        });
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  const handleCategoryClick = (id: Category) => {
    setActiveCategory((prev) => (prev === id ? null : id));
  };

  const { visibleMeetings, arrows } = useMemo(() => {
    if (!activeCategory) return { visibleMeetings: [], arrows: [] as { start: string; end: string }[] };

    const activeCatMeetings = meetings.filter((m) => m.category === activeCategory);
    const dependencyIds = new Set<string>();
    const arrowConnections: { start: string; end: string }[] = [];

    activeCatMeetings.forEach((m) => {
      m.dependencies.forEach((depId) => {
        dependencyIds.add(depId);
        arrowConnections.push({ start: depId, end: m.id });
      });
    });

    const visibleSet = new Set([...activeCatMeetings.map((m) => m.id), ...Array.from(dependencyIds)]);

    return {
      visibleMeetings: meetings.filter((m) => visibleSet.has(m.id)),
      arrows: arrowConnections,
    };
  }, [meetings, activeCategory]);

  const activeProjectColor = PROJECTS.find((p) => p.id === activeCategory);

  return (
    <div className="min-h-screen bg-stone-200 font-sans text-stone-800 overflow-x-hidden">
      <header className="fixed top-0 left-0 right-0 z-50 bg-stone-100/80 backdrop-blur-md border-b border-stone-200 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 text-stone-600 hover:text-stone-900"
            onClick={() => navigate("/app")}
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-stone-900">Hackathon Prep Timeline</h1>
            <p className="text-sm text-stone-500">Project Waterfall View · {companyName}</p>
          </div>
        </div>
        <div className="text-xs font-mono text-stone-400">{meetings.length} Events Logged</div>
      </header>

      <main
        ref={containerRef}
        className="relative w-full max-w-5xl mx-auto mt-24 mb-32 transition-all duration-500"
        style={{ height: containerDimensions.height }}
      >
        <svg
          className="absolute top-0 left-0 w-full h-full pointer-events-none z-10"
          style={{ height: containerDimensions.height }}
        >
          <defs>
            {PROJECTS.map((p) => (
              <marker
                key={p.id}
                id={`arrowhead-${p.hex.replace("#", "")}`}
                markerWidth="10"
                markerHeight="7"
                refX="9"
                refY="3.5"
                orient="auto"
              >
                <polygon points="0 0, 10 3.5, 0 7" fill={p.hex} />
              </marker>
            ))}
          </defs>
          <AnimatePresence>
            {activeCategory &&
              arrows.map((arrow) => {
                const startMeeting = meetings.find((m) => m.id === arrow.start);
                const endMeeting = meetings.find((m) => m.id === arrow.end);
                if (!startMeeting || !endMeeting) return null;

                const startX = (startMeeting.x / 100) * containerDimensions.width + 96;
                const startY = startMeeting.y + 80;
                const endX = (endMeeting.x / 100) * containerDimensions.width + 96;
                const endY = endMeeting.y;

                return (
                  <Arrow
                    key={`${arrow.start}-${arrow.end}`}
                    start={{ x: startX, y: startY }}
                    end={{ x: endX, y: endY }}
                    color={activeProjectColor?.hex || "#000"}
                  />
                );
              })}
          </AnimatePresence>
        </svg>

        <div className="absolute top-0 bottom-0 left-1/2 w-px bg-stone-300 -translate-x-1/2 z-0 opacity-50" />

        {meetings.map((meeting) => {
          const isCategoryMatch = activeCategory === meeting.category;
          const isVisible = !activeCategory || visibleMeetings.some((vm) => vm.id === meeting.id);
          const isDimmed = Boolean(activeCategory) && !isVisible;
          const isDependency = Boolean(activeCategory) && isVisible && !isCategoryMatch;
          const project = PROJECTS.find((p) => p.id === meeting.category);

          return (
            <motion.div
              key={meeting.id}
              className={`absolute w-48 p-3 rounded-lg border shadow-sm transition-all duration-300 cursor-pointer z-20 ${
                isDimmed ? "opacity-10 grayscale scale-90 bg-stone-200 border-stone-200" : ""
              } ${isDependency ? "bg-stone-50 border-stone-400 opacity-80 z-20" : ""} ${
                !activeCategory ? "bg-stone-100 border-stone-300 hover:bg-white hover:shadow-md hover:-translate-y-1" : ""
              }`}
              style={{
                left: `${meeting.x}%`,
                top: meeting.y,
                boxShadow: isCategoryMatch ? `0 0 0 2px ${project?.hex ?? "#64748b"}` : undefined,
                borderColor: isCategoryMatch ? "transparent" : undefined,
                backgroundColor: isCategoryMatch ? "#ffffff" : undefined,
              }}
              initial={{ opacity: 0, y: 20 }}
              animate={{
                opacity: isDimmed ? 0.1 : isDependency ? 0.8 : 1,
                y: 0,
                scale: isCategoryMatch ? 1.05 : isDimmed ? 0.9 : 1,
              }}
              whileHover={{ scale: isCategoryMatch ? 1.05 : isDimmed ? 0.9 : 1.05, zIndex: 40 }}
            >
              <div className="flex items-center gap-2 mb-1">
                <div
                  className={`w-2 h-2 rounded-full ${
                    isCategoryMatch || !activeCategory ? project?.color : "bg-stone-400"
                  }`}
                />
                <span
                  className={`text-[10px] uppercase tracking-wider font-semibold ${
                    isCategoryMatch || !activeCategory ? project?.twColor : "text-stone-500"
                  }`}
                >
                  {project?.label}
                </span>
              </div>
              <h3
                className={`text-xs font-medium leading-tight mb-2 ${
                  isCategoryMatch || !activeCategory ? "text-stone-900" : "text-stone-600"
                }`}
              >
                {meeting.title}
              </h3>
              <div className="flex items-center gap-1 text-[10px] text-stone-400 font-mono">
                <Clock size={10} />
                <span>
                  {meeting.timestamp.toLocaleDateString(undefined, { month: "short", day: "numeric" })}{" "}
                  {meeting.timestamp.toLocaleTimeString(undefined, {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </motion.div>
          );
        })}
      </main>

      <div className="fixed bottom-8 right-8 z-50 flex flex-col items-end gap-3">
        <div className="bg-white/90 backdrop-blur shadow-xl border border-stone-200 rounded-2xl p-4 flex flex-col gap-3">
          <span className="text-[10px] uppercase tracking-widest text-stone-400 font-semibold text-right mb-1">
            Filter Projects
          </span>
          <div className="flex gap-2">
            {PROJECTS.map((project) => (
              <button
                key={project.id}
                onClick={() => handleCategoryClick(project.id)}
                className={`group relative w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 ${
                  activeCategory === project.id ? "scale-110 ring-2 ring-offset-2 ring-stone-300" : "hover:scale-110"
                } ${activeCategory && activeCategory !== project.id ? "opacity-40" : "opacity-100"}`}
                title={project.label}
              >
                <div
                  className={`w-full h-full rounded-full ${project.color} opacity-20 group-hover:opacity-30 transition-opacity absolute inset-0`}
                />
                <div className={`w-4 h-4 rounded-full ${project.color} shadow-sm`} />
                <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-stone-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                  {project.label}
                </span>
              </button>
            ))}
          </div>
          {activeCategory && (
            <button
              onClick={() => setActiveCategory(null)}
              className="text-[10px] text-stone-400 hover:text-stone-600 underline text-right mt-1"
            >
              Reset View
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
