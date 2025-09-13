import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Mail, Phone, User, Edit2, Upload, Shield } from "lucide-react";
import { updateUserProfileSchema, type User as UserType } from "@shared/schema";
import type { Goal, DevelopmentPlan } from "@shared/schema";
import type { z } from "zod";
import { ObjectUploader } from "@/components/ObjectUploader";
// import ProgressRing from "./ProgressRing"; // TODO: Create or fix ProgressRing component

type UpdateProfileData = z.infer<typeof updateUserProfileSchema>;

export default function Profile() {
  const { user } = useAuth();
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const { toast } = useToast();

  // Profile editing form with proper type handling
  const profileForm = useForm<{
    firstName?: string;
    lastName?: string;
    mobilePhone?: string;
    jobTitle?: string;
    profileImageUrl?: string;
    role?: "operative" | "supervisor" | "leadership";
  }>({
    resolver: zodResolver(updateUserProfileSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      mobilePhone: "",
      jobTitle: "",
      profileImageUrl: "",
      role: undefined,
    },
  });

  // Fetch real data for performance calculations
  const { data: goals = [] } = useQuery<Goal[]>({
    queryKey: ["/api/goals"],
    retry: false,
  });

  const { data: developmentPlans = [] } = useQuery<DevelopmentPlan[]>({
    queryKey: ["/api/development-plans"],
    retry: false,
  });

  const { data: recognitionStats } = useQuery({
    queryKey: ["/api/recognition-stats"],
    retry: false,
  });

  // Calculate real performance metrics
  const calculateGoalCompletion = () => {
    if (!goals.length) return 0;
    const completedGoals = goals.filter(goal => 
      goal.targetValue && goal.currentValue !== null && goal.currentValue >= goal.targetValue
    ).length;
    return Math.round((completedGoals / goals.length) * 100);
  };

  const calculateTrainingProgress = () => {
    if (!developmentPlans.length) return 0;
    const completedPlans = developmentPlans.filter(plan => 
      plan.status === 'completed'
    ).length;
    return Math.round((completedPlans / developmentPlans.length) * 100);
  };

  const goalCompletionPercentage = calculateGoalCompletion();
  const trainingProgressPercentage = calculateTrainingProgress();

  // Profile update mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (updates: UpdateProfileData) => {
      if (!user?.id) throw new Error("User ID not found");
      return apiRequest("PUT", `/api/users/${user.id}/profile`, updates);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setIsEditProfileOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    },
  });

  const handleEditProfile = () => {
    // Pre-populate form with current user data
    profileForm.reset({
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      mobilePhone: user?.mobilePhone || "",
      jobTitle: user?.jobTitle || "",
      profileImageUrl: user?.profileImageUrl || "",
    });
    setIsEditProfileOpen(true);
  };

  const handleUpdateProfile = (data: UpdateProfileData) => {
    // Remove empty string values and create clean update object
    const cleanData: any = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== null && value !== undefined && value !== "") {
        cleanData[key] = value;
      }
    }

    updateProfileMutation.mutate(cleanData);
  };

  const handleSignOut = () => {
    window.location.href = "/api/logout";
  };

  return (
    <div className="space-y-6">
      {/* Profile Information */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-4 mb-6">
            <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center">
              {user?.profileImageUrl ? (
                <img 
                  src={user.profileImageUrl} 
                  alt="Profile" 
                  className="w-20 h-20 rounded-full object-cover"
                />
              ) : (
                <span className="text-primary-foreground font-bold text-2xl">
                  {user?.firstName?.charAt(0) || user?.email?.charAt(0) || "U"}
                </span>
              )}
            </div>
            <div>
              <h3 className="text-xl font-semibold" data-testid="text-user-name">
                {user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : user?.email || "User"}
              </h3>
              <p className="text-muted-foreground" data-testid="text-user-role">
                {user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : "Team Member"}
              </p>
              <p className="text-sm text-muted-foreground" data-testid="text-user-team">
                {user?.teamName ? `${user.teamName} •` : ""} Started {user?.startDate ? new Date(user.startDate).toLocaleDateString() : "Recently"}
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-3">Contact Information</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center space-x-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span data-testid="text-user-email">{user?.email || "No email provided"}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span data-testid="text-user-phone">{user?.mobilePhone || "Phone not provided"}</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-3">Manager</h4>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium">Manager</p>
                  <p className="text-sm text-muted-foreground">Supervisor</p>
                </div>
              </div>
            </div>
          </div>

          {/* Edit Profile Button */}
          <div className="mt-6 flex justify-end">
            <Dialog open={isEditProfileOpen} onOpenChange={setIsEditProfileOpen}>
              <DialogTrigger asChild>
                <Button onClick={handleEditProfile} data-testid="button-edit-profile">
                  <Edit2 className="w-4 h-4 mr-2" />
                  Edit Profile
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Edit Profile</DialogTitle>
                </DialogHeader>
                <Form {...profileForm}>
                  <form onSubmit={profileForm.handleSubmit(handleUpdateProfile)} className="space-y-4">
                    <FormField
                      control={profileForm.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              value={field.value || ""}
                              placeholder="Enter first name"
                              data-testid="input-first-name"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={profileForm.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              value={field.value || ""}
                              placeholder="Enter last name"
                              data-testid="input-last-name"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={profileForm.control}
                      name="mobilePhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Mobile Phone</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              value={field.value || ""}
                              placeholder="Enter mobile phone number"
                              data-testid="input-mobile-phone"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={profileForm.control}
                      name="jobTitle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Job Title</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              value={field.value || ""}
                              placeholder="Enter job title"
                              data-testid="input-job-title"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={profileForm.control}
                      name="profileImageUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Profile Image</FormLabel>
                          <FormControl>
                            <div className="space-y-4">
                              <ObjectUploader
                                maxNumberOfFiles={1}
                                maxFileSize={5 * 1024 * 1024} // 5MB
                                onGetUploadParameters={async () => {
                                  const response = await apiRequest('POST', '/api/objects/upload');
                                  const { uploadURL } = await response.json();
                                  return { method: 'PUT' as const, url: uploadURL };
                                }}
                                onComplete={async (result) => {
                                  const uploaded = result.successful?.[0];
                                  if (!uploaded) return;
                                  const path = uploaded.uploadURL || uploaded.response?.uploadURL;
                                  const response = await apiRequest('PUT', '/api/profile-images', { profileImageURL: path });
                                  const { objectPath } = await response.json();
                                  profileForm.setValue('profileImageUrl', objectPath, { shouldValidate: true });
                                  toast({ title: 'Photo uploaded successfully' });
                                }}
                                buttonClassName="w-full"
                              >
                                <div className="flex items-center gap-2">
                                  <Upload className="mr-2 h-4 w-4"/>
                                  <span>Upload Profile Photo</span>
                                </div>
                              </ObjectUploader>
                              <Input
                                {...field}
                                value={field.value || ""}
                                placeholder="Or enter image URL"
                                data-testid="input-profile-image"
                              />
                            </div>
                          </FormControl>
                          <FormDescription>
                            Upload a photo or provide a URL for your profile image
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Role Assignment - Only for Supervisors/Leadership */}
                    {user && (user.role === 'supervisor' || user.role === 'leadership') && (
                      <FormField
                        control={profileForm.control}
                        name="role"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              <div className="flex items-center gap-2">
                                <Shield className="h-4 w-4" />
                                User Role
                              </div>
                            </FormLabel>
                            <FormControl>
                              <Select value={field.value || ""} onValueChange={field.onChange}>
                                <SelectTrigger data-testid="select-user-role">
                                  <SelectValue placeholder="Select role" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="operative" data-testid="option-operative">
                                    Operative
                                  </SelectItem>
                                  <SelectItem value="supervisor" data-testid="option-supervisor">
                                    Supervisor
                                  </SelectItem>
                                  {user.role === 'leadership' && (
                                    <SelectItem value="leadership" data-testid="option-leadership">
                                      Leadership
                                    </SelectItem>
                                  )}
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormDescription>
                              {user.role === 'leadership' 
                                ? 'Assign role to this user (Leadership can assign all roles)'
                                : 'Assign role to this user (Supervisors can assign Operative/Supervisor roles)'
                              }
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    <div className="flex justify-end space-x-2">
                      <Button type="button" variant="outline" onClick={() => setIsEditProfileOpen(false)}>
                        Cancel
                      </Button>
                      <Button 
                        type="submit"
                        disabled={updateProfileMutation.isPending}
                        data-testid="button-save-profile"
                      >
                        {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Performance Summary */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4">Performance Summary</h3>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                {goals.length > 0 ? (
                  <span className="text-2xl font-bold text-green-600">{goalCompletionPercentage}%</span>
                ) : (
                  <span className="text-sm font-medium text-green-600">No Goals</span>
                )}
              </div>
              <p className="font-medium" data-testid="text-goal-completion">Goal Completion</p>
              <p className="text-xs text-muted-foreground">
                {goals.length > 0 ? `${goals.filter(g => g.targetValue && g.currentValue !== null && g.currentValue >= g.targetValue).length} of ${goals.length} goals` : "Set your first goal"}
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                {developmentPlans.length > 0 ? (
                  <span className="text-2xl font-bold text-blue-600">{trainingProgressPercentage}%</span>
                ) : (
                  <span className="text-sm font-medium text-blue-600">No Plans</span>
                )}
              </div>
              <p className="font-medium" data-testid="text-training-progress">Training Progress</p>
              <p className="text-xs text-muted-foreground">
                {developmentPlans.length > 0 ? `${developmentPlans.filter(p => p.status === 'completed').length} of ${developmentPlans.length} plans` : "Create development plan"}
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
                {recognitionStats && (recognitionStats as any).received !== undefined ? (
                  <span className="text-2xl font-bold text-purple-600">{(recognitionStats as any).received || 0}</span>
                ) : (
                  <span className="text-sm font-medium text-purple-600">0</span>
                )}
              </div>
              <p className="font-medium" data-testid="text-quality-score">Kudos Received</p>
              <p className="text-xs text-muted-foreground">
                {recognitionStats && (recognitionStats as any).sent ? `${(recognitionStats as any).sent} sent` : "No recognition yet"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Settings */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4">Settings</h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Email Notifications</p>
                <p className="text-sm text-muted-foreground">Receive email updates for goals and meetings</p>
              </div>
              <Switch 
                checked={emailNotifications} 
                onCheckedChange={setEmailNotifications}
                data-testid="switch-email-notifications"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Push Notifications</p>
                <p className="text-sm text-muted-foreground">Get notified about check-in reminders</p>
              </div>
              <Switch 
                checked={pushNotifications} 
                onCheckedChange={setPushNotifications}
                data-testid="switch-push-notifications"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Data Privacy</p>
                <p className="text-sm text-muted-foreground">Control how your data is shared</p>
              </div>
              <Button variant="ghost" size="sm" data-testid="button-manage-privacy">
                Manage
              </Button>
            </div>
          </div>

          <hr className="border-border my-6" />

          <Button 
            variant="destructive" 
            onClick={handleSignOut}
            data-testid="button-sign-out"
          >
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
