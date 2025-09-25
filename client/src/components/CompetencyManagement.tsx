import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
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
  Layers,
  TreePine,
  Plus,
  Edit,
  Trash2,
  GripVertical,
  ChevronRight,
  ChevronDown,
  Settings,
  Users,
  FileText,
  Award,
  CheckCircle,
  XCircle,
  Clock,
  BarChart3,
  Target,
  Shield,
  Upload,
  Download,
  RefreshCw,
  Move,
  Tree,
  TreeHorizontal
} from "lucide-react";

// Form schemas for competency management
const competencySchema = z.object({
  title: z.string().min(1, "Competency title is required"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  category: z.string().min(1, "Category is required"),
  level: z.coerce.number().min(1).max(5),
  parentId: z.string().optional(),
  requiredForRoles: z.array(z.string()).default([]),
  skillType: z.enum(["technical", "behavioral", "safety", "compliance"]).default("technical"),
  assessmentCriteria: z.string().optional(),
  trainingResources: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
});

const roleMappingSchema = z.object({
  roleId: z.string().min(1, "Role is required"),
  competencyId: z.string().min(1, "Competency is required"),
  priority: z.enum(["critical", "important", "desired"]).default("important"),
  targetLevel: z.coerce.number().min(1).max(5).default(3),
  deadline: z.string().optional(),
  isRequired: z.boolean().default(true),
});

const evidenceSchema = z.object({
  competencyId: z.string().min(1, "Competency is required"),
  evidenceType: z.enum(["document", "observation", "assessment", "certification"]).default("document"),
  title: z.string().min(1, "Evidence title is required"),
  description: z.string().min(10, "Description is required"),
  url: z.string().url().optional().or(z.literal("")),
  verifiedBy: z.string().optional(),
  verificationStatus: z.enum(["pending", "verified", "rejected"]).default("pending"),
});

type CompetencyFormType = z.infer<typeof competencySchema>;
type RoleMappingFormType = z.infer<typeof roleMappingSchema>;
type EvidenceFormType = z.infer<typeof evidenceSchema>;

// Types for competency data
interface Competency {
  id: string;
  title: string;
  description: string;
  category: string;
  level: number;
  parentId?: string;
  children?: Competency[];
  skillType: "technical" | "behavioral" | "safety" | "compliance";
  assessmentCriteria?: string;
  isActive: boolean;
}

interface RoleMapping {
  id: string;
  roleId: string;
  competencyId: string;
  priority: "critical" | "important" | "desired";
  targetLevel: number;
  deadline?: string;
  isRequired: boolean;
  competency?: Competency;
}

interface EvidenceRecord {
  id: string;
  userId: string;
  competencyId: string;
  evidenceType: "document" | "observation" | "assessment" | "certification";
  title: string;
  description: string;
  url?: string;
  verifiedBy?: string;
  verificationStatus: "pending" | "verified" | "rejected";
  createdAt: string;
  competency?: Competency;
}

// Hierarchical Competency Tree Component
function CompetencyTree({ competencies, onEdit, onDelete, onReorder }: {
  competencies: Competency[];
  onEdit: (competency: Competency) => void;
  onDelete: (id: string) => void;
  onReorder: (id: string, newParentId?: string, newPosition?: number) => void;
}) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [draggedItem, setDraggedItem] = useState<string | null>(null);

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
    setDraggedItem(id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, targetId: string, position: "before" | "after" | "child") => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData("text/plain");
    
    if (sourceId === targetId) return;

    if (position === "child") {
      onReorder(sourceId, targetId);
    } else {
      // For before/after positioning, we'd need more complex logic
      // For now, just treat as re-parenting
      const targetCompetency = competencies.find(c => c.id === targetId);
      onReorder(sourceId, targetCompetency?.parentId);
    }
    
    setDraggedItem(null);
  };

  const renderCompetency = (competency: Competency, level: number = 0) => {
    const hasChildren = competency.children && competency.children.length > 0;
    const isExpanded = expandedItems.has(competency.id);
    const isDragging = draggedItem === competency.id;

    return (
      <div key={competency.id} className={`${isDragging ? "opacity-50" : ""}`}>
        <div
          className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 group"
          style={{ marginLeft: `${level * 20}px` }}
          draggable
          onDragStart={(e) => handleDragStart(e, competency.id)}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, competency.id, "child")}
          data-testid={`competency-${competency.id}`}
        >
          <GripVertical className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 cursor-grab" />
          
          {hasChildren ? (
            <Button
              variant="ghost"
              size="sm"
              className="w-6 h-6 p-0"
              onClick={() => toggleExpanded(competency.id)}
              data-testid={`expand-${competency.id}`}
            >
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </Button>
          ) : (
            <div className="w-6 h-6" />
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="font-medium text-sm">{competency.title}</h4>
              <Badge variant={competency.skillType === "safety" ? "destructive" : 
                             competency.skillType === "compliance" ? "secondary" :
                             competency.skillType === "behavioral" ? "outline" : "default"}>
                {competency.skillType}
              </Badge>
              <Badge variant="outline">L{competency.level}</Badge>
              {!competency.isActive && <Badge variant="destructive">Inactive</Badge>}
            </div>
            <p className="text-xs text-muted-foreground truncate">{competency.description}</p>
          </div>

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(competency)}
              data-testid={`edit-competency-${competency.id}`}
            >
              <Edit className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(competency.id)}
              data-testid={`delete-competency-${competency.id}`}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div>
            {competency.children!.map(child => renderCompetency(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-1">
      {competencies
        .filter(c => !c.parentId) // Only show root-level competencies
        .map(competency => renderCompetency(competency))}
    </div>
  );
}

// Role Competency Mapping Interface
function RoleCompetencyMapping() {
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: roleMappings, isLoading: isLoadingMappings } = useQuery({
    queryKey: ["/api/role-competency-mappings", selectedRole],
    enabled: !!selectedRole
  });

  const { data: competencies } = useQuery({
    queryKey: ["/api/competency-library"]
  });

  const createMappingMutation = useMutation({
    mutationFn: (data: RoleMappingFormType) => apiRequest("/api/role-competency-mappings", {
      method: "POST",
      body: JSON.stringify(data)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/role-competency-mappings"] });
      setIsCreateDialogOpen(false);
      toast({ title: "Role mapping created successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to create role mapping", description: error.message, variant: "destructive" });
    }
  });

  const updateMappingMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<RoleMappingFormType> }) => 
      apiRequest(`/api/role-competency-mappings/${id}`, {
        method: "PUT",
        body: JSON.stringify(data)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/role-competency-mappings"] });
      toast({ title: "Role mapping updated successfully" });
    }
  });

  const deleteMappingMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/role-competency-mappings/${id}`, {
      method: "DELETE"
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/role-competency-mappings"] });
      toast({ title: "Role mapping deleted successfully" });
    }
  });

  const form = useForm<RoleMappingFormType>({
    resolver: zodResolver(roleMappingSchema),
    defaultValues: {
      priority: "important",
      targetLevel: 3,
      isRequired: true
    }
  });

  const onSubmit = (data: RoleMappingFormType) => {
    createMappingMutation.mutate(data);
  };

  const roles = [
    { value: "operative", label: "Cleaning Operative" },
    { value: "supervisor", label: "Area Supervisor" },
    { value: "leadership", label: "Senior Leadership" }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Role Competency Mapping
        </CardTitle>
        <CardDescription>
          Map competencies to roles with priorities and target levels
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <Select value={selectedRole} onValueChange={setSelectedRole}>
            <SelectTrigger className="w-64" data-testid="select-role">
              <SelectValue placeholder="Select a role" />
            </SelectTrigger>
            <SelectContent>
              {roles.map((role) => (
                <SelectItem key={role.value} value={role.value}>
                  {role.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button disabled={!selectedRole} data-testid="button-create-mapping">
                <Plus className="w-4 h-4 mr-2" />
                Add Competency
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Competency to Role</DialogTitle>
                <DialogDescription>
                  Map a competency to the selected role with target level and priority
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="roleId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role</FormLabel>
                        <FormControl>
                          <Input {...field} value={selectedRole} readOnly />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="competencyId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Competency</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-competency">
                              <SelectValue placeholder="Select competency" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {competencies?.map((comp: Competency) => (
                              <SelectItem key={comp.id} value={comp.id}>
                                {comp.title} (Level {comp.level})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Priority</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-priority">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="critical">Critical</SelectItem>
                            <SelectItem value="important">Important</SelectItem>
                            <SelectItem value="desired">Desired</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="targetLevel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Target Level (1-5)</FormLabel>
                        <FormControl>
                          <Input type="number" min="1" max="5" {...field} data-testid="input-target-level" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="deadline"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Deadline (Optional)</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} data-testid="input-deadline" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createMappingMutation.isPending} data-testid="button-submit-mapping">
                      {createMappingMutation.isPending ? "Creating..." : "Create Mapping"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {selectedRole && (
          <div className="space-y-4">
            {isLoadingMappings ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : roleMappings?.length > 0 ? (
              <div className="space-y-2">
                {roleMappings.map((mapping: RoleMapping) => (
                  <div key={mapping.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{mapping.competency?.title}</h4>
                        <Badge variant={mapping.priority === "critical" ? "destructive" : 
                                       mapping.priority === "important" ? "default" : "secondary"}>
                          {mapping.priority}
                        </Badge>
                        <Badge variant="outline">Target L{mapping.targetLevel}</Badge>
                        {mapping.isRequired && <Badge variant="outline">Required</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">{mapping.competency?.description}</p>
                      {mapping.deadline && (
                        <p className="text-xs text-muted-foreground">Deadline: {new Date(mapping.deadline).toLocaleDateString()}</p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteMappingMutation.mutate(mapping.id)}
                      data-testid={`delete-mapping-${mapping.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-medium mb-2">No competencies mapped</h3>
                <p className="text-sm text-muted-foreground">Add competencies to this role to get started</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Audit Trail Viewing Interface
function AuditTrailViewer() {
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedCompetencyId, setSelectedCompetencyId] = useState<string>("");
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: evidenceRecords, isLoading: isLoadingEvidence } = useQuery({
    queryKey: ["/api/competency-evidence", selectedUserId],
    enabled: !!selectedUserId
  });

  const { data: statusHistory, isLoading: isLoadingHistory } = useQuery({
    queryKey: ["/api/competency-status-history", selectedUserId],
    enabled: !!selectedUserId
  });

  const { data: users } = useQuery({
    queryKey: ["/api/users"]
  });

  const { data: competencies } = useQuery({
    queryKey: ["/api/competency-library"]
  });

  const verifyEvidenceMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "verified" | "rejected" }) =>
      apiRequest(`/api/competency-evidence/${id}/verify`, {
        method: "POST",
        body: JSON.stringify({ verificationStatus: status, verifiedBy: user?.id })
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/competency-evidence"] });
      toast({ title: "Evidence verification updated" });
    }
  });

  const filteredEvidence = evidenceRecords?.filter((record: EvidenceRecord) => 
    !selectedCompetencyId || record.competencyId === selectedCompetencyId
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Audit Trail & Evidence Viewer
        </CardTitle>
        <CardDescription>
          View competency evidence and track verification status
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <Select value={selectedUserId} onValueChange={setSelectedUserId}>
            <SelectTrigger className="w-64" data-testid="select-user">
              <SelectValue placeholder="Select a user" />
            </SelectTrigger>
            <SelectContent>
              {users?.map((user: any) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.firstName} {user.lastName} ({user.role})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedCompetencyId} onValueChange={setSelectedCompetencyId}>
            <SelectTrigger className="w-64" data-testid="select-competency-filter">
              <SelectValue placeholder="Filter by competency" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All competencies</SelectItem>
              {competencies?.map((comp: Competency) => (
                <SelectItem key={comp.id} value={comp.id}>
                  {comp.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedUserId && (
          <Tabs defaultValue="evidence" className="w-full">
            <TabsList>
              <TabsTrigger value="evidence" data-testid="tab-evidence">Evidence Records</TabsTrigger>
              <TabsTrigger value="history" data-testid="tab-history">Status History</TabsTrigger>
            </TabsList>

            <TabsContent value="evidence" className="space-y-4">
              {isLoadingEvidence ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : filteredEvidence?.length > 0 ? (
                <div className="space-y-4">
                  {filteredEvidence.map((record: EvidenceRecord) => (
                    <div key={record.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-medium">{record.title}</h4>
                            <Badge variant={record.verificationStatus === "verified" ? "default" :
                                           record.verificationStatus === "rejected" ? "destructive" : "secondary"}>
                              {record.verificationStatus}
                            </Badge>
                            <Badge variant="outline">{record.evidenceType}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{record.description}</p>
                          <p className="text-xs text-muted-foreground">
                            Competency: {record.competency?.title} | 
                            Submitted: {new Date(record.createdAt).toLocaleDateString()}
                          </p>
                          {record.url && (
                            <a 
                              href={record.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-sm text-primary hover:underline"
                            >
                              View Evidence →
                            </a>
                          )}
                        </div>

                        {record.verificationStatus === "pending" && (user?.role === "supervisor" || user?.role === "leadership") && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => verifyEvidenceMutation.mutate({ id: record.id, status: "verified" })}
                              data-testid={`verify-${record.id}`}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Verify
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => verifyEvidenceMutation.mutate({ id: record.id, status: "rejected" })}
                              data-testid={`reject-${record.id}`}
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-medium mb-2">No evidence records</h3>
                  <p className="text-sm text-muted-foreground">No evidence has been submitted for this user</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="history" className="space-y-4">
              {isLoadingHistory ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : statusHistory?.length > 0 ? (
                <div className="space-y-2">
                  {statusHistory.map((entry: any) => (
                    <div key={entry.id} className="flex items-center gap-4 p-3 border rounded-lg">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{entry.competency?.title}</span>
                          <Badge variant="outline">Level {entry.currentLevel}</Badge>
                          <Badge variant={entry.status === "achieved" ? "default" : 
                                         entry.status === "in_progress" ? "secondary" : "outline"}>
                            {entry.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {new Date(entry.updatedAt).toLocaleDateString()} • {entry.notes}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-medium mb-2">No status history</h3>
                  <p className="text-sm text-muted-foreground">No competency status updates for this user</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}

// Main Competency Management Component
export default function CompetencyManagement() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingCompetency, setEditingCompetency] = useState<Competency | null>(null);
  const { toast } = useToast();

  const { data: competencies, isLoading } = useQuery({
    queryKey: ["/api/competency-library/hierarchical"]
  });

  const createCompetencyMutation = useMutation({
    mutationFn: (data: CompetencyFormType) => apiRequest("/api/competency-library", {
      method: "POST",
      body: JSON.stringify(data)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/competency-library"] });
      setIsCreateDialogOpen(false);
      toast({ title: "Competency created successfully" });
    }
  });

  const updateCompetencyMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CompetencyFormType }) => 
      apiRequest(`/api/competency-library/${id}`, {
        method: "PUT",
        body: JSON.stringify(data)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/competency-library"] });
      setEditingCompetency(null);
      toast({ title: "Competency updated successfully" });
    }
  });

  const deleteCompetencyMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/competency-library/${id}`, {
      method: "DELETE"
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/competency-library"] });
      toast({ title: "Competency deleted successfully" });
    }
  });

  const form = useForm<CompetencyFormType>({
    resolver: zodResolver(competencySchema),
    defaultValues: {
      level: 1,
      skillType: "technical",
      isActive: true,
      requiredForRoles: [],
      trainingResources: []
    }
  });

  const onSubmit = (data: CompetencyFormType) => {
    if (editingCompetency) {
      updateCompetencyMutation.mutate({ id: editingCompetency.id, data });
    } else {
      createCompetencyMutation.mutate(data);
    }
  };

  const handleEdit = (competency: Competency) => {
    setEditingCompetency(competency);
    form.reset({
      title: competency.title,
      description: competency.description,
      category: competency.category,
      level: competency.level,
      parentId: competency.parentId,
      skillType: competency.skillType,
      assessmentCriteria: competency.assessmentCriteria,
      isActive: competency.isActive,
      requiredForRoles: [],
      trainingResources: []
    });
  };

  const handleReorder = (id: string, newParentId?: string, newPosition?: number) => {
    // For now, just update the parent
    // A full implementation would handle position ordering as well
    updateCompetencyMutation.mutate({ 
      id, 
      data: { parentId: newParentId } as CompetencyFormType 
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Competency Management</h1>
          <p className="text-muted-foreground">Manage hierarchical competency library, role mappings, and audit trails</p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)} data-testid="button-create-competency">
          <Plus className="w-4 h-4 mr-2" />
          Create Competency
        </Button>
      </div>

      <Tabs defaultValue="library" className="w-full">
        <TabsList>
          <TabsTrigger value="library" data-testid="tab-library">Competency Library</TabsTrigger>
          <TabsTrigger value="mappings" data-testid="tab-mappings">Role Mappings</TabsTrigger>
          <TabsTrigger value="audit" data-testid="tab-audit">Audit Trail</TabsTrigger>
        </TabsList>

        <TabsContent value="library" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TreeHorizontal className="w-5 h-5" />
                Hierarchical Competency Library
              </CardTitle>
              <CardDescription>
                Manage competencies with drag-and-drop reordering and level management
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : competencies?.length > 0 ? (
                <CompetencyTree
                  competencies={competencies}
                  onEdit={handleEdit}
                  onDelete={(id) => deleteCompetencyMutation.mutate(id)}
                  onReorder={handleReorder}
                />
              ) : (
                <div className="text-center py-8">
                  <Tree className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-medium mb-2">No competencies found</h3>
                  <p className="text-sm text-muted-foreground">Create your first competency to get started</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mappings">
          <RoleCompetencyMapping />
        </TabsContent>

        <TabsContent value="audit">
          <AuditTrailViewer />
        </TabsContent>
      </Tabs>

      {/* Create/Edit Competency Dialog */}
      <Dialog open={isCreateDialogOpen || !!editingCompetency} onOpenChange={(open) => {
        if (!open) {
          setIsCreateDialogOpen(false);
          setEditingCompetency(null);
          form.reset();
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingCompetency ? "Edit Competency" : "Create New Competency"}</DialogTitle>
            <DialogDescription>
              {editingCompetency ? "Update the competency details" : "Add a new competency to the library"}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-competency-title" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-competency-category" />
                      </FormControl>
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
                      <Textarea {...field} rows={3} data-testid="input-competency-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="skillType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Skill Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-skill-type">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="technical">Technical</SelectItem>
                          <SelectItem value="behavioral">Behavioral</SelectItem>
                          <SelectItem value="safety">Safety</SelectItem>
                          <SelectItem value="compliance">Compliance</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="level"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Level (1-5)</FormLabel>
                      <FormControl>
                        <Input type="number" min="1" max="5" {...field} data-testid="input-competency-level" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="parentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Parent Competency</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger data-testid="select-parent-competency">
                            <SelectValue placeholder="None (root level)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">None (root level)</SelectItem>
                          {competencies?.map((comp: Competency) => (
                            <SelectItem key={comp.id} value={comp.id}>
                              {comp.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="assessmentCriteria"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assessment Criteria (Optional)</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={2} data-testid="input-assessment-criteria" />
                    </FormControl>
                    <FormDescription>
                      Describe how this competency should be assessed or evaluated
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => {
                  setIsCreateDialogOpen(false);
                  setEditingCompetency(null);
                  form.reset();
                }}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createCompetencyMutation.isPending || updateCompetencyMutation.isPending}
                  data-testid="button-submit-competency"
                >
                  {(createCompetencyMutation.isPending || updateCompetencyMutation.isPending) ? "Saving..." : 
                   editingCompetency ? "Update Competency" : "Create Competency"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}