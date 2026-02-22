import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, UploadCloud } from "lucide-react";
import { TaskUnpacker } from "@/components/upload-experience/TaskUnpacker";
import { Button } from "@/components/ui/button";

export default function UploadExperience() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const companyName = params.get("companyName") || "Nexus";

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-card/80 backdrop-blur">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 text-muted-foreground"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div className="flex items-center gap-2">
            <UploadCloud className="h-5 w-5 text-primary" />
            <div>
              <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                Upload Simulation
              </p>
              <p className="text-sm font-semibold">{companyName}</p>
            </div>
          </div>
        </div>
        <div className="text-xs text-muted-foreground">
          Visual handoff of transcript → actions pipeline (demo only)
        </div>
      </header>

      <TaskUnpacker />
    </div>
  );
}
