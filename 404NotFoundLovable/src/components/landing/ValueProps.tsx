import { Orbit, Link2, Plus } from "lucide-react";

const values = [
  {
    icon: Orbit,
    title: "Visual Clarity",
    description:
      "See your entire organization at a glance with orbital and grid views. Understand hierarchies instantly.",
    number: "01",
  },
  {
    icon: Link2,
    title: "Smart Connections",
    description:
      "Define who needs to talk to whom. No more 'reply-all' culture. Communication paths that make sense.",
    number: "02",
  },
  {
    icon: Plus,
    title: "Start Fresh",
    description:
      "Build your company structure from zero or iterate on existing teams. Complete flexibility, no constraints.",
    number: "03",
  },
];

export function ValueProps() {
  return (
    <section className="py-24 px-6 border-t border-border">
      <div className="max-w-6xl mx-auto">
        <p className="text-xs font-mono uppercase tracking-widest text-primary mb-4 text-center">
          // Features
        </p>
        <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4 uppercase tracking-wide">
          Why teams choose <span className="text-primary">Nexus</span>
        </h2>
        <p className="text-muted-foreground text-center text-base mb-16 max-w-2xl mx-auto font-light">
          Stop drowning in organizational chaos. Start making decisions that matter.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {values.map((value, index) => (
            <div
              key={index}
              className="group flex flex-col p-6 rounded bg-card border border-border hover:border-primary/50 transition-all duration-300"
            >
              <div className="flex items-start justify-between mb-6">
                <div className="w-12 h-12 rounded border border-border bg-secondary flex items-center justify-center group-hover:border-primary/50 group-hover:bg-primary/5 transition-colors">
                  <value.icon className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <span className="font-mono text-xs text-muted-foreground">{value.number}</span>
              </div>
              <h3 className="text-lg font-semibold mb-2 uppercase tracking-wide">{value.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed font-light">
                {value.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
