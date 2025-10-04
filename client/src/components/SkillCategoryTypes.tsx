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
  Tag,
  AlertCircle,
} from "lucide-react";

const skillCategoryTypeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1, "Code is required").regex(/^[a-z_]+$/, "Code must be lowercase letters and underscores only"),
  description: z.string().optional(),
  sortOrder: z.coerce.number().default(0),
  isActive: z.boolean().default(true),
});

type SkillCategoryTypeFormType = z.infer<typeof skillCategoryTypeSchema>;

interface SkillCategoryType {
  id: string;
  name: string;
  code: string;
  description?: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
}

export default function SkillCategoryTypes() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<SkillCategoryType | null>(null);
  const { toast } = useToast();

  const { data: types, isLoading } = useQuery({
    queryKey: ["/api/skill-category-types"]
  }) as { data: SkillCategoryType[] | undefined; isLoading: boolean };

  const form = useForm<SkillCategoryTypeFormType>({
    resolver: zodResolver(skillCategoryTypeSchema),
    defaultValues: {
      code: "",
      sortOrder: 0,
      isActive: true,
    }
  });

  const createMutation = useMutation({
    mutationFn: (data: SkillCategoryTypeFormType) => apiRequest("/api/skill-category-types", {
      method: "POST",
      body: JSON.stringify(data)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/skill-category-types"] });
      queryClient.invalidateQueries({ queryKey: ["/api/skill-categories"] });
      toast({ title: "Success", description: "Category type created successfully" });
      setIsCreateDialogOpen(false);
      form.reset();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create category type", variant: "destructive" });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: SkillCategoryTypeFormType }) => 
      apiRequest(`/api/skill-category-types/${id}`, {
        method: "PUT",
        body: JSON.stringify(data)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/skill-category-types"] });
      queryClient.invalidateQueries({ queryKey: ["/api/skill-categories"] });
      toast({ title: "Success", description: "Category type updated successfully" });
      setEditingType(null);
      form.reset();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update category type", variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/skill-category-types/${id}`, {
      method: "DELETE"
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/skill-category-types"] });
      queryClient.invalidateQueries({ queryKey: ["/api/skill-categories"] });
      toast({ title: "Success", description: "Category type deleted successfully" });
    },
    onError: (error: any) => {
      const message = error?.message || "Failed to delete category type";
      toast({ title: "Error", description: message, variant: "destructive" });
    }
  });

  const onSubmit = (data: SkillCategoryTypeFormType) => {
    if (editingType) {
      updateMutation.mutate({ id: editingType.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (type: SkillCategoryType) => {
    setEditingType(type);
    form.reset({
      name: type.name,
      code: type.code,
      description: type.description || "",
      sortOrder: type.sortOrder,
      isActive: type.isActive,
    });
    setIsCreateDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this category type? This may affect existing skill categories.")) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Skill Category Types</h1>
          <p className="text-muted-foreground">
            Manage normalized category types used to classify skill categories
          </p>
        </div>
        <Button onClick={() => {
          setEditingType(null);
          form.reset();
          setIsCreateDialogOpen(true);
        }} data-testid="button-create-type">
          <Plus className="w-4 h-4 mr-2" />
          Create Type
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="w-5 h-5" />
            Category Type List
          </CardTitle>
          <CardDescription>
            Types are used to classify skill categories across the platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : types && types.length > 0 ? (
            <div className="space-y-3">
              {types.map((type) => (
                <div key={type.id} className="p-4 border rounded-lg flex items-center justify-between hover:bg-muted/50">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium">{type.name}</h3>
                      <Badge variant="outline">{type.code}</Badge>
                      {!type.isActive && (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </div>
                    {type.description && (
                      <p className="text-sm text-muted-foreground">{type.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      Sort Order: {type.sortOrder}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(type)}
                      data-testid={`button-edit-type-${type.id}`}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(type.id)}
                      data-testid={`button-delete-type-${type.id}`}
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
              <h3 className="font-medium mb-2">No category types found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create your first category type to classify skill categories
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create First Type
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isCreateDialogOpen || !!editingType} onOpenChange={(open) => {
        if (!open) {
          setIsCreateDialogOpen(false);
          setEditingType(null);
          form.reset();
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingType ? "Edit Category Type" : "Create Category Type"}
            </DialogTitle>
            <DialogDescription>
              {editingType ? "Update the category type details" : "Add a new type for classifying skill categories"}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., Technical" data-testid="input-type-name" />
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
                    <FormLabel>Type Code</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., technical" data-testid="input-type-code" />
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
                      <Textarea {...field} rows={3} placeholder="Describe this type..." data-testid="textarea-type-description" />
                    </FormControl>
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
                      <Input type="number" {...field} placeholder="0" data-testid="input-type-sort-order" />
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
                    setEditingType(null);
                    form.reset();
                  }}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-submit-type"
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? "Saving..."
                    : editingType
                    ? "Update Type"
                    : "Create Type"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
