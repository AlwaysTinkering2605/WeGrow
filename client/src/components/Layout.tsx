import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  LayoutDashboard,
  Target,
  BookOpen,
  Star,
  Users,
  User,
  Bell,
  ChevronDown,
  BarChart3,
  Settings,
  UsersRound,
  GraduationCap,
} from "lucide-react";
import Dashboard from "./Dashboard";
import Goals from "./Goals";
import Development from "./Development";
import Recognition from "./Recognition";
import Meetings from "./Meetings";
import Profile from "./Profile";
import Learning from "./Learning";

// Role-based components
import TeamManagement from "./TeamManagement";
import TeamObjectives from "./TeamObjectives";
import Reports from "./Reports";
import CompanySettings from "./CompanySettings";

type TabType = "dashboard" | "goals" | "development" | "recognition" | "meetings" | "learning" | "profile" | "team" | "team-objectives" | "reports" | "settings";

export default function Layout() {
  const [location] = useLocation();
  const { user } = useAuth();
  const isMobile = useIsMobile();

  // Extract active tab from URL
  const getActiveTab = (): TabType => {
    if (location === "/" || location === "/dashboard") return "dashboard";
    if (location === "/goals") return "goals";
    if (location === "/development") return "development";
    if (location.startsWith("/learning")) return "learning";
    if (location === "/recognition") return "recognition";
    if (location === "/meetings") return "meetings";
    if (location === "/profile") return "profile";
    if (location === "/team") return "team";
    if (location === "/team-objectives") return "team-objectives";
    if (location === "/reports") return "reports";
    if (location === "/settings") return "settings";
    return "dashboard";
  };

  const activeTab = getActiveTab();

  // Base tabs available to all users
  const baseTabs = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, component: Dashboard },
    { id: "goals", label: "My Goals", icon: Target, component: Goals },
    { id: "development", label: "Development", icon: BookOpen, component: Development },
    { id: "learning", label: "Learning", icon: GraduationCap, component: Learning },
    { id: "recognition", label: "Recognition", icon: Star, component: Recognition },
    { id: "meetings", label: "1-on-1s", icon: Users, component: Meetings },
    { id: "profile", label: "Profile", icon: User, component: Profile },
  ];

  // Additional tabs for supervisors and leadership
  const supervisorTabs = [
    { id: "team", label: "Team Management", icon: UsersRound, component: TeamManagement },
    { id: "team-objectives", label: "Team Objectives", icon: Target, component: TeamObjectives },
  ];

  const leadershipTabs = [
    { id: "team", label: "Team Management", icon: UsersRound, component: TeamManagement },
    { id: "team-objectives", label: "Team Objectives", icon: Target, component: TeamObjectives },
    { id: "reports", label: "Reports", icon: BarChart3, component: Reports },
    { id: "settings", label: "Company Settings", icon: Settings, component: CompanySettings },
  ];

  // Determine tabs based on user role
  const getRoleTabs = () => {
    if (user?.role === 'leadership') {
      return [...baseTabs, ...leadershipTabs];
    } else if (user?.role === 'supervisor') {
      return [...baseTabs, ...supervisorTabs];
    }
    return baseTabs; // operative or default
  };

  const tabs = getRoleTabs();

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component || Dashboard;

  const renderNavigation = () => {
    if (isMobile) {
      return (
        <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
          <div className="grid grid-cols-5 gap-1 py-2">
            {/* Show only the first 5 base tabs to avoid overcrowding */}
            {baseTabs.slice(0, 5).map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              const href = tab.id === "dashboard" ? "/" : `/${tab.id}`;
              const mobileLabel = tab.label === "My Goals" ? "Goals" : tab.label === "Recognition" ? "Kudos" : tab.label;
              return (
                <Link
                  key={tab.id}
                  href={href}
                  className={`flex flex-col items-center p-2 text-xs no-underline ${
                    isActive ? "text-primary" : "text-muted-foreground"
                  }`}
                  data-testid={`tab-${tab.id}`}
                >
                  <Icon className="w-5 h-5 mb-1" />
                  <span>{mobileLabel}</span>
                </Link>
              );
            })}
          </div>
        </div>
      );
    }

    return (
      <div className="w-64 bg-card border-r border-border h-screen fixed left-0 top-0">
        <div className="p-6">
          <div className="flex items-center space-x-3 mb-8">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">A</span>
            </div>
            <span className="text-xl font-bold">Apex</span>
          </div>
          
          <nav className="space-y-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              const href = tab.id === "dashboard" ? "/" : `/${tab.id}`;
              return (
                <Link
                  key={tab.id}
                  href={href}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left no-underline ${
                    isActive
                      ? "text-primary bg-primary/10"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                  data-testid={`tab-${tab.id}`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{tab.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {user && (
          <div className="absolute bottom-6 left-6 right-6">
            <div className="flex items-center space-x-3 p-4 bg-muted rounded-lg">
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                <span className="text-primary-foreground font-medium text-sm">
                  {user.firstName?.charAt(0) || user.email?.charAt(0) || "U"}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">
                  {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : "Team Member"}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {renderNavigation()}
      
      <div className={`${isMobile ? "pb-20" : "md:ml-64"} min-h-screen`}>
        <header className="bg-card border-b border-border p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">
                Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"}, {user?.firstName || "there"}!
              </h1>
              <p className="text-muted-foreground">Here's your progress this week</p>
            </div>
            <div className="flex items-center space-x-3">
              <Button variant="ghost" size="icon" data-testid="button-notifications">
                <Bell className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" data-testid="button-menu">
                <ChevronDown className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </header>

        <main className="p-4 md:p-6">
          <ActiveComponent />
        </main>
      </div>
    </>
  );
}
