import { motion } from 'motion/react';
import { User, Users, Briefcase, Palette, Globe, Monitor, Building2, UserCircle, Crown } from 'lucide-react';

interface CompanyGraphProps {
  activeTaskId: string | null;
  className?: string;
}

export default function CompanyGraph({ activeTaskId, className = '' }: CompanyGraphProps) {
  // Node definitions with hierarchical positions
  // Structure based on user sketch:
  // CEO (Top)
  //  -> Manager (Left) -> You -> Client
  //                    -> Team
  //  -> PO (Mid) -> Internal
  //  -> Design Lead (Right) -> Sarah
  
  const nodes = [
    // Level 0
    { id: 'ceo', label: 'CEO', icon: Crown, x: 150, y: 40, color: 'bg-stone-800 text-white' },
    
    // Level 1
    { id: 'manager', label: 'Manager', icon: Briefcase, x: 75, y: 110, color: 'bg-stone-100 text-stone-600' },
    { id: 'po', label: 'Product Owner', icon: Briefcase, x: 150, y: 110, color: 'bg-amber-100 text-amber-600' },
    { id: 'design_lead', label: 'Design Lead', icon: Palette, x: 225, y: 110, color: 'bg-purple-50 text-purple-400' },
    
    // Level 2
    { id: 'user', label: 'You', icon: UserCircle, x: 50, y: 180, color: 'bg-stone-900 text-white' },
    { id: 'team', label: 'Team', icon: Users, x: 100, y: 180, color: 'bg-blue-100 text-blue-600' },
    { id: 'internal', label: 'Internal', icon: Globe, x: 150, y: 180, color: 'bg-orange-100 text-orange-600' },
    { id: 'sarah', label: 'Sarah', icon: Palette, x: 225, y: 180, color: 'bg-purple-100 text-purple-600' },
    
    // Level 3
    { id: 'client', label: 'Client A', icon: Building2, x: 50, y: 250, color: 'bg-emerald-100 text-emerald-600' },
  ];

  // Define connections (edges) representing the hierarchy
  const edges = [
    { from: 'ceo', to: 'manager' },
    { from: 'ceo', to: 'po' },
    { from: 'ceo', to: 'design_lead' },
    { from: 'manager', to: 'user' },
    { from: 'manager', to: 'team' },
    { from: 'po', to: 'internal' },
    { from: 'design_lead', to: 'sarah' },
    { from: 'user', to: 'client' },
  ];

  // Map tasks to active paths (traversing the tree)
  const getActivePath = (taskId: string | null) => {
    if (!taskId) return ['user']; // Default highlight user

    switch (taskId) {
      case '1': // Email Team: You -> Manager -> Team
        return ['user', 'manager', 'team'];
      case '2': // Calendar Client: You -> Client
        return ['user', 'client'];
      case '3': // Call PO: You -> Manager -> CEO -> PO
        return ['user', 'manager', 'ceo', 'po'];
      case '4': // Email Sarah: You -> Manager -> CEO -> Design Lead -> Sarah
        return ['user', 'manager', 'ceo', 'design_lead', 'sarah'];
      case '5': // Research Internal: You -> Manager -> CEO -> PO -> Internal
        return ['user', 'manager', 'ceo', 'po', 'internal'];
      case '6': // Block Focus Time: Just You
        return ['user'];
      default:
        return ['user'];
    }
  };

  const activeNodes = getActivePath(activeTaskId);

  return (
    <div className={`bg-white/90 backdrop-blur-md rounded-2xl shadow-xl border border-stone-200 relative overflow-hidden ${className}`}>
      <div className="absolute top-4 left-4 z-10">
        <h4 className="text-xs font-bold text-stone-400 uppercase tracking-wider">Org Chart</h4>
      </div>
      
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
        {edges.map((edge, i) => {
          const fromNode = nodes.find(n => n.id === edge.from)!;
          const toNode = nodes.find(n => n.id === edge.to)!;
          
          // An edge is active if BOTH connected nodes are in the active path
          // AND they are adjacent in the path logic (simplified here by just checking inclusion)
          // For a tree, checking inclusion of both endpoints is usually sufficient if the path is simple.
          const isActive = activeNodes.includes(edge.from) && activeNodes.includes(edge.to);

          return (
            <g key={i}>
              <motion.line
                x1={fromNode.x}
                y1={fromNode.y}
                x2={toNode.x}
                y2={toNode.y}
                stroke={isActive ? '#10b981' : '#e7e5e4'}
                strokeWidth={isActive ? 2 : 1}
                strokeDasharray={isActive ? "0" : "4 4"}
                animate={{
                  stroke: isActive ? '#10b981' : '#e7e5e4',
                  strokeWidth: isActive ? 2 : 1,
                }}
              />
              {isActive && (
                 <motion.circle
                   r="3"
                   fill="#10b981"
                   initial={{ cx: fromNode.x, cy: fromNode.y }}
                   animate={{ cx: toNode.x, cy: toNode.y }}
                   transition={{ 
                     duration: 1.5, 
                     repeat: Infinity, 
                     ease: "linear"
                   }}
                 />
              )}
            </g>
          );
        })}
      </svg>

      {nodes.map((node) => {
        const isActive = activeNodes.includes(node.id);
        const isUser = node.id === 'user';

        return (
          <motion.div
            key={node.id}
            className={`absolute w-8 h-8 -ml-4 -mt-4 rounded-full flex items-center justify-center shadow-md border-2 transition-all duration-300 z-10
              ${isActive ? 'border-emerald-500 scale-110 ring-2 ring-emerald-100' : 'border-white scale-100'}
              ${node.color}
            `}
            style={{ left: node.x, top: node.y }}
          >
            <node.icon size={14} />
            
            <motion.div 
              className={`absolute -bottom-5 whitespace-nowrap text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-white/90 border border-stone-100 text-stone-600 shadow-sm
                ${isActive || isUser ? 'opacity-100' : 'opacity-0'}
              `}
              animate={{ opacity: isActive || isUser ? 1 : 0 }}
            >
              {node.label}
            </motion.div>
          </motion.div>
        );
      })}
    </div>
  );
}
