import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Mail,
  Phone,
  Calendar,
  CheckCircle,
  Box,
  ArrowRight,
  Sparkles,
  Edit,
  Trash2,
  Clock,
  Check,
  List,
  ChevronLeft,
  ChevronRight,
  Minimize2,
  Maximize2,
  PackageOpen,
  X,
  Network,
} from "lucide-react";
import { CompanyGraph } from "./CompanyGraph";

type TaskType = "email" | "call" | "calendar" | "research";

interface Task {
  id: string;
  type: TaskType;
  title: string;
  recipient?: string;
  status: "pending" | "processing" | "completed";
  progress: number;
  delay: number;
  duration: number;
  details?: string;
}

const MOCK_TASKS: Task[] = [
  {
    id: "1",
    type: "email",
    title: "Send meeting minutes",
    recipient: "Team",
    status: "pending",
    progress: 0,
    delay: 500,
    duration: 2000,
    details:
      "Draft minutes from the strategy session and distribute to all attendees. Include action items.",
  },
  {
    id: "2",
    type: "calendar",
    title: "Schedule follow-up",
    recipient: "Client A",
    status: "pending",
    progress: 0,
    delay: 1200,
    duration: 1500,
    details: "Find a 30-min slot next Tuesday for the quarterly review sync.",
  },
  {
    id: "3",
    type: "call",
    title: "Clarify requirements",
    recipient: "Product Owner",
    status: "pending",
    progress: 0,
    delay: 800,
    duration: 3000,
    details: "Discuss the edge cases for the new authentication flow.",
  },
  {
    id: "4",
    type: "email",
    title: "Intro to Design Team",
    recipient: "Sarah",
    status: "pending",
    progress: 0,
    delay: 2500,
    duration: 1800,
    details: "Connect Sarah with the lead designer to start the asset handover.",
  },
  {
    id: "5",
    type: "research",
    title: "Competitor Analysis",
    recipient: "Internal",
    status: "pending",
    progress: 0,
    delay: 200,
    duration: 4000,
    details: "Review the top 3 competitors pricing models and feature sets.",
  },
  {
    id: "6",
    type: "calendar",
    title: "Block focus time",
    recipient: "Self",
    status: "pending",
    progress: 0,
    delay: 3000,
    duration: 1000,
    details: "Reserve 2 hours on Friday for deep work on the backend architecture.",
  },
];

type AppState =
  | "idle"
  | "dropping"
  | "unpacking"
  | "reviewing"
  | "processing"
  | "cleaning"
  | "recorded";

export function TaskUnpacker() {
  const [state, setState] = useState<AppState>("idle");
  const [tasks, setTasks] = useState<Task[]>(MOCK_TASKS);
  const [completedCount, setCompletedCount] = useState(0);
  const [showSidebar, setShowSidebar] = useState(false);
  const [sidebarMinimized, setSidebarMinimized] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [activeGraphTaskId, setActiveGraphTaskId] = useState<string | null>(null);
  const [showCardStack, setShowCardStack] = useState(false);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showWorkflow, setShowWorkflow] = useState(false);

  const reset = () => {
    setState("idle");
    setTasks(MOCK_TASKS.map((t) => ({ ...t, status: "pending", progress: 0 })));
    setCompletedCount(0);
    setShowSidebar(false);
    setSidebarMinimized(false);
    setSelectedTaskIds(new Set());
    setShowCardStack(false);
    setCurrentCardIndex(0);
    setActiveGraphTaskId(null);
    setShowWorkflow(false);
  };

  const startDrop = () => {
    setState("dropping");
    window.setTimeout(() => setState("unpacking"), 1500);
  };

  useEffect(() => {
    if (state !== "unpacking") return;
    const timer = window.setTimeout(() => setState("reviewing"), 1000);
    return () => window.clearTimeout(timer);
  }, [state]);

  const toggleTaskSelection = (id: string) => {
    setSelectedTaskIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleDeleteSelected = () => {
    setTasks((prev) => prev.filter((t) => !selectedTaskIds.has(t.id)));
    setSelectedTaskIds(new Set());
  };

  const startProcessing = () => {
    setState("processing");
    setShowSidebar(true);
    setSidebarMinimized(false);
  };

  useEffect(() => {
    if (state !== "processing") return;

    const intervals: number[] = [];

    tasks.forEach((task) => {
      const startTimeout = window.setTimeout(() => {
        setTasks((prev) =>
          prev.map((t) => (t.id === task.id ? { ...t, status: "processing" } : t))
        );

        const intervalTime = 50;
        const steps = task.duration / intervalTime;
        const increment = 100 / steps;

        const progressInterval = window.setInterval(() => {
          setTasks((prev) => {
            const currentTask = prev.find((t) => t.id === task.id);
            if (!currentTask) return prev;

            const newProgress = Math.min(currentTask.progress + increment, 100);
            if (newProgress >= 100) {
              window.clearInterval(progressInterval);
              setCompletedCount((c) => c + 1);
              return prev.map((t) =>
                t.id === task.id
                  ? { ...t, progress: 100, status: "completed" }
                  : t
              );
            }

            return prev.map((t) =>
              t.id === task.id ? { ...t, progress: newProgress } : t
            );
          });
        }, intervalTime);

        intervals.push(progressInterval);
      }, task.delay);

      intervals.push(startTimeout);
    });

    return () => intervals.forEach((id) => window.clearInterval(id));
  }, [state, tasks.length]);

  useEffect(() => {
    if (state === "processing" && completedCount === tasks.length && tasks.length > 0) {
      const timer = window.setTimeout(() => setState("cleaning"), 1000);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [completedCount, state, tasks.length]);

  const handleRecordClick = () => {
    setState("recorded");
    setShowSidebar(true);
    setSidebarMinimized(false);
    setShowCardStack(true);
  };

  const nextCard = () => setCurrentCardIndex((prev) => (prev + 1) % tasks.length);
  const prevCard = () =>
    setCurrentCardIndex((prev) => (prev - 1 + tasks.length) % tasks.length);

  return (
    <div className="min-h-screen bg-stone-100 flex flex-row overflow-hidden relative font-sans text-stone-800">
      <AnimatePresence>
        {showSidebar && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: sidebarMinimized ? 60 : 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="h-screen bg-white border-r border-stone-200 shadow-xl z-40 flex flex-col overflow-hidden"
          >
            <div className="p-4 border-b border-stone-100 bg-stone-50 flex items-center justify-between h-16">
              {!sidebarMinimized && (
                <div className="flex flex-col">
                  <h2 className="font-bold text-lg flex items-center gap-2">
                    <List size={20} />
                    Task Record
                  </h2>
                  <p className="text-xs text-stone-500">Live processing log</p>
                </div>
              )}
              {sidebarMinimized && <List size={24} className="mx-auto text-stone-400" />}

              <button
                onClick={() => setSidebarMinimized(!sidebarMinimized)}
                className="p-1.5 hover:bg-stone-200 rounded-md text-stone-500"
              >
                {sidebarMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
              </button>
            </div>

            {!sidebarMinimized && (
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className="p-3 rounded-lg border border-stone-100 bg-stone-50 flex items-start gap-3"
                  >
                    <div
                      className={`mt-0.5 p-1.5 rounded-md ${
                        task.status === "completed"
                          ? "bg-emerald-100 text-emerald-600"
                          : task.status === "processing"
                            ? "bg-blue-100 text-blue-600"
                            : "bg-stone-200 text-stone-500"
                      }`}
                    >
                      {task.status === "completed" ? (
                        <CheckCircle size={14} />
                      ) : task.status === "processing" ? (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                        >
                          <Sparkles size={14} />
                        </motion.div>
                      ) : (
                        <Clock size={14} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{task.title}</p>
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-[10px] uppercase text-stone-400 font-semibold">
                          {task.type}
                        </span>
                        <span
                          className={`text-[10px] font-mono ${
                            task.status === "completed"
                              ? "text-emerald-600"
                              : task.status === "processing"
                                ? "text-blue-600"
                                : "text-stone-400"
                          }`}
                        >
                          {task.status.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!sidebarMinimized && state === "recorded" && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: "auto" }}
                className="p-4 bg-emerald-50 border-t border-emerald-100"
              >
                <div className="flex items-center gap-2 text-emerald-700 font-medium text-sm">
                  <CheckCircle size={16} />
                  <span>All records saved to database.</span>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 relative flex flex-col items-center justify-center">
        <div className="absolute inset-0 grid grid-cols-[repeat(20,minmax(0,1fr))] opacity-[0.03] pointer-events-none">
          {Array.from({ length: 400 }).map((_, i) => (
            <div key={i} className="border border-stone-900 aspect-square" />
          ))}
        </div>

        <div className="absolute top-8 z-50 flex gap-4">
          {state === "idle" && (
            <motion.button
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={startDrop}
              className="bg-stone-900 text-white px-6 py-3 rounded-xl font-medium shadow-lg flex items-center gap-2"
            >
              <Box size={20} />
              Drop Transcript
            </motion.button>
          )}

          {state === "recorded" && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={reset}
              className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-medium shadow-lg flex items-center gap-2"
            >
              <Sparkles size={20} />
              Process New Batch
            </motion.button>
          )}
        </div>

        <div
          className="relative w-full max-w-4xl h-[600px] flex items-center justify-center"
          style={{ perspective: "1000px" }}
        >
          <AnimatePresence>
            {(state === "dropping" || state === "unpacking") && (
              <motion.div
                initial={{ y: -600, rotate: -10, opacity: 0 }}
                animate={
                  state === "dropping"
                    ? { y: 0, rotate: 0, opacity: 1 }
                    : { scale: 0, opacity: 0 }
                }
                transition={
                  state === "dropping"
                    ? { type: "spring", bounce: 0.3, duration: 1.2 }
                    : { duration: 0.5 }
                }
                className="absolute z-20 bg-white p-8 rounded-2xl shadow-2xl border border-stone-200 flex flex-col items-center gap-4 w-64"
              >
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center text-orange-600">
                  <FileText size={32} />
                </div>
                <div className="text-center">
                  <h3 className="font-bold text-lg">Meeting_Notes.txt</h3>
                  <p className="text-stone-500 text-sm">24KB • Just now</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {state === "reviewing" && (
              <div className="absolute bottom-10 z-50 flex items-end gap-4 pointer-events-none">
                <motion.div
                  initial={{ opacity: 0, x: -20, scale: 0.9 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -20, scale: 0.9 }}
                  className="w-[300px] h-[300px] pointer-events-auto"
                >
                  <CompanyGraph activeTaskId={activeGraphTaskId} className="w-full h-full" />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 50 }}
                  className="bg-white/95 backdrop-blur-xl p-6 rounded-2xl shadow-2xl border border-stone-200 w-[400px] flex flex-col gap-4 pointer-events-auto"
                >
                  <div className="flex justify-between items-center border-b border-stone-100 pb-3">
                    <div>
                      <h3 className="text-lg font-bold">Review Actions</h3>
                      <p className="text-stone-500 text-xs">{tasks.length} tasks detected</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={startProcessing}
                        className="bg-stone-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-stone-800 transition-colors flex items-center gap-2"
                      >
                        <Check size={16} /> Approve All
                      </button>
                    </div>
                  </div>

                  <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                    {tasks.map((task) => (
                      <div
                        key={task.id}
                        onClick={() => toggleTaskSelection(task.id)}
                        onMouseEnter={() => setActiveGraphTaskId(task.id)}
                        onMouseLeave={() => setActiveGraphTaskId(null)}
                        className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${
                          selectedTaskIds.has(task.id)
                            ? "bg-blue-50 border-blue-200 ring-1 ring-blue-200"
                            : "bg-stone-50 border-stone-100 hover:border-stone-300"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-4 h-4 rounded border flex items-center justify-center ${
                              selectedTaskIds.has(task.id)
                                ? "bg-blue-500 border-blue-500"
                                : "border-stone-300 bg-white"
                            }`}
                          >
                            {selectedTaskIds.has(task.id) && <Check size={10} className="text-white" />}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-stone-800">{task.title}</p>
                            <p className="text-[10px] text-stone-500 uppercase">{task.type}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-stone-100">
                    <button
                      disabled={selectedTaskIds.size === 0}
                      className="flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium bg-stone-100 text-stone-600 hover:bg-stone-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Edit size={14} /> Edit
                    </button>
                    <button
                      disabled={selectedTaskIds.size === 0}
                      className="flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium bg-stone-100 text-stone-600 hover:bg-stone-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Clock size={14} /> Postpone
                    </button>
                    <button
                      onClick={handleDeleteSelected}
                      disabled={selectedTaskIds.size === 0}
                      className="flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          <div className="relative w-full h-full flex items-center justify-center">
            {tasks.map((task, index) => {
              const angle = (index / tasks.length) * 360;
              const radius = 220;
              const x = Math.cos((angle * Math.PI) / 180) * radius;
              const y = Math.sin((angle * Math.PI) / 180) * radius * 0.6;

              const isVisible = state !== "idle" && state !== "dropping";
              const isCleaning = state === "cleaning" || state === "recorded";
              const isReviewing = state === "reviewing";
              const isCardStack = state === "recorded" && showCardStack;

              return (
                <motion.div
                  key={task.id}
                  initial={{ scale: 0, x: 0, y: 0, opacity: 0 }}
                  animate={
                    isVisible
                      ? isCleaning && !isCardStack
                        ? { x: 0, y: 200, scale: 0, opacity: 0, transition: { delay: index * 0.1 } }
                        : isCardStack
                          ? { scale: 0, opacity: 0 }
                          : {
                              scale: 1,
                              x: x + (Math.random() * 40 - 20),
                              y: y + (Math.random() * 40 - 20),
                              opacity: isReviewing ? 0.4 : 1,
                              rotate: Math.random() * 10 - 5,
                              filter: isReviewing ? "blur(2px)" : "blur(0px)",
                            }
                      : { scale: 0, opacity: 0 }
                  }
                  transition={{
                    type: "spring",
                    stiffness: 100,
                    damping: 15,
                    delay: isCleaning ? 0 : 0.2 + index * 0.1,
                  }}
                  className="absolute w-64 bg-white rounded-xl shadow-xl border border-stone-100 overflow-hidden transition-all duration-500"
                  style={{ zIndex: task.status === "processing" ? 50 : 10 }}
                >
                  <div className="p-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/50">
                    <div className="flex items-center gap-2">
                      {task.type === "email" && (
                        <div className="p-1.5 bg-blue-100 text-blue-600 rounded-lg">
                          <Mail size={14} />
                        </div>
                      )}
                      {task.type === "call" && (
                        <div className="p-1.5 bg-green-100 text-green-600 rounded-lg">
                          <Phone size={14} />
                        </div>
                      )}
                      {task.type === "calendar" && (
                        <div className="p-1.5 bg-purple-100 text-purple-600 rounded-lg">
                          <Calendar size={14} />
                        </div>
                      )}
                      {task.type === "research" && (
                        <div className="p-1.5 bg-amber-100 text-amber-600 rounded-lg">
                          <ArrowRight size={14} />
                        </div>
                      )}
                      <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                        {task.type}
                      </span>
                    </div>
                    {task.status === "completed" && (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-emerald-500">
                        <CheckCircle size={16} />
                      </motion.div>
                    )}
                  </div>

                  <div className="p-4">
                    <h4 className="font-medium text-stone-900 leading-tight mb-1">{task.title}</h4>
                    <p className="text-xs text-stone-500 mb-3">To: {task.recipient}</p>

                    <div className="h-1.5 w-full bg-stone-100 rounded-full overflow-hidden">
                      <motion.div
                        className={`h-full ${task.status === "completed" ? "bg-emerald-500" : "bg-stone-800"}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${task.progress}%` }}
                        transition={{ type: "tween", ease: "linear", duration: 0.2 }}
                      />
                    </div>

                    <div className="flex justify-between items-center mt-2 h-4">
                      <span className="text-[10px] text-stone-400 font-mono">
                        {task.status === "pending" && "WAITING..."}
                        {task.status === "processing" && "EXECUTING..."}
                        {task.status === "completed" && "DONE"}
                      </span>
                      {task.status === "processing" && (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                          className="w-3 h-3 border-2 border-stone-300 border-t-stone-800 rounded-full"
                        />
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          <AnimatePresence>
            {showCardStack && tasks.length > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="absolute inset-0 flex items-center justify-center z-40 bg-stone-100/50 backdrop-blur-sm"
              >
                <div className="relative w-96 h-[420px]">
                  <button
                    onClick={prevCard}
                    className="absolute left-[-60px] top-1/2 -translate-y-1/2 p-3 bg-white rounded-full shadow-lg hover:bg-stone-50 text-stone-600 z-50"
                  >
                    <ChevronLeft size={24} />
                  </button>
                  <button
                    onClick={nextCard}
                    className="absolute right-[-60px] top-1/2 -translate-y-1/2 p-3 bg-white rounded-full shadow-lg hover:bg-stone-50 text-stone-600 z-50"
                  >
                    <ChevronRight size={24} />
                  </button>

                  <div className="relative w-full h-full">
                    {tasks.map((task, index) => {
                      const isCurrent = index === currentCardIndex;
                      const nextIndex = (currentCardIndex + 1) % tasks.length;
                      const prevIndex = (currentCardIndex - 1 + tasks.length) % tasks.length;

                      let x = 0;
                      let scale = 0.8;
                      let opacity = 0;
                      let zIndex = 0;
                      let rotate = 0;

                      if (isCurrent) {
                        x = 0;
                        scale = 1;
                        opacity = 1;
                        zIndex = 10;
                        rotate = 0;
                      } else if (index === nextIndex) {
                        x = 40;
                        scale = 0.9;
                        opacity = 0.6;
                        zIndex = 5;
                        rotate = 5;
                      } else if (index === prevIndex) {
                        x = -40;
                        scale = 0.9;
                        opacity = 0.6;
                        zIndex = 5;
                        rotate = -5;
                      }

                      return (
                        <motion.div
                          key={task.id}
                          animate={{ x, scale, opacity, zIndex, rotate }}
                          transition={{ type: "spring", stiffness: 200, damping: 20 }}
                          className="absolute inset-0 bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col"
                        >
                          <div className="h-2 bg-emerald-500 w-full" />
                          <div className="p-6 flex-1 flex flex-col">
                            <div className="flex justify-between items-start mb-4">
                              <div
                                className={`p-2 rounded-lg ${
                                  task.type === "email"
                                    ? "bg-blue-100 text-blue-600"
                                    : task.type === "call"
                                      ? "bg-green-100 text-green-600"
                                      : task.type === "calendar"
                                        ? "bg-purple-100 text-purple-600"
                                        : "bg-amber-100 text-amber-600"
                                }`}
                              >
                                {task.type === "email" && <Mail size={20} />}
                                {task.type === "call" && <Phone size={20} />}
                                {task.type === "calendar" && <Calendar size={20} />}
                                {task.type === "research" && <ArrowRight size={20} />}
                              </div>
                              <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full uppercase">
                                Completed
                              </span>
                            </div>

                            <h3 className="text-xl font-bold text-stone-900 mb-2">{task.title}</h3>
                            <p className="text-sm text-stone-500 mb-6">To: {task.recipient}</p>

                            <div className="flex-1 bg-stone-50 rounded-xl p-4 border border-stone-100">
                              <p className="text-sm text-stone-600 leading-relaxed">{task.details}</p>
                            </div>

                            <div className="mt-6 pt-4 border-t border-stone-100 flex justify-between items-center">
                              <div className="text-xs text-stone-400 font-mono">
                                <span>ID: {task.id}</span>
                                <span className="ml-2">{task.duration}ms</span>
                              </div>
                              <button
                                onClick={() => setShowWorkflow(!showWorkflow)}
                                className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
                                  showWorkflow
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                                }`}
                              >
                                <Network size={14} />
                                {showWorkflow ? "Hide Workflow" : "View Workflow"}
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>

                  <AnimatePresence>
                    {showWorkflow && (
                      <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="absolute -right-[320px] top-0 bottom-0 w-[300px]"
                      >
                        <CompanyGraph activeTaskId={tasks[currentCardIndex].id} className="w-full h-full" />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <button
                    onClick={() => setShowCardStack(false)}
                    className="absolute -top-12 right-0 p-2 bg-white/80 rounded-full hover:bg-white text-stone-500"
                  >
                    <X size={20} />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {(state === "cleaning" || state === "recorded") && !showCardStack && (
              <motion.div
                initial={{ y: 200, opacity: 0, scale: 0.8 }}
                animate={{ y: 100, opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.05, y: 90 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleRecordClick}
                className="absolute bottom-0 z-30 bg-stone-900 text-white p-6 rounded-2xl shadow-2xl flex items-center gap-4 cursor-pointer hover:bg-stone-800 transition-all group"
              >
                <div className="p-3 bg-stone-800 rounded-xl group-hover:bg-emerald-900/30 transition-colors">
                  <PackageOpen size={32} className="text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">All Tasks Completed</h3>
                  <p className="text-stone-400 text-sm font-mono flex items-center gap-2">
                    Meeting ID: <span className="text-emerald-400">202602201230</span>
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="absolute bottom-8 text-stone-400 text-sm font-mono">
          STATUS: {state.toUpperCase()}
        </div>
      </div>
    </div>
  );
}
