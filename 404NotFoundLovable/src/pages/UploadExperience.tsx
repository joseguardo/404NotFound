import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, UploadCloud, Upload, FileText, X, Loader2 } from "lucide-react";
import { TaskUnpacker, UploadTask } from "@/components/upload-experience/TaskUnpacker";
import { Button } from "@/components/ui/button";
import { api, UploadResponse } from "@/services/api";
import { useToast } from "@/hooks/use-toast";

type Step = "select" | "run";

export default function UploadExperience() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [params] = useSearchParams();
  const companyName = params.get("companyName") || "Nexus";
  const companyId = Number(params.get("companyId") || 0);

  const [step, setStep] = useState<Step>("select");
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploaded, setUploaded] = useState<UploadTask[]>([]);

  useEffect(() => {
    if (!companyId) {
      toast({
        title: "Company not found",
        description: "Missing company id. Please go back and pick a company.",
        variant: "destructive",
      });
    }
  }, [companyId, toast]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (!companyId || files.length === 0) return;
    setIsUploading(true);
    try {
      const res: UploadResponse = await api.uploadTranscripts(companyId, files);
      const tasks: UploadTask[] = res.files.map((f, idx) => ({
        id: String(idx + 1),
        title: f.filename,
        backendFilename: f.filename,
        recipient: companyName,
        type: "research",
      }));
      setUploaded(tasks);
      setStep("run");
      toast({
        title: "Files uploaded",
        description: `${res.files.length} transcript${res.files.length === 1 ? "" : "s"} ready to process.`,
      });
    } catch (err) {
      toast({
        title: "Upload failed",
        description: (err as Error).message,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const reset = () => {
    setFiles([]);
    setUploaded([]);
    setStep("select");
  };

  const uploadDisabled = isUploading || files.length === 0 || !companyId;

  const dropZone = (
    <div className="border-2 border-dashed rounded-lg p-8 text-center">
      <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
      <p className="text-sm font-medium text-foreground">Drag & drop transcripts here</p>
      <p className="text-xs text-muted-foreground mt-1">.txt, .pdf, .docx</p>
      <input
        type="file"
        multiple
        accept=".txt,.pdf,.docx,.doc"
        className="hidden"
        id="upload-input"
        onChange={handleFileSelect}
      />
      <label
        htmlFor="upload-input"
        className="mt-3 inline-flex items-center justify-center px-3 py-1.5 rounded-md text-sm bg-muted hover:bg-muted/80 cursor-pointer"
      >
        Browse files
      </label>
    </div>
  );

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
                Transcript Pipeline
              </p>
              <p className="text-sm font-semibold">{companyName}</p>
            </div>
          </div>
        </div>
        <div className="text-xs text-muted-foreground">
          Upload → unpack → process → review (live backend)
        </div>
      </header>

      {step === "select" && (
        <div className="max-w-3xl mx-auto px-6 py-10 space-y-6">
          {dropZone}

          {files.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Selected Files ({files.length})
              </p>
              <div className="space-y-1 rounded-lg border border-border p-2">
                {files.map((file, index) => (
                  <div
                    key={`${file.name}-${index}`}
                    className="flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-muted/60"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="h-4 w-4 text-primary shrink-0" />
                      <span className="text-sm truncate">{file.name}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => removeFile(index)}
                      disabled={isUploading}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={reset} disabled={isUploading && files.length === 0}>
              Clear
            </Button>
            <Button onClick={handleUpload} disabled={uploadDisabled}>
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload & Process
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {step === "run" && uploaded.length > 0 && companyId !== 0 && (
        <TaskUnpacker companyId={companyId} tasks={uploaded} onReset={reset} />
      )}
    </div>
  );
}
