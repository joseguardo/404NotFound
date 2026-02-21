import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { X, Link2, Trash2, Plus } from "lucide-react";
import { Person, Department, DEPT_COLORS } from "../types";

interface PersonPanelProps {
  person: Person | null;
  department: Department | null;
  connectionCount: number;
  onClose: () => void;
  onUpdate: (deptId: string, personId: string, updates: Partial<Person>) => void;
  onDelete: (deptId: string, personId: string) => void;
}

export function PersonPanel({
  person,
  department,
  connectionCount,
  onClose,
  onUpdate,
  onDelete,
}: PersonPanelProps) {
  const [editingField, setEditingField] = useState<"name" | "role" | null>(null);
  const [editValue, setEditValue] = useState("");
  const [newTask, setNewTask] = useState("");
  const editInputRef = useRef<HTMLInputElement>(null);

  // Focus input when editing starts
  useEffect(() => {
    if (editingField) {
      setTimeout(() => editInputRef.current?.focus(), 50);
    }
  }, [editingField]);

  if (!person || !department) return null;

  const color = DEPT_COLORS[department.colorIdx % DEPT_COLORS.length];

  const startEditing = (field: "name" | "role", value: string) => {
    setEditingField(field);
    setEditValue(value);
  };

  const saveEdit = () => {
    if (!editingField || !editValue.trim()) {
      setEditingField(null);
      return;
    }

    onUpdate(department.id, person.id, { [editingField]: editValue.trim() });
    setEditingField(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") saveEdit();
    if (e.key === "Escape") setEditingField(null);
  };

  const addTask = () => {
    if (!newTask.trim()) return;
    onUpdate(department.id, person.id, {
      tasks: [...person.tasks, newTask.trim()],
    });
    setNewTask("");
  };

  const removeTask = (index: number) => {
    onUpdate(department.id, person.id, {
      tasks: person.tasks.filter((_, i) => i !== index),
    });
  };

  const handleDelete = () => {
    onDelete(department.id, person.id);
    onClose();
  };

  return (
    <Sheet open={!!person} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-[400px] sm:w-[400px] p-0 flex flex-col">
        {/* Header */}
        <SheetHeader className="px-6 py-4 border-b shrink-0">
          <div className="flex items-center gap-2">
            <div
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: color.dot }}
            />
            <span className="text-sm text-muted-foreground">
              {department.name}
            </span>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="px-6 py-5">
            {/* Name */}
            {editingField === "name" ? (
              <Input
                ref={editInputRef}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={saveEdit}
                onKeyDown={handleKeyDown}
                className="text-2xl font-bold h-auto py-1 px-2 -mx-2"
              />
            ) : (
              <SheetTitle
                className="text-2xl font-bold cursor-text hover:bg-muted/50 rounded px-2 py-1 -mx-2 transition-colors"
                onClick={() => startEditing("name", person.name)}
                role="button"
                tabIndex={0}
                aria-label="Click to edit name"
              >
                {person.name}
              </SheetTitle>
            )}

            {/* Role */}
            {editingField === "role" ? (
              <Input
                ref={editInputRef}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={saveEdit}
                onKeyDown={handleKeyDown}
                className="text-sm text-muted-foreground h-auto py-1 px-2 -mx-2 mt-1"
              />
            ) : (
              <p
                className="text-sm text-muted-foreground cursor-text hover:bg-muted/50 rounded px-2 py-1 -mx-2 mt-1 transition-colors"
                onClick={() => startEditing("role", person.role)}
                role="button"
                tabIndex={0}
                aria-label="Click to edit role"
              >
                {person.role}
              </p>
            )}

            {/* Badges */}
            <div className="flex flex-wrap gap-2 mt-4">
              {person.isHead && (
                <Badge
                  className="uppercase text-[10px] tracking-wider"
                  style={{
                    backgroundColor: `${color.dot}15`,
                    color: color.dot,
                    borderColor: color.dot,
                  }}
                >
                  Department Head
                </Badge>
              )}
              {connectionCount > 0 && (
                <Badge variant="secondary" className="gap-1">
                  <Link2 className="h-3 w-3" />
                  {connectionCount} path{connectionCount !== 1 ? "s" : ""}
                </Badge>
              )}
            </div>
          </div>

          <Separator />

          {/* Tasks */}
          <div className="px-6 py-5">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Tasks & Responsibilities
              </h4>
              <span className="text-xs text-muted-foreground">
                {person.tasks.length}
              </span>
            </div>

            <div className="space-y-2">
              {person.tasks.map((task, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 group bg-muted/50 rounded-lg px-3 py-2"
                >
                  <div
                    className="h-1.5 w-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: color.dot }}
                  />
                  <span className="flex-1 text-sm">{task}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removeTask(i)}
                    aria-label={`Remove task: ${task}`}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}

              {/* Add task input */}
              <div className="flex items-center gap-2">
                <Input
                  value={newTask}
                  onChange={(e) => setNewTask(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addTask()}
                  placeholder="Add a task..."
                  className="h-9 text-sm"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 shrink-0"
                  onClick={addTask}
                  disabled={!newTask.trim()}
                  aria-label="Add task"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Footer - Delete action */}
        <div className="px-6 py-4 border-t mt-auto shrink-0">
          <Button
            variant="destructive"
            className="w-full gap-2"
            onClick={handleDelete}
            aria-label={`Remove ${person.name} from ${department.name}`}
          >
            <Trash2 className="h-4 w-4" />
            Remove Person
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
