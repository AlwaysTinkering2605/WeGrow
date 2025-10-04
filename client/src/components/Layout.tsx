import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
  ChevronRight,
  BarChart3,
  Settings,
  UsersRound,
  GraduationCap,
  Layers,
  Zap,
  Route,
  Brain,
  Webhook,
  Building2,
  TrendingUp,
  UserPlus,
  GitBranch,
  Briefcase,
  Tag,
  Sparkles,
} from "lucide-react";
import { NotificationBadge } from "./NotificationCenter";
import Dashboard from "./Dashboard";
import Goals from "./Goals";
import Development from "./Development";
import Recognition from "./Recognition";
import Meetings from "./Meetings";
import Profile from "./Profile";
import Learning from "./Learning";

// Role-based components
import UserManagement from "./UserManagement";
import JobRoleManagement from "./JobRoleManagement";
import TeamManagement from "./TeamManagement";
import DepartmentManagement from "./DepartmentManagement";
import CompanyObjectives from "./CompanyObjectives";
import TeamObjectives from "./TeamObjectives";
import Reports from "./Reports";
import CompanySettings from "./CompanySettings";
import CompetencyManagement from "./CompetencyManagement";
import TrainingMatrixDashboard from "./TrainingMatrixDashboard";
import LearningPathsManagement from "./LearningPathsManagement";
import AutomationEngine from "./AutomationEngine";
import AdvancedAnalyticsDashboard from "./AdvancedAnalyticsDashboard";
import WebhookConfiguration from "../pages/WebhookConfiguration";
import Organization from "./Organization";
import SkillCategories from "./SkillCategories";
import SkillCategoryTypes from "./SkillCategoryTypes";
import ProficiencyLevels from "./ProficiencyLevels";
import Skills from "./Skills";

type TabType = "dashboard" | "goals" | "development" | "recognition" | "meetings" | "learning" | "profile" | "user-management" | "job-roles" | "team" | "company-objectives" | "team-objectives" | "analytics" | "reports" | "settings" | "competency-management" | "training-matrix" | "learning-paths" | "automation-engine" | "webhooks" | "organization" | "departments" | "skill-categories" | "skill-category-types" | "proficiency-levels" | "skills";

export default function Layout() {
  const [location] = useLocation();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  
  // Dropdown state management
  const [openDropdowns, setOpenDropdowns] = useState<{[key: string]: boolean}>({
    company: false,
    people: false,
    talent: false,
    analytics: false,
  });

  // Extract active tab from URL
  const getActiveTab = (): TabType => {
    if (location === "/" || location === "/dashboard") return "dashboard";
    if (location === "/goals") return "goals";
    if (location === "/development") return "development";
    // Check specific learning routes BEFORE generic learning check
    if (location === "/learning-paths") return "learning-paths";
    if (location === "/automation-engine") return "automation-engine";
    if (location === "/analytics") return "analytics";
    if (location.startsWith("/learning")) return "learning";
    if (location === "/recognition") return "recognition";
    if (location === "/meetings") return "meetings";
    if (location === "/profile") return "profile";
    if (location === "/user-management") return "user-management";
    if (location === "/job-roles") return "job-roles";
    if (location === "/departments") return "departments";
    if (location === "/team") return "team";
    if (location === "/organization") return "organization";
    if (location === "/company-objectives") return "company-objectives";
    if (location === "/team-objectives") return "team-objectives";
    if (location === "/reports") return "reports";
    if (location === "/settings") return "settings";
    if (location === "/competency-management") return "competency-management";
    if (location === "/training-matrix") return "training-matrix";
    if (location === "/skill-categories") return "skill-categories";
    if (location === "/skill-category-types") return "skill-category-types";
    if (location === "/proficiency-levels") return "proficiency-levels";
    if (location === "/skills") return "skills";
    if (location === "/webhooks") return "webhooks";
    return "dashboard";
  };

  const activeTab = getActiveTab();
  

  // User Views - available to all users
  const userViews = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, component: Dashboard },
    { id: "goals", label: "My Goals", icon: Target, component: Goals },
    { id: "development", label: "Development", icon: BookOpen, component: Development },
    { id: "learning", label: "Learning", icon: GraduationCap, component: Learning },
    { id: "recognition", label: "Recognition", icon: Star, component: Recognition },
    { id: "meetings", label: "1-on-1s", icon: Users, component: Meetings },
    { id: "profile", label: "Profile", icon: User, component: Profile },
  ];

  // Admin Dropdowns - only for supervisor/leadership
  const adminDropdowns = {
    company: {
      id: "company",
      label: "Company",
      icon: Building2,
      items: [
        { id: "settings", label: "Company Settings", icon: Settings, component: CompanySettings },
        { id: "company-objectives", label: "Company Objectives", icon: Target, component: CompanyObjectives },
        { id: "webhooks", label: "Webhook Configuration", icon: Webhook, component: WebhookConfiguration },
        { id: "automation-engine", label: "Automation Engine", icon: Zap, component: AutomationEngine },
      ]
    },
    people: {
      id: "people",
      label: "People Management",
      icon: UsersRound,
      items: [
        { id: "user-management", label: "User Management", icon: UserPlus, component: UserManagement },
        { id: "job-roles", label: "Job Role Management", icon: Briefcase, component: JobRoleManagement },
        { id: "departments", label: "Department Management", icon: Building2, component: DepartmentManagement },
        { id: "team", label: "Team Management", icon: UsersRound, component: TeamManagement },
        { id: "organization", label: "Organization Chart", icon: GitBranch, component: Organization },
        { id: "team-objectives", label: "Team Objectives", icon: Target, component: TeamObjectives },
      ]
    },
    talent: {
      id: "talent",
      label: "Talent Development",
      icon: TrendingUp,
      items: [
        { id: "competency-management", label: "Competency Management", icon: Layers, component: CompetencyManagement },
        { id: "skill-categories", label: "Skill Categories", icon: Layers, component: SkillCategories },
        { id: "skill-category-types", label: "Category Types", icon: Tag, component: SkillCategoryTypes },
        { id: "proficiency-levels", label: "Proficiency Levels", icon: TrendingUp, component: ProficiencyLevels },
        { id: "skills", label: "Skills", icon: Sparkles, component: Skills },
        { id: "learning-paths", label: "Learning Paths", icon: Route, component: LearningPathsManagement },
        { id: "training-matrix", label: "Training Matrix", icon: BarChart3, component: TrainingMatrixDashboard },
      ]
    },
    analytics: {
      id: "analytics",
      label: "Analytics & Reports",
      icon: Brain,
      items: [
        { id: "reports", label: "Reports", icon: BarChart3, component: Reports },
        { id: "analytics", label: "Advanced Analytics", icon: Brain, component: AdvancedAnalyticsDashboard },
      ]
    }
  };

  // Get available admin dropdowns based on role
  const getAdminDropdowns = () => {
    if (user?.role === 'leadership') {
      return adminDropdowns;
    } else if (user?.role === 'supervisor') {
      // Supervisors get all except company management
      const { company, ...supervisorDropdowns } = adminDropdowns;
      return supervisorDropdowns;
    }
    return {};
  };

  // Get all available components for routing
  const getAllComponents = () => {
    const components = new Map();
    
    // Add user view components
    userViews.forEach(view => {
      components.set(view.id, view.component);
    });
    
    // Add admin dropdown components
    Object.values(getAdminDropdowns()).forEach((dropdown: any) => {
      dropdown.items.forEach((item: any) => {
        components.set(item.id, item.component);
      });
    });
    
    return components;
  };

  const allComponents = getAllComponents();

  const ActiveComponent = allComponents.get(activeTab) || Dashboard;

  const renderNavigation = () => {
    if (isMobile) {
      return (
        <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
          <div className="grid grid-cols-5 gap-1 py-2">
            {/* Show only the first 5 user views to avoid overcrowding */}
            {userViews.slice(0, 5).map((tab) => {
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
          
          <nav className="space-y-2 overflow-y-auto max-h-[calc(100vh-120px)]">
            {/* User Views */}
            {userViews.map((view) => {
              const Icon = view.icon;
              const isActive = activeTab === view.id;
              const href = view.id === "dashboard" ? "/" : `/${view.id}`;
              return (
                <Link
                  key={view.id}
                  href={href}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left no-underline ${
                    isActive
                      ? "text-primary bg-primary/10"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                  data-testid={`tab-${view.id}`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{view.label}</span>
                </Link>
              );
            })}
            
            {/* Admin Dropdowns */}
            {(user?.role === 'supervisor' || user?.role === 'leadership') && (
              <>
                <div className="mt-6 mb-4">
                  <div className="px-4 py-2">
                    <div className="h-px bg-border" />
                  </div>
                </div>
                
                {Object.values(getAdminDropdowns()).map((dropdown: any) => {
                  const DropdownIcon = dropdown.icon;
                  const isAnyItemActive = dropdown.items.some((item: any) => item.id === activeTab);
                  const hasExplicitState = openDropdowns.hasOwnProperty(dropdown.id);
                  const isOpen = hasExplicitState ? openDropdowns[dropdown.id] : isAnyItemActive;
                  
                  const toggleDropdown = () => {
                    setOpenDropdowns(prev => ({
                      ...prev,
                      [dropdown.id]: !isOpen
                    }));
                  };
                  
                  return (
                    <Collapsible key={dropdown.id} open={isOpen} onOpenChange={toggleDropdown}>
                      <CollapsibleTrigger asChild>
                        <Button
                          variant="ghost"
                          className={`w-full justify-start px-4 py-3 h-auto ${
                            isAnyItemActive ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"
                          }`}
                          data-testid={`dropdown-${dropdown.id}`}
                        >
                          <DropdownIcon className="w-5 h-5 mr-3" />
                          <span className="flex-1 text-left">{dropdown.label}</span>
                          <ChevronRight className={`w-4 h-4 transition-transform ${isOpen ? "rotate-90" : ""}`} />
                        </Button>
                      </CollapsibleTrigger>
                      
                      <CollapsibleContent className="space-y-1">
                        {dropdown.items.map((item: any) => {
                          const ItemIcon = item.icon;
                          const isActive = activeTab === item.id;
                          const href = `/${item.id}`;
                          
                          return (
                            <Link
                              key={item.id}
                              href={href}
                              className={`w-full flex items-center space-x-3 px-4 py-2 ml-6 rounded-lg text-left no-underline text-sm ${
                                isActive
                                  ? "text-primary bg-primary/10"
                                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
                              }`}
                              data-testid={`tab-${item.id}`}
                            >
                              <ItemIcon className="w-4 h-4" />
                              <span>{item.label}</span>
                            </Link>
                          );
                        })}
                      </CollapsibleContent>
                    </Collapsible>
                  );
                })}
              </>
            )}
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
              <NotificationBadge />
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
