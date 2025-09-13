import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link, useLocation, useParams } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
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
  Plus,
  AlertCircle,
  ShieldCheck,
  RefreshCw,
  Download,
  Star
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

  // Fetch LMS data using React Query with proper typing
  const { data: enrollments, isLoading: enrollmentsLoading, error: enrollmentsError, refetch: refetchEnrollments } = useQuery<any[]>({
    queryKey: ["/api/lms/enrollments/me"],
    retry: false,
  });

  const { data: certificates, isLoading: certificatesLoading, error: certificatesError, refetch: refetchCertificates } = useQuery<any[]>({
    queryKey: ["/api/lms/certificates/me"],
    retry: false,
  });

  const { data: badges, isLoading: badgesLoading, error: badgesError, refetch: refetchBadges } = useQuery<any[]>({
    queryKey: ["/api/lms/badges/me"],
    retry: false,
  });

  const { data: trainingRecords, isLoading: trainingRecordsLoading, error: trainingRecordsError, refetch: refetchTrainingRecords } = useQuery<any[]>({
    queryKey: ["/api/lms/training-records/me"],
    retry: false,
  });

  // Calculate learning metrics from real data with proper fallbacks
  const enrolledCourses = Array.isArray(enrollments) ? enrollments : [];
  const recentCertificates = Array.isArray(certificates) ? certificates : [];
  const earnedBadges = Array.isArray(badges) ? badges : [];
  const learningHours = Array.isArray(trainingRecords) 
    ? trainingRecords.reduce((total: number, record: any) => total + (record.hoursSpent || 0), 0) 
    : 0;
  
  // Mock upcoming training (will be replaced with training matrix data)
  const upcomingTraining = [
    { id: "1", title: "ISO 9001 Quality Standards", dueDate: "2025-09-20", priority: "high" },
    { id: "2", title: "Environmental Compliance", dueDate: "2025-10-01", priority: "medium" }
  ];

  // Loading state for the main dashboard
  const isMainLoading = enrollmentsLoading || certificatesLoading || badgesLoading || trainingRecordsLoading;

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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card data-testid="card-enrolled-courses" className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => window.location.href = '/learning/courses'}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Enrolled Courses</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {enrollmentsError ? (
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="h-4 w-4 text-destructive" />
                    <span className="text-sm text-destructive">Error loading</span>
                  </div>
                ) : isMainLoading ? (
                  <>
                    <Skeleton className="h-8 w-12 mb-1" />
                    <Skeleton className="h-4 w-24" />
                  </>
                ) : (
                  <>
                    <div className="text-2xl font-bold">{enrolledCourses.length}</div>
                    <p className="text-xs text-muted-foreground">Active enrollments</p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card data-testid="card-certificates-earned" className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => window.location.href = '/learning/certificates'}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Certificates Earned</CardTitle>
                <Award className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {certificatesError ? (
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="h-4 w-4 text-destructive" />
                    <span className="text-sm text-destructive">Error loading</span>
                  </div>
                ) : isMainLoading ? (
                  <>
                    <Skeleton className="h-8 w-12 mb-1" />
                    <Skeleton className="h-4 w-20" />
                  </>
                ) : (
                  <>
                    <div className="text-2xl font-bold">{recentCertificates.length}</div>
                    <p className="text-xs text-muted-foreground">This year</p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card data-testid="card-learning-hours">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Learning Hours</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {isMainLoading ? (
                  <>
                    <Skeleton className="h-8 w-16 mb-1" />
                    <Skeleton className="h-4 w-24" />
                  </>
                ) : (
                  <>
                    <div className="text-2xl font-bold">{learningHours.toFixed(1)}</div>
                    <p className="text-xs text-muted-foreground">Total hours</p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card data-testid="card-badges-earned" className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => window.location.href = '/learning/certificates'}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Badges Earned</CardTitle>
                <Star className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {badgesError ? (
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="h-4 w-4 text-destructive" />
                    <span className="text-sm text-destructive">Error loading</span>
                  </div>
                ) : isMainLoading ? (
                  <>
                    <Skeleton className="h-8 w-12 mb-1" />
                    <Skeleton className="h-4 w-20" />
                  </>
                ) : (
                  <>
                    <div className="text-2xl font-bold">{earnedBadges.length}</div>
                    <p className="text-xs text-muted-foreground">Achievements</p>
                  </>
                )}
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
              {isMainLoading ? (
                // Loading skeleton for courses
                [...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-4 border rounded-lg animate-pulse">
                    <div className="flex-1">
                      <Skeleton className="h-5 w-48 mb-2" />
                      <div className="flex items-center space-x-4 mt-2">
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-4 w-16" />
                      </div>
                      <Skeleton className="h-2 w-full mt-3" />
                      <Skeleton className="h-3 w-20 mt-1" />
                    </div>
                    <Skeleton className="h-9 w-20 ml-4" />
                  </div>
                ))
              ) : enrolledCourses.length > 0 ? (
                enrolledCourses.map((course: any) => (
                  <div key={course.id} className="flex items-center justify-between p-4 border rounded-lg" data-testid={`course-item-${course.id}`}>
                    <div className="flex-1">
                      <h3 className="font-semibold">{course.title || course.courseTitle || 'Untitled Course'}</h3>
                      <div className="flex items-center space-x-4 mt-2">
                        <Badge variant="secondary">{course.category || 'General'}</Badge>
                        <span className="text-sm text-muted-foreground">
                          {course.completedLessons || course.lessonsCompleted || 0}/{course.totalLessons || course.totalLessons || '?'} lessons
                        </span>
                        <span className="text-sm text-muted-foreground flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          {course.estimatedTime || course.duration || 'Unknown'}
                        </span>
                      </div>
                      <Progress value={course.progress || course.progressPercentage || 0} className="mt-3 h-2" />
                      <p className="text-xs text-muted-foreground mt-1">{course.progress || course.progressPercentage || 0}% complete</p>
                    </div>
                    <Button 
                      className="ml-4" 
                      data-testid={`button-continue-${course.id}`}
                      onClick={() => window.location.href = `/learning/course/${course.id}`}
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Continue
                    </Button>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-2">No enrolled courses yet</p>
                  <p className="text-sm text-muted-foreground">Browse the course catalog to start learning</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Achievements & Upcoming Training */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card data-testid="card-recent-achievements">
              <CardHeader>
                <CardTitle>Recent Achievements</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(certificatesError || badgesError) ? (
                  <div className="text-center py-6">
                    <AlertCircle className="w-8 h-8 text-destructive mx-auto mb-2" />
                    <p className="text-sm text-destructive mb-2">Failed to load achievements</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        refetchCertificates();
                        refetchBadges();
                      }}
                      data-testid="button-retry-achievements"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Retry
                    </Button>
                  </div>
                ) : isMainLoading ? (
                  // Loading skeleton for achievements
                  [...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-3 animate-pulse">
                      <Skeleton className="w-5 h-5 rounded" />
                      <div>
                        <Skeleton className="h-4 w-32 mb-1" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="space-y-3">
                    {/* Recent Certificates */}
                    {recentCertificates.length > 0 && recentCertificates.slice(0, 2).map((cert: any) => (
                      <div key={`cert-${cert.id}`} className="flex items-center space-x-3" data-testid={`achievement-cert-${cert.id}`}>
                        <Award className="w-5 h-5 text-yellow-500" />
                        <div>
                          <p className="font-medium">{cert.name || cert.title || 'Certificate'}</p>
                          <p className="text-xs text-muted-foreground">
                            Earned {new Date(cert.earnedDate || cert.issuedAt || cert.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                    
                    {/* Recent Badges */}
                    {earnedBadges.length > 0 && earnedBadges.slice(0, 2).map((userBadge: any) => (
                      <div key={`badge-${userBadge.id}`} className="flex items-center space-x-3" data-testid={`achievement-badge-${userBadge.id}`}>
                        <Star className="w-5 h-5 text-blue-500" />
                        <div>
                          <p className="font-medium">{userBadge.badge?.name || userBadge.name || 'Badge'}</p>
                          <p className="text-xs text-muted-foreground">
                            Awarded {new Date(userBadge.awardedAt || userBadge.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                    
                    {/* Empty State */}
                    {recentCertificates.length === 0 && earnedBadges.length === 0 && (
                      <div className="text-center py-6">
                        <Award className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">No achievements yet</p>
                        <p className="text-xs text-muted-foreground mt-1">Complete courses to earn certificates and badges</p>
                      </div>
                    )}
                  </div>
                )}
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
          {/* Certificates Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card data-testid="card-total-certificates">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Certificates</CardTitle>
                <Award className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{recentCertificates.length}</div>
                <p className="text-xs text-muted-foreground">Earned certificates</p>
              </CardContent>
            </Card>
            
            <Card data-testid="card-total-badges">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Badges</CardTitle>
                <Star className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{earnedBadges.length}</div>
                <p className="text-xs text-muted-foreground">Earned badges</p>
              </CardContent>
            </Card>
            
            <Card data-testid="card-completion-rate">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {enrolledCourses.length > 0 
                    ? Math.round((recentCertificates.length / enrolledCourses.length) * 100) 
                    : 0}%
                </div>
                <p className="text-xs text-muted-foreground">Courses completed</p>
              </CardContent>
            </Card>
          </div>

          {/* Certificates List */}
          <Card data-testid="card-certificates-list">
            <CardHeader>
              <CardTitle>My Certificates</CardTitle>
              <CardDescription>View and download your earned certificates</CardDescription>
            </CardHeader>
            <CardContent>
              {certificatesError ? (
                <div className="text-center py-8">
                  <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
                  <p className="text-destructive mb-2">Failed to load certificates</p>
                  <Button 
                    variant="outline" 
                    onClick={() => refetchCertificates()}
                    data-testid="button-retry-certificates"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Retry
                  </Button>
                </div>
              ) : certificatesLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center justify-between p-4 border rounded-lg animate-pulse">
                      <div className="flex items-center space-x-4">
                        <Skeleton className="w-12 h-12 rounded" />
                        <div>
                          <Skeleton className="h-5 w-48 mb-2" />
                          <Skeleton className="h-4 w-32" />
                        </div>
                      </div>
                      <Skeleton className="h-9 w-24" />
                    </div>
                  ))}
                </div>
              ) : recentCertificates.length > 0 ? (
                <div className="space-y-4">
                  {recentCertificates.map((cert: any) => (
                    <div key={cert.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors" data-testid={`certificate-item-${cert.id}`}>
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center">
                          <Award className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{cert.name || cert.title || 'Certificate'}</h3>
                          <div className="flex items-center space-x-4 mt-1">
                            <span className="text-sm text-muted-foreground">
                              Earned: {new Date(cert.earnedDate || cert.issuedAt || cert.createdAt).toLocaleDateString()}
                            </span>
                            {cert.expiresAt && (
                              <span className="text-sm text-muted-foreground">
                                Expires: {new Date(cert.expiresAt).toLocaleDateString()}
                              </span>
                            )}
                            {cert.certificateNumber && (
                              <span className="text-sm text-muted-foreground">
                                #{cert.certificateNumber}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          data-testid={`button-download-${cert.id}`}
                          onClick={() => {
                            // TODO: Implement certificate download
                            console.log('Download certificate:', cert.id);
                          }}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          data-testid={`button-verify-${cert.id}`}
                          onClick={() => {
                            // TODO: Implement certificate verification
                            console.log('Verify certificate:', cert.verificationHash);
                          }}
                        >
                          <ShieldCheck className="w-4 h-4 mr-2" />
                          Verify
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Award className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-2">No certificates earned yet</p>
                  <p className="text-sm text-muted-foreground">Complete courses to earn your first certificate</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Badges List */}
          <Card data-testid="card-badges-list">
            <CardHeader>
              <CardTitle>My Badges</CardTitle>
              <CardDescription>Achievements and skill badges you've earned</CardDescription>
            </CardHeader>
            <CardContent>
              {badgesError ? (
                <div className="text-center py-8">
                  <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
                  <p className="text-destructive mb-2">Failed to load badges</p>
                  <Button 
                    variant="outline" 
                    onClick={() => refetchBadges()}
                    data-testid="button-retry-badges"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Retry
                  </Button>
                </div>
              ) : badgesLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="p-4 border rounded-lg animate-pulse">
                      <div className="flex items-center space-x-3">
                        <Skeleton className="w-10 h-10 rounded-full" />
                        <div>
                          <Skeleton className="h-4 w-24 mb-1" />
                          <Skeleton className="h-3 w-16" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : earnedBadges.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {earnedBadges.map((userBadge: any) => (
                    <div key={userBadge.id} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors" data-testid={`badge-item-${userBadge.id}`}>
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
                          <Star className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h4 className="font-medium">{userBadge.badge?.name || userBadge.name || 'Badge'}</h4>
                          <p className="text-sm text-muted-foreground">
                            {new Date(userBadge.awardedAt || userBadge.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      {(userBadge.badge?.description || userBadge.reason) && (
                        <p className="text-sm text-muted-foreground mt-2">
                          {userBadge.badge?.description || userBadge.reason}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Star className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-2">No badges earned yet</p>
                  <p className="text-sm text-muted-foreground">Complete courses and demonstrate skills to earn badges</p>
                </div>
              )}
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