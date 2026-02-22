import { useState, useEffect, useCallback, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { api, GranolaResult, ProjectResponse } from "@/services/api";
import { ProjectCarousel } from "../ActionCards";
import { useToast } from "@/hooks/use-toast";

interface GranolaResultsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pollInterval?: number; // ms, default 5000
}

export function GranolaResultsModal({
  open,
  onOpenChange,
  pollInterval = 5000,
}: GranolaResultsModalProps) {
  const { toast } = useToast();
  const [results, setResults] = useState<GranolaResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<GranolaResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const lastCheckRef = useRef<string | null>(null);
  const hasNotifiedRef = useRef<Set<string>>(new Set());

  // Fetch results
  const fetchResults = useCallback(async (showNotification = false) => {
    try {
      const data = await api.getGranolaResults(10);
      setResults(data);

      // Check for new results and show toast
      if (showNotification && data.length > 0) {
        for (const result of data) {
          if (!hasNotifiedRef.current.has(result.document_id)) {
            hasNotifiedRef.current.add(result.document_id);

            // Skip notification on first load
            if (lastCheckRef.current !== null) {
              toast({
                title: `Granola: ${result.meeting_title}`,
                description: `${result.total_actions} action${result.total_actions !== 1 ? "s" : ""} extracted from meeting`,
                action: (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedResult(result);
                      onOpenChange(true);
                    }}
                  >
                    View
                  </Button>
                ),
              });
            }
          }
        }
      }

      lastCheckRef.current = new Date().toISOString();
    } catch (err) {
      console.error("Failed to fetch Granola results:", err);
    }
  }, [toast, onOpenChange]);

  // Poll for new results
  useEffect(() => {
    // Initial fetch
    fetchResults(true);

    // Set up polling
    const interval = setInterval(() => {
      fetchResults(true);
    }, pollInterval);

    return () => clearInterval(interval);
  }, [fetchResults, pollInterval]);

  // Refresh when modal opens
  useEffect(() => {
    if (open) {
      setIsLoading(true);
      fetchResults(false).finally(() => setIsLoading(false));
    }
  }, [open, fetchResults]);

  const handleRefresh = async () => {
    setIsLoading(true);
    await fetchResults(false);
    setIsLoading(false);
  };

  const formatTimeAgo = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  // Get projects for carousel display
  const selectedProjects: ProjectResponse[] = selectedResult?.projects || [];
  const totalActions = selectedProjects.reduce(
    (sum, p) => sum + p.first_actions.length,
    0
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "transition-all duration-300",
          selectedResult ? "sm:max-w-[800px]" : "sm:max-w-[500px]"
        )}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-green-500" />
            {selectedResult ? selectedResult.meeting_title : "Granola Meetings"}
          </DialogTitle>
          <DialogDescription>
            {selectedResult
              ? `${totalActions} first-in-sequence action${totalActions !== 1 ? "s" : ""} across ${selectedProjects.length} project${selectedProjects.length !== 1 ? "s" : ""}`
              : "Transcripts automatically captured from your meetings"}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {!selectedResult ? (
            // List view
            <div className="space-y-2">
              {results.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Sparkles className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p>No Granola transcripts yet</p>
                  <p className="text-xs mt-1">
                    Transcripts will appear here automatically when detected
                  </p>
                </div>
              ) : (
                results.map((result) => (
                  <button
                    key={result.document_id}
                    onClick={() => setSelectedResult(result)}
                    className={cn(
                      "w-full flex items-center justify-between p-3 rounded-lg border transition-all text-left",
                      "hover:border-primary/50 hover:bg-muted/50",
                      result.success
                        ? "border-border bg-muted/30"
                        : "border-red-200 bg-red-50"
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {result.success ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {result.meeting_title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {result.total_projects} project{result.total_projects !== 1 ? "s" : ""},{" "}
                          {result.total_actions} action{result.total_actions !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
                      <Clock className="h-3 w-3" />
                      {formatTimeAgo(result.processed_at)}
                    </div>
                  </button>
                ))
              )}
            </div>
          ) : (
            // Detail view with carousel
            <div className="min-h-[300px]">
              {selectedProjects.length > 0 ? (
                <ProjectCarousel
                  projects={selectedProjects}
                  showOnlyFirst={true}
                />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p>No actions were extracted from this transcript.</p>
                  {selectedResult.error && (
                    <p className="text-xs text-red-500 mt-2">
                      {selectedResult.error}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex-row justify-between sm:justify-between">
          {selectedResult ? (
            <>
              <Button
                variant="outline"
                onClick={() => setSelectedResult(null)}
              >
                Back to List
              </Button>
              <Button onClick={() => onOpenChange(false)}>Done</Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                size="icon"
                onClick={handleRefresh}
                disabled={isLoading}
              >
                <RefreshCw
                  className={cn("h-4 w-4", isLoading && "animate-spin")}
                />
              </Button>
              <Button onClick={() => onOpenChange(false)}>Close</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
