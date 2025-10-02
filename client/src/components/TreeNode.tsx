import { useState } from "react";
import { ChevronRight, ChevronDown, User, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface TreeNodeData {
  id: string;
  name: string;
  subtitle?: string;
  badge?: string;
  count?: number;
  children?: TreeNodeData[];
  metadata?: Record<string, any>;
}

interface TreeNodeProps {
  node: TreeNodeData;
  level?: number;
  defaultExpanded?: boolean;
  onNodeClick?: (node: TreeNodeData) => void;
}

export function TreeNode({ 
  node, 
  level = 0, 
  defaultExpanded = false,
  onNodeClick 
}: TreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded || level < 2);
  const hasChildren = node.children && node.children.length > 0;

  const toggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasChildren) {
      setIsExpanded(!isExpanded);
    }
  };

  const handleNodeClick = () => {
    if (onNodeClick) {
      onNodeClick(node);
    }
  };

  return (
    <div className="w-full">
      <Card
        className={cn(
          "mb-2 transition-all hover:shadow-md cursor-pointer",
          level > 0 && "border-l-4 border-l-primary/20"
        )}
        style={{ marginLeft: level > 0 ? `${level * 24}px` : '0' }}
        onClick={handleNodeClick}
        data-testid={`tree-node-${node.id}`}
      >
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 flex-1">
              {/* Expand/Collapse Button */}
              <button
                onClick={toggleExpand}
                className={cn(
                  "flex-shrink-0 w-6 h-6 flex items-center justify-center rounded hover:bg-muted transition-colors",
                  !hasChildren && "invisible"
                )}
                data-testid={`button-toggle-${node.id}`}
              >
                {hasChildren && (
                  isExpanded ? 
                    <ChevronDown className="w-4 h-4" /> : 
                    <ChevronRight className="w-4 h-4" />
                )}
              </button>

              {/* Node Icon */}
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center",
                level === 0 ? "bg-primary/10" : "bg-muted"
              )}>
                {hasChildren ? (
                  <Users className={cn(
                    "w-5 h-5",
                    level === 0 ? "text-primary" : "text-muted-foreground"
                  )} />
                ) : (
                  <User className="w-5 h-5 text-muted-foreground" />
                )}
              </div>

              {/* Node Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-sm truncate" data-testid={`text-node-name-${node.id}`}>
                    {node.name}
                  </h4>
                  {node.badge && (
                    <Badge variant="outline" className="text-xs">
                      {node.badge}
                    </Badge>
                  )}
                </div>
                {node.subtitle && (
                  <p className="text-xs text-muted-foreground truncate" data-testid={`text-node-subtitle-${node.id}`}>
                    {node.subtitle}
                  </p>
                )}
              </div>

              {/* Count Badge */}
              {node.count !== undefined && node.count > 0 && (
                <Badge 
                  variant="secondary" 
                  className="ml-2"
                  data-testid={`badge-count-${node.id}`}
                >
                  {node.count}
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div className="mt-1">
          {node.children!.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              level={level + 1}
              defaultExpanded={defaultExpanded}
              onNodeClick={onNodeClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function TreeView({ 
  nodes, 
  defaultExpanded = false,
  onNodeClick 
}: { 
  nodes: TreeNodeData[]; 
  defaultExpanded?: boolean;
  onNodeClick?: (node: TreeNodeData) => void;
}) {
  return (
    <div className="space-y-2">
      {nodes.map((node) => (
        <TreeNode
          key={node.id}
          node={node}
          level={0}
          defaultExpanded={defaultExpanded}
          onNodeClick={onNodeClick}
        />
      ))}
    </div>
  );
}
