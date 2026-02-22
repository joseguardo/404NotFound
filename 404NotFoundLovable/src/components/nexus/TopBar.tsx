import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Orbit,
  LayoutGrid,
  Building2,
  Users,
  Link2,
  GitBranch,
  ArrowLeft,
  Save,
  Loader2,
  Sun,
  Moon,
  ChevronDown,
  Upload,
} from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { ViewMode } from "./types";

interface TopBarProps {
  totalDepts: number;
  totalPeople: number;
  totalConns: number;
  view: ViewMode;
  onViewChange: (view: ViewMode) => void;
  onCreateClick: () => void;
  onUploadClick: () => void;
  onOverviewClick: () => void;
  companyName?: string;
  onBack?: () => void;
  onSave?: () => void;
  isSaving?: boolean;
}

export function TopBar({
  totalDepts,
  totalPeople,
  totalConns,
  view,
  onViewChange,
  onCreateClick,
  onUploadClick,
  onOverviewClick,
  companyName,
  onBack,
  onSave,
  isSaving = false,
}: TopBarProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="flex items-center justify-between px-6 py-3 border-b border-border bg-card/95 backdrop-blur-sm shrink-0">
      {/* Left side - Back, Company Name, and stats */}
      <div className="flex items-center gap-4">
        {onBack && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back</span>
          </Button>
        )}

        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <h1 className="text-base font-semibold tracking-widest uppercase text-primary">
            {companyName || "Nexus"}
          </h1>
        </div>

        <Separator orientation="vertical" className="h-4" />

        <div className="flex items-center gap-4 text-xs text-muted-foreground font-mono">
          <div className="flex items-center gap-1.5">
            <Building2 className="h-3 w-3" />
            <span>
              {totalDepts} <span className="hidden sm:inline">dept{totalDepts !== 1 ? "s" : ""}</span>
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users className="h-3 w-3" />
            <span>
              {totalPeople} <span className="hidden sm:inline">people</span>
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Link2 className="h-3 w-3" />
            <span>
              {totalConns} <span className="hidden sm:inline">path{totalConns !== 1 ? "s" : ""}</span>
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
          className="border border-border rounded p-0.5"
        >
          <ToggleGroupItem
            value="hierarchy"
            aria-label="Hierarchy view"
            className="gap-1.5 rounded-sm text-xs data-[state=on]:bg-primary/10 data-[state=on]:text-primary"
          >
            <GitBranch className="h-3.5 w-3.5" />
            <span className="hidden sm:inline uppercase tracking-wide">Hierarchy</span>
          </ToggleGroupItem>
          <ToggleGroupItem
            value="grid"
            aria-label="Grid view"
            className="gap-1.5 rounded-sm text-xs data-[state=on]:bg-primary/10 data-[state=on]:text-primary"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            <span className="hidden sm:inline uppercase tracking-wide">Grid</span>
          </ToggleGroupItem>
          <ToggleGroupItem
            value="orbital"
            aria-label="Orbital view"
            className="gap-1.5 rounded-sm text-xs data-[state=on]:bg-primary/10 data-[state=on]:text-primary"
          >
            <Orbit className="h-3.5 w-3.5" />
            <span className="hidden sm:inline uppercase tracking-wide">Orbital</span>
          </ToggleGroupItem>
        </ToggleGroup>

        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="text-muted-foreground hover:text-foreground"
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {theme === "dark" ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" aria-label="Meeting menu">
              <span className="uppercase tracking-wide">Meeting</span>
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-40">
            <DropdownMenuItem onClick={onUploadClick} className="gap-2">
              <span>Upload</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onOverviewClick}>Overview</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="neon"
          onClick={onCreateClick}
          className="gap-1.5 uppercase tracking-wider text-xs"
          aria-label="Open command palette to create"
        >
          <Plus className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Create</span>
          <kbd className="hidden sm:inline-flex h-4 items-center gap-1 rounded border border-primary-foreground/20 bg-primary-foreground/10 px-1 font-mono text-[9px] font-medium text-primary-foreground/80 ml-0.5">
            ⌘K
          </kbd>
        </Button>

        {onSave && (
          <Button
            onClick={onSave}
            disabled={isSaving}
            className="gap-1.5 bg-miro-green hover:bg-miro-green/90 text-white uppercase tracking-wider text-xs"
          >
            {isSaving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            <span className="hidden sm:inline">{isSaving ? "Saving..." : "Save"}</span>
          </Button>
        )}
      </div>
    </header>
  );
}
