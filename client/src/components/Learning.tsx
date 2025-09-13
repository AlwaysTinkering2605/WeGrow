import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link, useLocation, useParams } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { 
  BookOpen, 
  Play, 
  Award, 
  Clock, 
  CheckCircle, 
  Users,
  FileText,
  BarChart3,
  Plus
} from "lucide-react";

export default function Learning() {
  const { user } = useAuth();
  const [location] = useLocation();
  const params = useParams();
  
  // Extract active tab from URL
  const getActiveTab = () => {
    if (location === "/learning" || !params.tab) return "dashboard";
    return params.tab || "dashboard";
  };

  const activeTab = getActiveTab();

  // Mock data for initial display
  const enrolledCourses = [
    {
      id: "1",
      title: "Health & Safety Fundamentals",
      progress: 75,
      totalLessons: 8,
      completedLessons: 6,
      category: "Safety",
      estimatedTime: "2 hours"
    },
    {
      id: "2", 
      title: "Chemical Handling Procedures",
      progress: 30,
      totalLessons: 12,
      completedLessons: 4,
      category: "Safety",
      estimatedTime: "3 hours"
    },
    {
      id: "3",
      title: "Customer Service Excellence",
      progress: 90,
      totalLessons: 6,
      completedLessons: 5,
      category: "Soft Skills",
      estimatedTime: "1.5 hours"
    }
  ];

  const recentCertificates = [
    { id: "1", name: "Health & Safety Foundation", earnedDate: "2025-09-10", validUntil: "2026-09-10" },
    { id: "2", name: "First Aid Basics", earnedDate: "2025-08-15", validUntil: "2026-08-15" }
  ];

  const upcomingTraining = [
    { id: "1", title: "ISO 9001 Quality Standards", dueDate: "2025-09-20", priority: "high" },
    { id: "2", title: "Environmental Compliance", dueDate: "2025-10-01", priority: "medium" }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold" data-testid="heading-learning">Learning Dashboard</h1>
          <p className="text-muted-foreground">Continue your professional development</p>
        </div>
        {(user?.role === 'supervisor' || user?.role === 'leadership') && (
          <Button data-testid="button-create-course">
            <Plus className="w-4 h-4 mr-2" />
            Create Course
          </Button>
        )}
      </div>

      <div className="space-y-6">
        <div className="grid w-full grid-cols-4 bg-muted p-1 rounded-lg">
          <Link
            href="/learning"
            className={`px-3 py-2 text-sm font-medium text-center rounded-md transition-colors ${
              activeTab === "dashboard"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            data-testid="tab-dashboard"
          >
            Dashboard
          </Link>
          <Link
            href="/learning/courses"
            className={`px-3 py-2 text-sm font-medium text-center rounded-md transition-colors ${
              activeTab === "courses"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            data-testid="tab-courses"
          >
            Courses
          </Link>
          <Link
            href="/learning/certificates"
            className={`px-3 py-2 text-sm font-medium text-center rounded-md transition-colors ${
              activeTab === "certificates"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            data-testid="tab-certificates"
          >
            Certificates
          </Link>
          <Link
            href="/learning/matrix"
            className={`px-3 py-2 text-sm font-medium text-center rounded-md transition-colors ${
              activeTab === "matrix"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            data-testid="tab-matrix"
          >
            Training Matrix
          </Link>
        </div>

        {activeTab === "dashboard" && (<div className="space-y-6">
          {/* Learning Progress Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card data-testid="card-enrolled-courses">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Enrolled Courses</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{enrolledCourses.length}</div>
                <p className="text-xs text-muted-foreground">Active enrollments</p>
              </CardContent>
            </Card>

            <Card data-testid="card-certificates-earned">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Certificates Earned</CardTitle>
                <Award className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{recentCertificates.length}</div>
                <p className="text-xs text-muted-foreground">This year</p>
              </CardContent>
            </Card>

            <Card data-testid="card-learning-hours">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Learning Hours</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">12.5</div>
                <p className="text-xs text-muted-foreground">This month</p>
              </CardContent>
            </Card>
          </div>

          {/* Current Courses */}
          <Card data-testid="card-current-courses">
            <CardHeader>
              <CardTitle>Continue Learning</CardTitle>
              <CardDescription>Pick up where you left off</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {enrolledCourses.map((course) => (
                <div key={course.id} className="flex items-center justify-between p-4 border rounded-lg" data-testid={`course-item-${course.id}`}>
                  <div className="flex-1">
                    <h3 className="font-semibold">{course.title}</h3>
                    <div className="flex items-center space-x-4 mt-2">
                      <Badge variant="secondary">{course.category}</Badge>
                      <span className="text-sm text-muted-foreground">
                        {course.completedLessons}/{course.totalLessons} lessons
                      </span>
                      <span className="text-sm text-muted-foreground flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {course.estimatedTime}
                      </span>
                    </div>
                    <Progress value={course.progress} className="mt-3 h-2" />
                    <p className="text-xs text-muted-foreground mt-1">{course.progress}% complete</p>
                  </div>
                  <Button className="ml-4" data-testid={`button-continue-${course.id}`}>
                    <Play className="w-4 h-4 mr-2" />
                    Continue
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Recent Achievements & Upcoming Training */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card data-testid="card-recent-achievements">
              <CardHeader>
                <CardTitle>Recent Achievements</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {recentCertificates.map((cert) => (
                  <div key={cert.id} className="flex items-center space-x-3" data-testid={`achievement-${cert.id}`}>
                    <Award className="w-5 h-5 text-yellow-500" />
                    <div>
                      <p className="font-medium">{cert.name}</p>
                      <p className="text-xs text-muted-foreground">Earned {cert.earnedDate}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card data-testid="card-upcoming-training">
              <CardHeader>
                <CardTitle>Upcoming Training</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {upcomingTraining.map((training) => (
                  <div key={training.id} className="flex items-center justify-between" data-testid={`training-${training.id}`}>
                    <div>
                      <p className="font-medium">{training.title}</p>
                      <p className="text-xs text-muted-foreground">Due {training.dueDate}</p>
                    </div>
                    <Badge variant={training.priority === 'high' ? 'destructive' : 'default'}>
                      {training.priority}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>)}

        {activeTab === "courses" && (<div className="space-y-6">
          <Card data-testid="card-course-catalog">
            <CardHeader>
              <CardTitle>Course Catalog</CardTitle>
              <CardDescription>Browse available courses and start learning</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Course catalog coming soon...</p>
              </div>
            </CardContent>
          </Card>
        </div>)}

        {activeTab === "certificates" && (<div className="space-y-6">
          <Card data-testid="card-certificates-view">
            <CardHeader>
              <CardTitle>My Certificates</CardTitle>
              <CardDescription>View and download your earned certificates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Award className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Certificate management coming soon...</p>
              </div>
            </CardContent>
          </Card>
        </div>)}

        {activeTab === "matrix" && (<div className="space-y-6">
          <Card data-testid="card-training-matrix">
            <CardHeader>
              <CardTitle>Training Matrix</CardTitle>
              <CardDescription>
                {user?.role === 'supervisor' || user?.role === 'leadership' 
                  ? "Manage training requirements and compliance tracking"
                  : "View your training requirements and progress"
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Training matrix coming soon...</p>
              </div>
            </CardContent>
          </Card>
        </div>)}
      </div>
    </div>
  );
}