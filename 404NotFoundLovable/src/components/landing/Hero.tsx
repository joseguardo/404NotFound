import { Button } from "@/components/ui/button";
import { ArrowRight, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function Hero() {
  const navigate = useNavigate();

  const handleCreateNew = () => {
    localStorage.removeItem("nexus-state");
    navigate("/app");
  };

  const handleExploreDemo = () => {
    navigate("/app");
  };

  return (
    <section className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <div className="max-w-4xl mx-auto space-y-10 animate-fade-in">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded border border-primary/30 bg-primary/5 text-primary text-xs font-medium uppercase tracking-widest mb-4">
          <Zap className="w-3.5 h-3.5" />
          <span>Organizational clarity, redefined</span>
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-foreground leading-tight">
          No more wasting time on{" "}
          <span className="text-primary neon-text">useless meetings</span>
        </h1>

        <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed font-light">
          Nexus streamlines decisions so you can focus only on what truly concerns you.
          <br />
          <span className="text-foreground/80">Clear hierarchies. Direct communication. Zero noise.</span>
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6">
          <Button
            variant="neon"
            size="lg"
            onClick={handleCreateNew}
            className="uppercase tracking-wider"
          >
            Create Your Structure
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>

          <Button
            variant="outline"
            size="lg"
            onClick={handleExploreDemo}
            className="uppercase tracking-wider"
          >
            Explore Demo
          </Button>
        </div>

        {/* Technical decoration */}
        <div className="pt-12 flex items-center justify-center gap-8 text-xs text-muted-foreground font-mono uppercase tracking-wider">
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            System Online
          </span>
          <span className="hidden sm:inline">|</span>
          <span className="hidden sm:inline">v1.0.0</span>
        </div>
      </div>
    </section>
  );
}
