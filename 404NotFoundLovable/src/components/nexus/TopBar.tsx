import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Separator } from "@/components/ui/separator";
import { Plus, Orbit, LayoutGrid, Building2, Users, Link2 } from "lucide-react";
import { ViewMode } from "./types";

interface TopBarProps {
  totalDepts: number;
  totalPeople: number;
  totalConns: number;
  view: ViewMode;
  onViewChange: (view: ViewMode) => void;
  onCreateClick: () => void;
}

export function TopBar({
  totalDepts,
  totalPeople,
  totalConns,
  view,
  onViewChange,
  onCreateClick,
}: TopBarProps) {
  return (
    <header className="flex items-center justify-between px-6 py-3 border-b bg-card shrink-0">
      {/* Left side - Logo and stats */}
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-bold tracking-tight">Nexus</h1>

        <Separator orientation="vertical" className="h-6" />

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5" />
            <span>
              {totalDepts} dept{totalDepts !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            <span>{totalPeople} people</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Link2 className="h-3.5 w-3.5" />
            <span>
              {totalConns} path{totalConns !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
      </div>

      {/* Right side - View toggle and create button */}
      <div className="flex items-center gap-3">
        <ToggleGroup
          type="single"
          value={view}
          onValueChange={(value) => value && onViewChange(value as ViewMode)}
          aria-label="View mode"
        >
          <ToggleGroupItem
            value="orbital"
            aria-label="Orbital view"
            className="gap-1.5"
          >
            <Orbit className="h-4 w-4" />
            <span className="hidden sm:inline">Orbital</span>
          </ToggleGroupItem>
          <ToggleGroupItem
            value="grid"
            aria-label="Grid view"
            className="gap-1.5"
          >
            <LayoutGrid className="h-4 w-4" />
            <span className="hidden sm:inline">Grid</span>
          </ToggleGroupItem>
        </ToggleGroup>

        <Button
          onClick={onCreateClick}
          className="gap-2"
          aria-label="Open command palette to create"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Create</span>
          <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground ml-1">
            ⌘K
          </kbd>
        </Button>
      </div>
    </header>
  );
}
