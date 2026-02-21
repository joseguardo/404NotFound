import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { useNexusState } from "./hooks/useNexusState";
import { TopBar } from "./TopBar";
import { HierarchyView } from "./HierarchyView";
import { OrbitalView } from "./OrbitalView";
import { GridView } from "./GridView";
import { PersonPanel, ConnectionsBar } from "./Panels";
import {
  CommandPalette,
  CreateDepartmentModal,
  CreatePersonModal,
  ConnectionPicker,
} from "./Modals";

export default function NexusApp() {
  const { toast } = useToast();

  // State from hook
  const {
    departments,
    connections,
    nodePositions,
    expandedDepts,
    selectedPerson,
    selectedDept,
    view,
    totalPeople,
    setView,
    toggleDept,
    selectPerson,
    clearSelection,
    addDepartment,
    deleteDepartment,
    addPerson,
    updatePerson,
    deletePerson,
    addConnection,
    removeConnection,
    getConnectionCount,
    updateNodePosition,
    exportData,
    importData,
    resetToSeed,
  } = useNexusState();

  // Modal states
  const [cmdOpen, setCmdOpen] = useState(false);
  const [createDeptOpen, setCreateDeptOpen] = useState(false);
  const [createPersonOpen, setCreatePersonOpen] = useState(false);
  const [connPickerOpen, setConnPickerOpen] = useState(false);
  const [targetDeptId, setTargetDeptId] = useState<string | null>(null);
  const [targetDeptName, setTargetDeptName] = useState("");

  // Confirmation dialog state
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: "department" | "person";
    id: string;
    deptId?: string;
    name: string;
  } | null>(null);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCmdOpen(true);
      }
      if (e.key === "Escape") {
        setCmdOpen(false);
        setCreateDeptOpen(false);
        setCreatePersonOpen(false);
        setConnPickerOpen(false);
        clearSelection();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [clearSelection]);

  // Command palette handlers
  const handleCreateDepartment = () => {
    setCmdOpen(false);
    setCreateDeptOpen(true);
  };

  const handleCreateConnection = () => {
    setCmdOpen(false);
    setConnPickerOpen(true);
  };

  const handleAddPersonToDept = (deptId: string, deptName: string) => {
    setCmdOpen(false);
    setTargetDeptId(deptId);
    setTargetDeptName(deptName);
    setCreatePersonOpen(true);
  };

  // Save handlers
  const handleSaveDepartment = (name: string, head: string) => {
    addDepartment(name, head);
    toast({
      title: "Department created",
      description: `${name} has been added to your organization.`,
    });
  };

  const handleSavePerson = (name: string, role: string, tasks: string[]) => {
    if (!targetDeptId) return;
    addPerson(targetDeptId, name, role, tasks);
    toast({
      title: "Person added",
      description: `${name} has been added to ${targetDeptName}.`,
    });
  };

  const handleSaveConnection = (from: string, to: string, label: string) => {
    addConnection(from, to, label);
    toast({
      title: "Connection created",
      description: "Communication path has been established.",
    });
  };

  // Delete handlers with confirmation
  const handleRequestDeleteDept = (deptId: string) => {
    const dept = departments.find((d) => d.id === deptId);
    if (!dept) return;
    setDeleteConfirm({
      type: "department",
      id: deptId,
      name: dept.name,
    });
  };

  const handleConfirmDelete = () => {
    if (!deleteConfirm) return;

    if (deleteConfirm.type === "department") {
      deleteDepartment(deleteConfirm.id);
      toast({
        title: "Department deleted",
        description: `${deleteConfirm.name} has been removed.`,
        variant: "destructive",
      });
    } else if (deleteConfirm.type === "person" && deleteConfirm.deptId) {
      deletePerson(deleteConfirm.deptId, deleteConfirm.id);
      toast({
        title: "Person removed",
        description: `${deleteConfirm.name} has been removed.`,
        variant: "destructive",
      });
    }

    setDeleteConfirm(null);
  };

  // Person panel delete handler
  const handleDeletePerson = (deptId: string, personId: string) => {
    const dept = departments.find((d) => d.id === deptId);
    const person = dept?.people.find((p) => p.id === personId);
    if (!person) return;

    setDeleteConfirm({
      type: "person",
      id: personId,
      deptId,
      name: person.name,
    });
  };

  // Data export/import handlers
  const handleExportData = useCallback(() => {
    const data = exportData();
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "nexus-organization.json";
    a.click();
    URL.revokeObjectURL(url);
    toast({
      title: "Data exported",
      description: "Organization data has been downloaded.",
    });
  }, [exportData, toast]);

  const handleImportData = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const json = e.target?.result as string;
        if (importData(json)) {
          toast({
            title: "Data imported",
            description: "Organization data has been loaded.",
          });
        } else {
          toast({
            title: "Import failed",
            description: "The file could not be parsed.",
            variant: "destructive",
          });
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }, [importData, toast]);

  const handleResetData = useCallback(() => {
    resetToSeed();
    toast({
      title: "Data reset",
      description: "Organization has been reset to default.",
    });
  }, [resetToSeed, toast]);

  // Connection count for selected person
  const connectionCount = selectedPerson
    ? getConnectionCount(selectedPerson.id)
    : 0;

  return (
    <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">
      {/* Top bar */}
      <TopBar
        totalDepts={departments.length}
        totalPeople={totalPeople}
        totalConns={connections.length}
        view={view}
        onViewChange={setView}
        onCreateClick={() => setCmdOpen(true)}
      />

      {/* Main view */}
      {view === "hierarchy" && (
        <HierarchyView
          departments={departments}
          selectedPersonId={selectedPerson?.id || null}
          onSelectPerson={selectPerson}
          onOpenCommandPalette={() => setCmdOpen(true)}
        />
      )}
      {view === "grid" && (
        <GridView
          departments={departments}
          connections={connections}
          selectedPersonId={selectedPerson?.id || null}
          onSelectPerson={selectPerson}
          onDeleteDepartment={handleRequestDeleteDept}
          onOpenCommandPalette={() => setCmdOpen(true)}
        />
      )}
      {view === "orbital" && (
        <OrbitalView
          departments={departments}
          connections={connections}
          expandedDepts={expandedDepts}
          nodePositions={nodePositions}
          selectedPersonId={selectedPerson?.id || null}
          onToggleDept={toggleDept}
          onSelectPerson={selectPerson}
          onNodeDrag={updateNodePosition}
          onOpenCommandPalette={() => setCmdOpen(true)}
        />
      )}

      {/* Connections bar */}
      <ConnectionsBar
        connections={connections}
        departments={departments}
        onRemove={removeConnection}
      />

      {/* Command palette */}
      <CommandPalette
        open={cmdOpen}
        onOpenChange={setCmdOpen}
        departments={departments}
        onCreateDepartment={handleCreateDepartment}
        onCreateConnection={handleCreateConnection}
        onAddPersonToDept={handleAddPersonToDept}
        onExportData={handleExportData}
        onImportData={handleImportData}
        onResetData={handleResetData}
      />

      {/* Create department modal */}
      <CreateDepartmentModal
        open={createDeptOpen}
        onOpenChange={setCreateDeptOpen}
        onSave={handleSaveDepartment}
      />

      {/* Create person modal */}
      <CreatePersonModal
        open={createPersonOpen}
        onOpenChange={setCreatePersonOpen}
        departmentName={targetDeptName}
        onSave={handleSavePerson}
      />

      {/* Connection picker */}
      <ConnectionPicker
        open={connPickerOpen}
        onOpenChange={setConnPickerOpen}
        departments={departments}
        onSave={handleSaveConnection}
      />

      {/* Person panel */}
      <PersonPanel
        person={selectedPerson}
        department={selectedDept}
        connectionCount={connectionCount}
        onClose={clearSelection}
        onUpdate={updatePerson}
        onDelete={handleDeletePerson}
      />

      {/* Delete confirmation dialog */}
      <AlertDialog
        open={!!deleteConfirm}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteConfirm?.type === "department"
                ? `This will permanently delete the "${deleteConfirm.name}" department and all its team members. This action cannot be undone.`
                : `This will remove ${deleteConfirm?.name} from the organization. This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
