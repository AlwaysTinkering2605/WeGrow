import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import {
  Plus,
  FileText,
  Calendar,
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Eye,
  Edit,
  Trash2,
  Target,
} from "lucide-react";

type ManagementReview = {
  id: string;
  reviewDate: Date;
  reviewPeriodStart: Date;
  reviewPeriodEnd: Date;
  chairPerson: string;
  attendees: string[];
  objectivesReviewed: string[];
  keyFindings: string;
  decisionsRequired: string;
  actionItems: any; // JSONB from backend
  nextReviewDate: Date | null;
  status: "scheduled" | "in_progress" | "completed" | "published";
  createdBy: string;
  createdAt: Date;
  updatedAt: Date | null;
};

const managementReviewSchema = z.object({
  reviewDate: z.string().min(1, "Review date is required"),
  reviewPeriodStart: z.string().min(1, "Review period start is required"),
  reviewPeriodEnd: z.string().min(1, "Review period end is required"),
  chairPerson: z.string().min(1, "Chair person is required"),
  attendees: z.string().min(1, "At least one attendee is required"),
  objectivesReviewed: z.string().min(1, "Objectives reviewed are required"),
  keyFindings: z.string().min(1, "Key findings are required"),
  decisionsRequired: z.string().min(1, "Decisions required are required"),
  actionItems: z.string().optional(),
  nextReviewDate: z.string().optional(),
  status: z.enum(["scheduled", "in_progress", "completed", "published"]),
});

type ManagementReviewForm = z.infer<typeof managementReviewSchema>;

const statusLabels: Record<string, string> = {
  scheduled: "Scheduled",
  in_progress: "In Progress",
  completed: "Completed",
  published: "Published",
};

const statusColors: Record<string, string> = {
  scheduled: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
  in_progress: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  completed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  published: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
};

export default function ManagementReviews() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedReview, setSelectedReview] = useState<ManagementReview | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [reviewToDelete, setReviewToDelete] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: reviews, isLoading } = useQuery<ManagementReview[]>({
    queryKey: ["/api/management-reviews"],
  });

  const createForm = useForm<ManagementReviewForm>({
    resolver: zodResolver(managementReviewSchema),
    defaultValues: {
      reviewDate: new Date().toISOString().split("T")[0],
      reviewPeriodStart: "",
      reviewPeriodEnd: "",
      chairPerson: "",
      attendees: "",
      objectivesReviewed: "",
      keyFindings: "",
      decisionsRequired: "",
      actionItems: "",
      nextReviewDate: "",
      status: "scheduled",
    },
  });

  const editForm = useForm<ManagementReviewForm>({
    resolver: zodResolver(managementReviewSchema),
  });

  const createMutation = useMutation({
    mutationFn: async (data: ManagementReviewForm) => {
      // Convert action items to structured JSONB format
      const actionItemsArray = data.actionItems 
        ? data.actionItems.split("\n").filter((a) => a.trim()).map((item, index) => ({
            id: index + 1,
            description: item,
            assignedTo: null,
            dueDate: null,
            status: "pending"
          }))
        : [];

      return await apiRequest("/api/management-reviews", {
        method: "POST",
        body: JSON.stringify({
          reviewDate: data.reviewDate,
          reviewPeriodStart: data.reviewPeriodStart,
          reviewPeriodEnd: data.reviewPeriodEnd,
          chairPerson: data.chairPerson,
          attendees: data.attendees.split("\n").filter((a) => a.trim()),
          objectivesReviewed: data.objectivesReviewed.split("\n").filter((o) => o.trim()),
          keyFindings: data.keyFindings,
          decisionsRequired: data.decisionsRequired,
          actionItems: actionItemsArray,
          nextReviewDate: data.nextReviewDate || null,
          status: data.status,
          createdBy: user?.id || "unknown",
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/management-reviews"] });
      toast({
        title: "Success",
        description: "Management review created successfully",
      });
      setIsCreateDialogOpen(false);
      createForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create management review",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ManagementReviewForm }) => {
      // Convert action items to structured JSONB format
      const actionItemsArray = data.actionItems 
        ? data.actionItems.split("\n").filter((a) => a.trim()).map((item, index) => ({
            id: index + 1,
            description: item,
            assignedTo: null,
            dueDate: null,
            status: "pending"
          }))
        : [];

      return await apiRequest(`/api/management-reviews/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          reviewDate: data.reviewDate,
          reviewPeriodStart: data.reviewPeriodStart,
          reviewPeriodEnd: data.reviewPeriodEnd,
          chairPerson: data.chairPerson,
          attendees: data.attendees.split("\n").filter((a) => a.trim()),
          objectivesReviewed: data.objectivesReviewed.split("\n").filter((o) => o.trim()),
          keyFindings: data.keyFindings,
          decisionsRequired: data.decisionsRequired,
          actionItems: actionItemsArray,
          nextReviewDate: data.nextReviewDate || null,
          status: data.status,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/management-reviews"] });
      toast({
        title: "Success",
        description: "Management review updated successfully",
      });
      setIsEditDialogOpen(false);
      setSelectedReview(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update management review",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/management-reviews/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/management-reviews"] });
      toast({
        title: "Success",
        description: "Management review deleted successfully",
      });
      setIsViewDialogOpen(false);
      setIsDeleteDialogOpen(false);
      setSelectedReview(null);
      setReviewToDelete(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete management review",
        variant: "destructive",
      });
    },
  });

  const handleViewReview = (review: ManagementReview) => {
    setSelectedReview(review);
    setIsViewDialogOpen(true);
  };

  // Get valid status transitions
  const getValidStatusTransitions = (currentStatus: string): string[] => {
    switch (currentStatus) {
      case "scheduled":
        return ["scheduled", "in_progress"];
      case "in_progress":
        return ["in_progress", "completed"];
      case "completed":
        return ["completed", "published"];
      case "published":
        return ["published"];
      default:
        return ["scheduled"];
    }
  };

  const handleEditReview = (review: ManagementReview) => {
    setSelectedReview(review);
    // Convert actionItems from JSONB to newline-separated string
    let actionItemsText = "";
    if (Array.isArray(review.actionItems)) {
      actionItemsText = review.actionItems.map((item: any) => 
        typeof item === "string" ? item : item.description || ""
      ).join("\n");
    }
    
    editForm.reset({
      reviewDate: format(new Date(review.reviewDate), "yyyy-MM-dd"),
      reviewPeriodStart: format(new Date(review.reviewPeriodStart), "yyyy-MM-dd"),
      reviewPeriodEnd: format(new Date(review.reviewPeriodEnd), "yyyy-MM-dd"),
      chairPerson: review.chairPerson,
      attendees: review.attendees.join("\n"),
      objectivesReviewed: review.objectivesReviewed.join("\n"),
      keyFindings: review.keyFindings,
      decisionsRequired: review.decisionsRequired,
      actionItems: actionItemsText,
      nextReviewDate: review.nextReviewDate ? format(new Date(review.nextReviewDate), "yyyy-MM-dd") : "",
      status: review.status,
    });
    setIsEditDialogOpen(true);
  };

  const handleDeleteReview = (id: string) => {
    setReviewToDelete(id);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (reviewToDelete) {
      deleteMutation.mutate(reviewToDelete);
    }
  };

  const onCreateSubmit = (data: ManagementReviewForm) => {
    createMutation.mutate(data);
  };

  const onEditSubmit = (data: ManagementReviewForm) => {
    if (selectedReview) {
      updateMutation.mutate({ id: selectedReview.id, data });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Management Reviews</h2>
            <p className="text-muted-foreground">ISO 9001:2015 Clause 9.3</p>
          </div>
        </div>
        <div className="grid gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="h-6 w-48 bg-muted animate-pulse rounded" />
              </CardHeader>
              <CardContent>
                <div className="h-4 w-full bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight" data-testid="title-management-reviews">Management Reviews</h2>
          <p className="text-muted-foreground">ISO 9001:2015 Clause 9.3 - Management Review of OKR Performance</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-review">
              <Plus className="w-4 h-4 mr-2" />
              Create Review
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Management Review</DialogTitle>
              <DialogDescription>
                Document a formal management review meeting for ISO 9001:2015 compliance
              </DialogDescription>
            </DialogHeader>
            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={createForm.control}
                    name="reviewDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Review Date *</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} data-testid="input-review-date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createForm.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-status">
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="scheduled">Scheduled</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          New reviews can start as Scheduled or In Progress
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={createForm.control}
                    name="reviewPeriodStart"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Review Period Start *</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} data-testid="input-period-start" />
                        </FormControl>
                        <FormDescription>Start date of review period</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createForm.control}
                    name="reviewPeriodEnd"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Review Period End *</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} data-testid="input-period-end" />
                        </FormControl>
                        <FormDescription>End date of review period</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={createForm.control}
                  name="chairPerson"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Chair Person *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Name of meeting chair" data-testid="input-chair-person" />
                      </FormControl>
                      <FormDescription>Person chairing the management review</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={createForm.control}
                  name="attendees"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Attendees *</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Enter attendees (one per line)"
                          rows={3}
                          data-testid="textarea-attendees"
                        />
                      </FormControl>
                      <FormDescription>
                        List all attendees, one per line (ISO 9001 requirement)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={createForm.control}
                  name="objectivesReviewed"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Objectives Reviewed *</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Enter objectives reviewed (one per line)"
                          rows={4}
                          data-testid="textarea-objectives-reviewed"
                        />
                      </FormControl>
                      <FormDescription>
                        List all objectives reviewed during the meeting
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={createForm.control}
                  name="keyFindings"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Key Findings *</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Document key findings and observations"
                          rows={4}
                          data-testid="textarea-key-findings"
                        />
                      </FormControl>
                      <FormDescription>
                        Summarize the main findings from the review (ISO 9001 requirement)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={createForm.control}
                  name="decisionsRequired"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Decisions Required *</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Document decisions and changes needed"
                          rows={4}
                          data-testid="textarea-decisions-required"
                        />
                      </FormControl>
                      <FormDescription>
                        Detail any decisions or changes required (ISO 9001 requirement)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={createForm.control}
                  name="actionItems"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Action Items</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Enter action items (one per line)"
                          rows={3}
                          data-testid="textarea-action-items"
                        />
                      </FormControl>
                      <FormDescription>
                        List follow-up actions, one per line
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={createForm.control}
                  name="nextReviewDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Next Review Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-next-review-date" />
                      </FormControl>
                      <FormDescription>
                        Schedule the next management review meeting
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateDialogOpen(false)}
                    data-testid="button-cancel-create"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-create">
                    {createMutation.isPending ? "Creating..." : "Create Review"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card data-testid="card-total-reviews">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reviews</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-reviews">{reviews?.length || 0}</div>
          </CardContent>
        </Card>

        <Card data-testid="card-approved-reviews">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500" data-testid="text-approved-reviews">
              {reviews?.filter((r) => r.status === "approved").length || 0}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-in-review">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Review</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500" data-testid="text-in-review">
              {reviews?.filter((r) => r.status === "in_review").length || 0}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-draft-reviews">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Drafts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-500" data-testid="text-draft-reviews">
              {reviews?.filter((r) => r.status === "draft").length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {!reviews || reviews.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No management reviews yet. Create your first review to get started.</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          reviews.map((review) => (
            <Card key={review.id} data-testid={`review-card-${review.id}`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg" data-testid={`review-title-${review.id}`}>
                        Management Review - {format(new Date(review.reviewDate), "MMMM d, yyyy")}
                      </CardTitle>
                      <Badge className={statusColors[review.status]} data-testid={`review-status-${review.id}`}>
                        {statusLabels[review.status]}
                      </Badge>
                    </div>
                    <CardDescription>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {review.attendees.length} attendees
                        </span>
                        <span className="flex items-center gap-1">
                          <Target className="h-3 w-3" />
                          {review.objectivesReviewed.length} objectives
                        </span>
                        {review.nextReviewDate && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Next: {format(new Date(review.nextReviewDate), "MMM d, yyyy")}
                          </span>
                        )}
                      </div>
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewReview(review)}
                      data-testid={`button-view-${review.id}`}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditReview(review)}
                      data-testid={`button-edit-${review.id}`}
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteReview(review.id)}
                      data-testid={`button-delete-${review.id}`}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <h4 className="font-medium text-sm mb-1">Key Findings:</h4>
                    <p className="text-sm text-muted-foreground line-clamp-2" data-testid={`review-findings-${review.id}`}>
                      {review.keyFindings}
                    </p>
                  </div>
                  {review.actionItems.length > 0 && (
                    <div>
                      <h4 className="font-medium text-sm mb-1">Action Items:</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        {review.actionItems.slice(0, 2).map((item, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-primary">•</span>
                            <span className="line-clamp-1">{item}</span>
                          </li>
                        ))}
                        {review.actionItems.length > 2 && (
                          <li className="text-xs">+{review.actionItems.length - 2} more</li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedReview && (
            <>
              <DialogHeader>
                <DialogTitle data-testid="view-dialog-title">Management Review Details</DialogTitle>
                <DialogDescription data-testid="view-dialog-date">
                  Review conducted on {format(new Date(selectedReview.reviewDate), "MMMM d, yyyy")}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Status</h4>
                  <Badge className={statusColors[selectedReview.status]} data-testid="view-dialog-status">
                    {statusLabels[selectedReview.status]}
                  </Badge>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Review Period</h4>
                  <p className="text-sm" data-testid="view-dialog-period">
                    {format(new Date(selectedReview.reviewPeriodStart), "MMMM d, yyyy")} - {format(new Date(selectedReview.reviewPeriodEnd), "MMMM d, yyyy")}
                  </p>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Chair Person</h4>
                  <p className="text-sm" data-testid="view-dialog-chair">
                    {selectedReview.chairPerson}
                  </p>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Attendees</h4>
                  <ul className="list-disc list-inside space-y-1" data-testid="view-dialog-attendees">
                    {selectedReview.attendees.map((attendee, idx) => (
                      <li key={idx} className="text-sm">{attendee}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Objectives Reviewed</h4>
                  <ul className="list-disc list-inside space-y-1" data-testid="view-dialog-objectives">
                    {selectedReview.objectivesReviewed.map((objective, idx) => (
                      <li key={idx} className="text-sm">{objective}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Key Findings</h4>
                  <p className="text-sm whitespace-pre-wrap" data-testid="view-dialog-findings">
                    {selectedReview.keyFindings}
                  </p>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Decisions Required</h4>
                  <p className="text-sm whitespace-pre-wrap" data-testid="view-dialog-decisions">
                    {selectedReview.decisionsRequired}
                  </p>
                </div>

                {selectedReview.actionItems.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Action Items</h4>
                    <ul className="list-disc list-inside space-y-1" data-testid="view-dialog-actions">
                      {selectedReview.actionItems.map((item, idx) => (
                        <li key={idx} className="text-sm">{item}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedReview.nextReviewDate && (
                  <div>
                    <h4 className="font-medium mb-2">Next Review Date</h4>
                    <p className="text-sm" data-testid="view-dialog-next-date">
                      {format(new Date(selectedReview.nextReviewDate), "MMMM d, yyyy")}
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle data-testid="delete-dialog-title">Confirm Deletion</DialogTitle>
            <DialogDescription data-testid="delete-dialog-description">
              Are you sure you want to delete this management review? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              data-testid="button-cancel-delete"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Management Review</DialogTitle>
            <DialogDescription>
              Update the management review details
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="reviewDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Review Date *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-edit-review-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="status"
                  render={({ field }) => {
                    const validStatuses = selectedReview 
                      ? getValidStatusTransitions(selectedReview.status)
                      : ["scheduled", "in_progress"];
                    return (
                      <FormItem>
                        <FormLabel>Status *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-edit-status">
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {validStatuses.includes("scheduled") && <SelectItem value="scheduled">Scheduled</SelectItem>}
                            {validStatuses.includes("in_progress") && <SelectItem value="in_progress">In Progress</SelectItem>}
                            {validStatuses.includes("completed") && <SelectItem value="completed">Completed</SelectItem>}
                            {validStatuses.includes("published") && <SelectItem value="published">Published</SelectItem>}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          {selectedReview?.status === "scheduled" && "Move to In Progress when review starts"}
                          {selectedReview?.status === "in_progress" && "Mark as Completed when review is done"}
                          {selectedReview?.status === "completed" && "Publish when ready to share"}
                          {selectedReview?.status === "published" && "Review is published"}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="reviewPeriodStart"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Review Period Start *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-edit-period-start" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="reviewPeriodEnd"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Review Period End *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-edit-period-end" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={editForm.control}
                name="chairPerson"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Chair Person *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Name of meeting chair" data-testid="input-edit-chair-person" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="attendees"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Attendees *</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Enter attendees (one per line)"
                        rows={3}
                        data-testid="textarea-edit-attendees"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="objectivesReviewed"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Objectives Reviewed *</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Enter objectives reviewed (one per line)"
                        rows={4}
                        data-testid="textarea-edit-objectives-reviewed"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="keyFindings"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Key Findings *</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Document key findings and observations"
                        rows={4}
                        data-testid="textarea-edit-key-findings"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="decisionsRequired"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Decisions Required *</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Document decisions and changes needed"
                        rows={4}
                        data-testid="textarea-edit-decisions-required"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="actionItems"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Action Items</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Enter action items (one per line)"
                        rows={3}
                        data-testid="textarea-edit-action-items"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="nextReviewDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Next Review Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-edit-next-review-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(false)}
                  data-testid="button-cancel-edit"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={updateMutation.isPending} data-testid="button-submit-edit">
                  {updateMutation.isPending ? "Updating..." : "Update Review"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
