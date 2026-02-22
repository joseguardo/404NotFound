import { cn } from "@/lib/utils";
import { ActionCard } from "./ActionCard";
import type { ActionResponse, ProjectResponse } from "@/services/api";
import { FolderKanban, Zap } from "lucide-react";

interface ActionCardListProps {
  projects: ProjectResponse[];
  showOnlyFirst?: boolean;
  className?: string;
}

export function ActionCardList({
  projects,
  showOnlyFirst = true,
  className,
}: ActionCardListProps) {
  if (projects.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No actions found
      </div>
    );
  }

  let globalIndex = 0;

  return (
    <div className={cn("space-y-6", className)}>
      {projects.map((project) => {
        const actions = showOnlyFirst ? project.first_actions : project.actions;

        if (actions.length === 0) {
          return null;
        }

        return (
          <div key={project.project_id} className="space-y-4">
            {/* Project Header */}
            <div className="flex items-center gap-2">
              <FolderKanban className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-foreground">
                {project.project_name}
              </h3>
              {showOnlyFirst && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  <Zap className="h-3 w-3" />
                  First Actions
                </span>
              )}
            </div>

            {/* Actions Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {actions.map((action) => {
                const cardIndex = globalIndex++;
                return (
                  <ActionCard
                    key={`${project.project_id}-${action.action_index}`}
                    action={action}
                    index={cardIndex}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
