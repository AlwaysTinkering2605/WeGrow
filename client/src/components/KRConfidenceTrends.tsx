import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { format } from "date-fns";

interface KRConfidenceTrendsProps {
  keyResultId: string;
  keyResultType: 'company' | 'team';
  title?: string;
}

export default function KRConfidenceTrends({ keyResultId, keyResultType, title }: KRConfidenceTrendsProps) {
  const { data: checkIns = [], isLoading } = useQuery({
    queryKey: ['/api/kr-check-ins', keyResultId, { type: keyResultType }],
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{title || 'Confidence Trends'}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            Loading trends...
          </div>
        </CardContent>
      </Card>
    );
  }

  const checkInData = (checkIns as any[])
    .map((ci: any) => ({
      date: format(new Date(ci.weekOf), 'MMM dd'),
      confidence: ci.confidenceScore,
      value: ci.newValue,
    }))
    .reverse(); // Show oldest to newest

  if (checkInData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{title || 'Confidence Trends'}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Minus className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No check-in data yet</p>
              <p className="text-sm">Check-ins will appear here once submitted</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate trend
  const firstConfidence = checkInData[0]?.confidence || 0;
  const lastConfidence = checkInData[checkInData.length - 1]?.confidence || 0;
  const trend = lastConfidence - firstConfidence;
  const trendDirection = trend > 0 ? 'up' : trend < 0 ? 'down' : 'stable';

  function getConfidenceColor(score: number): string {
    if (score >= 8) return '#22c55e'; // green
    if (score >= 5) return '#eab308'; // yellow
    return '#ef4444'; // red
  }

  return (
    <Card data-testid={`kr-confidence-trends-${keyResultId}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{title || 'Confidence Trends'}</CardTitle>
          <div className="flex items-center gap-2">
            {trendDirection === 'up' && (
              <Badge variant="outline" className="bg-green-50 text-green-700">
                <TrendingUp className="w-3 h-3 mr-1" />
                Improving
              </Badge>
            )}
            {trendDirection === 'down' && (
              <Badge variant="outline" className="bg-red-50 text-red-700">
                <TrendingDown className="w-3 h-3 mr-1" />
                Declining
              </Badge>
            )}
            {trendDirection === 'stable' && (
              <Badge variant="outline" className="bg-gray-50 text-gray-700">
                <Minus className="w-3 h-3 mr-1" />
                Stable
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={checkInData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="date" 
              className="text-xs"
              tick={{ fill: 'currentColor' }}
            />
            <YAxis 
              domain={[0, 10]} 
              className="text-xs"
              tick={{ fill: 'currentColor' }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--background))', 
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px'
              }}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="confidence" 
              stroke={getConfidenceColor(lastConfidence)}
              strokeWidth={2}
              dot={{ fill: getConfidenceColor(lastConfidence), r: 4 }}
              activeDot={{ r: 6 }}
              name="Confidence Score"
            />
          </LineChart>
        </ResponsiveContainer>

        {/* Recent Check-ins Summary */}
        <div className="mt-4 pt-4 border-t">
          <h4 className="text-sm font-medium mb-2">Recent Check-ins</h4>
          <div className="space-y-2">
            {checkInData.slice(-3).reverse().map((ci: any, idx: number) => (
              <div 
                key={idx} 
                className="flex items-center justify-between text-sm"
                data-testid={`recent-checkin-${idx}`}
              >
                <span className="text-muted-foreground">{ci.date}</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">Confidence: {ci.confidence}/10</span>
                  <span className="text-muted-foreground">Value: {ci.value}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
