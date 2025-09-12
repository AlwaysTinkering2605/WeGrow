import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="text-center space-y-6">
            <div className="flex items-center justify-center space-x-3 mb-8">
              <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-xl">A</span>
              </div>
              <span className="text-3xl font-bold">Apex</span>
            </div>
            
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-foreground">
                Performance & Development Platform
              </h1>
              <p className="text-muted-foreground">
                Connect your goals with company objectives and accelerate your development journey.
              </p>
            </div>

            <div className="space-y-4 pt-4">
              <Button 
                onClick={() => window.location.href = '/api/login'} 
                className="w-full"
                data-testid="button-login"
              >
                Sign In to Get Started
              </Button>
              
              <div className="text-xs text-muted-foreground">
                For cleaning operatives, supervisors, and leadership teams
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
