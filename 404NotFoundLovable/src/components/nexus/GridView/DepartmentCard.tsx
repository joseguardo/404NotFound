import { useMemo } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Department, Person, Connection, DEPT_COLORS } from "../types";

interface DepartmentCardProps {
  department: Department;
  connections: Connection[];
  selectedPersonId: string | null;
  onSelectPerson: (person: Person, dept: Department) => void;
  onDelete: () => void;
}

export function DepartmentCard({
  department,
  connections,
  selectedPersonId,
  onSelectPerson,
  onDelete,
}: DepartmentCardProps) {
  const color = DEPT_COLORS[department.colorIdx % DEPT_COLORS.length];

  const connCountMap = useMemo(() => {
    const m = new Map<string, number>();
    connections.forEach((c) => {
      m.set(c.from, (m.get(c.from) || 0) + 1);
      m.set(c.to, (m.get(c.to) || 0) + 1);
    });
    return m;
  }, [connections]);

  return (
    <Card
      className="group transition-all duration-300 hover:border-primary/50 rounded border shadow-tech hover:shadow-tech-md bg-card"
      style={{
        borderColor: color.border,
      }}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <div
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: color.dot }}
          />
          <h3 className="font-medium text-sm uppercase tracking-wide">{department.name}</h3>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="secondary"
            className="text-[10px] font-mono rounded px-1.5 py-0.5"
          >
            {department.people.length}
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={onDelete}
            aria-label={`Delete ${department.name} department`}
          >
            <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-2">
        {department.people.map((person) => {
          const initials = person.name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .slice(0, 2);
          const connCount = connCountMap.get(person.id) || 0;
          const isSelected = selectedPersonId === person.id;

          return (
            <button
              key={person.id}
              onClick={() => onSelectPerson(person, department)}
              className={cn(
                "flex w-full items-center gap-3 rounded p-2.5 text-left transition-all duration-200",
                isSelected
                  ? "bg-primary/10 border border-primary/30"
                  : "hover:bg-secondary border border-transparent"
              )}
              aria-label={`View ${person.name}'s profile`}
              aria-pressed={isSelected}
            >
              {/* Avatar */}
              <div
                className="flex h-8 w-8 items-center justify-center rounded text-[10px] font-mono font-medium shrink-0 border"
                style={{
                  borderColor: color.dot,
                  color: color.dot,
                }}
              >
                {initials}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm truncate">
                    {person.name}
                  </span>
                  {person.isHead && (
                    <Badge
                      variant="outline"
                      className="text-[10px] px-1 py-0 h-4 shrink-0 font-mono border-primary text-primary"
                    >
                      HEAD
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground truncate font-light">
                  {person.role}
                </div>

                {/* Tasks preview */}
                {person.tasks.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {person.tasks.slice(0, 2).map((task, i) => (
                      <span
                        key={i}
                        className="inline-block text-[10px] bg-secondary text-muted-foreground px-1.5 py-0.5 rounded font-mono"
                      >
                        {task}
                      </span>
                    ))}
                    {person.tasks.length > 2 && (
                      <span className="text-[10px] text-muted-foreground font-mono">
                        +{person.tasks.length - 2}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Connection count */}
              {connCount > 0 && (
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground shrink-0 font-mono">
                  <Link2 className="h-3 w-3" />
                  {connCount}
                </div>
              )}
            </button>
          );
        })}

        {department.people.length === 0 && (
          <div className="text-center py-6 text-sm text-muted-foreground">
            No team members yet
          </div>
        )}
      </CardContent>
    </Card>
  );
}
