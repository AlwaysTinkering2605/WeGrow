import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Clock, User } from "lucide-react";
import { format } from "date-fns";

interface AuditEntry {
  id: string;
  objectiveId?: string;
  keyResultId?: string;
  objectiveType?: string;
  keyResultType?: string;
  changeType: string;
  changedBy: string;
  changeTimestamp: string;
  oldValue: any;
  newValue: any;
  fieldChanged?: string;
  changeReason?: string;
}

interface AuditHistoryTimelineProps {
  entityId: string;
  entityType: 'objective' | 'key-result';
  objectiveType?: 'company' | 'team';
}

export function AuditHistoryTimeline({ entityId, entityType, objectiveType = 'company' }: AuditHistoryTimelineProps) {
  const endpoint = entityType === 'objective' 
    ? `/api/objectives/${entityId}/audit-history?type=${objectiveType}`
    : `/api/key-results/${entityId}/audit-history?type=${objectiveType}`;

  const { data: history, isLoading } = useQuery<AuditEntry[]>({
    queryKey: [endpoint],
  });

  if (isLoading) {
    return (
      <Card data-testid="audit-history-loading">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Change History
          </CardTitle>
          <CardDescription>Loading audit trail...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!history || history.length === 0) {
    return (
      <Card data-testid="audit-history-empty">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Change History
          </CardTitle>
          <CardDescription>No changes recorded yet</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const getChangeBadgeColor = (changeType: string) => {
    switch (changeType) {
      case 'created': return 'bg-green-500';
      case 'updated': return 'bg-blue-500';
      case 'deleted': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const renderValueDiff = (entry: AuditEntry) => {
    if (entry.changeType === 'created') {
      return (
        <div className="text-sm text-muted-foreground">
          {entityType === 'objective' ? 'Objective' : 'Key Result'} created
        </div>
      );
    }

    if (entry.changeType === 'deleted') {
      return (
        <div className="text-sm text-muted-foreground">
          {entityType === 'objective' ? 'Objective' : 'Key Result'} deleted
        </div>
      );
    }

    // For updates, show changed fields
    const oldVal = entry.oldValue || {};
    const newVal = entry.newValue || {};
    const changes: string[] = [];

    // Compare key fields
    const fieldsToCheck = entityType === 'objective' 
      ? ['title', 'description', 'strategicTheme', 'riskLevel', 'status']
      : ['description', 'targetValue', 'currentValue', 'confidenceScore', 'status'];

    fieldsToCheck.forEach(field => {
      if (oldVal[field] !== newVal[field]) {
        changes.push(field);
      }
    });

    if (changes.length === 0) {
      return <div className="text-sm text-muted-foreground">Updated</div>;
    }

    return (
      <div className="space-y-2">
        {changes.map(field => (
          <div key={field} className="text-sm">
            <span className="font-medium capitalize">{field}:</span>
            <div className="ml-4 space-y-1">
              {oldVal[field] !== undefined && (
                <div className="text-red-600">
                  - {String(oldVal[field])}
                </div>
              )}
              {newVal[field] !== undefined && (
                <div className="text-green-600">
                  + {String(newVal[field])}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Card data-testid="audit-history-timeline">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Change History
        </CardTitle>
        <CardDescription>
          Complete audit trail of all changes (ISO 9001:2015 Clause 7.5 compliant)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {history.map((entry, index) => (
              <div
                key={entry.id}
                className="relative pl-8 pb-4 border-l-2 border-muted last:border-0"
                data-testid={`audit-entry-${index}`}
              >
                <div className="absolute -left-2 top-0 h-4 w-4 rounded-full bg-background border-2 border-muted" />
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge 
                      className={getChangeBadgeColor(entry.changeType)}
                      data-testid={`badge-${entry.changeType}`}
                    >
                      {entry.changeType}
                    </Badge>
                    
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span data-testid={`timestamp-${index}`}>
                        {format(new Date(entry.changeTimestamp), 'MMM d, yyyy h:mm a')}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <User className="h-3 w-3" />
                      <span data-testid={`user-${index}`}>
                        {entry.changedBy}
                      </span>
                    </div>
                  </div>

                  {renderValueDiff(entry)}

                  {entry.changeReason && (
                    <div className="text-sm italic text-muted-foreground">
                      Reason: {entry.changeReason}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
