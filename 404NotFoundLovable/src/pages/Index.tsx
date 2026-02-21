import { useState } from "react";
import NexusApp from "@/components/nexus/NexusApp";
import { CompanySelector } from "@/components/nexus/CompanySelector";
import { Department } from "@/components/nexus/types";
import { Company } from "@/services/api";

type AppState =
  | { mode: "selecting" }
  | { mode: "editing"; company: Company; initialDepartments: Department[] };

const Index = () => {
  const [appState, setAppState] = useState<AppState>({ mode: "selecting" });

  const handleSelectCompany = (company: Company, departments: Department[]) => {
    setAppState({
      mode: "editing",
      company,
      initialDepartments: departments,
    });
  };

  const handleCreateCompany = (company: Company) => {
    setAppState({
      mode: "editing",
      company,
      initialDepartments: [],
    });
  };

  const handleBack = () => {
    setAppState({ mode: "selecting" });
  };

  if (appState.mode === "selecting") {
    return (
      <CompanySelector
        onSelectCompany={handleSelectCompany}
        onCreateCompany={handleCreateCompany}
      />
    );
  }

  return (
    <NexusApp
      company={appState.company}
      initialDepartments={appState.initialDepartments}
      onBack={handleBack}
    />
  );
};

export default Index;
