import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Award,
  FileText,
  Download,
  Upload,
  Settings,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Edit,
  Trash2,
  Plus,
  RefreshCw,
  Search,
  Users,
  Calendar,
  Shield,
  Verified,
  Hash,
  Link,
  QrCode,
  Star,
  TrendingUp
} from "lucide-react";

// Certificate template schema
const certificateTemplateSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  certificateType: z.enum(["course", "learning_path", "competency", "custom"]).default("learning_path"),
  title: z.string().min(1, "Certificate title is required"),
  bodyText: z.string().min(20, "Certificate body text is required"),
  validityPeriod: z.coerce.number().min(1).max(3650).optional(), // Days
  requiresApproval: z.boolean().default(false),
  autoIssue: z.boolean().default(true),
  signatories: z.array(z.string()).default([]),
  branding: z.object({
    logo: z.string().optional(),
    colors: z.object({
      primary: z.string().default("#2563eb"),
      secondary: z.string().default("#1e40af"),
      accent: z.string().default("#dc2626")
    }).optional(),
    fontStyle: z.enum(["modern", "classic", "elegant"]).default("modern")
  }).optional(),
  isActive: z.boolean().default(true)
});

type CertificateTemplateFormType = z.infer<typeof certificateTemplateSchema>;

// Types for certificate data
interface CertificateTemplate {
  id: string;
  name: string;
  description: string;
  certificateType: "course" | "learning_path" | "competency" | "custom";
  title: string;
  bodyText: string;
  validityPeriod?: number;
  requiresApproval: boolean;
  autoIssue: boolean;
  signatories: string[];
  branding?: {
    logo?: string;
    colors?: {
      primary: string;
      secondary: string;
      accent: string;
    };
    fontStyle: "modern" | "classic" | "elegant";
  };
  isActive: boolean;
  createdAt: string;
  usage: {
    totalIssued: number;
    activeCertificates: number;
    expiredCertificates: number;
  };
}

interface IssuedCertificate {
  id: string;
  userId: string;
  templateId?: string;
  certificateNumber: string;
  certificateType?: string;
  title?: string;
  issuedAt: string;
  expiresAt?: string;
  verificationHash: string;
  metadata?: any;
  status: "active" | "expired" | "revoked";
  user: {
    firstName: string;
    lastName: string;
    email: string;
  };
  template?: CertificateTemplate;
}

interface CertificationStats {
  totalIssued: number;
  activeCount: number;
  expiredCount: number;
  revokedCount: number;
  issueRate: number; // per month
  topTemplates: Array<{
    templateId: string;
    templateName: string;
    count: number;
  }>;
  recentIssues: Array<{
    date: string;
    count: number;
  }>;
}

// Certificate Template Management Component
function CertificateTemplateManager() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<CertificateTemplate | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const { user } = useAuth();
  const { toast } = useToast();

  const form = useForm<CertificateTemplateFormType>({
    resolver: zodResolver(certificateTemplateSchema),
    defaultValues: {
      certificateType: "learning_path",
      requiresApproval: false,
      autoIssue: true,
      signatories: [],
      branding: {
        colors: {
          primary: "#2563eb",
          secondary: "#1e40af",
          accent: "#dc2626"
        },
        fontStyle: "modern"
      },
      isActive: true
    }
  });

  // Fetch certificate templates
  const { data: templates, isLoading } = useQuery({
    queryKey: ["/api/certificate-templates", { search: searchTerm }]
  }) as { data: CertificateTemplate[] | undefined; isLoading: boolean };

  // Create template mutation
  const createTemplateMutation = useMutation({
    mutationFn: (data: CertificateTemplateFormType) => apiRequest("/api/certificate-templates", {
      method: "POST",
      body: JSON.stringify(data)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/certificate-templates"] });
      toast({ title: "Success", description: "Certificate template created successfully" });
      setIsCreateDialogOpen(false);
      form.reset();
    }
  });

  // Update template mutation
  const updateTemplateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CertificateTemplateFormType> }) => 
      apiRequest(`/api/certificate-templates/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/certificate-templates"] });
      toast({ title: "Success", description: "Certificate template updated successfully" });
      setEditingTemplate(null);
      form.reset();
    }
  });

  // Delete template mutation
  const deleteTemplateMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/certificate-templates/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/certificate-templates"] });
      toast({ title: "Success", description: "Certificate template deleted successfully" });
    }
  });

  const handleCreate = (data: CertificateTemplateFormType) => {
    createTemplateMutation.mutate(data);
  };

  const handleEdit = (template: CertificateTemplate) => {
    setEditingTemplate(template);
    form.reset({
      name: template.name,
      description: template.description,
      certificateType: template.certificateType,
      title: template.title,
      bodyText: template.bodyText,
      validityPeriod: template.validityPeriod,
      requiresApproval: template.requiresApproval,
      autoIssue: template.autoIssue,
      signatories: template.signatories,
      branding: template.branding,
      isActive: template.isActive
    });
    setIsCreateDialogOpen(true);
  };

  const handleUpdate = (data: CertificateTemplateFormType) => {
    if (editingTemplate) {
      updateTemplateMutation.mutate({ id: editingTemplate.id, data });
    }
  };

  const filteredTemplates = templates?.filter(template =>
    template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Certificate Templates
        </CardTitle>
        <CardDescription>
          Manage certificate templates for automatic issuance upon learning path completion
        </CardDescription>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64"
              data-testid="input-search-templates"
            />
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)} data-testid="button-create-template">
            <Plus className="w-4 h-4 mr-2" />
            Create Template
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : filteredTemplates && filteredTemplates.length > 0 ? (
          <div className="grid gap-4">
            {filteredTemplates.map((template) => (
              <Card key={template.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium">{template.name}</h4>
                      <Badge variant={template.isActive ? "default" : "secondary"}>
                        {template.isActive ? "Active" : "Inactive"}
                      </Badge>
                      <Badge variant="outline">
                        {template.certificateType.replace("_", " ")}
                      </Badge>
                      {template.autoIssue && (
                        <Badge variant="secondary" className="text-xs">
                          Auto-Issue
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{template.description}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>🏆 {template.usage.totalIssued} issued</span>
                      <span>✅ {template.usage.activeCertificates} active</span>
                      <span>⏰ {template.usage.expiredCertificates} expired</span>
                      {template.validityPeriod && (
                        <span>📅 {template.validityPeriod} days validity</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(template)}
                      data-testid={`edit-template-${template.id}`}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteTemplateMutation.mutate(template.id)}
                      data-testid={`delete-template-${template.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Award className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-medium mb-2">No certificate templates found</h3>
            <p className="text-sm text-muted-foreground">
              {searchTerm ? "Try adjusting your search" : "Create your first certificate template"}
            </p>
          </div>
        )}

        {/* Create/Edit Template Dialog */}
        <Dialog open={isCreateDialogOpen || !!editingTemplate} onOpenChange={(open) => {
          if (!open) {
            setIsCreateDialogOpen(false);
            setEditingTemplate(null);
            form.reset();
          }
        }}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingTemplate ? "Edit Certificate Template" : "Create Certificate Template"}
              </DialogTitle>
              <DialogDescription>
                Define how certificates should be automatically generated and issued
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(editingTemplate ? handleUpdate : handleCreate)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Template Name</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-template-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="certificateType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Certificate Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-certificate-type">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="course">Course Completion</SelectItem>
                            <SelectItem value="learning_path">Learning Path Completion</SelectItem>
                            <SelectItem value="competency">Competency Achievement</SelectItem>
                            <SelectItem value="custom">Custom Certificate</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea {...field} data-testid="textarea-description" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Certificate Title</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Certificate of Completion" data-testid="input-certificate-title" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bodyText"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Certificate Body Text</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          rows={4}
                          placeholder="This is to certify that {firstName} {lastName} has successfully completed..."
                          data-testid="textarea-body-text"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="validityPeriod"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Validity Period (days)</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" placeholder="365" data-testid="input-validity-period" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="branding.fontStyle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Font Style</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-font-style">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="modern">Modern</SelectItem>
                            <SelectItem value="classic">Classic</SelectItem>
                            <SelectItem value="elegant">Elegant</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex items-center justify-between pt-4">
                  <div className="flex items-center gap-4">
                    <FormField
                      control={form.control}
                      name="autoIssue"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <input
                              type="checkbox"
                              checked={field.value}
                              onChange={field.onChange}
                              data-testid="checkbox-auto-issue"
                            />
                          </FormControl>
                          <FormLabel className="text-sm">Auto-issue certificates</FormLabel>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="requiresApproval"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <input
                              type="checkbox"
                              checked={field.value}
                              onChange={field.onChange}
                              data-testid="checkbox-requires-approval"
                            />
                          </FormControl>
                          <FormLabel className="text-sm">Requires approval</FormLabel>
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsCreateDialogOpen(false);
                        setEditingTemplate(null);
                        form.reset();
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={createTemplateMutation.isPending || updateTemplateMutation.isPending}
                      data-testid="button-save-template"
                    >
                      {editingTemplate ? "Update Template" : "Create Template"}
                    </Button>
                  </div>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

// Issued Certificates Management Component
function IssuedCertificatesManager() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("");

  // Fetch issued certificates
  const { data: certificates, isLoading } = useQuery({
    queryKey: ["/api/certificates", { search: searchTerm, status: statusFilter, type: typeFilter }]
  }) as { data: IssuedCertificate[] | undefined; isLoading: boolean };

  // Revoke certificate mutation
  const revokeCertificateMutation = useMutation({
    mutationFn: (certificateId: string) => apiRequest(`/api/certificates/${certificateId}/revoke`, {
      method: "POST"
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/certificates"] });
    }
  });

  const filteredCertificates = certificates?.filter(cert => {
    const matchesSearch = !searchTerm || 
      cert.user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cert.user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cert.certificateNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || cert.status === statusFilter;
    const matchesType = !typeFilter || cert.certificateType === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active": return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "expired": return <Clock className="w-4 h-4 text-yellow-600" />;
      case "revoked": return <XCircle className="w-4 h-4 text-red-600" />;
      default: return <Verified className="w-4 h-4 text-blue-600" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="w-5 h-5" />
          Issued Certificates
        </CardTitle>
        <CardDescription>
          View and manage all certificates issued to learners
        </CardDescription>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search certificates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64"
              data-testid="input-search-certificates"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32" data-testid="select-status-filter">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
              <SelectItem value="revoked">Revoked</SelectItem>
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-48" data-testid="select-type-filter">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Types</SelectItem>
              <SelectItem value="course">Course</SelectItem>
              <SelectItem value="learning_path">Learning Path</SelectItem>
              <SelectItem value="competency">Competency</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/certificates"] })}
            data-testid="button-refresh-certificates"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : filteredCertificates && filteredCertificates.length > 0 ? (
          <div className="space-y-3">
            {filteredCertificates.map((certificate) => (
              <Card key={certificate.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {getStatusIcon(certificate.status)}
                    <div>
                      <h4 className="font-medium">
                        {certificate.user.firstName} {certificate.user.lastName}
                      </h4>
                      <p className="text-sm text-muted-foreground">{certificate.user.email}</p>
                    </div>
                    <div>
                      <div className="font-medium text-sm">{certificate.title || "Certificate"}</div>
                      <div className="text-xs text-muted-foreground">#{certificate.certificateNumber}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <Badge variant={certificate.status === "active" ? "default" : 
                                    certificate.status === "expired" ? "secondary" : "destructive"}>
                        {certificate.status}
                      </Badge>
                      <div className="text-xs text-muted-foreground mt-1">
                        Issued: {new Date(certificate.issuedAt).toLocaleDateString()}
                      </div>
                      {certificate.expiresAt && (
                        <div className="text-xs text-muted-foreground">
                          Expires: {new Date(certificate.expiresAt).toLocaleDateString()}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        data-testid={`view-certificate-${certificate.id}`}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        data-testid={`download-certificate-${certificate.id}`}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      {certificate.status === "active" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => revokeCertificateMutation.mutate(certificate.id)}
                          data-testid={`revoke-certificate-${certificate.id}`}
                        >
                          <XCircle className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-medium mb-2">No certificates found</h3>
            <p className="text-sm text-muted-foreground">
              {searchTerm || statusFilter || typeFilter ? 
                "Try adjusting your filters" : 
                "Certificates will appear here once learners complete training"}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Certification Analytics Dashboard
function CertificationAnalytics() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["/api/certificates/analytics"]
  }) as { data: CertificationStats | undefined; isLoading: boolean };

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Award className="w-8 h-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Issued</p>
                <p className="text-2xl font-bold" data-testid="stat-total-issued">
                  {isLoading ? "-" : stats?.totalIssued || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Active</p>
                <p className="text-2xl font-bold" data-testid="stat-active">
                  {isLoading ? "-" : stats?.activeCount || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Clock className="w-8 h-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Expired</p>
                <p className="text-2xl font-bold" data-testid="stat-expired">
                  {isLoading ? "-" : stats?.expiredCount || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <TrendingUp className="w-8 h-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Monthly Rate</p>
                <p className="text-2xl font-bold" data-testid="stat-monthly-rate">
                  {isLoading ? "-" : Math.round(stats?.issueRate || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Templates */}
      <Card>
        <CardHeader>
          <CardTitle>Top Performing Templates</CardTitle>
          <CardDescription>Most frequently used certificate templates</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : stats?.topTemplates && stats.topTemplates.length > 0 ? (
            <div className="space-y-4">
              {stats.topTemplates.map((template, index) => (
                <div key={template.templateId} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 bg-muted rounded-full">
                      <span className="text-sm font-medium">{index + 1}</span>
                    </div>
                    <div>
                      <h4 className="font-medium">{template.templateName}</h4>
                      <p className="text-sm text-muted-foreground">{template.count} certificates issued</p>
                    </div>
                  </div>
                  <Badge variant="secondary">{template.count}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Star className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-medium mb-2">No template data available</h3>
              <p className="text-sm text-muted-foreground">Create and use templates to see analytics</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Main Auto-Certification System Component
export default function AutoCertificationSystem() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("templates");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Auto-Certification System</h1>
          <p className="text-muted-foreground">
            Automated certificate generation and management for ISO 9001:2015 compliance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" data-testid="button-export-certificates">
            <Download className="w-4 h-4 mr-2" />
            Export All
          </Button>
          <Button variant="outline" data-testid="button-verification-portal">
            <QrCode className="w-4 h-4 mr-2" />
            Verification Portal
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="templates" data-testid="tab-templates">Templates</TabsTrigger>
          <TabsTrigger value="certificates" data-testid="tab-certificates">Certificates</TabsTrigger>
          <TabsTrigger value="analytics" data-testid="tab-analytics">Analytics</TabsTrigger>
          <TabsTrigger value="settings" data-testid="tab-settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-6">
          <CertificateTemplateManager />
        </TabsContent>

        <TabsContent value="certificates" className="space-y-6">
          <IssuedCertificatesManager />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <CertificationAnalytics />
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Certification Settings</CardTitle>
              <CardDescription>Configure global certification policies and branding</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Settings className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-medium mb-2">Settings Coming Soon</h3>
                <p className="text-sm text-muted-foreground">Global certification settings will be available here</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}