import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Department, Person, DEPT_COLORS } from "../types";

interface PersonWithDept extends Person {
  dept: Department;
}

interface ConnectionPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  departments: Department[];
  onSave: (from: string, to: string, label: string) => void;
}

export function ConnectionPicker({
  open,
  onOpenChange,
  departments,
  onSave,
}: ConnectionPickerProps) {
  const [fromId, setFromId] = useState<string | null>(null);
  const [toId, setToId] = useState<string | null>(null);
  const [label, setLabel] = useState("Reports to");

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setFromId(null);
      setToId(null);
      setLabel("Reports to");
    }
  }, [open]);

  const allPeople = useMemo<PersonWithDept[]>(
    () =>
      departments.flatMap((d) =>
        d.people.map((p) => ({ ...p, dept: d }))
      ),
    [departments]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromId || !toId) return;
    onSave(fromId, toId, label);
    onOpenChange(false);
  };

  const isValid = fromId && toId && fromId !== toId;

  const PersonList = ({
    selected,
    onSelect,
    exclude,
  }: {
    selected: string | null;
    onSelect: (id: string) => void;
    exclude?: string | null;
  }) => (
    <ScrollArea className="h-[200px] rounded-md border">
      <div className="p-2 space-y-1">
        {allPeople
          .filter((p) => p.id !== exclude)
          .map((p) => {
            const color = DEPT_COLORS[p.dept.colorIdx % DEPT_COLORS.length];
            const isSelected = selected === p.id;

            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onSelect(p.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors",
                  isSelected
                    ? "bg-primary/10 border border-primary"
                    : "hover:bg-muted border border-transparent"
                )}
              >
                <div
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: color.dot }}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{p.name}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {p.role} · {p.dept.name}
                  </div>
                </div>
                {isSelected && (
                  <Check className="h-4 w-4 text-primary shrink-0" />
                )}
              </button>
            );
          })}
      </div>
    </ScrollArea>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>New Communication Path</DialogTitle>
            <DialogDescription>
              Define a communication or reporting relationship between two
              people in your organization.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="flex items-start gap-4">
              {/* From Person */}
              <div className="flex-1 space-y-2">
                <Label>From</Label>
                <PersonList
                  selected={fromId}
                  onSelect={setFromId}
                  exclude={toId}
                />
              </div>

              {/* Arrow */}
              <div className="flex items-center justify-center pt-8">
                <div className="rounded-full bg-muted p-2">
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>

              {/* To Person */}
              <div className="flex-1 space-y-2">
                <Label>To</Label>
                <PersonList
                  selected={toId}
                  onSelect={setToId}
                  exclude={fromId}
                />
              </div>
            </div>

            {/* Relationship Label */}
            <div className="mt-4 space-y-2">
              <Label htmlFor="connection-label">Relationship Label</Label>
              <Input
                id="connection-label"
                placeholder="e.g. Reports to, Collaborates with, Mentors"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!isValid}>
              Create Path
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
