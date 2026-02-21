import { useState, useCallback, useRef, useEffect, useMemo } from "react";

// ─── Color Constants (Light Grid Theme) ───────────────────────────────
const BG = "#f5f5f5";
const SURFACE = "#ffffff";
const SURFACE_2 = "#ebebeb";
const BORDER = "#d4d4d4";
const ACCENT = "#3b82f6";
const ACCENT_DIM = "rgba(59,130,246,0.10)";
const ACCENT_GLOW = "rgba(59,130,246,0.3)";
const TEXT = "#1a1a1a";
const TEXT_DIM = "#525252";
const TEXT_MUTED = "#a3a3a3";
const DANGER = "#ef4444";
const GRID_LINE = "#e0e0e0";

const DEPT_COLORS = [
  { bg: "rgba(59,130,246,0.08)", border: "rgba(59,130,246,0.30)", dot: "#3b82f6" },
  { bg: "rgba(16,185,129,0.08)", border: "rgba(16,185,129,0.30)", dot: "#10b981" },
  { bg: "rgba(139,92,246,0.08)", border: "rgba(139,92,246,0.30)", dot: "#8b5cf6" },
  { bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.30)", dot: "#f59e0b" },
  { bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.30)", dot: "#ef4444" },
  { bg: "rgba(236,72,153,0.08)", border: "rgba(236,72,153,0.30)", dot: "#ec4899" },
  { bg: "rgba(20,184,166,0.08)", border: "rgba(20,184,166,0.30)", dot: "#14b8a6" },
  { bg: "rgba(168,162,158,0.08)", border: "rgba(168,162,158,0.30)", dot: "#a8a29e" },
];

const uid = () => Math.random().toString(36).substr(2, 9);

// ─── Seed Data ────────────────────────────────────────────────────────
const SEED_DEPARTMENTS = [
  {
    id: uid(), name: "Executive", head: "CEO", colorIdx: 0,
    people: [
      { id: uid(), name: "Alexandra Chen", role: "Chief Executive Officer", tasks: ["Company vision & strategy", "Board relations", "Capital allocation"], isHead: true },
      { id: uid(), name: "Marcus Webb", role: "Chief of Staff", tasks: ["Executive operations", "Cross-functional alignment"], isHead: false },
    ],
  },
  {
    id: uid(), name: "Engineering", head: "CTO", colorIdx: 1,
    people: [
      { id: uid(), name: "James Liu", role: "Chief Technology Officer", tasks: ["Technical strategy", "Architecture decisions", "Engineering culture"], isHead: true },
      { id: uid(), name: "Sarah Kim", role: "VP of Engineering", tasks: ["Team scaling", "Delivery cadence", "Technical debt"], isHead: false },
      { id: uid(), name: "Ravi Patel", role: "Staff Engineer", tasks: ["System design", "Code reviews", "Mentorship"], isHead: false },
    ],
  },
  {
    id: uid(), name: "Product", head: "CPO", colorIdx: 2,
    people: [
      { id: uid(), name: "Elena Vasquez", role: "Chief Product Officer", tasks: ["Product roadmap", "Customer insights", "Market positioning"], isHead: true },
      { id: uid(), name: "Tom Nakamura", role: "Senior PM", tasks: ["Feature prioritization", "Sprint planning"], isHead: false },
    ],
  },
  {
    id: uid(), name: "Operations", head: "COO", colorIdx: 3,
    people: [
      { id: uid(), name: "Diana Brooks", role: "Chief Operating Officer", tasks: ["Process optimization", "Vendor management", "Compliance"], isHead: true },
      { id: uid(), name: "Oscar Mendez", role: "Operations Manager", tasks: ["Day-to-day operations", "Reporting", "Budget tracking"], isHead: false },
    ],
  },
];

// ─── Inline SVG Icons ─────────────────────────────────────────────────
const Icon = ({ type, size = 14, color = "currentColor" }: { type: string; size?: number; color?: string }) => {
  const s = { width: size, height: size, display: "inline-block", verticalAlign: "middle", flexShrink: 0 } as const;
  const p = { stroke: color, strokeWidth: 1.5, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, fill: "none" };
  switch (type) {
    case "plus": return <svg style={s} viewBox="0 0 14 14"><line {...p} x1="7" y1="2" x2="7" y2="12"/><line {...p} x1="2" y1="7" x2="12" y2="7"/></svg>;
    case "search": return <svg style={s} viewBox="0 0 14 14"><circle {...p} cx="6" cy="6" r="3.5"/><line {...p} x1="9" y1="9" x2="12" y2="12"/></svg>;
    case "x": return <svg style={s} viewBox="0 0 14 14"><line {...p} x1="3" y1="3" x2="11" y2="11"/><line {...p} x1="11" y1="3" x2="3" y2="11"/></svg>;
    case "link": return <svg style={s} viewBox="0 0 14 14"><path {...p} d="M6 8a3 3 0 004 1l1-1a3 3 0 000-4l0 0a3 3 0 00-4 0L6 5"/><path {...p} d="M8 6a3 3 0 00-4-1L3 6a3 3 0 000 4l0 0a3 3 0 004 0l1-1"/></svg>;
    case "user": return <svg style={s} viewBox="0 0 14 14"><circle {...p} cx="7" cy="4.5" r="2.5"/><path {...p} d="M2 13c0-2.8 2.2-5 5-5s5 2.2 5 5"/></svg>;
    case "building": return <svg style={s} viewBox="0 0 14 14"><rect {...p} x="2" y="2" width="10" height="10" rx="1"/><line {...p} x1="5" y1="5" x2="5" y2="5.01"/><line {...p} x1="7" y1="5" x2="7" y2="5.01"/><line {...p} x1="9" y1="5" x2="9" y2="5.01"/><line {...p} x1="5" y1="8" x2="5" y2="8.01"/><line {...p} x1="7" y1="8" x2="7" y2="8.01"/><line {...p} x1="9" y1="8" x2="9" y2="8.01"/></svg>;
    case "trash": return <svg style={s} viewBox="0 0 14 14"><path {...p} d="M2 4h10"/><path {...p} d="M5 4V3a1 1 0 011-1h2a1 1 0 011 1v1"/><path {...p} d="M3 4l1 8a1 1 0 001 1h4a1 1 0 001-1l1-8"/></svg>;
    case "arrow": return <svg style={s} viewBox="0 0 14 14"><line {...p} x1="2" y1="7" x2="12" y2="7"/><polyline {...p} points="8,3 12,7 8,11"/></svg>;
    case "grid": return <svg style={s} viewBox="0 0 14 14"><rect {...p} x="2" y="2" width="4" height="4" rx="0.5"/><rect {...p} x="8" y="2" width="4" height="4" rx="0.5"/><rect {...p} x="2" y="8" width="4" height="4" rx="0.5"/><rect {...p} x="8" y="8" width="4" height="4" rx="0.5"/></svg>;
    case "orbital": return <svg style={s} viewBox="0 0 14 14"><circle {...p} cx="7" cy="7" r="2"/><circle {...p} cx="7" cy="7" r="5" strokeDasharray="2 2"/><circle {...p} cx="7" cy="2" r="1" fill={color} stroke="none"/><circle {...p} cx="12" cy="7" r="1" fill={color} stroke="none"/></svg>;
    case "chevDown": return <svg style={s} viewBox="0 0 14 14"><polyline {...p} points="3,5 7,9 11,5"/></svg>;
    default: return null;
  }
};

// ─── Kbd Badge ────────────────────────────────────────────────────────
const Kbd = ({ children }: { children: string }) => (
  <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: TEXT_MUTED, background: SURFACE_2, border: `1px solid ${BORDER}`, borderRadius: 4, padding: "1px 5px", lineHeight: "18px" }}>{children}</span>
);

// ─── Styles Injection ─────────────────────────────────────────────────
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400&family=DM+Sans:wght@300;400;500;600;700&family=Inter:wght@400;500;600;700&display=swap');
    .nexus-root { font-family: 'DM Sans', sans-serif; color: ${TEXT}; background: ${BG}; }
    .nexus-root * { box-sizing: border-box; }
    .nexus-root ::selection { background: ${ACCENT_DIM}; color: ${TEXT}; }
    .nexus-root ::-webkit-scrollbar { width: 6px; height: 6px; }
    .nexus-root ::-webkit-scrollbar-track { background: transparent; }
    .nexus-root ::-webkit-scrollbar-thumb { background: ${BORDER}; border-radius: 3px; }
    @keyframes nxFadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
    @keyframes nxCmdIn { from { opacity:0; transform:translateY(-12px) scale(0.97); } to { opacity:1; transform:translateY(0) scale(1); } }
    @keyframes nxPanelIn { from { opacity:0; transform:translateX(20px); } to { opacity:1; transform:translateX(0); } }
    @keyframes nxPulse { 0%,100%{opacity:0.4} 50%{opacity:1} }
  `}</style>
);

// ─── TopBar ───────────────────────────────────────────────────────────
type ViewMode = "orbital" | "grid";
interface TopBarProps { totalDepts: number; totalPeople: number; totalConns: number; view: ViewMode; setView: (v: ViewMode) => void; onCreateClick: () => void; }
const TopBar = ({ totalDepts, totalPeople, totalConns, view, setView, onCreateClick }: TopBarProps) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 24px", borderBottom: `1px solid ${BORDER}`, background: SURFACE, flexShrink: 0 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
      <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em", color: TEXT }}>Nexus</span>
      <div style={{ display: "flex", gap: 12, fontSize: 12, color: TEXT_MUTED }}>
        <span>{totalDepts} dept{totalDepts !== 1 ? "s" : ""}</span>
        <span style={{ color: BORDER }}>·</span>
        <span>{totalPeople} people</span>
        <span style={{ color: BORDER }}>·</span>
        <span>{totalConns} path{totalConns !== 1 ? "s" : ""}</span>
      </div>
    </div>
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ display: "flex", border: `1px solid ${BORDER}`, borderRadius: 10, overflow: "hidden" }}>
        {(["orbital", "grid"] as ViewMode[]).map(v => (
          <button key={v} onClick={() => setView(v)} style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 12px", fontSize: 12, fontWeight: 500, background: view === v ? SURFACE_2 : "transparent", color: view === v ? TEXT : TEXT_MUTED, border: "none", cursor: "pointer", transition: "all 0.15s", fontFamily: "'DM Sans',sans-serif" }}>
            <Icon type={v === "orbital" ? "orbital" : "grid"} size={13} />{v === "orbital" ? "Orbital" : "Grid"}
          </button>
        ))}
      </div>
      <button onClick={onCreateClick} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", fontSize: 12, fontWeight: 600, background: ACCENT, color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", transition: "all 0.15s" }}>
        <Icon type="plus" size={12} color="#fff" /> Create <Kbd>⌘K</Kbd>
      </button>
    </div>
  </div>
);

// ─── Command Palette ──────────────────────────────────────────────────
interface Department { id: string; name: string; head: string; colorIdx: number; people: Person[]; }
interface Person { id: string; name: string; role: string; tasks: string[]; isHead: boolean; }
interface Connection { from: string; to: string; label: string; }
interface CmdAction { icon: string; label: string; desc: string; action: () => void; }

interface CmdPaletteProps { open: boolean; onClose: () => void; actions: CmdAction[]; }
const CommandPalette = ({ open, onClose, actions }: CmdPaletteProps) => {
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const filtered = useMemo(() => actions.filter(a => (a.label + a.desc).toLowerCase().includes(q.toLowerCase())), [actions, q]);
  useEffect(() => { if (open) { setQ(""); setSel(0); setTimeout(() => inputRef.current?.focus(), 50); } }, [open]);
  useEffect(() => { setSel(0); }, [q]);
  const handleKey = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSel(s => Math.min(s + 1, filtered.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSel(s => Math.max(s - 1, 0)); }
    else if (e.key === "Enter" && filtered[sel]) { filtered[sel].action(); onClose(); }
    else if (e.key === "Escape") onClose();
  }, [filtered, sel, onClose]);
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", justifyContent: "center", paddingTop: "18vh", background: "rgba(0,0,0,0.3)", backdropFilter: "blur(8px)" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width: 520, background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden", animation: "nxCmdIn 0.2s ease-out", maxHeight: 420, display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderBottom: `1px solid ${BORDER}` }}>
          <Icon type="search" size={15} color={TEXT_MUTED} />
          <input ref={inputRef} value={q} onChange={e => setQ(e.target.value)} onKeyDown={handleKey} placeholder="Type a command..." style={{ flex: 1, background: "none", border: "none", outline: "none", color: TEXT, fontSize: 14, fontFamily: "'DM Sans',sans-serif" }} />
          <Kbd>ESC</Kbd>
        </div>
        <div style={{ overflowY: "auto", flex: 1 }}>
          {filtered.length === 0 && <div style={{ padding: 24, textAlign: "center", color: TEXT_MUTED, fontSize: 13 }}>No matching commands</div>}
          {filtered.map((a, i) => (
            <div key={i} onClick={() => { a.action(); onClose(); }} onMouseEnter={() => setSel(i)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", cursor: "pointer", background: sel === i ? ACCENT_DIM : "transparent", transition: "background 0.1s" }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: SURFACE_2, border: `1px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon type={a.icon} size={13} color={sel === i ? ACCENT : TEXT_DIM} /></div>
              <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 500, color: TEXT }}>{a.label}</div><div style={{ fontSize: 11, color: TEXT_MUTED }}>{a.desc}</div></div>
              {sel === i && <Icon type="arrow" size={12} color={ACCENT} />}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 16, padding: "8px 16px", borderTop: `1px solid ${BORDER}`, fontSize: 11, color: TEXT_MUTED }}>
          <span>↑↓ navigate</span><span>↵ select</span>
        </div>
      </div>
    </div>
  );
};

// ─── Inline Modal ─────────────────────────────────────────────────────
interface ModalField { key: string; label: string; type?: "text" | "textarea"; placeholder?: string; }
interface ModalConfig { title: string; fields: ModalField[]; onSave: (vals: Record<string, string>) => void; }
interface InlineModalProps { config: ModalConfig | null; onClose: () => void; }
const InlineModal = ({ config, onClose }: InlineModalProps) => {
  const [vals, setVals] = useState<Record<string, string>>({});
  const firstRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (config) { const init: Record<string, string> = {}; config.fields.forEach(f => init[f.key] = ""); setVals(init); setTimeout(() => firstRef.current?.focus(), 50); } }, [config]);
  if (!config) return null;
  const set = (k: string, v: string) => setVals(p => ({ ...p, [k]: v }));
  const save = () => { config.onSave(vals); onClose(); };
  const inputStyle = { width: "100%", padding: "10px 12px", background: SURFACE_2, border: `1px solid ${BORDER}`, borderRadius: 10, color: TEXT, fontSize: 14, fontFamily: "'DM Sans',sans-serif", outline: "none", transition: "border-color 0.15s" } as const;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", justifyContent: "center", paddingTop: "22vh", background: "rgba(0,0,0,0.3)", backdropFilter: "blur(8px)" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width: 440, background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 24, animation: "nxCmdIn 0.2s ease-out", height: "fit-content", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}>
        <h2 style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 20 }}>{config.title}</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {config.fields.map((f, i) => (
            <div key={f.key}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: TEXT_MUTED, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>{f.label}</label>
              {f.type === "textarea" ? (
                <textarea value={vals[f.key] || ""} onChange={e => set(f.key, e.target.value)} placeholder={f.placeholder} style={{ ...inputStyle, minHeight: 72, resize: "vertical" } as any} />
              ) : (
                <input ref={i === 0 ? firstRef : undefined} value={vals[f.key] || ""} onChange={e => set(f.key, e.target.value)} onKeyDown={e => e.key === "Enter" && save()} placeholder={f.placeholder} style={inputStyle} onFocus={e => (e.target.style.borderColor = ACCENT)} onBlur={e => (e.target.style.borderColor = BORDER)} />
              )}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
          <button onClick={onClose} style={{ padding: "8px 16px", fontSize: 13, fontWeight: 500, background: "transparent", border: `1px solid ${BORDER}`, borderRadius: 10, color: TEXT_DIM, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>Cancel</button>
          <button onClick={save} style={{ padding: "8px 16px", fontSize: 13, fontWeight: 600, background: ACCENT, border: "none", borderRadius: 10, color: "#fff", cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>Create</button>
        </div>
      </div>
    </div>
  );
};

// ─── Connection Picker ────────────────────────────────────────────────
interface ConnPickerProps { open: boolean; onClose: () => void; departments: Department[]; onSave: (from: string, to: string, label: string) => void; }
const ConnectionPicker = ({ open, onClose, departments, onSave }: ConnPickerProps) => {
  const [fromId, setFromId] = useState<string | null>(null);
  const [toId, setToId] = useState<string | null>(null);
  const [label, setLabel] = useState("Reports to");
  useEffect(() => { if (open) { setFromId(null); setToId(null); setLabel("Reports to"); } }, [open]);
  if (!open) return null;
  const allPeople = departments.flatMap(d => d.people.map(p => ({ ...p, dept: d })));
  const PersonList = ({ selected, onSelect, exclude }: { selected: string | null; onSelect: (id: string) => void; exclude?: string | null }) => (
    <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 2 }}>
      {allPeople.filter(p => p.id !== exclude).map(p => {
        const c = DEPT_COLORS[p.dept.colorIdx % DEPT_COLORS.length];
        return (
          <div key={p.id} onClick={() => onSelect(p.id)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 8, cursor: "pointer", background: selected === p.id ? ACCENT_DIM : "transparent", border: `1px solid ${selected === p.id ? ACCENT : "transparent"}`, transition: "all 0.15s" }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: c.dot, flexShrink: 0 }} />
            <div><div style={{ fontSize: 12, fontWeight: 500 }}>{p.name}</div><div style={{ fontSize: 10, color: TEXT_MUTED }}>{p.role}</div></div>
          </div>
        );
      })}
    </div>
  );
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", justifyContent: "center", paddingTop: "16vh", background: "rgba(0,0,0,0.3)", backdropFilter: "blur(8px)" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width: 600, background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 24, animation: "nxCmdIn 0.2s ease-out", height: "fit-content", maxHeight: "60vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}>
        <h2 style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 16 }}>New Communication Path</h2>
        <div style={{ display: "flex", gap: 12, flex: 1, minHeight: 0, maxHeight: 240 }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: TEXT_MUTED, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>From</div>
            <PersonList selected={fromId} onSelect={setFromId} exclude={toId} />
          </div>
          <div style={{ display: "flex", alignItems: "center", color: TEXT_MUTED }}><Icon type="arrow" size={18} /></div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: TEXT_MUTED, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>To</div>
            <PersonList selected={toId} onSelect={setToId} exclude={fromId} />
          </div>
        </div>
        <div style={{ marginTop: 16 }}>
          <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: TEXT_MUTED, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Relationship Label</label>
          <input value={label} onChange={e => setLabel(e.target.value)} style={{ width: "100%", padding: "10px 12px", background: SURFACE_2, border: `1px solid ${BORDER}`, borderRadius: 10, color: TEXT, fontSize: 13, fontFamily: "'DM Sans',sans-serif", outline: "none" }} onFocus={e => (e.target.style.borderColor = ACCENT)} onBlur={e => (e.target.style.borderColor = BORDER)} />
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
          <button onClick={onClose} style={{ padding: "8px 16px", fontSize: 13, fontWeight: 500, background: "transparent", border: `1px solid ${BORDER}`, borderRadius: 10, color: TEXT_DIM, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>Cancel</button>
          <button disabled={!fromId || !toId} onClick={() => { if (fromId && toId) { onSave(fromId, toId, label); onClose(); } }} style={{ padding: "8px 16px", fontSize: 13, fontWeight: 600, background: fromId && toId ? ACCENT : SURFACE_2, border: "none", borderRadius: 10, color: fromId && toId ? "#fff" : TEXT_MUTED, cursor: fromId && toId ? "pointer" : "default", fontFamily: "'DM Sans',sans-serif", transition: "all 0.15s" }}>Create Path</button>
        </div>
      </div>
    </div>
  );
};

// ─── Person Panel ─────────────────────────────────────────────────────
interface PersonPanelProps { person: Person | null; dept: Department | null; onClose: () => void; onUpdate: (deptId: string, personId: string, updates: Partial<Person>) => void; onDelete: (deptId: string, personId: string) => void; connCount: number; }
const PersonPanel = ({ person, dept, onClose, onUpdate, onDelete, connCount }: PersonPanelProps) => {
  const [editField, setEditField] = useState<string | null>(null);
  const [editVal, setEditVal] = useState("");
  const [newTask, setNewTask] = useState("");
  const editRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (editField) setTimeout(() => editRef.current?.focus(), 30); }, [editField]);
  if (!person || !dept) return null;
  const c = DEPT_COLORS[dept.colorIdx % DEPT_COLORS.length];
  const startEdit = (field: string, val: string) => { setEditField(field); setEditVal(val); };
  const saveEdit = () => {
    if (editField === "name" && editVal.trim()) onUpdate(dept.id, person.id, { name: editVal.trim() });
    if (editField === "role" && editVal.trim()) onUpdate(dept.id, person.id, { role: editVal.trim() });
    setEditField(null);
  };
  const addTask = () => { if (newTask.trim()) { onUpdate(dept.id, person.id, { tasks: [...person.tasks, newTask.trim()] }); setNewTask(""); } };
  const removeTask = (idx: number) => { onUpdate(dept.id, person.id, { tasks: person.tasks.filter((_, i) => i !== idx) }); };
  return (
    <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: 400, background: SURFACE, borderLeft: `1px solid ${BORDER}`, zIndex: 90, animation: "nxPanelIn 0.25s ease-out", display: "flex", flexDirection: "column", overflowY: "auto", boxShadow: "-8px 0 30px rgba(0,0,0,0.08)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}><div style={{ width: 8, height: 8, borderRadius: "50%", background: c.dot }} /><span style={{ fontSize: 12, color: TEXT_DIM }}>{dept.name}</span></div>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: TEXT_MUTED, padding: 4 }}><Icon type="x" size={16} /></button>
      </div>
      <div style={{ padding: "20px 20px 24px" }}>
        {editField === "name" ? (
          <input ref={editRef} value={editVal} onChange={e => setEditVal(e.target.value)} onBlur={saveEdit} onKeyDown={e => e.key === "Enter" && saveEdit()} style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em", background: "none", border: "none", borderBottom: `2px solid ${ACCENT}`, outline: "none", color: TEXT, width: "100%", paddingBottom: 4 }} />
        ) : (
          <h2 onClick={() => startEdit("name", person.name)} style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em", cursor: "text", margin: 0 }}>{person.name}</h2>
        )}
        {editField === "role" ? (
          <input ref={editRef} value={editVal} onChange={e => setEditVal(e.target.value)} onBlur={saveEdit} onKeyDown={e => e.key === "Enter" && saveEdit()} style={{ fontSize: 14, color: TEXT_DIM, background: "none", border: "none", borderBottom: `2px solid ${ACCENT}`, outline: "none", width: "100%", paddingBottom: 2, marginTop: 4, fontFamily: "'DM Sans',sans-serif" }} />
        ) : (
          <p onClick={() => startEdit("role", person.role)} style={{ fontSize: 14, color: TEXT_DIM, margin: "4px 0 0", cursor: "text" }}>{person.role}</p>
        )}
        {person.isHead && (
          <div style={{ marginTop: 12, padding: "6px 10px", background: ACCENT_DIM, border: `1px solid ${ACCENT}`, borderRadius: 8, fontSize: 11, fontWeight: 600, color: ACCENT, textTransform: "uppercase", letterSpacing: "0.06em", display: "inline-block" }}>Department Head</div>
        )}
        {connCount > 0 && <div style={{ marginTop: 12, fontSize: 12, color: TEXT_MUTED }}><Icon type="link" size={12} /> {connCount} communication path{connCount !== 1 ? "s" : ""}</div>}
      </div>
      <div style={{ padding: "0 20px 20px", flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: TEXT_MUTED, textTransform: "uppercase", letterSpacing: "0.06em" }}>Tasks & Responsibilities</span>
          <span style={{ fontSize: 11, color: TEXT_MUTED }}>{person.tasks.length}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {person.tasks.map((t, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: SURFACE_2, borderRadius: 8, fontSize: 13 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: c.dot, flexShrink: 0 }} />
              <span style={{ flex: 1 }}>{t}</span>
              <button onClick={() => removeTask(i)} style={{ background: "none", border: "none", cursor: "pointer", color: TEXT_MUTED, padding: 2, opacity: 0.5, transition: "opacity 0.15s" }} onMouseEnter={e => (e.currentTarget.style.opacity = "1")} onMouseLeave={e => (e.currentTarget.style.opacity = "0.5")}><Icon type="x" size={10} /></button>
            </div>
          ))}
          <input value={newTask} onChange={e => setNewTask(e.target.value)} onKeyDown={e => e.key === "Enter" && addTask()} placeholder="Add a task..." style={{ padding: "8px 10px", background: "transparent", border: `1px dashed ${BORDER}`, borderRadius: 8, color: TEXT, fontSize: 13, outline: "none", fontFamily: "'DM Sans',sans-serif" }} onFocus={e => (e.target.style.borderColor = ACCENT)} onBlur={e => (e.target.style.borderColor = BORDER)} />
        </div>
      </div>
      <div style={{ padding: "16px 20px", borderTop: `1px solid ${BORDER}` }}>
        <button onClick={() => { onDelete(dept.id, person.id); onClose(); }} style={{ width: "100%", padding: "10px", fontSize: 13, fontWeight: 500, background: "rgba(239,68,68,0.06)", border: `1px solid rgba(239,68,68,0.2)`, borderRadius: 10, color: DANGER, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontFamily: "'DM Sans',sans-serif" }}>
          <Icon type="trash" size={13} color={DANGER} /> Remove Person
        </button>
      </div>
    </div>
  );
};

// ─── Orbital View (Draggable Rectangular Nodes + Grid BG) ─────────────
interface OrbitalProps {
  departments: Department[];
  connections: Connection[];
  expandedDepts: Set<string>;
  toggleDept: (id: string) => void;
  onSelectPerson: (p: Person, d: Department) => void;
  selectedPersonId: string | null;
  nodePositions: Map<string, { x: number; y: number }>;
  onNodeDrag: (id: string, x: number, y: number) => void;
}
const OrbitalView = ({ departments, connections, expandedDepts, toggleDept, onSelectPerson, selectedPersonId, nodePositions, onNodeDrag }: OrbitalProps) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<{ id: string; offsetX: number; offsetY: number } | null>(null);

  const getSVGPoint = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const svgP = pt.matrixTransform(ctm.inverse());
    return { x: svgP.x, y: svgP.y };
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent, id: string) => {
    e.stopPropagation();
    e.preventDefault();
    const pos = nodePositions.get(id);
    if (!pos) return;
    const svgP = getSVGPoint(e.clientX, e.clientY);
    dragRef.current = { id, offsetX: pos.x - svgP.x, offsetY: pos.y - svgP.y };
    (e.target as Element).setPointerCapture?.(e.pointerId);
  }, [nodePositions, getSVGPoint]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const svgP = getSVGPoint(e.clientX, e.clientY);
    onNodeDrag(dragRef.current.id, svgP.x + dragRef.current.offsetX, svgP.y + dragRef.current.offsetY);
  }, [getSVGPoint, onNodeDrag]);

  const handlePointerUp = useCallback(() => { dragRef.current = null; }, []);

  const cx = 420, cy = 320;

  // Build person positions from expanded depts
  const personPositions = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();
    departments.forEach(dept => {
      if (!expandedDepts.has(dept.id)) return;
      const deptPos = nodePositions.get(dept.id);
      if (!deptPos) return;
      dept.people.forEach(p => {
        const pos = nodePositions.get(p.id);
        if (pos) map.set(p.id, pos);
      });
    });
    return map;
  }, [departments, expandedDepts, nodePositions]);

  const allPersonPos = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();
    departments.forEach(dept => {
      const deptPos = nodePositions.get(dept.id);
      if (!deptPos) return;
      dept.people.forEach(p => {
        if (personPositions.has(p.id)) map.set(p.id, personPositions.get(p.id)!);
        else map.set(p.id, deptPos);
      });
    });
    return map;
  }, [departments, personPositions, nodePositions]);

  const anyExpanded = expandedDepts.size > 0;

  // Node dimensions
  const deptW = 130, deptH = 52;
  const personW = 110, personH = 42;
  const centerW = 100, centerH = 48;

  return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", background: BG }}>
      <svg
        ref={svgRef}
        viewBox="0 0 840 640"
        style={{ width: "100%", maxWidth: 840, maxHeight: "100%", cursor: dragRef.current ? "grabbing" : "default" }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <defs>
          <pattern id="gridPattern" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke={GRID_LINE} strokeWidth="0.5" />
          </pattern>
          <filter id="nodeShadow">
            <feDropShadow dx="0" dy="1" stdDeviation="3" floodColor="#000" floodOpacity="0.08" />
          </filter>
        </defs>
        {/* Grid background */}
        <rect width="840" height="640" fill="url(#gridPattern)" />

        {/* Connection arcs */}
        {connections.map((conn, i) => {
          const from = allPersonPos.get(conn.from);
          const to = allPersonPos.get(conn.to);
          if (!from || !to) return null;
          const mx = (from.x + to.x) / 2, my = (from.y + to.y) / 2;
          const dx = to.x - from.x, dy = to.y - from.y;
          const len = Math.sqrt(dx * dx + dy * dy);
          if (len === 0) return null;
          const off = Math.min(len * 0.3, 60);
          const cpx = mx + (-dy / len) * off, cpy = my + (dx / len) * off;
          return (
            <g key={i}>
              <path d={`M ${from.x} ${from.y} Q ${cpx} ${cpy} ${to.x} ${to.y}`} fill="none" stroke={ACCENT} strokeWidth={1.5} strokeDasharray="6 4" opacity={0.4} />
              <text x={cpx} y={cpy - 6} textAnchor="middle" fill={ACCENT} fontSize={9} fontFamily="'DM Sans',sans-serif" opacity={0.7}>{conn.label}</text>
            </g>
          );
        })}

        {/* Dept-to-center lines */}
        {departments.map(dept => {
          const pos = nodePositions.get(dept.id);
          if (!pos) return null;
          return <line key={dept.id} x1={cx} y1={cy} x2={pos.x} y2={pos.y} stroke={BORDER} strokeWidth={1} strokeDasharray="4 4" />;
        })}

        {/* Center node (rectangular) */}
        <g>
          <rect x={cx - centerW / 2} y={cy - centerH / 2} width={centerW} height={centerH} rx={12} fill={SURFACE} stroke={ACCENT} strokeWidth={1.5} filter="url(#nodeShadow)" />
          <text x={cx} y={cy - 4} textAnchor="middle" fill={TEXT} fontSize={13} fontWeight="600" fontFamily="'DM Sans',sans-serif">Nexus</text>
          <text x={cx} y={cy + 12} textAnchor="middle" fill={TEXT_MUTED} fontSize={9} fontFamily="'DM Sans',sans-serif">Organization</text>
        </g>

        {/* Department nodes (rectangular, draggable) */}
        {departments.map(dept => {
          const pos = nodePositions.get(dept.id);
          if (!pos) return null;
          const c = DEPT_COLORS[dept.colorIdx % DEPT_COLORS.length];
          const expanded = expandedDepts.has(dept.id);

          return (
            <g key={dept.id}>
              {/* Lines to people */}
              {expanded && dept.people.map((p, pi) => {
                const pPos = personPositions.get(p.id);
                if (!pPos) return null;
                return <line key={pi} x1={pos.x} y1={pos.y} x2={pPos.x} y2={pPos.y} stroke={c.border} strokeWidth={0.8} strokeDasharray="3 3" />;
              })}
              {/* Dept rect */}
              <g
                style={{ cursor: "grab" }}
                onPointerDown={e => handlePointerDown(e, dept.id)}
                onClick={() => toggleDept(dept.id)}
              >
                <rect x={pos.x - deptW / 2} y={pos.y - deptH / 2} width={deptW} height={deptH} rx={10} fill={SURFACE} stroke={c.dot} strokeWidth={1.5} filter="url(#nodeShadow)" />
                <circle cx={pos.x - deptW / 2 + 16} cy={pos.y - 4} r={4} fill={c.dot} />
                <text x={pos.x - deptW / 2 + 26} y={pos.y - 0} fill={TEXT} fontSize={11} fontWeight="600" fontFamily="'DM Sans',sans-serif">{dept.name}</text>
                <text x={pos.x - deptW / 2 + 16} y={pos.y + 14} fill={TEXT_MUTED} fontSize={9} fontFamily="'DM Sans',sans-serif">{dept.people.length} people</text>
              </g>
            </g>
          );
        })}

        {/* People nodes (rectangular, draggable) */}
        {departments.map(dept => {
          if (!expandedDepts.has(dept.id)) return null;
          const c = DEPT_COLORS[dept.colorIdx % DEPT_COLORS.length];
          return dept.people.map(p => {
            const pos = personPositions.get(p.id);
            if (!pos) return null;
            const isSel = selectedPersonId === p.id;
            const firstName = p.name.split(" ")[0];
            return (
              <g
                key={p.id}
                style={{ cursor: "grab" }}
                onPointerDown={e => handlePointerDown(e, p.id)}
                onClick={e => { e.stopPropagation(); onSelectPerson(p, dept); }}
              >
                <rect x={pos.x - personW / 2} y={pos.y - personH / 2} width={personW} height={personH} rx={8} fill={SURFACE} stroke={isSel ? ACCENT : c.dot} strokeWidth={isSel ? 2 : 1} filter="url(#nodeShadow)" style={{ transition: "stroke 0.2s, stroke-width 0.2s" }} />
                <text x={pos.x} y={pos.y - 3} textAnchor="middle" fill={TEXT} fontSize={10} fontWeight="500" fontFamily="'DM Sans',sans-serif">{firstName}</text>
                <text x={pos.x} y={pos.y + 10} textAnchor="middle" fill={TEXT_MUTED} fontSize={8} fontFamily="'DM Sans',sans-serif">{p.role.length > 16 ? p.role.slice(0, 14) + "…" : p.role}</text>
                {p.isHead && <rect x={pos.x + personW / 2 - 14} y={pos.y - personH / 2 - 4} width={8} height={8} rx={2} fill={ACCENT} />}
              </g>
            );
          });
        })}
      </svg>
      {!anyExpanded && departments.length > 0 && (
        <div style={{ position: "absolute", bottom: 32, left: "50%", transform: "translateX(-50%)", fontSize: 13, color: TEXT_MUTED, animation: "nxFadeIn 1s ease-out", whiteSpace: "nowrap" }}>Click a department to expand · Drag nodes to rearrange</div>
      )}
      {departments.length === 0 && (
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, animation: "nxFadeIn 0.6s ease-out" }}>
          <div style={{ fontSize: 64, color: TEXT_MUTED, opacity: 0.3 }}>◉</div>
          <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 22, fontWeight: 700, color: TEXT_DIM }}>Start building your organization</div>
          <div style={{ fontSize: 13, color: TEXT_MUTED, display: "flex", alignItems: "center", gap: 6 }}>Press <Kbd>⌘K</Kbd> to begin</div>
        </div>
      )}
    </div>
  );
};

// ─── Grid View ────────────────────────────────────────────────────────
interface GridProps { departments: Department[]; connections: Connection[]; onSelectPerson: (p: Person, d: Department) => void; selectedPersonId: string | null; onDeleteDept: (id: string) => void; }
const GridView = ({ departments, connections, onSelectPerson, selectedPersonId, onDeleteDept }: GridProps) => {
  const connCountMap = useMemo(() => {
    const m = new Map<string, number>();
    connections.forEach(c => { m.set(c.from, (m.get(c.from) || 0) + 1); m.set(c.to, (m.get(c.to) || 0) + 1); });
    return m;
  }, [connections]);

  if (departments.length === 0) return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, animation: "nxFadeIn 0.6s ease-out" }}>
      <div style={{ fontSize: 64, color: TEXT_MUTED, opacity: 0.3 }}>◉</div>
      <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 22, fontWeight: 700, color: TEXT_DIM }}>Start building your organization</div>
      <div style={{ fontSize: 13, color: TEXT_MUTED, display: "flex", alignItems: "center", gap: 6 }}>Press <Kbd>⌘K</Kbd> to begin</div>
    </div>
  );

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: 32, background: BG }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}>
        {departments.map(dept => {
          const c = DEPT_COLORS[dept.colorIdx % DEPT_COLORS.length];
          return (
            <div key={dept.id} style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: "hidden", transition: "border-color 0.15s, box-shadow 0.15s", animation: "nxFadeIn 0.3s ease-out", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }} onMouseEnter={e => { e.currentTarget.style.borderColor = c.dot; e.currentTarget.style.boxShadow = `0 4px 16px rgba(0,0,0,0.08)`; }} onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.06)"; }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "14px 16px", borderBottom: `1px solid ${BORDER}` }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: c.dot }} />
                <span style={{ fontSize: 14, fontWeight: 600, flex: 1 }}>{dept.name}</span>
                <span style={{ fontSize: 11, color: TEXT_MUTED, background: SURFACE_2, borderRadius: 6, padding: "2px 8px" }}>{dept.people.length}</span>
                <button onClick={() => onDeleteDept(dept.id)} style={{ background: "none", border: "none", cursor: "pointer", color: TEXT_MUTED, padding: 2, opacity: 0.3, transition: "opacity 0.15s" }} onMouseEnter={e => (e.currentTarget.style.opacity = "1")} onMouseLeave={e => (e.currentTarget.style.opacity = "0.3")}><Icon type="trash" size={13} /></button>
              </div>
              <div style={{ padding: "8px" }}>
                {dept.people.map(p => {
                  const initials = p.name.split(" ").map(n => n[0]).join("").slice(0, 2);
                  const cc = connCountMap.get(p.id) || 0;
                  return (
                    <div key={p.id} onClick={() => onSelectPerson(p, dept)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 8px", borderRadius: 10, cursor: "pointer", background: selectedPersonId === p.id ? ACCENT_DIM : "transparent", transition: "background 0.15s" }} onMouseEnter={e => { if (selectedPersonId !== p.id) e.currentTarget.style.background = SURFACE_2; }} onMouseLeave={e => { if (selectedPersonId !== p.id) e.currentTarget.style.background = "transparent"; }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: c.bg, border: `1.5px solid ${c.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600, color: c.dot, flexShrink: 0 }}>{initials}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
                          {p.name}
                          {p.isHead && <span style={{ fontSize: 9, fontWeight: 700, color: ACCENT, background: ACCENT_DIM, padding: "1px 5px", borderRadius: 4, letterSpacing: "0.05em" }}>HEAD</span>}
                        </div>
                        <div style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 1 }}>{p.role}</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
                          {p.tasks.slice(0, 3).map((t, i) => <span key={i} style={{ fontSize: 10, color: TEXT_DIM, background: SURFACE_2, borderRadius: 4, padding: "2px 6px" }}>{t}</span>)}
                          {p.tasks.length > 3 && <span style={{ fontSize: 10, color: TEXT_MUTED }}>+{p.tasks.length - 3}</span>}
                        </div>
                      </div>
                      {cc > 0 && <div style={{ fontSize: 10, color: TEXT_MUTED, display: "flex", alignItems: "center", gap: 3 }}><Icon type="link" size={10} />{cc}</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── Connections Bar ──────────────────────────────────────────────────
interface ConnBarProps { connections: Connection[]; departments: Department[]; onRemove: (idx: number) => void; }
const ConnectionsBar = ({ connections, departments, onRemove }: ConnBarProps) => {
  const personMap = useMemo(() => {
    const m = new Map<string, string>();
    departments.forEach(d => d.people.forEach(p => m.set(p.id, p.name)));
    return m;
  }, [departments]);
  if (connections.length === 0) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 24px", borderTop: `1px solid ${BORDER}`, background: SURFACE, overflowX: "auto", flexShrink: 0 }}>
      <span style={{ fontSize: 11, color: TEXT_MUTED, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", flexShrink: 0 }}>Paths</span>
      {connections.map((c, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", background: SURFACE_2, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 11, color: TEXT_DIM, flexShrink: 0 }}>
          <span>{personMap.get(c.from) || "?"}</span>
          <Icon type="arrow" size={10} color={ACCENT} />
          <span>{personMap.get(c.to) || "?"}</span>
          <span style={{ color: TEXT_MUTED, fontSize: 10 }}>({c.label})</span>
          <button onClick={() => onRemove(i)} style={{ background: "none", border: "none", cursor: "pointer", color: TEXT_MUTED, padding: 0, marginLeft: 2 }}><Icon type="x" size={10} /></button>
        </div>
      ))}
    </div>
  );
};

// ─── Root NexusApp ────────────────────────────────────────────────────
const NexusApp = () => {
  const [departments, setDepartments] = useState<Department[]>(SEED_DEPARTMENTS);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [modal, setModal] = useState<ModalConfig | null>(null);
  const [connPicker, setConnPicker] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [selectedDept, setSelectedDept] = useState<Department | null>(null);
  const [view, setView] = useState<ViewMode>("orbital");
  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set());
  const [nodePositions, setNodePositions] = useState<Map<string, { x: number; y: number }>>(new Map());

  // Compute initial positions for departments and people when they change
  useEffect(() => {
    setNodePositions(prev => {
      const next = new Map(prev);
      const cx = 420, cy = 320, baseR = 220;
      departments.forEach((d, i) => {
        if (!next.has(d.id)) {
          const angle = (i / Math.max(departments.length, 1)) * Math.PI * 2 - Math.PI / 2;
          next.set(d.id, { x: cx + Math.cos(angle) * baseR, y: cy + Math.sin(angle) * baseR });
        }
        // Initialize people positions relative to dept
        const deptPos = next.get(d.id)!;
        d.people.forEach((p, pi) => {
          if (!next.has(p.id)) {
            const spread = 0.4;
            const baseAngle = Math.atan2(deptPos.y - cy, deptPos.x - cx);
            const pAngle = baseAngle + (pi - (d.people.length - 1) / 2) * spread;
            next.set(p.id, { x: deptPos.x + Math.cos(pAngle) * 90, y: deptPos.y + Math.sin(pAngle) * 90 });
          }
        });
      });
      return next;
    });
  }, [departments]);

  const handleNodeDrag = useCallback((id: string, x: number, y: number) => {
    setNodePositions(prev => {
      const next = new Map(prev);
      next.set(id, { x, y });
      return next;
    });
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setCmdOpen(true); }
      if (e.key === "Escape") { setCmdOpen(false); setModal(null); setConnPicker(false); setSelectedPerson(null); setSelectedDept(null); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const totalPeople = useMemo(() => departments.reduce((a, d) => a + d.people.length, 0), [departments]);

  const toggleDept = useCallback((id: string) => setExpandedDepts(s => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; }), []);

  const onSelectPerson = useCallback((p: Person, d: Department) => {
    setSelectedPerson(p);
    setSelectedDept(d);
  }, []);

  const updatePerson = useCallback((deptId: string, personId: string, updates: Partial<Person>) => {
    setDepartments(ds => ds.map(d => d.id === deptId ? { ...d, people: d.people.map(p => p.id === personId ? { ...p, ...updates } : p) } : d));
    setSelectedPerson(p => p && p.id === personId ? { ...p, ...updates } : p);
  }, []);

  const deletePerson = useCallback((deptId: string, personId: string) => {
    setDepartments(ds => ds.map(d => d.id === deptId ? { ...d, people: d.people.filter(p => p.id !== personId) } : d));
    setConnections(cs => cs.filter(c => c.from !== personId && c.to !== personId));
  }, []);

  const deleteDept = useCallback((deptId: string) => {
    const dept = departments.find(d => d.id === deptId);
    if (!dept) return;
    const pids = new Set(dept.people.map(p => p.id));
    setDepartments(ds => ds.filter(d => d.id !== deptId));
    setConnections(cs => cs.filter(c => !pids.has(c.from) && !pids.has(c.to)));
    setExpandedDepts(s => { const n = new Set(s); n.delete(deptId); return n; });
    if (selectedDept?.id === deptId) { setSelectedPerson(null); setSelectedDept(null); }
  }, [departments, selectedDept]);

  const connCountForPerson = useMemo(() => {
    if (!selectedPerson) return 0;
    return connections.filter(c => c.from === selectedPerson.id || c.to === selectedPerson.id).length;
  }, [connections, selectedPerson]);

  const cmdActions: CmdAction[] = useMemo(() => {
    const acts: CmdAction[] = [
      {
        icon: "building", label: "New Department", desc: "Create a new department",
        action: () => setModal({
          title: "New Department",
          fields: [
            { key: "name", label: "Department Name", placeholder: "e.g. Marketing" },
            { key: "head", label: "Head Title", placeholder: "e.g. CMO" },
          ],
          onSave: (v) => {
            if (!v.name.trim()) return;
            setDepartments(ds => [...ds, { id: uid(), name: v.name.trim(), head: v.head.trim() || "Head", colorIdx: ds.length % DEPT_COLORS.length, people: [] }]);
          },
        }),
      },
      {
        icon: "link", label: "New Communication Path", desc: "Define a connection between two people",
        action: () => setConnPicker(true),
      },
    ];
    departments.forEach(d => {
      acts.push({
        icon: "user", label: `Add Person to ${d.name}`, desc: `Add a team member to the ${d.name} department`,
        action: () => setModal({
          title: `Add Person to ${d.name}`,
          fields: [
            { key: "name", label: "Full Name", placeholder: "e.g. Jane Smith" },
            { key: "role", label: "Role / Title", placeholder: "e.g. Senior Designer" },
            { key: "tasks", label: "Tasks", type: "textarea", placeholder: "Comma-separated: Design systems, User research" },
          ],
          onSave: (v) => {
            if (!v.name.trim()) return;
            const tasks = (v.tasks || "").split(",").map(t => t.trim()).filter(Boolean);
            setDepartments(ds => ds.map(dep => dep.id === d.id ? { ...dep, people: [...dep.people, { id: uid(), name: v.name.trim(), role: v.role.trim() || "Member", tasks, isHead: dep.people.length === 0 }] } : dep));
          },
        }),
      });
    });
    return acts;
  }, [departments]);

  return (
    <div className="nexus-root" style={{ width: "100%", height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <GlobalStyles />
      <TopBar totalDepts={departments.length} totalPeople={totalPeople} totalConns={connections.length} view={view} setView={setView} onCreateClick={() => setCmdOpen(true)} />
      {view === "orbital" ? (
        <OrbitalView departments={departments} connections={connections} expandedDepts={expandedDepts} toggleDept={toggleDept} onSelectPerson={onSelectPerson} selectedPersonId={selectedPerson?.id || null} nodePositions={nodePositions} onNodeDrag={handleNodeDrag} />
      ) : (
        <GridView departments={departments} connections={connections} onSelectPerson={onSelectPerson} selectedPersonId={selectedPerson?.id || null} onDeleteDept={deleteDept} />
      )}
      <ConnectionsBar connections={connections} departments={departments} onRemove={i => setConnections(cs => cs.filter((_, idx) => idx !== i))} />
      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} actions={cmdActions} />
      <InlineModal config={modal} onClose={() => setModal(null)} />
      <ConnectionPicker open={connPicker} onClose={() => setConnPicker(false)} departments={departments} onSave={(f, t, l) => setConnections(cs => [...cs, { from: f, to: t, label: l }])} />
      <PersonPanel person={selectedPerson} dept={selectedDept} onClose={() => { setSelectedPerson(null); setSelectedDept(null); }} onUpdate={updatePerson} onDelete={deletePerson} connCount={connCountForPerson} />
    </div>
  );
};

export default NexusApp;
