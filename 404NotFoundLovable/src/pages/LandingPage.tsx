import { Hero } from "@/components/landing/Hero";
import { ValueProps } from "@/components/landing/ValueProps";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Hero />
      <ValueProps />

      <footer className="py-8 px-6 text-center text-muted-foreground text-sm border-t border-border/50">
        <p>
          Built for teams who value their time.{" "}
          <span className="text-primary">Nexus</span>
        </p>
      </footer>
    </div>
  );
}
