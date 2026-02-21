// ─── Core Data Types ─────────────────────────────────────────────────

export interface Person {
  id: string;
  name: string;
  role: string;
  tasks: string[];
  isHead: boolean;
}

export interface Department {
  id: string;
  name: string;
  head: string;
  colorIdx: number;
  people: Person[];
}

export interface Connection {
  from: string;
  to: string;
  label: string;
}

// ─── View & UI Types ─────────────────────────────────────────────────

export type ViewMode = "hierarchy" | "grid" | "orbital";

export interface NodePosition {
  x: number;
  y: number;
}

// ─── Color Theme Types ───────────────────────────────────────────────

export interface DepartmentColor {
  bg: string;
  border: string;
  dot: string;
}

// Technical monochromatic department colors with neon accents
export const DEPT_COLORS: DepartmentColor[] = [
  // Neon Green - Primary highlight
  { bg: "hsl(75 100% 50% / 0.08)", border: "hsl(75 100% 50% / 0.4)", dot: "hsl(75 100% 50%)" },
  // Electric Blue - Secondary
  { bg: "hsl(200 100% 50% / 0.08)", border: "hsl(200 100% 50% / 0.4)", dot: "hsl(200 100% 50%)" },
  // Grayscale Light
  { bg: "hsl(0 0% 50% / 0.06)", border: "hsl(0 0% 50% / 0.3)", dot: "hsl(0 0% 60%)" },
  // Grayscale Medium
  { bg: "hsl(0 0% 40% / 0.06)", border: "hsl(0 0% 40% / 0.3)", dot: "hsl(0 0% 50%)" },
  // Neon Green Dim
  { bg: "hsl(75 60% 40% / 0.08)", border: "hsl(75 60% 40% / 0.4)", dot: "hsl(75 60% 45%)" },
  // Electric Blue Dim
  { bg: "hsl(200 60% 40% / 0.08)", border: "hsl(200 60% 40% / 0.4)", dot: "hsl(200 60% 45%)" },
  // Grayscale Dark
  { bg: "hsl(0 0% 30% / 0.06)", border: "hsl(0 0% 30% / 0.3)", dot: "hsl(0 0% 40%)" },
  // Pure Gray
  { bg: "hsl(0 0% 25% / 0.06)", border: "hsl(0 0% 25% / 0.3)", dot: "hsl(0 0% 35%)" },
];

// ─── State Types ─────────────────────────────────────────────────────

export interface NexusState {
  departments: Department[];
  connections: Connection[];
  nodePositions: Map<string, NodePosition>;
  expandedDepts: Set<string>;
  selectedPerson: Person | null;
  selectedDept: Department | null;
  view: ViewMode;
}

// ─── Action Types (for undo/redo) ────────────────────────────────────

export type NexusAction =
  | { type: "ADD_DEPARTMENT"; department: Department }
  | { type: "DELETE_DEPARTMENT"; departmentId: string }
  | { type: "ADD_PERSON"; departmentId: string; person: Person }
  | { type: "UPDATE_PERSON"; departmentId: string; personId: string; updates: Partial<Person> }
  | { type: "DELETE_PERSON"; departmentId: string; personId: string }
  | { type: "ADD_CONNECTION"; connection: Connection }
  | { type: "DELETE_CONNECTION"; index: number }
  | { type: "UPDATE_NODE_POSITION"; nodeId: string; position: NodePosition };

// ─── Modal Types ─────────────────────────────────────────────────────

export interface ModalField {
  key: string;
  label: string;
  type?: "text" | "textarea";
  placeholder?: string;
}

export interface ModalConfig {
  title: string;
  fields: ModalField[];
  onSave: (vals: Record<string, string>) => void;
}

// ─── Command Palette Types ───────────────────────────────────────────

export interface CommandAction {
  icon: string;
  label: string;
  desc: string;
  action: () => void;
  keywords?: string[];
}

// ─── Utility ─────────────────────────────────────────────────────────

export const uid = (): string => Math.random().toString(36).substr(2, 9);

// ─── Seed Data ───────────────────────────────────────────────────────

export const SEED_DEPARTMENTS: Department[] = [
  {
    id: uid(),
    name: "Executive",
    head: "CEO",
    colorIdx: 0,
    people: [
      {
        id: uid(),
        name: "Alexandra Chen",
        role: "Chief Executive Officer",
        tasks: ["Company vision & strategy", "Board relations", "Capital allocation"],
        isHead: true,
      },
      {
        id: uid(),
        name: "Marcus Webb",
        role: "Chief of Staff",
        tasks: ["Executive operations", "Cross-functional alignment"],
        isHead: false,
      },
    ],
  },
  {
    id: uid(),
    name: "Engineering",
    head: "CTO",
    colorIdx: 1,
    people: [
      {
        id: uid(),
        name: "James Liu",
        role: "Chief Technology Officer",
        tasks: ["Technical strategy", "Architecture decisions", "Engineering culture"],
        isHead: true,
      },
      {
        id: uid(),
        name: "Sarah Kim",
        role: "VP of Engineering",
        tasks: ["Team scaling", "Delivery cadence", "Technical debt"],
        isHead: false,
      },
      {
        id: uid(),
        name: "Ravi Patel",
        role: "Staff Engineer",
        tasks: ["System design", "Code reviews", "Mentorship"],
        isHead: false,
      },
    ],
  },
  {
    id: uid(),
    name: "Product",
    head: "CPO",
    colorIdx: 2,
    people: [
      {
        id: uid(),
        name: "Elena Vasquez",
        role: "Chief Product Officer",
        tasks: ["Product roadmap", "Customer insights", "Market positioning"],
        isHead: true,
      },
      {
        id: uid(),
        name: "Tom Nakamura",
        role: "Senior PM",
        tasks: ["Feature prioritization", "Sprint planning"],
        isHead: false,
      },
    ],
  },
  {
    id: uid(),
    name: "Operations",
    head: "COO",
    colorIdx: 3,
    people: [
      {
        id: uid(),
        name: "Diana Brooks",
        role: "Chief Operating Officer",
        tasks: ["Process optimization", "Vendor management", "Compliance"],
        isHead: true,
      },
      {
        id: uid(),
        name: "Oscar Mendez",
        role: "Operations Manager",
        tasks: ["Day-to-day operations", "Reporting", "Budget tracking"],
        isHead: false,
      },
    ],
  },
];

// ─── Serialization helpers for localStorage ─────────────────────────

export interface SerializedNexusState {
  departments: Department[];
  connections: Connection[];
  nodePositions: [string, NodePosition][];
}

export const serializeState = (state: Pick<NexusState, 'departments' | 'connections' | 'nodePositions'>): SerializedNexusState => ({
  departments: state.departments,
  connections: state.connections,
  nodePositions: Array.from(state.nodePositions.entries()),
});

export const deserializeState = (data: SerializedNexusState): Pick<NexusState, 'departments' | 'connections' | 'nodePositions'> => ({
  departments: data.departments,
  connections: data.connections,
  nodePositions: new Map(data.nodePositions),
});
