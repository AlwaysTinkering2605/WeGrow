import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  Sparkles,
  AlertCircle,
  Target,
} from "lucide-react";

const skillSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  categoryId: z.string().min(1, "Category is required"),
  targetProficiencyId: z.string().nullish(),
  isActive: z.boolean().default(true),
});

type SkillFormType = z.infer<typeof skillSchema>;

interface Skill {
  id: string;
  name: string;
  description?: string;
  categoryId: string;
  targetProficiencyId?: string | null;
  isActive: boolean;
  createdAt: string;
}

interface SkillCategory {
  id: string;
  name: string;
  typeId: string;
}

interface ProficiencyLevel {
  id: string;
  name: string;
  code: string;
  numericValue: number;
}

export default function Skills() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const { toast } = useToast();

  const { data: skills, isLoading: skillsLoading } = useQuery({
    queryKey: ["/api/skills"]
  }) as { data: Skill[] | undefined; isLoading: boolean };

  const { data: categories } = useQuery({
    queryKey: ["/api/skill-categories"]
  }) as { data: SkillCategory[] | undefined };

  const { data: proficiencyLevels } = useQuery({
    queryKey: ["/api/proficiency-levels"]
  }) as { data: ProficiencyLevel[] | undefined };

  const form = useForm<SkillFormType>({
    resolver: zodResolver(skillSchema),
    defaultValues: {
      name: "",
      description: "",
      categoryId: "",
      targetProficiencyId: null,
      isActive: true,
    }
  });

  const createMutation = useMutation({
    mutationFn: (data: SkillFormType) => apiRequest("/api/skills", {
      method: "POST",
      body: JSON.stringify(data)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/skills"] });
      toast({ title: "Success", description: "Skill created successfully" });
      setIsCreateDialogOpen(false);
      form.reset();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create skill", variant: "destructive" });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: SkillFormType }) => 
      apiRequest(`/api/skills/${id}`, {
        method: "PUT",
        body: JSON.stringify(data)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/skills"] });
      toast({ title: "Success", description: "Skill updated successfully" });
      setIsCreateDialogOpen(false);
      setEditingSkill(null);
      form.reset();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update skill", variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/skills/${id}`, {
      method: "DELETE"
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/skills"] });
      toast({ title: "Success", description: "Skill deleted successfully" });
    },
    onError: (error: any) => {
      const message = error?.message || "Failed to delete skill";
      toast({ title: "Error", description: message, variant: "destructive" });
    }
  });

  const onSubmit = (data: SkillFormType) => {
    if (editingSkill) {
      updateMutation.mutate({ id: editingSkill.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (skill: Skill) => {
    setEditingSkill(skill);
    form.reset({
      name: skill.name,
      description: skill.description || "",
      categoryId: skill.categoryId,
      targetProficiencyId: skill.targetProficiencyId || null,
      isActive: skill.isActive,
    });
    setIsCreateDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this skill? This may affect lessons and competencies.")) {
      deleteMutation.mutate(id);
    }
  };

  const getCategoryName = (categoryId: string) => {
    return categories?.find(c => c.id === categoryId)?.name || "Unknown";
  };

  const getProficiencyName = (proficiencyId: string | null | undefined) => {
    if (!proficiencyId) return null;
    return proficiencyLevels?.find(p => p.id === proficiencyId)?.name;
  };

  const filteredSkills = selectedCategory && selectedCategory !== "all"
    ? skills?.filter(s => s.categoryId === selectedCategory)
    : skills;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Skills Management</h1>
          <p className="text-muted-foreground">
            Manage granular skills taught in lessons and required by competencies
          </p>
        </div>
        <Button onClick={() => {
          setEditingSkill(null);
          form.reset();
          setIsCreateDialogOpen(true);
        }} data-testid="button-create-skill">
          <Plus className="w-4 h-4 mr-2" />
          Create Skill
        </Button>
      </div>

      <div className="flex gap-4">
        <Select value={selectedCategory || "all"} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-64" data-testid="select-category-filter">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" data-testid="option-all-categories">All Categories</SelectItem>
            {categories?.map((category) => (
              <SelectItem key={category.id} value={category.id} data-testid={`option-category-${category.id}`}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedCategory && selectedCategory !== "all" && (
          <Button variant="outline" onClick={() => setSelectedCategory("all")} data-testid="button-clear-filter">
            Clear Filter
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            Skills List
          </CardTitle>
          <CardDescription>
            Granular skills like "vacuuming", "mopping", and "toilet cleaning"
          </CardDescription>
        </CardHeader>
        <CardContent>
          {skillsLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : filteredSkills && filteredSkills.length > 0 ? (
            <div className="space-y-3">
              {filteredSkills.map((skill) => (
                <div key={skill.id} className="p-4 border rounded-lg flex items-center justify-between hover:bg-muted/50" data-testid={`card-skill-${skill.id}`}>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium" data-testid={`text-skill-name-${skill.id}`}>{skill.name}</h3>
                      <Badge variant="outline" data-testid={`badge-category-${skill.id}`}>{getCategoryName(skill.categoryId)}</Badge>
                      {skill.targetProficiencyId && (
                        <Badge variant="secondary" className="flex items-center gap-1" data-testid={`badge-proficiency-${skill.id}`}>
                          <Target className="w-3 h-3" />
                          {getProficiencyName(skill.targetProficiencyId)}
                        </Badge>
                      )}
                      {!skill.isActive && (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </div>
                    {skill.description && (
                      <p className="text-sm text-muted-foreground">{skill.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(skill)}
                      data-testid={`button-edit-skill-${skill.id}`}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(skill.id)}
                      data-testid={`button-delete-skill-${skill.id}`}
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
              <h3 className="font-medium mb-2">No skills found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {selectedCategory ? "No skills in this category" : "Create your first skill to start building your skills taxonomy"}
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)} data-testid="button-create-first-skill">
                <Plus className="w-4 h-4 mr-2" />
                Create First Skill
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingSkill ? "Edit Skill" : "Create New Skill"}</DialogTitle>
            <DialogDescription>
              Define a granular skill that can be taught in lessons or required by competencies
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Skill Name</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., Vacuuming, Mopping, Toilet Cleaning" 
                        {...field} 
                        data-testid="input-skill-name"
                      />
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
                      <Textarea 
                        placeholder="Describe the skill and what it involves..." 
                        {...field} 
                        data-testid="input-skill-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Skill Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-skill-category">
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories?.map((category) => (
                          <SelectItem key={category.id} value={category.id} data-testid={`option-skill-category-${category.id}`}>
                            {category.name}
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
                name="targetProficiencyId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Proficiency Level (Optional)</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(value === "none" ? null : value)} 
                      value={field.value || "none"}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-target-proficiency">
                          <SelectValue placeholder="No target proficiency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none" data-testid="option-no-proficiency">No target proficiency</SelectItem>
                        {proficiencyLevels?.map((level) => (
                          <SelectItem key={level.id} value={level.id} data-testid={`option-proficiency-${level.id}`}>
                            {level.name} (Level {level.numericValue})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Expected proficiency level learners should achieve for this skill
                    </FormDescription>
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
                    setEditingSkill(null);
                    form.reset();
                  }}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-submit-skill"
                >
                  {editingSkill ? "Update" : "Create"} Skill
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
