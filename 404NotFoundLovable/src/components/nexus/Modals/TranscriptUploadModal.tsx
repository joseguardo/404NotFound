import { useState, useRef, useCallback } from "react";
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
  Upload,
  FileText,
  X,
  Loader2,
  Play,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { api, ProcessingResponse, UploadResponse } from "@/services/api";
import { ProjectCarousel } from "../ActionCards";

type ModalStep = "upload" | "uploaded" | "processing" | "results";

interface UploadedFile {
  filename: string;
  size: number;
  status: "pending" | "processing" | "completed" | "error";
  result?: ProcessingResponse;
  error?: string;
}

interface TranscriptUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: number;
  onUploadComplete?: () => void;
}

export function TranscriptUploadModal({
  open,
  onOpenChange,
  companyId,
  onUploadComplete,
}: TranscriptUploadModalProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [step, setStep] = useState<ModalStep>("upload");
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    setFiles((prev) => [...prev, ...droppedFiles]);
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        const selectedFiles = Array.from(e.target.files);
        setFiles((prev) => [...prev, ...selectedFiles]);
      }
    },
    []
  );

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleUpload = async () => {
    if (files.length === 0) return;
    setIsUploading(true);
    try {
      const response: UploadResponse = await api.uploadTranscripts(companyId, files);

      // Transform to UploadedFile format
      const uploaded: UploadedFile[] = response.files.map((f) => ({
        filename: f.filename,
        size: f.size,
        status: "pending",
      }));

      setUploadedFiles(uploaded);
      setFiles([]);
      setStep("uploaded");
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setIsUploading(false);
    }
  };

  const advanceToResultsIfDone = (files: UploadedFile[]) => {
    const hasActive = files.some(
      (f) => f.status === "pending" || f.status === "processing"
    );
    if (!hasActive) {
      setStep("results");
    }
  };

  const handleProcessFile = async (filename: string) => {
    // Update status to processing
    setUploadedFiles((prev) =>
      prev.map((f) =>
        f.filename === filename ? { ...f, status: "processing" } : f
      )
    );

    try {
      const result = await api.processTranscript(companyId, filename);

      setUploadedFiles((prev) => {
        const updated = prev.map((f) =>
          f.filename === filename
            ? { ...f, status: "completed", result }
            : f
        );
        advanceToResultsIfDone(updated);
        return updated;
      });
    } catch (err) {
      setUploadedFiles((prev) => {
        const updated = prev.map((f) =>
          f.filename === filename
            ? { ...f, status: "error", error: (err as Error).message }
            : f
        );
        advanceToResultsIfDone(updated);
        return updated;
      });
    }
  };

  const handleProcessAll = async () => {
    setStep("processing");

    for (const file of uploadedFiles) {
      if (file.status === "pending") {
        await handleProcessFile(file.filename);
      }
    }

    setStep("results");
  };

  const handleClose = () => {
    if (!isUploading && step !== "processing") {
      resetModal();
      onOpenChange(false);
    }
  };

  const resetModal = () => {
    setFiles([]);
    setUploadedFiles([]);
    setStep("upload");
  };

  const handleDone = () => {
    onUploadComplete?.();
    handleClose();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Get all results for display
  const allResults = uploadedFiles
    .filter((f) => f.status === "completed" && f.result)
    .flatMap((f) => f.result!.projects);

  const totalActions = allResults.reduce(
    (sum, p) => sum + p.first_actions.length,
    0
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className={cn(
          "transition-all duration-300",
          step === "results" ? "sm:max-w-[800px]" : "sm:max-w-[500px]"
        )}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step === "results" && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 -ml-1"
                onClick={() => setStep("uploaded")}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}
            {step === "upload" && "Upload Transcripts"}
            {step === "uploaded" && "Process Transcripts"}
            {step === "processing" && "Processing..."}
            {step === "results" && (
              <span className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                First Actions
              </span>
            )}
          </DialogTitle>
          <DialogDescription>
            {step === "upload" &&
              "Upload meeting transcripts or documents to process. Supported formats: .txt, .pdf, .docx"}
            {step === "uploaded" &&
              "Your files have been uploaded. Click Process to extract actions from the transcripts."}
            {step === "processing" &&
              "Extracting topics, matching projects, and identifying actions..."}
            {step === "results" &&
              `Found ${totalActions} first-in-sequence action${totalActions !== 1 ? "s" : ""} across ${allResults.length} project${allResults.length !== 1 ? "s" : ""}. Swipe or use arrows to navigate.`}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {/* Step: Upload */}
          {step === "upload" && (
            <>
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
                className={cn(
                  "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
                  isDragging
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50 hover:bg-muted/50"
                )}
              >
                <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm font-medium text-foreground">
                  Drag & drop files here
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  or click to browse
                </p>
                <input
                  ref={inputRef}
                  type="file"
                  multiple
                  accept=".txt,.pdf,.docx,.doc"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              {files.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Selected Files ({files.length})
                  </p>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {files.map((file, index) => (
                      <div
                        key={`${file.name}-${index}`}
                        className="flex items-center justify-between p-2 rounded bg-muted/50"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="h-4 w-4 text-primary shrink-0" />
                          <span className="text-sm truncate">{file.name}</span>
                          <span className="text-xs text-muted-foreground shrink-0">
                            ({formatFileSize(file.size)})
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFile(index);
                          }}
                          disabled={isUploading}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Step: Uploaded - Show files with Process button */}
          {(step === "uploaded" || step === "processing") && (
            <div className="space-y-3">
              {uploadedFiles.map((file) => (
                <div
                  key={file.filename}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg border transition-all",
                    file.status === "completed" && "border-green-200 bg-green-50",
                    file.status === "error" && "border-red-200 bg-red-50",
                    file.status === "processing" && "border-primary/30 bg-primary/5",
                    file.status === "pending" && "border-border bg-muted/30"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {file.status === "pending" && (
                      <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                    )}
                    {file.status === "processing" && (
                      <Loader2 className="h-5 w-5 text-primary animate-spin shrink-0" />
                    )}
                    {file.status === "completed" && (
                      <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                    )}
                    {file.status === "error" && (
                      <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {file.filename}
                      </p>
                      {file.status === "completed" && file.result && (
                        <p className="text-xs text-muted-foreground">
                          {file.result.total_projects} project(s), {file.result.total_actions} action(s)
                        </p>
                      )}
                      {file.status === "error" && (
                        <p className="text-xs text-red-500">{file.error}</p>
                      )}
                    </div>
                  </div>

                  {file.status === "pending" && step === "uploaded" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleProcessFile(file.filename)}
                    >
                      <Play className="h-3 w-3 mr-1" />
                      Process
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Step: Results - Show action cards carousel */}
          {step === "results" && (
            <div className="min-h-[300px]">
              {allResults.length > 0 ? (
                <ProjectCarousel
                  projects={allResults}
                  showOnlyFirst={true}
                />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p>No actions were extracted from the transcripts.</p>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          {step === "upload" && (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isUploading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpload}
                disabled={files.length === 0 || isUploading}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload {files.length > 0 && `(${files.length})`}
                  </>
                )}
              </Button>
            </>
          )}

          {step === "uploaded" && (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
              >
                Close
              </Button>
              <Button onClick={handleProcessAll}>
                <Sparkles className="h-4 w-4 mr-2" />
                Process All
              </Button>
            </>
          )}

          {step === "processing" && (
            <Button disabled>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Processing...
            </Button>
          )}

          {step === "results" && (
            <Button onClick={handleDone}>
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
