import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Heart, Star } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";

const companyValues = [
  { id: "excellence", label: "Excellence", color: "bg-purple-100 text-purple-800" },
  { id: "teamwork", label: "Teamwork", color: "bg-blue-100 text-blue-800" },
  { id: "innovation", label: "Innovation", color: "bg-green-100 text-green-800" },
  { id: "reliability", label: "Reliability", color: "bg-orange-100 text-orange-800" },
];

export default function Recognition() {
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedValue, setSelectedValue] = useState("excellence");
  const [message, setMessage] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: recognitions, isLoading } = useQuery({
    queryKey: ["/api/recognitions"],
    retry: false,
  });

  const createRecognitionMutation = useMutation({
    mutationFn: async (data: { toUserId: string; value: string; message: string }) => {
      await apiRequest("POST", "/api/recognitions", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recognitions"] });
      setSelectedUser("");
      setMessage("");
      toast({
        title: "Recognition sent!",
        description: "Your colleague will be notified of your recognition.",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to send recognition. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !message.trim()) {
      toast({
        title: "Missing information",
        description: "Please select a colleague and write a message.",
        variant: "destructive",
      });
      return;
    }

    createRecognitionMutation.mutate({
      toUserId: selectedUser,
      value: selectedValue,
      message: message.trim(),
    });
  };

  const getValueColor = (value: string) => {
    return companyValues.find(v => v.id === value)?.color || "bg-gray-100 text-gray-800";
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

  return (
    <div className="space-y-6">
      {/* Give Recognition */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4">Give Recognition</h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Recognize a colleague</label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger data-testid="select-colleague">
                  <SelectValue placeholder="Select a team member..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user1">John Smith</SelectItem>
                  <SelectItem value="user2">Sarah Johnson</SelectItem>
                  <SelectItem value="user3">Mike Wilson</SelectItem>
                  <SelectItem value="user4">Emma Davis</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Company Value</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {companyValues.map((value) => (
                  <button
                    key={value.id}
                    type="button"
                    onClick={() => setSelectedValue(value.id)}
                    className={`p-3 border-2 rounded-lg text-sm font-medium transition-colors ${
                      selectedValue === value.id
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:border-primary hover:bg-primary/10"
                    }`}
                    data-testid={`button-value-${value.id}`}
                  >
                    {value.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Message</label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="What did they do that exemplified this value?"
                rows={3}
                data-testid="textarea-message"
              />
            </div>

            <Button 
              type="submit" 
              disabled={createRecognitionMutation.isPending || !selectedUser || !message.trim()}
              data-testid="button-send-recognition"
            >
              {createRecognitionMutation.isPending ? "Sending..." : "Send Recognition"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Recognition Feed */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Recognition</h3>
          
          <div className="space-y-4">
            {!(recognitions as any[]) || (recognitions as any[]).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Star className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No recognitions yet</p>
                <p className="text-sm">Be the first to recognize a colleague's great work!</p>
              </div>
            ) : (
              (recognitions as any[]).map((recognition: any) => (
                <div key={recognition.id} className="border border-border rounded-lg p-4" data-testid={`recognition-${recognition.id}`}>
                  <div className="flex items-start space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="font-medium text-blue-600">
                        {recognition.fromUser?.firstName?.charAt(0) || "U"}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-medium">
                          {recognition.fromUser?.firstName && recognition.fromUser?.lastName 
                            ? `${recognition.fromUser.firstName} ${recognition.fromUser.lastName}`
                            : recognition.fromUser?.email || "Someone"}
                        </span>
                        <span className="text-sm text-muted-foreground">recognized</span>
                        <span className="font-medium">
                          {recognition.toUser?.firstName && recognition.toUser?.lastName 
                            ? `${recognition.toUser.firstName} ${recognition.toUser.lastName}`
                            : recognition.toUser?.email || "Someone"}
                        </span>
                        <Badge className={getValueColor(recognition.value)}>
                          {companyValues.find(v => v.id === recognition.value)?.label || recognition.value}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">"{recognition.message}"</p>
                      <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                        <span>{new Date(recognition.createdAt).toLocaleDateString()}</span>
                        <button className="flex items-center space-x-1 hover:text-foreground" data-testid={`button-like-${recognition.id}`}>
                          <Heart className="w-4 h-4" />
                          <span>Like</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
