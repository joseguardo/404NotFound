import { useState, useEffect } from "react";
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
import { Textarea } from "@/components/ui/textarea";

interface CreatePersonModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  departmentName: string;
  onSave: (name: string, role: string, tasks: string[]) => void;
}

export function CreatePersonModal({
  open,
  onOpenChange,
  departmentName,
  onSave,
}: CreatePersonModalProps) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [tasksText, setTasksText] = useState("");

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setName("");
      setRole("");
      setTasksText("");
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const tasks = tasksText
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    onSave(name.trim(), role.trim(), tasks);
    onOpenChange(false);
  };

  const isValid = name.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add Person to {departmentName}</DialogTitle>
            <DialogDescription>
              Add a new team member to the {departmentName} department.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="person-name">Full Name</Label>
              <Input
                id="person-name"
                placeholder="e.g. Jane Smith"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="person-role">Role / Title</Label>
              <Input
                id="person-role"
                placeholder="e.g. Senior Designer, Product Manager"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="person-tasks">
                Tasks & Responsibilities (comma-separated)
              </Label>
              <Textarea
                id="person-tasks"
                placeholder="e.g. Design systems, User research, Prototyping"
                value={tasksText}
                onChange={(e) => setTasksText(e.target.value)}
                rows={3}
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
              Add Person
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
