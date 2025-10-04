import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "./pages/not-found";
import Landing from "./pages/landing";
import Home from "./pages/home";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 bg-primary rounded-lg animate-pulse mx-auto"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Use early return to ensure Switch gets direct Route children
  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/login" component={Landing} />
        <Route path="/:rest*" component={Landing} />
      </Switch>
    );
  }

  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/dashboard" component={Home} />
      <Route path="/goals" component={Home} />
      <Route path="/development" component={Home} />
      <Route path="/learning" component={Home} />
      <Route path="/learning/courses/:courseId" component={Home} />
      <Route path="/learning/lessons/:lessonId" component={Home} />
      <Route path="/learning/:rest*" component={Home} />
      <Route path="/recognition" component={Home} />
      <Route path="/meetings" component={Home} />
      <Route path="/profile" component={Home} />
      <Route path="/team" component={Home} />
      <Route path="/company-objectives" component={Home} />
      <Route path="/team-objectives" component={Home} />
      <Route path="/competency-management" component={Home} />
      <Route path="/skill-categories" component={Home} />
      <Route path="/skill-category-types" component={Home} />
      <Route path="/proficiency-levels" component={Home} />
      <Route path="/training-matrix" component={Home} />
      <Route path="/learning-paths" component={Home} />
      <Route path="/user-management" component={Home} />
      <Route path="/job-roles" component={Home} />
      <Route path="/departments" component={Home} />
      <Route path="/organization" component={Home} />
      <Route path="/automation-engine" component={Home} />
      <Route path="/analytics" component={Home} />
      <Route path="/reports" component={Home} />
      <Route path="/settings" component={Home} />
      <Route path="/webhooks" component={Home} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
