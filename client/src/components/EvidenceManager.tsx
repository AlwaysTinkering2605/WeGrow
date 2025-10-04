import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FileText, Upload, CheckCircle, XCircle, Clock, Download, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface Evidence {
  id: string;
  linkedToId: string;
  linkedToType: string;
  evidenceType: string;
  title: string;
  description?: string;
  fileUrl?: string;
  uploadedAt: string;
  uploadedBy: string;
  verificationStatus: string;
  verifiedBy?: string;
  verifiedAt?: string;
  verificationNote?: string;
}

interface EvidenceManagerProps {
  linkedToId: string;
  linkedToType: string;
  canUpload?: boolean;
  canVerify?: boolean;
}

const evidenceFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  evidenceType: z.enum(['document', 'image', 'metric_report', 'compliance_report', 'other']),
  fileUrl: z.string().optional(),
});

type EvidenceFormValues = z.infer<typeof evidenceFormSchema>;

export function EvidenceManager({ linkedToId, linkedToType, canUpload = false, canVerify = false }: EvidenceManagerProps) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: evidence, isLoading } = useQuery<Evidence[]>({
    queryKey: ['/api/evidence', linkedToId, linkedToType],
    queryFn: async () => {
      const response = await fetch(`/api/evidence?linkedToId=${linkedToId}&linkedToType=${linkedToType}`);
      if (!response.ok) throw new Error('Failed to fetch evidence');
      return response.json();
    },
  });

  const form = useForm<EvidenceFormValues>({
    resolver: zodResolver(evidenceFormSchema),
    defaultValues: {
      title: '',
      description: '',
      evidenceType: 'document',
      fileUrl: '',
    },
  });

  const onSubmit = async (values: EvidenceFormValues) => {
    try {
      await apiRequest('/api/evidence', 'POST', {
        ...values,
        linkedToId,
        linkedToType,
      });

      await queryClient.invalidateQueries({ queryKey: ['/api/evidence', linkedToId, linkedToType] });
      
      toast({
        title: "Evidence uploaded",
        description: "Evidence has been added successfully",
      });
      
      setIsDialogOpen(false);
      form.reset();
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Failed to upload evidence",
        variant: "destructive",
      });
    }
  };

  const handleVerify = async (evidenceId: string, status: 'approved' | 'rejected', note?: string) => {
    try {
      await apiRequest(`/api/evidence/${evidenceId}/verify`, 'PUT', {
        status,
        note,
      });

      await queryClient.invalidateQueries({ queryKey: ['/api/evidence', linkedToId, linkedToType] });
      
      toast({
        title: "Evidence verified",
        description: `Evidence ${status}`,
      });
    } catch (error) {
      toast({
        title: "Verification failed",
        description: "Failed to verify evidence",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (evidenceId: string) => {
    if (!confirm('Are you sure you want to delete this evidence?')) return;

    try {
      await apiRequest(`/api/evidence/${evidenceId}`, 'DELETE');
      await queryClient.invalidateQueries({ queryKey: ['/api/evidence', linkedToId, linkedToType] });
      
      toast({
        title: "Evidence deleted",
        description: "Evidence has been removed",
      });
    } catch (error) {
      toast({
        title: "Delete failed",
        description: "Failed to delete evidence",
        variant: "destructive",
      });
    }
  };

  const getVerificationBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500" data-testid="badge-approved"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500" data-testid="badge-rejected"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="outline" data-testid="badge-pending"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
    }
  };

  const getEvidenceTypeLabel = (type: string) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (isLoading) {
    return (
      <Card data-testid="evidence-loading">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Evidence Repository
          </CardTitle>
          <CardDescription>Loading evidence...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card data-testid="evidence-manager">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Evidence Repository
            </CardTitle>
            <CardDescription>
              ISO 9001:2015 Clause 7.5 - Documented information control
            </CardDescription>
          </div>
          
          {canUpload && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" data-testid="button-upload-evidence">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Evidence
                </Button>
              </DialogTrigger>
              <DialogContent data-testid="dialog-upload-evidence">
                <DialogHeader>
                  <DialogTitle>Upload Evidence</DialogTitle>
                  <DialogDescription>
                    Add documentation, reports, or other evidence
                  </DialogDescription>
                </DialogHeader>
                
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Title</FormLabel>
                          <FormControl>
                            <Input placeholder="Evidence title" {...field} data-testid="input-title" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="evidenceType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-evidence-type">
                                <SelectValue placeholder="Select evidence type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="document">Document</SelectItem>
                              <SelectItem value="image">Image</SelectItem>
                              <SelectItem value="metric_report">Metric Report</SelectItem>
                              <SelectItem value="compliance_report">Compliance Report</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description (Optional)</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Describe this evidence" 
                              {...field} 
                              data-testid="textarea-description"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="fileUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>File URL (Optional)</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Object storage URL" 
                              {...field} 
                              data-testid="input-file-url"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end gap-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setIsDialogOpen(false)}
                        data-testid="button-cancel"
                      >
                        Cancel
                      </Button>
                      <Button type="submit" data-testid="button-submit">
                        Upload
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        {!evidence || evidence.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground" data-testid="no-evidence">
            No evidence uploaded yet
          </div>
        ) : (
          <div className="space-y-4">
            {evidence.map((item, index) => (
              <Card key={item.id} data-testid={`evidence-item-${index}`}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-medium" data-testid={`evidence-title-${index}`}>
                          {item.title}
                        </h4>
                        <Badge variant="secondary" data-testid={`evidence-type-${index}`}>
                          {getEvidenceTypeLabel(item.evidenceType)}
                        </Badge>
                        {getVerificationBadge(item.verificationStatus)}
                      </div>

                      {item.description && (
                        <p className="text-sm text-muted-foreground" data-testid={`evidence-description-${index}`}>
                          {item.description}
                        </p>
                      )}

                      <div className="text-xs text-muted-foreground">
                        Uploaded {format(new Date(item.uploadedAt), 'MMM d, yyyy')} by {item.uploadedBy}
                      </div>

                      {item.verifiedAt && (
                        <div className="text-xs text-muted-foreground">
                          Verified {format(new Date(item.verifiedAt), 'MMM d, yyyy')} by {item.verifiedBy}
                          {item.verificationNote && ` - ${item.verificationNote}`}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      {item.fileUrl && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => window.open(item.fileUrl, '_blank')}
                          data-testid={`button-download-${index}`}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      )}

                      {canVerify && item.verificationStatus === 'pending' && (
                        <>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="text-green-600"
                            onClick={() => handleVerify(item.id, 'approved')}
                            data-testid={`button-approve-${index}`}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="text-red-600"
                            onClick={() => handleVerify(item.id, 'rejected')}
                            data-testid={`button-reject-${index}`}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </>
                      )}

                      {canUpload && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="text-red-600"
                          onClick={() => handleDelete(item.id)}
                          data-testid={`button-delete-${index}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
