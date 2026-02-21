import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Department, Person, DEPT_COLORS } from "../types";

interface HierarchyViewProps {
  departments: Department[];
  selectedPersonId: string | null;
  onSelectPerson: (person: Person, dept: Department) => void;
  onOpenCommandPalette: () => void;
}

export function HierarchyView({
  departments,
  selectedPersonId,
  onSelectPerson,
  onOpenCommandPalette,
}: HierarchyViewProps) {
  // Empty state
  if (departments.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-background">
        <div className="text-6xl text-muted-foreground/30">◉</div>
        <h2 className="text-xl font-bold text-muted-foreground">
          Start building your organization
        </h2>
        <p className="text-sm text-muted-foreground flex items-center gap-2">
          Press{" "}
          <kbd className="px-2 py-1 text-xs bg-muted border rounded">⌘K</kbd>{" "}
          to begin
        </p>
        <Button onClick={onOpenCommandPalette} className="mt-2">
          <Plus className="h-4 w-4 mr-2" />
          Create Department
        </Button>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1 bg-background">
      <div className="min-h-full p-8 flex flex-col items-center">
        {/* Company/CEO Node */}
        <div className="flex flex-col items-center mb-8">
          <Card className="w-48 border-primary/50 bg-card shadow-lg">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Crown className="h-4 w-4 text-primary" />
                <span className="font-bold text-lg">Nexus</span>
              </div>
              <span className="text-xs text-muted-foreground">Organization</span>
            </CardContent>
          </Card>

          {/* Vertical connector */}
          <div className="w-px h-8 bg-border" />
        </div>

        {/* Horizontal connector line */}
        {departments.length > 1 && (
          <div
            className="h-px bg-border mb-8"
            style={{
              width: `${Math.min(departments.length * 220, 900)}px`,
            }}
          />
        )}

        {/* Departments row */}
        <div className="flex flex-wrap justify-center gap-6">
          {departments.map((dept) => {
            const color = DEPT_COLORS[dept.colorIdx % DEPT_COLORS.length];

            return (
              <div key={dept.id} className="flex flex-col items-center">
                {/* Vertical connector from horizontal line */}
                {departments.length > 1 && (
                  <div className="w-px h-4 bg-border -mt-8 mb-4" />
                )}

                {/* Department Card */}
                <Card
                  className="w-52 transition-shadow hover:shadow-lg"
                  style={{ borderColor: color.border }}
                >
                  <CardHeader className="pb-2 pt-4 px-4">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded-full shrink-0"
                        style={{ backgroundColor: color.dot }}
                      />
                      <span className="font-semibold text-sm truncate">
                        {dept.name}
                      </span>
                      <Badge variant="outline" className="ml-auto text-[10px]">
                        {dept.head}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="px-3 pb-3 pt-0">
                    <div className="space-y-1">
                      {dept.people.map((person) => {
                        const isSelected = selectedPersonId === person.id;
                        const initials = person.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2);

                        return (
                          <button
                            key={person.id}
                            onClick={() => onSelectPerson(person, dept)}
                            className={cn(
                              "w-full flex items-center gap-2 p-2 rounded-md text-left transition-colors",
                              isSelected
                                ? "bg-primary/10 ring-1 ring-primary"
                                : "hover:bg-muted"
                            )}
                          >
                            {/* Avatar */}
                            <div
                              className="flex h-8 w-8 items-center justify-center rounded-md text-[10px] font-semibold shrink-0"
                              style={{
                                backgroundColor: color.bg,
                                border: `1px solid ${color.border}`,
                                color: color.dot,
                              }}
                            >
                              {initials}
                            </div>

                            {/* Name & Role */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1">
                                <span className="text-xs font-medium truncate">
                                  {person.name}
                                </span>
                                {person.isHead && (
                                  <Crown className="h-3 w-3 text-primary shrink-0" />
                                )}
                              </div>
                              <span className="text-[10px] text-muted-foreground truncate block">
                                {person.role}
                              </span>
                            </div>
                          </button>
                        );
                      })}

                      {dept.people.length === 0 && (
                        <div className="text-center py-3 text-xs text-muted-foreground">
                          No members
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>

        {/* Hint */}
        <div className="mt-12 text-sm text-muted-foreground text-center">
          Click any person to view details
        </div>
      </div>
    </ScrollArea>
  );
}
