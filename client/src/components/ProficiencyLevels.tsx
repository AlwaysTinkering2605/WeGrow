import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Plus,
  Edit,
  Trash2,
  TrendingUp,
  AlertCircle,
} from "lucide-react";

const proficiencyLevelSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1, "Code is required").regex(/^[a-z_]+$/, "Code must be lowercase letters and underscores only"),
  description: z.string().optional(),
  numericValue: z.coerce.number().min(1, "Numeric value is required and must be at least 1").max(10, "Maximum value is 10"),
  sortOrder: z.coerce.number().default(0),
  isActive: z.boolean().default(true),
});

type ProficiencyLevelFormType = z.infer<typeof proficiencyLevelSchema>;

interface ProficiencyLevel {
  id: string;
  name: string;
  code: string;
  description?: string;
  numericValue: number;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
}

export default function ProficiencyLevels() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingLevel, setEditingLevel] = useState<ProficiencyLevel | null>(null);
  const { toast } = useToast();

  const { data: levels, isLoading } = useQuery({
    queryKey: ["/api/proficiency-levels"]
  }) as { data: ProficiencyLevel[] | undefined; isLoading: boolean };

  const form = useForm<ProficiencyLevelFormType>({
    resolver: zodResolver(proficiencyLevelSchema),
    defaultValues: {
      code: "",
      numericValue: 1,
      sortOrder: 0,
      isActive: true,
    }
  });

  const createMutation = useMutation({
    mutationFn: (data: ProficiencyLevelFormType) => apiRequest("/api/proficiency-levels", {
      method: "POST",
      body: JSON.stringify(data)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/proficiency-levels"] });
      toast({ title: "Success", description: "Proficiency level created successfully" });
      setIsCreateDialogOpen(false);
      form.reset();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create proficiency level", variant: "destructive" });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ProficiencyLevelFormType }) => 
      apiRequest(`/api/proficiency-levels/${id}`, {
        method: "PUT",
        body: JSON.stringify(data)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/proficiency-levels"] });
      toast({ title: "Success", description: "Proficiency level updated successfully" });
      setEditingLevel(null);
      form.reset();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update proficiency level", variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/proficiency-levels/${id}`, {
      method: "DELETE"
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/proficiency-levels"] });
      toast({ title: "Success", description: "Proficiency level deleted successfully" });
    },
    onError: (error: any) => {
      const message = error?.message || "Failed to delete proficiency level";
      toast({ title: "Error", description: message, variant: "destructive" });
    }
  });

  const onSubmit = (data: ProficiencyLevelFormType) => {
    if (editingLevel) {
      updateMutation.mutate({ id: editingLevel.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (level: ProficiencyLevel) => {
    setEditingLevel(level);
    form.reset({
      name: level.name,
      code: level.code,
      description: level.description || "",
      numericValue: level.numericValue,
      sortOrder: level.sortOrder,
      isActive: level.isActive,
    });
    setIsCreateDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this proficiency level? This may affect existing competency assessments.")) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Proficiency Levels</h1>
          <p className="text-muted-foreground">
            Manage normalized proficiency levels for competency assessment
          </p>
        </div>
        <Button onClick={() => {
          setEditingLevel(null);
          form.reset();
          setIsCreateDialogOpen(true);
        }} data-testid="button-create-level">
          <Plus className="w-4 h-4 mr-2" />
          Create Level
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Proficiency Level List
          </CardTitle>
          <CardDescription>
            Levels represent skill mastery from beginner to expert
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : levels && levels.length > 0 ? (
            <div className="space-y-3">
              {levels.map((level) => (
                <div key={level.id} className="p-4 border rounded-lg flex items-center justify-between hover:bg-muted/50" data-testid={`card-level-${level.id}`}>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium">{level.name}</h3>
                      <Badge variant="outline">{level.code}</Badge>
                      <Badge variant="secondary">Level {level.numericValue}</Badge>
                      {!level.isActive && (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </div>
                    {level.description && (
                      <p className="text-sm text-muted-foreground">{level.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      Sort Order: {level.sortOrder}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(level)}
                      data-testid={`button-edit-level-${level.id}`}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(level.id)}
                      data-testid={`button-delete-level-${level.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-medium mb-2">No proficiency levels found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create your first proficiency level to assess competencies
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create First Level
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isCreateDialogOpen || !!editingLevel} onOpenChange={(open) => {
        if (!open) {
          setIsCreateDialogOpen(false);
          setEditingLevel(null);
          form.reset();
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingLevel ? "Edit Proficiency Level" : "Create Proficiency Level"}
            </DialogTitle>
            <DialogDescription>
              {editingLevel ? "Update the proficiency level details" : "Add a new level for skill assessment"}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Level Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., Foundation" data-testid="input-level-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Level Code</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., foundation" data-testid="input-level-code" />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">Lowercase letters and underscores only</p>
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
                      <Textarea {...field} rows={3} placeholder="Describe this level..." data-testid="textarea-level-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="numericValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Numeric Value (1-10)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} placeholder="1" min="1" max="10" data-testid="input-level-numeric-value" />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">Higher numbers indicate greater proficiency</p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sortOrder"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sort Order</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} placeholder="0" data-testid="input-level-sort-order" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsCreateDialogOpen(false);
                    setEditingLevel(null);
                    form.reset();
                  }}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-submit-level"
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? "Saving..."
                    : editingLevel
                    ? "Update Level"
                    : "Create Level"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
