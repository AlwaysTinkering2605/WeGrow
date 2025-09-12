import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertMeetingSchema, type Meeting, type User, type InsertMeeting } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Clock, Users, CheckCircle, AlertCircle, Plus, Save, Edit, X } from "lucide-react";
import { useState, useEffect } from "react";
import { z } from "zod";

// Form schema for meeting creation  
const createMeetingSchema = insertMeetingSchema.extend({
  scheduledAt: z.string().min(1, "Meeting date/time is required"),
});

type CreateMeetingData = z.infer<typeof createMeetingSchema>;

interface MeetingWithRelations extends Meeting {
  manager?: User;
  employee?: User;
}

export default function Meetings() {
  const { data: meetings, isLoading } = useQuery<MeetingWithRelations[]>({
    queryKey: ["/api/meetings"],
    retry: false,
  });
  
  const { data: user } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    retry: false,
  });
  
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMeetingId, setEditingMeetingId] = useState<string | null>(null);
  const [editingAgenda, setEditingAgenda] = useState<{[key: string]: string}>({});
  const [editingNotes, setEditingNotes] = useState<{[key: string]: string}>({});
  
  const form = useForm<CreateMeetingData>({
    resolver: zodResolver(createMeetingSchema),
    defaultValues: {
      managerId: "",
      employeeId: "",
      scheduledAt: "",
      duration: 30,
      agenda: "",
      employeeNotes: "",
    },
  });
  
  // Set employeeId when user data loads
  useEffect(() => {
    if (user?.id) {
      form.setValue("employeeId", user.id);
    }
  }, [user, form]);
  
  const createMeetingMutation = useMutation({
    mutationFn: async (data: CreateMeetingData) => {
      const meetingData = {
        ...data,
        scheduledAt: new Date(data.scheduledAt).toISOString(),
      };
      const response = await apiRequest("POST", "/api/meetings", meetingData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meetings"] });
      setIsDialogOpen(false);
      form.reset();
      toast({
        title: "Meeting scheduled",
        description: "Your 1-on-1 meeting has been scheduled successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to schedule meeting",
        variant: "destructive",
      });
    },
  });
  
  const updateMeetingMutation = useMutation({
    mutationFn: async ({ meetingId, updates }: { meetingId: string; updates: any }) => {
      const response = await apiRequest("PATCH", `/api/meetings/${meetingId}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meetings"] });
      toast({
        title: "Meeting updated",
        description: "Meeting details have been saved.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update meeting",
        variant: "destructive",
      });
    },
  });
  
  const handleSubmit = (data: CreateMeetingData) => {
    createMeetingMutation.mutate(data);
  };
  
  const handleSaveAgenda = (meetingId: string) => {
    const agenda = editingAgenda[meetingId];
    if (agenda !== undefined) {
      updateMeetingMutation.mutate({ 
        meetingId, 
        updates: { agenda } 
      });
      setEditingMeetingId(null);
      setEditingAgenda({});
    }
  };
  
  const handleSaveNotes = (meetingId: string) => {
    const notes = editingNotes[meetingId];
    if (notes !== undefined) {
      updateMeetingMutation.mutate({ 
        meetingId, 
        updates: { employeeNotes: notes } 
      });
      setEditingNotes({});
    }
  };
  
  const startEditingAgenda = (meetingId: string, currentAgenda: string) => {
    setEditingMeetingId(meetingId);
    setEditingAgenda({ [meetingId]: currentAgenda || "" });
  };
  
  const startEditingNotes = (meetingId: string, currentNotes: string) => {
    setEditingNotes({ [meetingId]: currentNotes || "" });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="bg-card border border-border rounded-lg p-6 animate-pulse">
            <div className="w-48 h-6 bg-muted rounded mb-4"></div>
            <div className="space-y-4">
              <div className="w-full h-32 bg-muted rounded"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  const upcomingMeetings = meetings?.filter((meeting) => 
    new Date(meeting.scheduledAt) > new Date() && meeting.status === 'scheduled'
  ) || [];

  const pastMeetings = meetings?.filter((meeting) => 
    new Date(meeting.scheduledAt) <= new Date() || meeting.status === 'completed'
  ) || [];

  return (
    <div className="space-y-6">
      {/* Header with Schedule Meeting button */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">1-on-1 Meetings</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-schedule-meeting">
              <Plus className="w-4 h-4 mr-2" />
              Schedule Meeting
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]" data-testid="dialog-schedule-meeting">
            <DialogHeader>
              <DialogTitle>Schedule 1-on-1 Meeting</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="managerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Manager</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-manager">
                            <SelectValue placeholder="Select your manager" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {user?.managerId && (
                            <SelectItem value={user.managerId} data-testid={`manager-option-${user.managerId}`}>
                              Manager
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="scheduledAt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date & Time</FormLabel>
                      <FormControl>
                        <Input
                          type="datetime-local"
                          {...field}
                          data-testid="input-meeting-datetime"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="duration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duration (minutes)</FormLabel>
                      <Select onValueChange={(value) => field.onChange(parseInt(value))} defaultValue={field.value?.toString()}>
                        <FormControl>
                          <SelectTrigger data-testid="select-duration">
                            <SelectValue placeholder="Select duration" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="15">15 minutes</SelectItem>
                          <SelectItem value="30">30 minutes</SelectItem>
                          <SelectItem value="45">45 minutes</SelectItem>
                          <SelectItem value="60">60 minutes</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="agenda"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Agenda</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Meeting topics to discuss..."
                          rows={3}
                          {...field}
                          value={field.value || ""}
                          data-testid="textarea-meeting-agenda"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="employeeNotes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Your Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Add any topics you'd like to discuss..."
                          rows={3}
                          {...field}
                          value={field.value || ""}
                          data-testid="textarea-employee-notes"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex justify-end space-x-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsDialogOpen(false)}
                    data-testid="button-cancel-meeting"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createMeetingMutation.isPending}
                    data-testid="button-create-meeting"
                  >
                    {createMeetingMutation.isPending ? "Scheduling..." : "Schedule Meeting"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
      
      {/* Upcoming Meeting */}
      {upcomingMeetings.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Upcoming 1-on-1</h3>
            
            {upcomingMeetings.map((meeting: any) => (
              <div key={meeting.id} className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4" data-testid={`upcoming-meeting-${meeting.id}`}>
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="font-medium text-blue-600">
                      {meeting.manager?.firstName?.charAt(0) || "M"}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium">
                      {meeting.manager?.firstName && meeting.manager?.lastName 
                        ? `${meeting.manager.firstName} ${meeting.manager.lastName}`
                        : meeting.manager?.email || "Manager"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {meeting.manager?.jobTitle || "Manager"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-4 text-sm text-blue-700 mb-4">
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-4 h-4" />
                    <span>{new Date(meeting.scheduledAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Clock className="w-4 h-4" />
                    <span>{meeting.duration || 30} minutes</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">Agenda</h4>
                      {editingMeetingId === meeting.id ? (
                        <div className="flex space-x-1">
                          <Button 
                            size="sm" 
                            onClick={() => handleSaveAgenda(meeting.id)}
                            disabled={updateMeetingMutation.isPending}
                            data-testid={`button-save-agenda-${meeting.id}`}
                          >
                            <Save className="w-3 h-3" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => {
                              setEditingMeetingId(null);
                              setEditingAgenda({});
                            }}
                            data-testid={`button-cancel-agenda-${meeting.id}`}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ) : (
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => startEditingAgenda(meeting.id, meeting.agenda)}
                          data-testid={`button-edit-agenda-${meeting.id}`}
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                    {editingMeetingId === meeting.id ? (
                      <Textarea
                        value={editingAgenda[meeting.id] || ""}
                        onChange={(e) => setEditingAgenda({ 
                          ...editingAgenda, 
                          [meeting.id]: e.target.value 
                        })}
                        rows={3}
                        placeholder="Meeting topics to discuss..."
                        data-testid={`textarea-edit-agenda-${meeting.id}`}
                      />
                    ) : (
                      <div className="bg-muted rounded-lg p-3 text-sm" data-testid={`text-agenda-${meeting.id}`}>
                        {meeting.agenda || "No agenda set"}
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">Your Notes</h4>
                      {editingNotes[meeting.id] !== undefined ? (
                        <div className="flex space-x-1">
                          <Button 
                            size="sm" 
                            onClick={() => handleSaveNotes(meeting.id)}
                            disabled={updateMeetingMutation.isPending}
                            data-testid={`button-save-notes-${meeting.id}`}
                          >
                            <Save className="w-3 h-3" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => setEditingNotes({})}
                            data-testid={`button-cancel-notes-${meeting.id}`}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ) : (
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => startEditingNotes(meeting.id, meeting.employeeNotes)}
                          data-testid={`button-edit-notes-${meeting.id}`}
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                    {editingNotes[meeting.id] !== undefined ? (
                      <Textarea
                        value={editingNotes[meeting.id] || ""}
                        onChange={(e) => setEditingNotes({ 
                          ...editingNotes, 
                          [meeting.id]: e.target.value 
                        })}
                        rows={3}
                        placeholder="Add any topics you'd like to discuss..."
                        data-testid={`textarea-edit-notes-${meeting.id}`}
                      />
                    ) : (
                      <div className="bg-muted rounded-lg p-3 text-sm" data-testid={`text-notes-${meeting.id}`}>
                        {meeting.employeeNotes || "No notes added"}
                      </div>
                    )}
                  </div>

                  <Button data-testid="button-join-meeting">
                    Join Meeting
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Previous Meetings */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4">Previous Meetings</h3>
          
          <div className="space-y-4">
            {pastMeetings.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No previous meetings</p>
                <p className="text-sm">Your meeting history will appear here once you've had your first 1-on-1</p>
              </div>
            ) : (
              pastMeetings.map((meeting: any) => (
                <div key={meeting.id} className="border border-border rounded-lg p-4" data-testid={`past-meeting-${meeting.id}`}>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">
                      1-on-1 with {meeting.manager?.firstName && meeting.manager?.lastName 
                        ? `${meeting.manager.firstName} ${meeting.manager.lastName}`
                        : meeting.manager?.email || "Manager"}
                    </h4>
                    <span className="text-sm text-muted-foreground">
                      {new Date(meeting.scheduledAt).toLocaleDateString()}
                    </span>
                  </div>
                  
                  {meeting.agenda && (
                    <div className="text-sm text-muted-foreground mb-3">
                      <p><strong>Topics discussed:</strong> {meeting.agenda}</p>
                    </div>
                  )}
                  
                  {meeting.employeeNotes && (
                    <div className="text-sm text-muted-foreground mb-3">
                      <p><strong>Your notes:</strong> {meeting.employeeNotes}</p>
                    </div>
                  )}

                  {meeting.actionItems && (
                    <div className="bg-muted rounded-lg p-3">
                      <h5 className="font-medium text-sm mb-2">Action Items</h5>
                      <div className="space-y-1 text-sm">
                        {Array.isArray(meeting.actionItems) ? meeting.actionItems.map((item: any, index: number) => (
                          <div key={index} className="flex items-center space-x-2">
                            {item.completed ? (
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            ) : (
                              <AlertCircle className="w-4 h-4 text-yellow-600" />
                            )}
                            <span className={item.completed ? "line-through text-muted-foreground" : ""}>
                              {item.description || item}
                            </span>
                          </div>
                        )) : (
                          <p>{meeting.actionItems}</p>
                        )}
                      </div>
                    </div>
                  )}

                  <Button variant="ghost" size="sm" className="mt-3" data-testid={`button-view-details-${meeting.id}`}>
                    View Details
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}