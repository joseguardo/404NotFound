import { useEffect, useMemo, useState } from "react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import {
  Building2,
  Link2,
  User,
  Search,
  Plus,
  Settings,
  Download,
  Upload,
  RotateCcw,
} from "lucide-react";
import { Department } from "../types";

export interface CommandAction {
  id: string;
  icon: React.ReactNode;
  label: string;
  desc: string;
  action: () => void;
  group: "create" | "navigate" | "data" | "department";
  shortcut?: string;
}

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  departments: Department[];
  onCreateDepartment: () => void;
  onCreateConnection: () => void;
  onAddPersonToDept: (deptId: string, deptName: string) => void;
  onSelectDepartment?: (dept: Department) => void;
  onExportData?: () => void;
  onImportData?: () => void;
  onResetData?: () => void;
}

export function CommandPalette({
  open,
  onOpenChange,
  departments,
  onCreateDepartment,
  onCreateConnection,
  onAddPersonToDept,
  onSelectDepartment,
  onExportData,
  onImportData,
  onResetData,
}: CommandPaletteProps) {
  const [search, setSearch] = useState("");

  // Reset search when dialog opens
  useEffect(() => {
    if (open) setSearch("");
  }, [open]);

  // Build actions list
  const actions = useMemo<CommandAction[]>(() => {
    const acts: CommandAction[] = [
      {
        id: "new-dept",
        icon: <Building2 className="h-4 w-4" />,
        label: "New Department",
        desc: "Create a new department",
        action: onCreateDepartment,
        group: "create",
      },
      {
        id: "new-connection",
        icon: <Link2 className="h-4 w-4" />,
        label: "New Communication Path",
        desc: "Define a connection between two people",
        action: onCreateConnection,
        group: "create",
      },
    ];

    // Add person to department actions
    departments.forEach((d) => {
      acts.push({
        id: `add-person-${d.id}`,
        icon: <User className="h-4 w-4" />,
        label: `Add Person to ${d.name}`,
        desc: `Add a team member to the ${d.name} department`,
        action: () => onAddPersonToDept(d.id, d.name),
        group: "department",
      });
    });

    // Data management actions
    if (onExportData) {
      acts.push({
        id: "export-data",
        icon: <Download className="h-4 w-4" />,
        label: "Export Data",
        desc: "Download organization data as JSON",
        action: onExportData,
        group: "data",
      });
    }

    if (onImportData) {
      acts.push({
        id: "import-data",
        icon: <Upload className="h-4 w-4" />,
        label: "Import Data",
        desc: "Load organization data from JSON",
        action: onImportData,
        group: "data",
      });
    }

    if (onResetData) {
      acts.push({
        id: "reset-data",
        icon: <RotateCcw className="h-4 w-4" />,
        label: "Reset to Default",
        desc: "Reset organization to sample data",
        action: onResetData,
        group: "data",
      });
    }

    return acts;
  }, [
    departments,
    onCreateDepartment,
    onCreateConnection,
    onAddPersonToDept,
    onExportData,
    onImportData,
    onResetData,
  ]);

  const createActions = actions.filter((a) => a.group === "create");
  const departmentActions = actions.filter((a) => a.group === "department");
  const dataActions = actions.filter((a) => a.group === "data");

  const handleSelect = (action: CommandAction) => {
    action.action();
    onOpenChange(false);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Type a command or search..."
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        <CommandEmpty>No matching commands found.</CommandEmpty>

        <CommandGroup heading="Create">
          {createActions.map((action) => (
            <CommandItem
              key={action.id}
              onSelect={() => handleSelect(action)}
              className="flex items-center gap-3"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-md border bg-background">
                {action.icon}
              </div>
              <div className="flex flex-col">
                <span className="font-medium">{action.label}</span>
                <span className="text-xs text-muted-foreground">
                  {action.desc}
                </span>
              </div>
              {action.shortcut && (
                <CommandShortcut>{action.shortcut}</CommandShortcut>
              )}
            </CommandItem>
          ))}
        </CommandGroup>

        {departmentActions.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Add Team Members">
              {departmentActions.map((action) => (
                <CommandItem
                  key={action.id}
                  onSelect={() => handleSelect(action)}
                  className="flex items-center gap-3"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-md border bg-background">
                    {action.icon}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-medium">{action.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {action.desc}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {dataActions.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Data">
              {dataActions.map((action) => (
                <CommandItem
                  key={action.id}
                  onSelect={() => handleSelect(action)}
                  className="flex items-center gap-3"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-md border bg-background">
                    {action.icon}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-medium">{action.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {action.desc}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
