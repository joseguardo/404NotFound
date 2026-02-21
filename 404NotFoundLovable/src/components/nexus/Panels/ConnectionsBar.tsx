import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { ArrowRight, X } from "lucide-react";
import { Connection, Department } from "../types";

interface ConnectionsBarProps {
  connections: Connection[];
  departments: Department[];
  onRemove: (index: number) => void;
}

export function ConnectionsBar({
  connections,
  departments,
  onRemove,
}: ConnectionsBarProps) {
  const personMap = useMemo(() => {
    const m = new Map<string, string>();
    departments.forEach((d) =>
      d.people.forEach((p) => m.set(p.id, p.name))
    );
    return m;
  }, [departments]);

  if (connections.length === 0) return null;

  return (
    <div className="border-t bg-card shrink-0">
      <ScrollArea className="w-full">
        <div className="flex items-center gap-3 px-6 py-3">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider shrink-0">
            Paths
          </span>

          <div className="flex items-center gap-2">
            {connections.map((conn, i) => (
              <Badge
                key={i}
                variant="secondary"
                className="gap-2 py-1.5 px-3 shrink-0"
              >
                <span className="text-xs font-medium">
                  {personMap.get(conn.from) || "?"}
                </span>
                <ArrowRight className="h-3 w-3 text-primary" />
                <span className="text-xs font-medium">
                  {personMap.get(conn.to) || "?"}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  ({conn.label})
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4 ml-1 -mr-1 hover:bg-destructive/20"
                  onClick={() => onRemove(i)}
                  aria-label={`Remove connection from ${personMap.get(conn.from)} to ${personMap.get(conn.to)}`}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
          </div>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
