import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  Layers,
  AlertCircle,
} from "lucide-react";

const skillCategorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  typeId: z.string().min(1, "Type is required"),
  sortOrder: z.coerce.number().default(0),
  isActive: z.boolean().default(true),
});

type SkillCategoryFormType = z.infer<typeof skillCategorySchema>;

interface SkillCategoryType {
  id: string;
  name: string;
  code: string;
  description?: string;
  sortOrder: number;
  isActive: boolean;
}

interface SkillCategory {
  id: string;
  name: string;
  description?: string;
  type?: string; // Legacy enum field
  typeId?: string; // New normalized FK
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
}

export default function SkillCategories() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<SkillCategory | null>(null);
  const { toast } = useToast();

  const { data: categories, isLoading } = useQuery({
    queryKey: ["/api/skill-categories"]
  }) as { data: SkillCategory[] | undefined; isLoading: boolean };

  const { data: categoryTypes, isLoading: isLoadingTypes } = useQuery({
    queryKey: ["/api/skill-category-types"]
  }) as { data: SkillCategoryType[] | undefined; isLoading: boolean };

  const form = useForm<SkillCategoryFormType>({
    resolver: zodResolver(skillCategorySchema),
    defaultValues: {
      typeId: "",
      sortOrder: 0,
      isActive: true,
    }
  });

  const createMutation = useMutation({
    mutationFn: (data: SkillCategoryFormType) => apiRequest("/api/skill-categories", {
      method: "POST",
      body: JSON.stringify(data)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/skill-categories"] });
      toast({ title: "Success", description: "Skill category created successfully" });
      setIsCreateDialogOpen(false);
      form.reset();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create skill category", variant: "destructive" });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: SkillCategoryFormType }) => 
      apiRequest(`/api/skill-categories/${id}`, {
        method: "PUT",
        body: JSON.stringify(data)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/skill-categories"] });
      toast({ title: "Success", description: "Skill category updated successfully" });
      setEditingCategory(null);
      form.reset();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update skill category", variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/skill-categories/${id}`, {
      method: "DELETE"
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/skill-categories"] });
      toast({ title: "Success", description: "Skill category deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete skill category", variant: "destructive" });
    }
  });

  const onSubmit = (data: SkillCategoryFormType) => {
    if (editingCategory) {
      updateMutation.mutate({ id: editingCategory.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (category: SkillCategory) => {
    setEditingCategory(category);
    form.reset({
      name: category.name,
      description: category.description || "",
      typeId: category.typeId || "",
      sortOrder: category.sortOrder,
      isActive: category.isActive,
    });
    setIsCreateDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this skill category?")) {
      deleteMutation.mutate(id);
    }
  };

  const getTypeName = (category: SkillCategory): string => {
    if (category.typeId && categoryTypes) {
      const type = categoryTypes.find(t => t.id === category.typeId);
      return type?.name || category.type || "Unknown";
    }
    return category.type || "Unknown";
  };

  const getTypeColor = (typeName: string) => {
    const lowerName = typeName.toLowerCase();
    if (lowerName.includes("safety")) return "bg-red-100 text-red-800";
    if (lowerName.includes("compliance")) return "bg-purple-100 text-purple-800";
    if (lowerName.includes("behavioral")) return "bg-blue-100 text-blue-800";
    if (lowerName.includes("leadership")) return "bg-yellow-100 text-yellow-800";
    if (lowerName.includes("operational")) return "bg-orange-100 text-orange-800";
    return "bg-green-100 text-green-800";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Skill Categories</h1>
          <p className="text-muted-foreground">
            Manage normalized skill categories used across competencies, courses, and learning paths
          </p>
        </div>
        <Button onClick={() => {
          setEditingCategory(null);
          form.reset();
          setIsCreateDialogOpen(true);
        }} data-testid="button-create-skill-category">
          <Plus className="w-4 h-4 mr-2" />
          Create Category
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="w-5 h-5" />
            Skill Category List
          </CardTitle>
          <CardDescription>
            Categories are used to organize competencies, courses, and learning paths
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : categories && categories.length > 0 ? (
            <div className="space-y-3">
              {categories.map((category) => (
                <div key={category.id} className="p-4 border rounded-lg flex items-center justify-between hover:bg-muted/50">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium">{category.name}</h3>
                      <Badge className={getTypeColor(getTypeName(category))}>
                        {getTypeName(category)}
                      </Badge>
                      {!category.isActive && (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </div>
                    {category.description && (
                      <p className="text-sm text-muted-foreground">{category.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      Sort Order: {category.sortOrder}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(category)}
                      data-testid={`button-edit-category-${category.id}`}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(category.id)}
                      data-testid={`button-delete-category-${category.id}`}
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
              <h3 className="font-medium mb-2">No skill categories found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create your first skill category to start organizing competencies
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create First Category
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isCreateDialogOpen || !!editingCategory} onOpenChange={(open) => {
        if (!open) {
          setIsCreateDialogOpen(false);
          setEditingCategory(null);
          form.reset();
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? "Edit Skill Category" : "Create Skill Category"}
            </DialogTitle>
            <DialogDescription>
              {editingCategory ? "Update the skill category details" : "Add a new skill category for organizing competencies"}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., Cleaning Operations" data-testid="input-category-name" />
                    </FormControl>
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
                      <Textarea {...field} rows={3} placeholder="Describe this skill category..." data-testid="textarea-category-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="typeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-category-type">
                          <SelectValue placeholder="Select a type..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {isLoadingTypes ? (
                          <div className="p-2 text-sm text-muted-foreground">Loading types...</div>
                        ) : categoryTypes && categoryTypes.length > 0 ? (
                          categoryTypes.map((type) => (
                            <SelectItem key={type.id} value={type.id}>
                              {type.name}
                            </SelectItem>
                          ))
                        ) : (
                          <div className="p-2 text-sm text-muted-foreground">No types available</div>
                        )}
                      </SelectContent>
                    </Select>
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
                      <Input type="number" {...field} placeholder="0" data-testid="input-sort-order" />
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
                    setEditingCategory(null);
                    form.reset();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-submit-category"
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? "Saving..."
                    : editingCategory
                    ? "Update Category"
                    : "Create Category"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
