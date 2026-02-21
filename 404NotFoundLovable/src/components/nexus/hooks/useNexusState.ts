import { useState, useCallback, useEffect, useMemo } from "react";
import {
  Department,
  Person,
  Connection,
  NodePosition,
  ViewMode,
  SEED_DEPARTMENTS,
  uid,
  serializeState,
  deserializeState,
  SerializedNexusState,
} from "../types";

const STORAGE_KEY = "nexus-state";

interface UseNexusStateReturn {
  // Data
  departments: Department[];
  connections: Connection[];
  nodePositions: Map<string, NodePosition>;
  expandedDepts: Set<string>;
  selectedPerson: Person | null;
  selectedDept: Department | null;
  view: ViewMode;

  // Computed
  totalPeople: number;

  // View actions
  setView: (view: ViewMode) => void;
  toggleDept: (id: string) => void;

  // Selection actions
  selectPerson: (person: Person, dept: Department) => void;
  clearSelection: () => void;

  // Department actions
  addDepartment: (name: string, head: string) => void;
  deleteDepartment: (deptId: string) => void;

  // Person actions
  addPerson: (deptId: string, name: string, role: string, tasks: string[]) => void;
  updatePerson: (deptId: string, personId: string, updates: Partial<Person>) => void;
  deletePerson: (deptId: string, personId: string) => void;

  // Connection actions
  addConnection: (from: string, to: string, label: string) => void;
  removeConnection: (index: number) => void;
  getConnectionCount: (personId: string) => number;

  // Node position actions
  updateNodePosition: (id: string, x: number, y: number) => void;

  // Persistence actions
  exportData: () => string;
  importData: (json: string) => boolean;
  resetToSeed: () => void;
}

export function useNexusState(): UseNexusStateReturn {
  // Load initial state from localStorage or use seed data
  const [departments, setDepartments] = useState<Department[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data: SerializedNexusState = JSON.parse(stored);
        return data.departments;
      }
    } catch (e) {
      console.warn("Failed to load state from localStorage:", e);
    }
    return SEED_DEPARTMENTS;
  });

  const [connections, setConnections] = useState<Connection[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data: SerializedNexusState = JSON.parse(stored);
        return data.connections;
      }
    } catch (e) {
      // Already warned above
    }
    return [];
  });

  const [nodePositions, setNodePositions] = useState<Map<string, NodePosition>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data: SerializedNexusState = JSON.parse(stored);
        return new Map(data.nodePositions);
      }
    } catch (e) {
      // Already warned above
    }
    return new Map();
  });

  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set());
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [selectedDept, setSelectedDept] = useState<Department | null>(null);
  const [view, setView] = useState<ViewMode>("orbital");

  // Persist state to localStorage
  useEffect(() => {
    try {
      const serialized = JSON.stringify(
        serializeState({ departments, connections, nodePositions })
      );
      localStorage.setItem(STORAGE_KEY, serialized);
    } catch (e) {
      console.warn("Failed to save state to localStorage:", e);
    }
  }, [departments, connections, nodePositions]);

  // Compute initial positions for departments and people when they change
  useEffect(() => {
    setNodePositions((prev) => {
      const next = new Map(prev);
      const cx = 420,
        cy = 320,
        baseR = 220;

      departments.forEach((d, i) => {
        if (!next.has(d.id)) {
          const angle =
            (i / Math.max(departments.length, 1)) * Math.PI * 2 - Math.PI / 2;
          next.set(d.id, {
            x: cx + Math.cos(angle) * baseR,
            y: cy + Math.sin(angle) * baseR,
          });
        }

        // Initialize people positions relative to dept
        const deptPos = next.get(d.id)!;
        d.people.forEach((p, pi) => {
          if (!next.has(p.id)) {
            const spread = 0.4;
            const baseAngle = Math.atan2(deptPos.y - cy, deptPos.x - cx);
            const pAngle =
              baseAngle + (pi - (d.people.length - 1) / 2) * spread;
            next.set(p.id, {
              x: deptPos.x + Math.cos(pAngle) * 90,
              y: deptPos.y + Math.sin(pAngle) * 90,
            });
          }
        });
      });

      return next;
    });
  }, [departments]);

  // Computed values
  const totalPeople = useMemo(
    () => departments.reduce((a, d) => a + d.people.length, 0),
    [departments]
  );

  // View actions
  const toggleDept = useCallback(
    (id: string) =>
      setExpandedDepts((s) => {
        const n = new Set(s);
        if (n.has(id)) n.delete(id);
        else n.add(id);
        return n;
      }),
    []
  );

  // Selection actions
  const selectPerson = useCallback((person: Person, dept: Department) => {
    setSelectedPerson(person);
    setSelectedDept(dept);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedPerson(null);
    setSelectedDept(null);
  }, []);

  // Department actions
  const addDepartment = useCallback((name: string, head: string) => {
    if (!name.trim()) return;
    setDepartments((ds) => [
      ...ds,
      {
        id: uid(),
        name: name.trim(),
        head: head.trim() || "Head",
        colorIdx: ds.length % 8,
        people: [],
      },
    ]);
  }, []);

  const deleteDepartment = useCallback(
    (deptId: string) => {
      const dept = departments.find((d) => d.id === deptId);
      if (!dept) return;

      const pids = new Set(dept.people.map((p) => p.id));
      setDepartments((ds) => ds.filter((d) => d.id !== deptId));
      setConnections((cs) =>
        cs.filter((c) => !pids.has(c.from) && !pids.has(c.to))
      );
      setExpandedDepts((s) => {
        const n = new Set(s);
        n.delete(deptId);
        return n;
      });

      if (selectedDept?.id === deptId) {
        setSelectedPerson(null);
        setSelectedDept(null);
      }
    },
    [departments, selectedDept]
  );

  // Person actions
  const addPerson = useCallback(
    (deptId: string, name: string, role: string, tasks: string[]) => {
      if (!name.trim()) return;
      setDepartments((ds) =>
        ds.map((dep) =>
          dep.id === deptId
            ? {
                ...dep,
                people: [
                  ...dep.people,
                  {
                    id: uid(),
                    name: name.trim(),
                    role: role.trim() || "Member",
                    tasks,
                    isHead: dep.people.length === 0,
                  },
                ],
              }
            : dep
        )
      );
    },
    []
  );

  const updatePerson = useCallback(
    (deptId: string, personId: string, updates: Partial<Person>) => {
      setDepartments((ds) =>
        ds.map((d) =>
          d.id === deptId
            ? {
                ...d,
                people: d.people.map((p) =>
                  p.id === personId ? { ...p, ...updates } : p
                ),
              }
            : d
        )
      );
      setSelectedPerson((p) =>
        p && p.id === personId ? { ...p, ...updates } : p
      );
    },
    []
  );

  const deletePerson = useCallback((deptId: string, personId: string) => {
    setDepartments((ds) =>
      ds.map((d) =>
        d.id === deptId
          ? { ...d, people: d.people.filter((p) => p.id !== personId) }
          : d
      )
    );
    setConnections((cs) =>
      cs.filter((c) => c.from !== personId && c.to !== personId)
    );
  }, []);

  // Connection actions
  const addConnection = useCallback((from: string, to: string, label: string) => {
    setConnections((cs) => [...cs, { from, to, label }]);
  }, []);

  const removeConnection = useCallback((index: number) => {
    setConnections((cs) => cs.filter((_, idx) => idx !== index));
  }, []);

  const getConnectionCount = useCallback(
    (personId: string) => {
      return connections.filter(
        (c) => c.from === personId || c.to === personId
      ).length;
    },
    [connections]
  );

  // Node position actions
  const updateNodePosition = useCallback((id: string, x: number, y: number) => {
    setNodePositions((prev) => {
      const next = new Map(prev);
      next.set(id, { x, y });
      return next;
    });
  }, []);

  // Persistence actions
  const exportData = useCallback(() => {
    return JSON.stringify(
      serializeState({ departments, connections, nodePositions }),
      null,
      2
    );
  }, [departments, connections, nodePositions]);

  const importData = useCallback((json: string): boolean => {
    try {
      const data: SerializedNexusState = JSON.parse(json);
      const state = deserializeState(data);
      setDepartments(state.departments);
      setConnections(state.connections);
      setNodePositions(state.nodePositions);
      return true;
    } catch (e) {
      console.error("Failed to import data:", e);
      return false;
    }
  }, []);

  const resetToSeed = useCallback(() => {
    setDepartments(SEED_DEPARTMENTS);
    setConnections([]);
    setNodePositions(new Map());
    setExpandedDepts(new Set());
    setSelectedPerson(null);
    setSelectedDept(null);
  }, []);

  return {
    // Data
    departments,
    connections,
    nodePositions,
    expandedDepts,
    selectedPerson,
    selectedDept,
    view,

    // Computed
    totalPeople,

    // View actions
    setView,
    toggleDept,

    // Selection actions
    selectPerson,
    clearSelection,

    // Department actions
    addDepartment,
    deleteDepartment,

    // Person actions
    addPerson,
    updatePerson,
    deletePerson,

    // Connection actions
    addConnection,
    removeConnection,
    getConnectionCount,

    // Node position actions
    updateNodePosition,

    // Persistence actions
    exportData,
    importData,
    resetToSeed,
  };
}
