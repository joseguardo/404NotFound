import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Plus, RefreshCw, AlertCircle, Loader2 } from "lucide-react";
import { api, Company } from "@/services/api";
import { Department } from "./types";
import { CreateCompanyModal } from "./Modals/CreateCompanyModal";
import { useToast } from "@/hooks/use-toast";

interface CompanySelectorProps {
  onSelectCompany: (company: Company, departments: Department[]) => void;
  onCreateCompany: (company: Company) => void;
}

export function CompanySelector({
  onSelectCompany,
  onCreateCompany,
}: CompanySelectorProps) {
  const { toast } = useToast();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [loadingCompanyId, setLoadingCompanyId] = useState<number | null>(null);

  const fetchCompanies = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getCompanies();
      setCompanies(data);
    } catch (err) {
      setError("Failed to load companies. Make sure the backend is running.");
      console.error("Failed to fetch companies:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const handleSelectCompany = async (company: Company) => {
    setLoadingCompanyId(company.id);
    try {
      const departments = await api.loadStructure(company.id);
      onSelectCompany(company, departments);
    } catch (err) {
      toast({
        title: "Failed to load company",
        description: "Could not fetch the organization structure.",
        variant: "destructive",
      });
      console.error("Failed to load structure:", err);
    } finally {
      setLoadingCompanyId(null);
    }
  };

  const handleCreateCompany = async (companyName: string) => {
    const company = await api.createCompany(companyName);
    toast({
      title: "Company created",
      description: `${company.company_name} has been created successfully.`,
    });
    onCreateCompany(company);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="max-w-4xl w-full">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold mb-3 bg-gradient-to-r from-miro-blue to-miro-purple bg-clip-text text-transparent">
            Select Your Organization
          </h1>
          <p className="text-muted-foreground text-lg">
            Choose an existing company or create a new one
          </p>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-8 p-6 rounded-2xl bg-destructive/10 border border-destructive/30 text-center">
            <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-3" />
            <p className="text-destructive font-medium mb-4">{error}</p>
            <Button onClick={fetchCompanies} variant="outline" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Retry
            </Button>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="border-2 border-border">
                <CardContent className="p-6">
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Companies Grid */}
        {!isLoading && !error && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Existing Companies */}
            {companies.map((company) => (
              <Card
                key={company.id}
                className={`border-2 cursor-pointer transition-all hover:border-miro-blue/50 hover:shadow-miro ${
                  loadingCompanyId === company.id
                    ? "border-miro-blue/50 bg-miro-blue/5"
                    : "border-border hover:bg-card/80"
                }`}
                onClick={() =>
                  loadingCompanyId === null && handleSelectCompany(company)
                }
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-miro-blue/10 flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-miro-blue" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">
                          {company.company_name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Created {formatDate(company.created_at)}
                        </p>
                      </div>
                    </div>
                    {loadingCompanyId === company.id && (
                      <Loader2 className="h-5 w-5 animate-spin text-miro-blue" />
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Create New Company Card */}
            <Card
              className="border-2 border-dashed border-miro-purple/30 cursor-pointer transition-all hover:border-miro-purple/60 hover:bg-miro-purple/5"
              onClick={() => setCreateModalOpen(true)}
            >
              <CardContent className="p-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-miro-purple/10 flex items-center justify-center">
                  <Plus className="h-5 w-5 text-miro-purple" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">
                    New Company
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Start from scratch
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && companies.length === 0 && (
          <div className="text-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-6">
              No companies found. Create your first one!
            </p>
          </div>
        )}
      </div>

      {/* Create Company Modal */}
      <CreateCompanyModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onSave={handleCreateCompany}
      />
    </div>
  );
}
