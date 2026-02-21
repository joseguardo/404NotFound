import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Department, Person, Connection } from "../types";
import { DepartmentCard } from "./DepartmentCard";

interface GridViewProps {
  departments: Department[];
  connections: Connection[];
  selectedPersonId: string | null;
  onSelectPerson: (person: Person, dept: Department) => void;
  onDeleteDepartment: (id: string) => void;
  onOpenCommandPalette: () => void;
}

export function GridView({
  departments,
  connections,
  selectedPersonId,
  onSelectPerson,
  onDeleteDepartment,
  onOpenCommandPalette,
}: GridViewProps) {
  if (departments.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 animate-in fade-in duration-500">
        <div className="text-6xl text-muted-foreground/30">◉</div>
        <h2 className="text-xl font-bold text-muted-foreground">
          Start building your organization
        </h2>
        <p className="text-sm text-muted-foreground flex items-center gap-2">
          Press{" "}
          <kbd className="px-2 py-1 text-xs bg-muted border rounded">⌘K</kbd>{" "}
          to begin
        </p>
        <Button
          onClick={onOpenCommandPalette}
          className="mt-2"
          aria-label="Create new department"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Department
        </Button>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-background">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {departments.map((dept) => (
          <DepartmentCard
            key={dept.id}
            department={dept}
            connections={connections}
            selectedPersonId={selectedPersonId}
            onSelectPerson={onSelectPerson}
            onDelete={() => onDeleteDepartment(dept.id)}
          />
        ))}
      </div>
    </div>
  );
}
