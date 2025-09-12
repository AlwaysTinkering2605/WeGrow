import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Users, CheckCircle, AlertCircle } from "lucide-react";

export default function Meetings() {
  const { data: meetings, isLoading } = useQuery({
    queryKey: ["/api/meetings"],
    retry: false,
  });

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

  const upcomingMeetings = (meetings as any[])?.filter((meeting: any) => 
    new Date(meeting.scheduledAt) > new Date() && meeting.status === 'scheduled'
  ) || [];

  const pastMeetings = (meetings as any[])?.filter((meeting: any) => 
    new Date(meeting.scheduledAt) <= new Date() || meeting.status === 'completed'
  ) || [];

  return (
    <div className="space-y-6">
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
                    <h4 className="font-medium mb-2">Agenda</h4>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox id="agenda-1" />
                        <label htmlFor="agenda-1" className="text-sm">Review goal progress</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox id="agenda-2" />
                        <label htmlFor="agenda-2" className="text-sm">Discuss development plans</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox id="agenda-3" />
                        <label htmlFor="agenda-3" className="text-sm">Career development opportunities</label>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Your Notes</h4>
                    <Textarea
                      placeholder="Add any topics you'd like to discuss..."
                      rows={3}
                      defaultValue={meeting.employeeNotes || ""}
                      data-testid="textarea-meeting-notes"
                    />
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
