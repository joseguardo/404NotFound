import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, Clock, MapPin } from 'lucide-react';

// --- Types ---

type Category = 'food' | 'venue' | 'tech' | 'marketing' | 'budget';

interface Meeting {
  id: string;
  title: string;
  timestamp: Date;
  category: Category;
  x: number; // Percentage 0-100
  y: number; // Pixel offset
  dependencies: string[]; // IDs of meetings this depends on
}

interface ProjectColor {
  id: Category;
  color: string;
  label: string;
  twColor: string; // Tailwind class for text/border
  hex: string;
}

// --- Constants & Data Generation ---

const PROJECTS: ProjectColor[] = [
  { id: 'food', color: 'bg-red-500', label: 'Food & Bev', twColor: 'text-red-600', hex: '#ef4444' },
  { id: 'venue', color: 'bg-green-500', label: 'Venue Ops', twColor: 'text-green-600', hex: '#22c55e' },
  { id: 'tech', color: 'bg-blue-500', label: 'Tech Stack', twColor: 'text-blue-600', hex: '#3b82f6' },
  { id: 'marketing', color: 'bg-yellow-500', label: 'Marketing', twColor: 'text-yellow-600', hex: '#eab308' },
  { id: 'budget', color: 'bg-purple-500', label: 'Budget & Finance', twColor: 'text-purple-600', hex: '#a855f7' },
];

const TITLES = {
  food: ['Catering Sync', 'Snack Selection', 'Pizza Order Finalization', 'Coffee Vendor Call', 'Dietary Restrictions Check', 'Midnight Snack Plan', 'Breakfast Bagels Run', 'Water Station Setup'],
  venue: ['Room Layout', 'Chair Arrangement', 'Stage Setup', 'Lighting Check', 'Security Briefing', 'Registration Desk Prep', 'Signage Placement', 'Cleanup Crew Sync'],
  tech: ['Wifi Stress Test', 'Server Deployment', 'API Key Gen', 'Projector Test', 'Live Stream Setup', 'Discord Server Rules', 'Submission Portal Test', 'Hardware Lab Setup'],
  marketing: ['Social Blast', 'Email Newsletter', 'Sponsor Shoutout', 'Swag Design', 'T-Shirt Printing', 'Sticker Order', 'Press Release', 'Photography Brief'],
  budget: ['Sponsor Funds Received', 'Venue Deposit', 'Catering Payment', 'Swag Invoice', 'Emergency Fund Allocation', 'Prize Money Transfer', 'Travel Reimbursements', 'Final Budget Review'],
};

const generateMeetings = (count: number): Meeting[] => {
  const meetings: Meeting[] = [];
  const startDate = new Date();
  startDate.setHours(9, 0, 0, 0);

  // 1. Generate basic meetings
  for (let i = 0; i < count; i++) {
    const category = PROJECTS[Math.floor(Math.random() * PROJECTS.length)].id;
    const titles = TITLES[category];
    const title = titles[Math.floor(Math.random() * titles.length)];

    // Random time in the next 14 days
    const timeOffset = Math.random() * 14 * 24 * 60 * 60 * 1000;
    const timestamp = new Date(startDate.getTime() + timeOffset);

    meetings.push({
      id: `m-${i}`,
      title,
      timestamp,
      category,
      x: 0,
      y: 0,
      dependencies: []
    });
  }

  // 2. Sort by time
  meetings.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  // 3. Assign positions (More compact horizontally, more spaced vertically)
  let currentY = 100;
  meetings.forEach((m) => {
    m.y = currentY;
    // Compact X: Range 30% to 70% (40% spread) - was 25-75%
    // This centers the flow more tightly
    m.x = 30 + Math.random() * 40;
    currentY += 120 + Math.random() * 60; // Increased vertical spacing
  });

  // 4. Generate Dependencies
  // Iterate and create links to previous meetings
  meetings.forEach((m, i) => {
    if (i === 0) return;

    // 60% chance to have a dependency
    if (Math.random() > 0.4) {
      // Look at previous meetings
      const potentialParents = meetings.slice(Math.max(0, i - 10), i);

      if (potentialParents.length > 0) {
        // 1. Same category dependency (Linear flow) - High chance
        const sameCategory = potentialParents.filter(p => p.category === m.category);
        if (sameCategory.length > 0 && Math.random() > 0.2) {
          // Link to the most recent same-category meeting
          m.dependencies.push(sameCategory[sameCategory.length - 1].id);
        }

        // 2. Cross-category dependency - Lower chance
        // "food and budget team can come to something that affect the next food meeting"
        if (Math.random() > 0.7) {
          const differentCategory = potentialParents.filter(p => p.category !== m.category);
          if (differentCategory.length > 0) {
             const randomParent = differentCategory[Math.floor(Math.random() * differentCategory.length)];
             // Avoid duplicates
             if (!m.dependencies.includes(randomParent.id)) {
               m.dependencies.push(randomParent.id);
             }
          }
        }

        // 3. Multiple dependencies (Two meetings link to next one)
        if (m.dependencies.length === 1 && Math.random() > 0.8) {
           const anyParent = potentialParents[Math.floor(Math.random() * potentialParents.length)];
           if (!m.dependencies.includes(anyParent.id)) {
             m.dependencies.push(anyParent.id);
           }
        }
      }
    }
  });

  return meetings;
};

// --- Components ---

const Arrow: React.FC<{ start: { x: number; y: number }; end: { x: number; y: number }; color: string }> = ({ start, end, color }) => {
  // Calculate control points for a smooth Bezier curve
  const midY = (start.y + end.y) / 2;

  // If elements are far apart horizontally, curve more
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
      markerEnd={`url(#arrowhead-${color.replace('#', '')})`}
    />
  );
};

export default function App() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [activeCategory, setActiveCategory] = useState<Category | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerDimensions, setContainerDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const data = generateMeetings(40);
    setMeetings(data);

    // Set initial container height based on generated data
    const lastMeeting = data[data.length - 1];
    const height = lastMeeting ? lastMeeting.y + 200 : 2000;

    if (containerRef.current) {
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          setContainerDimensions({
            width: entry.contentRect.width,
            height: height
          });
        }
      });

      resizeObserver.observe(containerRef.current);
      return () => resizeObserver.disconnect();
    }
  }, []);

  const handleCategoryClick = (id: Category) => {
    setActiveCategory(prev => prev === id ? null : id);
  };

  // Filter meetings for connections
  // When a category is active, we want to show:
  // 1. All meetings of that category
  // 2. Any meetings that are DEPENDENCIES of those meetings (even if different category)
  // 3. Any meetings that DEPEND ON those meetings (optional, but good for context? Let's stick to upstream dependencies for now as per "food and budget... affect next food")
  const { visibleMeetings, arrows } = useMemo(() => {
    if (!activeCategory) return { visibleMeetings: [], arrows: [] };

    const activeCatMeetings = meetings.filter(m => m.category === activeCategory);
    const dependencyIds = new Set<string>();
    const arrowConnections: { start: string, end: string }[] = [];

    activeCatMeetings.forEach(m => {
      m.dependencies.forEach(depId => {
        dependencyIds.add(depId);
        arrowConnections.push({ start: depId, end: m.id });
      });
    });

    // Also include the active category meetings themselves in the visible set
    const visibleSet = new Set([...activeCatMeetings.map(m => m.id), ...Array.from(dependencyIds)]);

    return {
      visibleMeetings: meetings.filter(m => visibleSet.has(m.id)),
      arrows: arrowConnections
    };
  }, [meetings, activeCategory]);

  const activeProjectColor = PROJECTS.find(p => p.id === activeCategory);

  return (
    <div className="min-h-screen bg-stone-200 font-sans text-stone-800 overflow-x-hidden">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-stone-100/80 backdrop-blur-md border-b border-stone-200 px-6 py-4 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-stone-900">Hackathon Prep Timeline</h1>
          <p className="text-sm text-stone-500">Project Waterfall View</p>
        </div>
        <div className="text-xs font-mono text-stone-400">
          {meetings.length} Events Logged
        </div>
      </header>

      {/* Main Timeline Canvas */}
      <main
        ref={containerRef}
        className="relative w-full max-w-5xl mx-auto mt-24 mb-32 transition-all duration-500"
        style={{ height: containerDimensions.height }}
      >
        {/* SVG Layer for Arrows */}
        <svg
          className="absolute top-0 left-0 w-full h-full pointer-events-none z-10"
          style={{ height: containerDimensions.height }}
        >
          <defs>
            {PROJECTS.map(p => (
              <marker
                key={p.id}
                id={`arrowhead-${p.hex.replace('#', '')}`}
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
            {activeCategory && arrows.map((arrow) => {
              const startMeeting = meetings.find(m => m.id === arrow.start);
              const endMeeting = meetings.find(m => m.id === arrow.end);

              if (!startMeeting || !endMeeting) return null;

              // Calculate positions
              const startX = (startMeeting.x / 100) * containerDimensions.width + 96;
              const startY = startMeeting.y + 80;

              const endX = (endMeeting.x / 100) * containerDimensions.width + 96;
              const endY = endMeeting.y;

              // Use the color of the TARGET meeting for the arrow, or the active category color?
              // Usually flow arrows match the flow. Let's use the active category color.
              return (
                <Arrow
                  key={`${arrow.start}-${arrow.end}`}
                  start={{ x: startX, y: startY }}
                  end={{ x: endX, y: endY }}
                  color={activeProjectColor?.hex || '#000'}
                />
              );
            })}
          </AnimatePresence>
        </svg>

        {/* Vertical Line Guide (Optional aesthetic) */}
        <div className="absolute top-0 bottom-0 left-1/2 w-px bg-stone-300 -translate-x-1/2 z-0 opacity-50" />

        {/* Meeting Cards */}
        {meetings.map((meeting) => {
          // A meeting is "Active" if it belongs to the active category
          // A meeting is "Related" if it is in the visible set but NOT the active category (i.e. it's a dependency)
          const isCategoryMatch = activeCategory === meeting.category;
          const isVisible = !activeCategory || visibleMeetings.some(vm => vm.id === meeting.id);

          // If activeCategory is null, everyone is visible (not dimmed)
          // If activeCategory is set:
          //   - Match: Fully opaque, highlighted
          //   - Dependency: Visible, but maybe slightly different style?
          //   - Others: Dimmed

          const isDimmed = activeCategory && !isVisible;
          const isDependency = activeCategory && isVisible && !isCategoryMatch;

          const project = PROJECTS.find(p => p.id === meeting.category);

          return (
            <motion.div
              key={meeting.id}
              className={`absolute w-48 p-3 rounded-lg border shadow-sm transition-all duration-300 cursor-pointer z-20
                ${isDimmed ? 'opacity-10 grayscale scale-90 bg-stone-200 border-stone-200' : ''}
                ${isCategoryMatch ? `!bg-white ring-2 ring-offset-2 ring-${project?.color.replace('bg-', '')} !border-transparent !opacity-100 scale-105 z-30` : ''}
                ${isDependency ? 'bg-stone-50 border-stone-400 opacity-80 z-25' : ''}
                ${!activeCategory ? 'bg-stone-100 border-stone-300 hover:bg-white hover:shadow-md hover:-translate-y-1' : ''}
              `}
              style={{
                left: `${meeting.x}%`,
                top: meeting.y,
              }}
              initial={{ opacity: 0, y: 20 }}
              animate={{
                opacity: isDimmed ? 0.1 : (isDependency ? 0.8 : 1),
                y: 0,
                scale: isCategoryMatch ? 1.05 : (isDimmed ? 0.9 : 1)
              }}
              whileHover={{ scale: isCategoryMatch ? 1.05 : (isDimmed ? 0.9 : 1.05), zIndex: 40 }}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className={`w-2 h-2 rounded-full ${isCategoryMatch || !activeCategory ? project?.color : 'bg-stone-400'}`} />
                <span className={`text-[10px] uppercase tracking-wider font-semibold ${isCategoryMatch || !activeCategory ? project?.twColor : 'text-stone-500'}`}>
                  {project?.label}
                </span>
              </div>
              <h3 className={`text-xs font-medium leading-tight mb-2 ${isCategoryMatch || !activeCategory ? 'text-stone-900' : 'text-stone-600'}`}>
                {meeting.title}
              </h3>
              <div className="flex items-center gap-1 text-[10px] text-stone-400 font-mono">
                <Clock size={10} />
                <span>
                  {meeting.timestamp.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  {' '}
                  {meeting.timestamp.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </motion.div>
          );
        })}
      </main>

      {/* Floating Controls */}
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
                className={`group relative w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200
                  ${activeCategory === project.id ? 'scale-110 ring-2 ring-offset-2 ring-stone-300' : 'hover:scale-110'}
                  ${activeCategory && activeCategory !== project.id ? 'opacity-40' : 'opacity-100'}
                `}
                title={project.label}
              >
                <div className={`w-full h-full rounded-full ${project.color} opacity-20 group-hover:opacity-30 transition-opacity absolute inset-0`} />
                <div className={`w-4 h-4 rounded-full ${project.color} shadow-sm`} />

                {/* Tooltip */}
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
