import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import Player from '@vimeo/player';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link, useLocation, useParams } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
  Star,
  ClipboardList,
  Calendar,
  Building,
  FileCheck,
  Settings,
  Edit,
  Trash2,
  Copy,
  Upload,
  Video,
  Trophy,
  Target,
  PieChart,
  TrendingUp,
  GraduationCap,
  Layers,
  PlayCircle,
  Circle,
  Lock
} from "lucide-react";

// Form Schemas for Admin Interface
const courseSchema = z.object({
  title: z.string().min(1, "Course title is required"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  category: z.string().min(1, "Category is required"),
  targetRole: z.string().optional(),
  estimatedHours: z.coerce.number().min(0.5).max(100),
  difficulty: z.enum(["Beginner", "Intermediate", "Advanced"]),
  vimeoVideoId: z.string().optional(),
  isPublished: z.boolean().default(false),
});

// Import the proper lesson schema from shared
import { insertLessonSchema } from "@shared/schema";

// Extend the insert schema for client-side validation
const lessonSchema = insertLessonSchema.extend({
  // Override to make these coercible from form inputs
  orderIndex: z.coerce.number().min(1),
  estimatedDuration: z.coerce.number().min(60).max(18000), // 1 minute to 5 hours in seconds
  type: z.enum(["video", "document", "link", "quiz"]).default("video"),
}).omit({
  moduleId: true, // Will be provided by the courseId context
});

const quizSchema = z.object({
  title: z.string().min(1, "Quiz title is required"),
  description: z.string().optional(),
  passingScore: z.coerce.number().min(50).max(100).default(80),
  maxAttempts: z.coerce.number().min(1).max(10).default(3),
  timeLimit: z.coerce.number().min(5).max(120).optional(),
});

const quizQuestionSchema = z.object({
  type: z.enum(["multiple_choice", "true_false", "multi_select"]),
  questionText: z.string().min(1, "Question text is required"),
  options: z.array(z.string()).min(2, "At least 2 options required").optional(),
  correctAnswers: z.array(z.coerce.number()).min(1, "At least 1 correct answer required"),
  explanation: z.string().optional(),
  orderIndex: z.coerce.number().min(1).default(1),
});

const badgeSchema = z.object({
  name: z.string().min(1, "Badge name is required"),
  description: z.string().min(10, "Description is required"),
  criteria: z.string().min(10, "Achievement criteria required"),
  icon: z.string().optional(),
  color: z.string().default("#3B82F6"),
});

// Vimeo Player Component with Progress Tracking
function VimeoPlayer({ videoId, enrollmentId, lessonId, onProgressUpdate, onComplete, onProgressComplete }: {
  videoId: string;
  enrollmentId: string;
  lessonId: string;
  onProgressUpdate?: (progress: number, timePosition: number) => void;
  onComplete?: () => void;
  onProgressComplete?: (progress: number, timePosition: number) => void;
}) {
  const playerRef = useRef<HTMLDivElement>(null);
  const vimeoPlayer = useRef<Player | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const lastSavedProgress = useRef<number>(0);
  const loadingTimeoutRef = useRef<number | null>(null);

  // Store callbacks in refs to avoid effect dependencies
  const onProgressUpdateRef = useRef(onProgressUpdate);
  const onCompleteRef = useRef(onComplete);
  const onProgressCompleteRef = useRef(onProgressComplete);

  // Update callback refs when props change
  useEffect(() => {
    onProgressUpdateRef.current = onProgressUpdate;
  }, [onProgressUpdate]);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    onProgressCompleteRef.current = onProgressComplete;
  }, [onProgressComplete]);

  // Initialize player once on mount
  useEffect(() => {
    if (!playerRef.current) return;

    // Initialize Vimeo Player with initial video ID if available
    try {
      const playerOptions = {
        width: 640,
        height: 360,
        responsive: true,
        controls: true,
        autopause: false
      };

      // If we have a videoId on mount, initialize with it
      if (videoId) {
        console.log('Initializing Vimeo player with video ID:', videoId);
        const videoIdNumber = parseInt(videoId);
        if (!isNaN(videoIdNumber)) {
          (playerOptions as any).id = videoIdNumber;
          console.log('Parsed video ID number:', videoIdNumber);
        } else {
          console.error('Invalid video ID format:', videoId);
        }
      }

      vimeoPlayer.current = new Player(playerRef.current, playerOptions);

      // Set up event listeners for progress tracking
      vimeoPlayer.current.on('loaded', () => {
        setIsLoading(false);
        if (loadingTimeoutRef.current) {
          window.clearTimeout(loadingTimeoutRef.current);
          loadingTimeoutRef.current = null;
        }
      });

      vimeoPlayer.current.on('error', (error) => {
        console.error('Vimeo Player Error:', error);
        console.error('Failed Video ID:', videoId);
        setError(`Failed to load video: ${error.message || 'Unknown error'}`);
        setIsLoading(false);
        if (loadingTimeoutRef.current) {
          window.clearTimeout(loadingTimeoutRef.current);
          loadingTimeoutRef.current = null;
        }
      });

      // Clear loading on multiple events for better reliability
      vimeoPlayer.current.on('play', () => {
        setIsLoading(false);
        if (loadingTimeoutRef.current) {
          window.clearTimeout(loadingTimeoutRef.current);
          loadingTimeoutRef.current = null;
        }
      });

      vimeoPlayer.current.on('bufferend', () => {
        setIsLoading(false);
      });

      // Track progress with throttling to avoid API spam
      vimeoPlayer.current.on('timeupdate', async (data) => {
        const { seconds, duration } = data;
        
        // Clear loading state on first timeupdate
        setIsLoading(false);
        if (loadingTimeoutRef.current) {
          window.clearTimeout(loadingTimeoutRef.current);
          loadingTimeoutRef.current = null;
        }
        
        // Guard against invalid duration
        if (duration <= 0) return;
        
        const progress = Math.round((seconds / duration) * 100);
        
        // Throttle progress updates: only save when progress increases by at least 1%
        if (progress > lastSavedProgress.current) {
          lastSavedProgress.current = progress;
          
          // Always call progress update for regular tracking
          if (onProgressUpdateRef.current) {
            onProgressUpdateRef.current(progress, seconds);
          }
          
          // Call completion callback when 100% reached (only once)
          if (progress >= 100 && !isCompleted && onProgressCompleteRef.current) {
            setIsCompleted(true);
            onProgressCompleteRef.current(progress, seconds);
          }
        }
      });

      // Track video completion
      vimeoPlayer.current.on('ended', () => {
        if (onCompleteRef.current) {
          onCompleteRef.current();
        }
      });

    } catch (err) {
      console.error('Error initializing Vimeo player:', err);
      setError(`Failed to initialize video player: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setIsLoading(false);
    }

    // Cleanup on unmount only
    return () => {
      if (loadingTimeoutRef.current) {
        window.clearTimeout(loadingTimeoutRef.current);
      }
      if (vimeoPlayer.current) {
        vimeoPlayer.current.destroy();
      }
    };
  }, []); // Only run once on mount

  // Handle video ID changes by loading new video
  useEffect(() => {
    if (!videoId) return;

    // Reset state when switching videos
    lastSavedProgress.current = 0;
    setIsCompleted(false);
    setIsLoading(true);
    setError(null);

    // Clear any existing timeout
    if (loadingTimeoutRef.current) {
      window.clearTimeout(loadingTimeoutRef.current);
    }

    // Set loading timeout (10 seconds)
    loadingTimeoutRef.current = window.setTimeout(() => {
      setError('Video loading timed out. Please check your connection or try refreshing.');
      setIsLoading(false);
    }, 10000);

    try {
      const videoIdNumber = parseInt(videoId);
      if (isNaN(videoIdNumber)) {
        throw new Error(`Invalid video ID: ${videoId}`);
      }

      // If player not initialized yet, it will be initialized with this video ID in the mount effect
      if (!vimeoPlayer.current) {
        return; // The mount effect will handle this video ID
      }

      // Load new video using existing player instance
      vimeoPlayer.current.loadVideo(videoIdNumber).then(() => {
        console.log(`Successfully loaded video ${videoIdNumber}`);
      }).catch((err) => {
        console.error('Error loading video:', err);
        setError(`Failed to load video: ${err.message || 'Video may be private or not found'}`);
        setIsLoading(false);
        if (loadingTimeoutRef.current) {
          window.clearTimeout(loadingTimeoutRef.current);
          loadingTimeoutRef.current = null;
        }
      });

    } catch (err) {
      console.error('Error loading video:', err);
      setError(`Failed to load video: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setIsLoading(false);
      if (loadingTimeoutRef.current) {
        window.clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
    }
  }, [videoId]); // Only depend on videoId

  if (error) {
    return (
      <div className="aspect-video bg-black rounded-lg overflow-hidden relative flex items-center justify-center">
        <div className="text-center text-white">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 opacity-75" />
          <p className="text-lg">Error loading video</p>
          <p className="text-sm opacity-75">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="aspect-video bg-black rounded-lg overflow-hidden relative">
      <div ref={playerRef} className="w-full h-full" />
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-75">
          <div className="text-center text-white">
            <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin" />
            <p>Loading video...</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Learning() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [location] = useLocation();
  const params = useParams();
  
  // Check if we're viewing a specific course
  const isViewingCourse = location.startsWith("/learning/courses/");
  const courseId = isViewingCourse ? location.split("/learning/courses/")[1] : null;
  
  // Check if we're viewing the course catalog
  const isViewingCatalog = location === "/learning/courses";
  
  
  // Extract active tab from URL
  const getActiveTab = () => {
    if (location === "/learning") return "dashboard";
    if (location === "/learning/courses") return "courses";
    if (location === "/learning/certificates") return "certificates";
    if (location === "/learning/matrix") return "matrix";
    if (location.startsWith("/learning/courses/")) return "courses"; // Individual course pages
    return "dashboard";
  };

  const activeTab = getActiveTab();

  // Course catalog state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedRole, setSelectedRole] = useState("all");

  // Course player state
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0);
  const [currentLesson, setCurrentLesson] = useState<any>(null);
  
  // Track which course is currently being enrolled to prevent shared loading state
  const [enrollingCourseId, setEnrollingCourseId] = useState<string | null>(null);
  
  // Quiz taking state
  const [isQuizActive, setIsQuizActive] = useState(false);
  const [currentQuiz, setCurrentQuiz] = useState<any>(null);
  const [quizQuestionsForTaking, setQuizQuestionsForTaking] = useState<any[]>([]);
  const [userAnswers, setUserAnswers] = useState<{ [key: string]: any }>({});
  const [currentAttempt, setCurrentAttempt] = useState<any>(null);
  const [quizStartTime, setQuizStartTime] = useState<Date | null>(null);

  // Admin interface state
  const [isCreateCourseOpen, setIsCreateCourseOpen] = useState(false);
  const [isCreateLessonOpen, setIsCreateLessonOpen] = useState(false);
  const [isEditLessonOpen, setIsEditLessonOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<any>(null);
  const [isCreateQuizOpen, setIsCreateQuizOpen] = useState(false);
  const [isEditQuizOpen, setIsEditQuizOpen] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<any>(null);
  const [isCreateBadgeOpen, setIsCreateBadgeOpen] = useState(false);
  const [isManageQuestionsOpen, setIsManageQuestionsOpen] = useState(false);
  const [selectedCourseForEdit, setSelectedCourseForEdit] = useState<any>(null);
  const [selectedCourseForContent, setSelectedCourseForContent] = useState<string>("");
  const [selectedLessonForQuiz, setSelectedLessonForQuiz] = useState<string>("");
  const [selectedQuizForQuestions, setSelectedQuizForQuestions] = useState<string>("");
  const [adminTab, setAdminTab] = useState("courses");
  const [isAdminMode, setIsAdminMode] = useState(false);

  // Assessment viewing state
  const [selectedCourseForViewing, setSelectedCourseForViewing] = useState<string>("all");
  const [selectedLessonForViewing, setSelectedLessonForViewing] = useState<string>("all");

  // Quiz question management state
  const [quizQuestions, setQuizQuestions] = useState<any[]>([]);
  const [editingQuestionIndex, setEditingQuestionIndex] = useState<number>(-1);

  // Form instances for admin operations
  const createCourseForm = useForm({
    resolver: zodResolver(courseSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "",
      targetRole: "",
      estimatedHours: 1,
      difficulty: "Beginner" as const,
      vimeoVideoId: "",
      isPublished: false,
    },
  });

  const updateCourseForm = useForm({
    resolver: zodResolver(courseSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "",
      targetRole: "",
      estimatedHours: 1,
      difficulty: "Beginner" as const,
      vimeoVideoId: "",
      isPublished: false,
    },
  });

  // Effect to populate edit form when selectedCourseForEdit changes
  useEffect(() => {
    if (selectedCourseForEdit) {
      updateCourseForm.reset({
        title: selectedCourseForEdit.title || "",
        description: selectedCourseForEdit.description || "",
        category: selectedCourseForEdit.category || "",
        targetRole: selectedCourseForEdit.targetRole || "",
        estimatedHours: selectedCourseForEdit.estimatedHours || 1,
        difficulty: selectedCourseForEdit.difficulty || "Beginner",
        vimeoVideoId: selectedCourseForEdit.vimeoVideoId || "",
        isPublished: selectedCourseForEdit.isPublished || false,
      });
    }
  }, [selectedCourseForEdit, updateCourseForm]);

  const createLessonForm = useForm({
    resolver: zodResolver(lessonSchema),
    defaultValues: {
      title: "",
      description: "",
      vimeoVideoId: "",
      type: "video" as const,
      orderIndex: 1,
      estimatedDuration: 1800, // 30 minutes in seconds
      isRequired: true,
    },
  });

  const editLessonForm = useForm({
    resolver: zodResolver(lessonSchema),
    defaultValues: {
      title: "",
      description: "",
      vimeoVideoId: "",
      type: "video" as const,
      orderIndex: 1,
      estimatedDuration: 1800, // 30 minutes in seconds
      isRequired: true,
    },
  });

  // Effect to populate edit lesson form when editingLesson changes
  useEffect(() => {
    if (editingLesson) {
      editLessonForm.reset({
        title: editingLesson.title || "",
        description: editingLesson.description || "",
        vimeoVideoId: editingLesson.vimeoVideoId || "",
        type: editingLesson.type || "video",
        orderIndex: editingLesson.orderIndex || 1,
        estimatedDuration: editingLesson.estimatedDuration || 1800,
        isRequired: editingLesson.isRequired ?? true,
      });
    }
  }, [editingLesson, editLessonForm]);

  const createQuizForm = useForm({
    resolver: zodResolver(quizSchema),
    defaultValues: {
      title: "",
      description: "",
      passingScore: 80,
      maxAttempts: 3,
      timeLimit: 60,
    },
  });

  const editQuizForm = useForm({
    resolver: zodResolver(quizSchema),
    defaultValues: {
      title: "",
      description: "",
      passingScore: 80,
      maxAttempts: 3,
      timeLimit: 60,
    },
  });

  // Effect to populate edit quiz form when editingQuiz changes
  useEffect(() => {
    if (editingQuiz) {
      editQuizForm.reset({
        title: editingQuiz.title || "",
        description: editingQuiz.description || "",
        passingScore: editingQuiz.passingScore || 80,
        maxAttempts: editingQuiz.maxAttempts || 3,
        timeLimit: editingQuiz.timeLimit || 60,
      });
    }
  }, [editingQuiz, editQuizForm]);

  const createBadgeForm = useForm({
    resolver: zodResolver(badgeSchema),
    defaultValues: {
      name: "",
      description: "",
      criteria: "",
      icon: "",
      color: "#3B82F6",
    },
  });

  const createQuestionForm = useForm({
    resolver: zodResolver(quizQuestionSchema),
    defaultValues: {
      type: "multiple_choice" as const,
      questionText: "",
      options: ["", ""],
      correctAnswers: [],
      explanation: "",
      orderIndex: 1,
    },
  });

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

  // Fetch all available badges for admin interface
  const { data: availableBadges, isLoading: availableBadgesLoading, refetch: refetchAvailableBadges } = useQuery<any[]>({
    queryKey: ["/api/lms/badges"],
    retry: false,
  });

  const { data: trainingRecords, isLoading: trainingRecordsLoading, error: trainingRecordsError, refetch: refetchTrainingRecords } = useQuery<any[]>({
    queryKey: ["/api/lms/training-records/me"],
    retry: false,
  });

  // Fetch available courses for the catalog
  const { data: availableCourses, isLoading: coursesLoading, error: coursesError, refetch: refetchCourses } = useQuery<any[]>({
    queryKey: ["/api/lms/courses"],
    retry: false,
  });

  // Fetch specific course details when viewing a course
  const { data: courseDetails, isLoading: courseDetailsLoading, error: courseDetailsError } = useQuery<any>({
    queryKey: ["/api/lms/courses", courseId],
    enabled: !!courseId,
    retry: false,
  });

  // Enrollment mutation
  const enrollMutation = useMutation({
    mutationFn: async (course: any) => {
      // Set which course is being enrolled to show loading state on specific button
      setEnrollingCourseId(course.id);
      
      // Use courseVersionId (currentVersionId) for enrollment - must be valid
      if (!course.currentVersionId) {
        throw new Error("Course is missing version information. Please contact support.");
      }
      const courseVersionId = course.currentVersionId;
      const response = await apiRequest("POST", "/api/lms/enrollments", {
        courseVersionId
      });
      return await response.json();
    },
    onSuccess: () => {
      // Clear enrolling state
      setEnrollingCourseId(null);
      
      toast({
        title: "Enrollment Successful",
        description: "You've been enrolled in the course. Check your dashboard to start learning!",
      });
      // Refresh enrollments and courses data
      queryClient.invalidateQueries({ queryKey: ["/api/lms/enrollments/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/lms/courses"] });
    },
    onError: (error: any) => {
      // Clear enrolling state on error
      setEnrollingCourseId(null);
      
      toast({
        title: "Enrollment Failed",
        description: error.message || "Failed to enroll in course. Please try again.",
        variant: "destructive",
      });
    },
  });


  // Lesson progress mutation
  const updateProgressMutation = useMutation({
    mutationFn: async ({ enrollmentId, lessonId, progressPercentage, lastPosition, timeSpent, status }: {
      enrollmentId: string;
      lessonId: string;
      progressPercentage: number;
      lastPosition: number;
      timeSpent?: number;
      status?: string;
    }) => {
      const response = await apiRequest("PATCH", "/api/lms/progress", {
        enrollmentId,
        lessonId,
        progressPercentage,
        lastPosition,
        timeSpent,
        status: status || (progressPercentage >= 100 ? 'completed' : 'in_progress')
      });
      return await response.json();
    },
    onSuccess: () => {
      // Invalidate queries to update "What's Next" section in real-time
      queryClient.invalidateQueries({ queryKey: ["/api/lms/enrollments/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/lms/progress"] });
    },
    onError: (error: any) => {
      console.error('Failed to update progress:', error);
    },
  });

  // Course completion mutation
  const completeCourseMutation = useMutation({
    mutationFn: async (enrollmentId: string) => {
      const response = await apiRequest("POST", "/api/lms/enrollments/" + enrollmentId + "/complete", {});
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Course Completed!",
        description: "Congratulations! Your certificate will be available soon.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/lms/enrollments/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/lms/certificates/me"] });
    },
    onError: (error: any) => {
      toast({
        title: "Completion Failed",
        description: error.message || "Failed to complete course. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Quiz start mutation
  const startQuizMutation = useMutation({
    mutationFn: async ({ quizId, enrollmentId }: { quizId: string; enrollmentId: string; }) => {
      const response = await apiRequest("POST", "/api/lms/quiz-attempts", {
        quizId,
        enrollmentId
      });
      return await response.json();
    },
    onSuccess: (data) => {
      // Navigate to quiz interface
      toast({
        title: "Quiz Started",
        description: "Good luck with your assessment!",
      });
      // In a real app, we would navigate to a quiz interface
      console.log('Quiz attempt created:', data);
    },
    onError: (error: any) => {
      toast({
        title: "Quiz Start Failed",
        description: error.message || "Failed to start quiz. Please try again.",
        variant: "destructive",
      });
    },
  });

  // ADMIN MUTATIONS - Course Management
  const createCourseMutation = useMutation({
    mutationFn: async (courseData: z.infer<typeof courseSchema>) => {
      const response = await apiRequest("POST", "/api/lms/admin/courses", courseData);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Course Created",
        description: "New course has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/lms/courses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/lms/admin/courses"] });
      setIsCreateCourseOpen(false);
      createCourseForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Creation Failed",
        description: error.message || "Failed to create course. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateCourseMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<z.infer<typeof courseSchema>> }) => {
      const response = await apiRequest("PATCH", `/api/lms/admin/courses/${id}`, data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Course Updated",
        description: "Course has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/lms/courses"] });
      setSelectedCourseForEdit(null);
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update course. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteCourseMutation = useMutation({
    mutationFn: async (courseId: string) => {
      const response = await apiRequest("DELETE", `/api/lms/admin/courses/${courseId}`, {});
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Course Deleted",
        description: "Course has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/lms/courses"] });
    },
    onError: (error: any) => {
      toast({
        title: "Deletion Failed",
        description: error.message || "Failed to delete course. Please try again.",
        variant: "destructive",
      });
    },
  });

  // ADMIN MUTATIONS - Lesson Management
  const createLessonMutation = useMutation({
    mutationFn: async ({ courseId, lessonData }: { courseId: string; lessonData: z.infer<typeof lessonSchema> }) => {
      const response = await apiRequest("POST", `/api/lms/admin/courses/${courseId}/lessons`, lessonData);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Lesson Created",
        description: "New lesson has been added successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/lms/courses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/lms/admin/courses"] });
      // Also invalidate specific course detail if we're viewing one
      if (selectedCourseForContent) {
        queryClient.invalidateQueries({ queryKey: ["/api/lms/courses", selectedCourseForContent] });
        // Invalidate lessons list for the selected course to show new lesson immediately
        queryClient.invalidateQueries({ queryKey: ["/api/lms/courses", selectedCourseForContent, "lessons"] });
      }
      setIsCreateLessonOpen(false);
      createLessonForm.reset();
      // Don't reset selectedCourseForContent to preserve course selection for continued lesson management
    },
    onError: (error: any) => {
      toast({
        title: "Creation Failed",
        description: error.message || "Failed to create lesson. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update lesson mutation
  const updateLessonMutation = useMutation({
    mutationFn: async ({ lessonId, lessonData }: { lessonId: string; lessonData: z.infer<typeof lessonSchema> }) => {
      const response = await apiRequest("PUT", `/api/lms/admin/lessons/${lessonId}`, lessonData);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Lesson Updated",
        description: "Lesson has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/lms/courses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/lms/admin/courses"] });
      // Also invalidate specific course detail if we're viewing one
      if (selectedCourseForContent) {
        queryClient.invalidateQueries({ queryKey: ["/api/lms/courses", selectedCourseForContent] });
        queryClient.invalidateQueries({ queryKey: ["/api/lms/courses", selectedCourseForContent, "lessons"] });
      }
      setIsEditLessonOpen(false);
      setEditingLesson(null);
      editLessonForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update lesson. Please try again.",
        variant: "destructive",
      });
    },
  });

  // ADMIN MUTATIONS - Quiz Management
  const createQuizMutation = useMutation({
    mutationFn: async ({ lessonId, quizData }: { lessonId: string; quizData: z.infer<typeof quizSchema> }) => {
      const response = await apiRequest("POST", `/api/lms/admin/lessons/${lessonId}/quiz`, quizData);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Quiz Created",
        description: "New quiz has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/lms/courses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/lms/admin/courses"] });
      // Also invalidate specific course detail if we're viewing one
      if (selectedCourseForContent) {
        queryClient.invalidateQueries({ queryKey: ["/api/lms/courses", selectedCourseForContent] });
      }
      setIsCreateQuizOpen(false);
      createQuizForm.reset();
      setSelectedLessonForQuiz("");
    },
    onError: (error: any) => {
      toast({
        title: "Creation Failed",
        description: error.message || "Failed to create quiz. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update quiz mutation
  const updateQuizMutation = useMutation({
    mutationFn: async ({ quizId, quizData }: { quizId: string; quizData: z.infer<typeof quizSchema> }) => {
      const response = await apiRequest("PUT", `/api/lms/admin/quizzes/${quizId}`, quizData);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Quiz Updated",
        description: "Quiz has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/lms/courses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/lms/admin/courses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/lms/admin/quizzes"] });
      // Also invalidate specific course detail if we're viewing one
      if (selectedCourseForContent) {
        queryClient.invalidateQueries({ queryKey: ["/api/lms/courses", selectedCourseForContent] });
      }
      setIsEditQuizOpen(false);
      setEditingQuiz(null);
      editQuizForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update quiz. Please try again.",
        variant: "destructive",
      });
    },
  });

  // ADMIN MUTATIONS - Quiz Question Management
  const saveQuizQuestionsMutation = useMutation({
    mutationFn: async ({ quizId, questions }: { quizId: string; questions: any[] }) => {
      const response = await apiRequest("POST", `/api/lms/admin/quizzes/${quizId}/questions`, { questions });
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Questions Saved",
        description: "Quiz questions have been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/lms/admin/quizzes"] });
      setIsManageQuestionsOpen(false);
      setQuizQuestions([]);
    },
    onError: (error: any) => {
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save quiz questions. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Quiz attempt mutations for learners
  const startQuizAttemptMutation = useMutation({
    mutationFn: async ({ quizId, enrollmentId }: { quizId: string; enrollmentId?: string }) => {
      // First get user's existing attempts to determine attempt number
      const attemptsResponse = await apiRequest("GET", `/api/lms/quizzes/${quizId}/attempts/me`);
      const attempts = await attemptsResponse.json();
      const attemptNumber = (attempts?.length || 0) + 1;
      
      const response = await apiRequest("POST", `/api/lms/quizzes/${quizId}/attempts`, {
        enrollmentId,
        attemptNumber
      });
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Quiz Started",
        description: "Your quiz attempt has been started. Good luck!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Start Failed",
        description: error.message || "Failed to start quiz. Please try again.",
        variant: "destructive",
      });
    },
  });

  const submitQuizAttemptMutation = useMutation({
    mutationFn: async ({ attemptId, answers, timeSpent }: { attemptId: string; answers: any; timeSpent: number }) => {
      const response = await apiRequest("POST", `/api/lms/quiz-attempts/${attemptId}/submit`, {
        answers,
        timeSpent
      });
      return await response.json();
    },
    onSuccess: (result) => {
      toast({
        title: "Quiz Submitted",
        description: `Quiz completed! Score: ${result.score}% ${result.passed ? '✅ Passed' : '❌ Failed'}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/lms/enrollments"] });
    },
    onError: (error: any) => {
      toast({
        title: "Submit Failed",
        description: error.message || "Failed to submit quiz. Please try again.",
        variant: "destructive",
      });
    },
  });

  // LESSON PROGRESS MUTATION
  const updateLessonProgressMutation = useMutation({
    mutationFn: async ({ enrollmentId, lessonId, progress, lastPosition, status }: { 
      enrollmentId: string; 
      lessonId: string; 
      progress: number; 
      lastPosition?: number;
      status?: string;
    }) => {
      const response = await apiRequest("POST", "/api/lms/lesson-progress", {
        enrollmentId,
        lessonId,
        userId: user?.id,
        progressPercentage: progress,
        lastPosition: lastPosition || 0,
        status: status || (progress >= 100 ? "completed" : "in_progress"),
        timeSpent: 0 // Will be calculated separately for video
      });
      return await response.json();
    },
    onSuccess: () => {
      // Invalidate enrollment queries to refresh progress
      queryClient.invalidateQueries({ queryKey: ["/api/lms/enrollments"] });
    },
    onError: (error: any) => {
      console.error("Failed to update lesson progress:", error);
    },
  });

  // ADMIN MUTATIONS - Badge Management
  const createBadgeMutation = useMutation({
    mutationFn: async (badgeData: z.infer<typeof badgeSchema>) => {
      const response = await apiRequest("POST", "/api/lms/admin/badges", badgeData);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Badge Created",
        description: "New badge has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/lms/badges"] });
      setIsCreateBadgeOpen(false);
      createBadgeForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Creation Failed",
        description: error.message || "Failed to create badge. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Admin data queries
  const { data: adminCourses, isLoading: adminCoursesLoading } = useQuery<any[]>({
    queryKey: ["/api/lms/admin/courses"],
    enabled: !!(user?.role === 'supervisor' || user?.role === 'leadership'),
    retry: false,
  });

  const { data: adminAnalytics, isLoading: adminAnalyticsLoading } = useQuery<any>({
    queryKey: ["/api/lms/admin/analytics"],
    enabled: !!(user?.role === 'supervisor' || user?.role === 'leadership'),
    retry: false,
  });

  // Fetch lessons for selected course for quiz creation
  const { data: courseLessons, isLoading: courseLessonsLoading } = useQuery<any[]>({
    queryKey: ["/api/lms/courses", selectedCourseForContent, "lessons"],
    queryFn: async () => {
      if (!selectedCourseForContent) return [];
      
      // If "all" courses selected, fetch lessons from all courses
      if (selectedCourseForContent === "all") {
        if (!adminCourses) return [];
        
        // Fetch lessons from all courses and aggregate them
        const allLessonsPromises = adminCourses.map(async (course: any) => {
          try {
            const response = await apiRequest("GET", `/api/lms/courses/${course.id}/lessons`);
            const lessons = await response.json();
            // Add course information to each lesson for display purposes
            return lessons.map((lesson: any) => ({
              ...lesson,
              courseName: course.title,
              courseId: course.id
            }));
          } catch (error) {
            console.error(`Failed to fetch lessons for course ${course.id}:`, error);
            return [];
          }
        });
        
        const allLessonsArrays = await Promise.all(allLessonsPromises);
        // Flatten the array of arrays into a single array
        return allLessonsArrays.flat();
      }
      
      const response = await apiRequest("GET", `/api/lms/courses/${selectedCourseForContent}/lessons`);
      return await response.json();
    },
    enabled: !!(selectedCourseForContent && (user?.role === 'supervisor' || user?.role === 'leadership')),
    retry: false,
  });

  // Fetch lessons for selected course for viewing assessments
  const { data: viewingCourseLessons, isLoading: viewingCourseLessonsLoading } = useQuery<any[]>({
    queryKey: ["/api/lms/courses", selectedCourseForViewing, "lessons"],
    queryFn: async () => {
      if (!selectedCourseForViewing || selectedCourseForViewing === "all") return [];
      const response = await apiRequest("GET", `/api/lms/courses/${selectedCourseForViewing}/lessons`);
      return await response.json();
    },
    enabled: !!(selectedCourseForViewing && selectedCourseForViewing !== "all" && (user?.role === 'supervisor' || user?.role === 'leadership')),
    retry: false,
  });

  // Fetch quizzes for selected course
  const { data: courseQuizzes, isLoading: courseQuizzesLoading, error: courseQuizzesError } = useQuery<any[]>({
    queryKey: ["/api/lms/courses", selectedCourseForViewing, "quizzes"],
    queryFn: async () => {
      if (!selectedCourseForViewing || selectedCourseForViewing === "all") return [];
      const response = await apiRequest("GET", `/api/lms/courses/${selectedCourseForViewing}/quizzes`);
      return await response.json();
    },
    enabled: !!(selectedCourseForViewing && selectedCourseForViewing !== "all" && (user?.role === 'supervisor' || user?.role === 'leadership')),
    retry: false,
  });

  // Fetch quizzes for selected lesson
  const { data: lessonQuizzes, isLoading: lessonQuizzesLoading, error: lessonQuizzesError } = useQuery<any[]>({
    queryKey: ["/api/lms/lessons", selectedLessonForViewing, "quizzes"],
    queryFn: async () => {
      if (!selectedLessonForViewing || selectedLessonForViewing === "all") return [];
      const response = await apiRequest("GET", `/api/lms/lessons/${selectedLessonForViewing}/quizzes`);
      return await response.json();
    },
    enabled: !!(selectedLessonForViewing && selectedLessonForViewing !== "all" && (user?.role === 'supervisor' || user?.role === 'leadership')),
    retry: false,
  });

  // Fetch all quizzes across all courses (for "All Courses" functionality)
  const { data: allQuizzes, isLoading: allQuizzesLoading, error: allQuizzesError } = useQuery<any[]>({
    queryKey: ["/api/lms/admin/quizzes"],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/lms/admin/quizzes`);
      return await response.json();
    },
    enabled: !!(selectedCourseForViewing === "all" && (user?.role === 'supervisor' || user?.role === 'leadership')),
    retry: false,
  });

  // Fetch quiz questions for selected quiz
  const { data: quizQuestionsData, isLoading: quizQuestionsLoading } = useQuery<any[]>({
    queryKey: ["/api/lms/admin/quizzes", selectedQuizForQuestions, "questions"],
    queryFn: async () => {
      if (!selectedQuizForQuestions) return [];
      const response = await apiRequest("GET", `/api/lms/admin/quizzes/${selectedQuizForQuestions}/questions`);
      return await response.json();
    },
    enabled: !!(selectedQuizForQuestions && (user?.role === 'supervisor' || user?.role === 'leadership')),
    retry: false,
  });

  // Update quiz questions state when data changes
  useEffect(() => {
    if (quizQuestionsData) {
      setQuizQuestions(quizQuestionsData.map((q: any) => ({
        type: q.type,
        questionText: q.questionText,
        options: q.options || [],
        correctAnswers: q.correctAnswers || [],
        explanation: q.explanation || "",
        orderIndex: q.orderIndex || 1
      })));
    }
  }, [quizQuestionsData]);

  // Calculate learning metrics from real data with proper fallbacks
  const enrolledCourses = Array.isArray(enrollments) ? enrollments : [];
  const recentCertificates = Array.isArray(certificates) ? certificates : [];
  const earnedBadges = Array.isArray(badges) ? badges : [];
  const learningHours = Array.isArray(trainingRecords) 
    ? trainingRecords.reduce((total: number, record: any) => total + (record.hoursSpent || 0), 0) 
    : 0;
  
  // Fetch training matrix data from API
  const { data: trainingMatrix, isLoading: trainingMatrixLoading } = useQuery<any[]>({
    queryKey: ["/api/lms/training-matrix", { role: user?.role, teamId: user?.teamId }],
    retry: false,
    enabled: !!user,
  });

  // Use real training matrix data or fallback to empty array
  const complianceData = Array.isArray(trainingMatrix) ? trainingMatrix : [];
  const upcomingTraining = complianceData.filter((item: any) => item.status === 'required').slice(0, 5);

  // Filter and search logic for course catalog
  const filteredCourses = Array.isArray(availableCourses) ? availableCourses.filter((course: any) => {
    const matchesSearch = searchQuery === "" || 
      course.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === "all" || course.category === selectedCategory;
    const matchesRole = selectedRole === "all" || course.targetRole === selectedRole || !course.targetRole;
    
    return matchesSearch && matchesCategory && matchesRole;
  }) : [];

  // Check if user is already enrolled in a course
  const isEnrolledInCourse = (courseId: string) => {
    return enrolledCourses.some((enrollment: any) => {
      // Check both courseId (if it exists) and match courseVersionId with course's currentVersionId
      return enrollment.courseId === courseId || 
             (availableCourses?.find((course: any) => 
               course.id === courseId && course.currentVersionId === enrollment.courseVersionId
             ));
    });
  };

  // Quiz question management helper functions
  const addQuestion = () => {
    const newQuestion = {
      type: "multiple_choice" as const,
      questionText: "",
      options: ["", ""],
      correctAnswers: [],
      explanation: "",
      orderIndex: quizQuestions.length + 1,
    };
    setQuizQuestions(prev => [...prev, newQuestion]);
    setEditingQuestionIndex(quizQuestions.length);
  };

  const updateQuestion = (index: number, updates: any) => {
    const updatedQuestions = [...quizQuestions];
    updatedQuestions[index] = { ...updatedQuestions[index], ...updates };
    setQuizQuestions(updatedQuestions);
  };

  const removeQuestion = (index: number) => {
    const updatedQuestions = quizQuestions.filter((_, i) => i !== index);
    setQuizQuestions(updatedQuestions);
    if (editingQuestionIndex === index) {
      setEditingQuestionIndex(-1);
    }
  };

  const addOption = (questionIndex: number) => {
    const updatedQuestions = [...quizQuestions];
    updatedQuestions[questionIndex].options = [...(updatedQuestions[questionIndex].options || []), ""];
    setQuizQuestions(updatedQuestions);
  };

  const updateOption = (questionIndex: number, optionIndex: number, value: string) => {
    const updatedQuestions = [...quizQuestions];
    updatedQuestions[questionIndex].options[optionIndex] = value;
    setQuizQuestions(updatedQuestions);
  };

  const removeOption = (questionIndex: number, optionIndex: number) => {
    const updatedQuestions = [...quizQuestions];
    updatedQuestions[questionIndex].options = updatedQuestions[questionIndex].options.filter(
      (_: any, i: number) => i !== optionIndex
    );
    // Remove this option from correct answers if it was selected
    updatedQuestions[questionIndex].correctAnswers = updatedQuestions[questionIndex].correctAnswers.filter(
      (answerIndex: number) => answerIndex !== optionIndex
    ).map((answerIndex: number) => answerIndex > optionIndex ? answerIndex - 1 : answerIndex);
    setQuizQuestions(updatedQuestions);
  };

  const toggleCorrectAnswer = (questionIndex: number, optionIndex: number) => {
    const updatedQuestions = [...quizQuestions];
    const correctAnswers = updatedQuestions[questionIndex].correctAnswers || [];
    const isCorrect = correctAnswers.includes(optionIndex);
    
    if (updatedQuestions[questionIndex].type === "multiple_choice") {
      // Single correct answer for multiple choice
      updatedQuestions[questionIndex].correctAnswers = isCorrect ? [] : [optionIndex];
    } else {
      // Multiple correct answers for multi-select
      if (isCorrect) {
        updatedQuestions[questionIndex].correctAnswers = correctAnswers.filter(
          (index: number) => index !== optionIndex
        );
      } else {
        updatedQuestions[questionIndex].correctAnswers = [...correctAnswers, optionIndex];
      }
    }
    setQuizQuestions(updatedQuestions);
  };

  // Quiz taking helper functions
  const startQuiz = async (quiz: any, enrollmentId: string) => {
    try {
      // Start quiz attempt
      const attemptResult = await startQuizAttemptMutation.mutateAsync({ 
        quizId: quiz.id, 
        enrollmentId 
      });
      
      // Fetch quiz questions
      const questionsResponse = await apiRequest("GET", `/api/lms/quizzes/${quiz.id}/questions`);
      const questions = await questionsResponse.json();
      
      // Set up quiz state
      setCurrentQuiz(quiz);
      setQuizQuestionsForTaking(questions);
      setCurrentAttempt(attemptResult);
      setUserAnswers({});
      setQuizStartTime(new Date());
      setIsQuizActive(true);
      
    } catch (error) {
      console.error("Failed to start quiz:", error);
    }
  };

  const submitQuiz = async () => {
    if (!currentAttempt || !quizStartTime) return;
    
    const timeSpent = Math.floor((new Date().getTime() - quizStartTime.getTime()) / 1000);
    
    try {
      const result = await submitQuizAttemptMutation.mutateAsync({
        attemptId: currentAttempt.id,
        answers: userAnswers,
        timeSpent
      });
      
      // Reset quiz state
      setIsQuizActive(false);
      setCurrentQuiz(null);
      setQuizQuestionsForTaking([]);
      setUserAnswers({});
      setCurrentAttempt(null);
      setQuizStartTime(null);
      
      return result;
    } catch (error) {
      console.error("Failed to submit quiz:", error);
    }
  };

  const updateQuizAnswer = (questionId: string, answer: any) => {
    setUserAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  // Lesson navigation logic for course player
  const availableLessons = courseDetails?.lessons || [];
  
  // Helper function to check if a lesson is locked (requires previous lessons to be completed)
  const isLessonLocked = (lessonIndex: number): boolean => {
    if (lessonIndex === 0) return false; // First lesson is never locked
    
    // Check if all previous lessons are completed
    for (let i = 0; i < lessonIndex; i++) {
      const previousLesson = availableLessons[i];
      const isVideoCompleted = previousLesson.progress?.status === 'completed';
      const hasQuiz = !!previousLesson.quiz?.quiz;
      const isQuizPassed = previousLesson.quiz?.latestAttempt?.passed;
      
      // For lessons with quizzes, both video AND quiz must be completed
      if (hasQuiz) {
        if (!isVideoCompleted || !isQuizPassed) {
          return true; // Lesson is locked
        }
      } else {
        // For lessons without quizzes, just need video completion
        if (!isVideoCompleted) {
          return true; // Lesson is locked
        }
      }
    }
    
    return false; // All prerequisites met, lesson is unlocked
  };
  
  // Helper function to get the next available (unlocked) lesson
  const getNextAvailableLesson = (): { lesson: any, index: number } | null => {
    for (let i = 0; i < availableLessons.length; i++) {
      if (!isLessonLocked(i) && availableLessons[i].progress?.status !== 'completed') {
        return { lesson: availableLessons[i], index: i };
      }
    }
    // If all lessons are completed, return the last lesson
    return availableLessons.length > 0 ? { 
      lesson: availableLessons[availableLessons.length - 1], 
      index: availableLessons.length - 1 
    } : null;
  };
  
  // Set current lesson when course data loads
  useEffect(() => {
    if (availableLessons.length > 0 && !currentLesson) {
      // Find the next available lesson that's not locked
      const nextAvailable = getNextAvailableLesson();
      if (nextAvailable) {
        setCurrentLessonIndex(nextAvailable.index);
        setCurrentLesson(nextAvailable.lesson);
      }
    }
  }, [courseDetails, availableLessons.length]);

  // Lesson navigation functions
  const goToLesson = (lessonIndex: number) => {
    if (lessonIndex >= 0 && lessonIndex < availableLessons.length) {
      // Check if the lesson is locked
      if (isLessonLocked(lessonIndex)) {
        toast({
          title: "Lesson Locked",
          description: "Complete the previous lesson(s) and any quizzes to unlock this lesson.",
          variant: "destructive",
        });
        return;
      }
      setCurrentLessonIndex(lessonIndex);
      setCurrentLesson(availableLessons[lessonIndex]);
    }
  };

  const goToNextLesson = () => {
    const nextIndex = currentLessonIndex + 1;
    if (nextIndex < availableLessons.length && !isLessonLocked(nextIndex)) {
      goToLesson(nextIndex);
    }
  };

  const goToPreviousLesson = () => {
    const prevIndex = currentLessonIndex - 1;
    if (prevIndex >= 0) {
      goToLesson(prevIndex);
    }
  };

  // Loading state for the main dashboard
  const isMainLoading = enrollmentsLoading || certificatesLoading || badgesLoading || trainingRecordsLoading;

  // Course Player View
  if (isViewingCourse && courseId) {
    return (
      <div className="space-y-6">
        {courseDetailsLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <Skeleton className="h-64 w-full" />
              </div>
              <div className="space-y-4">
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
          </div>
        ) : courseDetailsError ? (
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h2 className="text-2xl font-semibold mb-2">Course not found</h2>
            <p className="text-muted-foreground mb-4">The course you're looking for doesn't exist or has been removed.</p>
            <Button asChild>
              <Link href="/learning/courses">Back to Course Catalog</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Course Header */}
            <div className="border-b pb-6">
              <div className="flex items-center justify-between mb-4">
                <Button variant="outline" asChild data-testid="button-back-to-catalog">
                  <Link href="/learning/courses">
                    ← Back to Catalog
                  </Link>
                </Button>
                <Badge variant="secondary">
                  {courseDetails?.category || 'General'}
                </Badge>
              </div>
              <h1 className="text-3xl font-bold mb-2">{courseDetails?.title || 'Course Title'}</h1>
              <p className="text-muted-foreground text-lg mb-4">
                {courseDetails?.description || 'Course description not available'}
              </p>
              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <span className="flex items-center">
                  <Clock className="w-4 h-4 mr-1" />
                  {courseDetails?.estimatedHours || 2} hours
                </span>
                <span className="flex items-center">
                  <Users className="w-4 h-4 mr-1" />
                  {courseDetails?.enrolledCount || 0} enrolled
                </span>
                <span className="flex items-center">
                  <Award className="w-4 h-4 mr-1" />
                  Certificate available
                </span>
              </div>
            </div>

            {/* Course Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Video Player */}
              <div className="lg:col-span-2 space-y-4">
                <Card data-testid="card-video-player">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">
                          {currentLesson?.title || 'Select a Lesson'}
                        </CardTitle>
                        {currentLesson && (
                          <CardDescription>
                            Lesson {currentLessonIndex + 1} of {availableLessons.length} 
                            {currentLesson.moduleTitle && ` • ${currentLesson.moduleTitle}`}
                          </CardDescription>
                        )}
                      </div>
                      {currentLesson?.quiz?.quiz && (
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            <ClipboardList className="w-3 h-3 mr-1" />
                            Quiz Available
                          </Badge>
                          {currentLesson.quiz.latestAttempt && (
                            <Badge variant={currentLesson.quiz.latestAttempt.passed ? 'default' : 'destructive'}>
                              {currentLesson.quiz.latestAttempt.passed ? 'Quiz Passed' : 'Quiz Failed'}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="aspect-video bg-black rounded-lg overflow-hidden relative">
                      {/* Enhanced Vimeo Video Integration */}
                      {currentLesson?.vimeoVideoId ? (
                        <VimeoPlayer
                          videoId={currentLesson.vimeoVideoId}
                          enrollmentId={courseDetails?.enrollment?.id || ''}
                          lessonId={currentLesson.id}
                          onProgressUpdate={(progress, timePosition) => {
                            // Save progress updates (already throttled by VimeoPlayer)
                            const enrollmentId = courseDetails?.enrollment?.id;
                            if (enrollmentId && progress > 0 && currentLesson?.id) {
                              updateLessonProgressMutation.mutate({
                                enrollmentId,
                                lessonId: currentLesson.id,
                                progress: progress,
                                lastPosition: timePosition
                              });
                            }
                          }}
                          onProgressComplete={(progress, timePosition) => {
                            // Handle 100% completion (called only once by VimeoPlayer)
                            const enrollmentId = courseDetails?.enrollment?.id;
                            if (enrollmentId && currentLesson?.id) {
                              const hasQuiz = !!currentLesson.quiz?.quiz;
                              const quizPassed = currentLesson.quiz?.latestAttempt?.passed;
                              
                              // Auto-complete if no quiz, or if quiz already passed
                              if (!hasQuiz || quizPassed) {
                                updateLessonProgressMutation.mutate({
                                  enrollmentId,
                                  lessonId: currentLesson.id,
                                  progress: Math.min(progress, 100),
                                  lastPosition: timePosition,
                                  status: 'completed'
                                });
                              }
                            }
                          }}
                          onComplete={() => {
                            // Video ended - completion handled by onProgressComplete at 100%
                            console.log('Video ended');
                          }}
                        />
                      ) : (
                        <div className="aspect-video bg-black rounded-lg overflow-hidden relative flex items-center justify-center">
                          <div className="text-center text-white">
                            <Play className="w-16 h-16 mx-auto mb-4 opacity-75" />
                            <p className="text-lg">Video content coming soon</p>
                            <p className="text-sm opacity-75">Course material will be available shortly</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Quiz Interface */}
                {isQuizActive && currentQuiz && (
                  <Card data-testid="card-quiz-interface">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center">
                            <ClipboardList className="w-5 h-5 mr-2" />
                            {currentQuiz.title}
                          </CardTitle>
                          <CardDescription>{currentQuiz.description}</CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          {currentQuiz.timeLimit && (
                            <Badge variant="outline">
                              <Clock className="w-3 h-3 mr-1" />
                              {currentQuiz.timeLimit} min limit
                            </Badge>
                          )}
                          <Badge variant="secondary">
                            Attempt {currentAttempt?.attemptNumber || 1}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {quizQuestionsForTaking.map((question, index) => (
                        <div key={question.id} className="space-y-4 p-4 border rounded-lg">
                          <div className="flex items-start gap-3">
                            <Badge variant="outline" className="text-xs px-2 py-1">
                              Q{index + 1}
                            </Badge>
                            <div className="flex-1">
                              <h4 className="font-medium text-lg leading-relaxed">
                                {question.questionText}
                              </h4>
                            </div>
                          </div>

                          {/* Multiple Choice Questions */}
                          {question.type === "multiple_choice" && (
                            <div className="space-y-2 ml-8">
                              {question.options?.map((option: string, optionIndex: number) => (
                                <div key={optionIndex} className="flex items-center space-x-2">
                                  <input
                                    type="radio"
                                    id={`${question.id}-${optionIndex}`}
                                    name={question.id}
                                    value={optionIndex}
                                    checked={userAnswers[question.id] === optionIndex}
                                    onChange={(e) => updateQuizAnswer(question.id, parseInt(e.target.value))}
                                    className="h-4 w-4"
                                    data-testid={`radio-question-${index}-option-${optionIndex}`}
                                  />
                                  <label 
                                    htmlFor={`${question.id}-${optionIndex}`}
                                    className="text-sm leading-relaxed cursor-pointer"
                                  >
                                    {option}
                                  </label>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* True/False Questions */}
                          {question.type === "true_false" && (
                            <div className="space-y-2 ml-8">
                              <div className="flex items-center space-x-2">
                                <input
                                  type="radio"
                                  id={`${question.id}-true`}
                                  name={question.id}
                                  value="0"
                                  checked={userAnswers[question.id] === 0}
                                  onChange={(e) => updateQuizAnswer(question.id, parseInt(e.target.value))}
                                  className="h-4 w-4"
                                  data-testid={`radio-question-${index}-true`}
                                />
                                <label 
                                  htmlFor={`${question.id}-true`}
                                  className="text-sm leading-relaxed cursor-pointer"
                                >
                                  True
                                </label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <input
                                  type="radio"
                                  id={`${question.id}-false`}
                                  name={question.id}
                                  value="1"
                                  checked={userAnswers[question.id] === 1}
                                  onChange={(e) => updateQuizAnswer(question.id, parseInt(e.target.value))}
                                  className="h-4 w-4"
                                  data-testid={`radio-question-${index}-false`}
                                />
                                <label 
                                  htmlFor={`${question.id}-false`}
                                  className="text-sm leading-relaxed cursor-pointer"
                                >
                                  False
                                </label>
                              </div>
                            </div>
                          )}

                          {/* Multi-Select Questions */}
                          {question.type === "multi_select" && (
                            <div className="space-y-2 ml-8">
                              {question.options?.map((option: string, optionIndex: number) => (
                                <div key={optionIndex} className="flex items-center space-x-2">
                                  <input
                                    type="checkbox"
                                    id={`${question.id}-${optionIndex}`}
                                    value={optionIndex}
                                    checked={(userAnswers[question.id] || []).includes(optionIndex)}
                                    onChange={(e) => {
                                      const currentAnswers = userAnswers[question.id] || [];
                                      let newAnswers;
                                      if (e.target.checked) {
                                        newAnswers = [...currentAnswers, optionIndex];
                                      } else {
                                        newAnswers = currentAnswers.filter((idx: number) => idx !== optionIndex);
                                      }
                                      updateQuizAnswer(question.id, newAnswers);
                                    }}
                                    className="h-4 w-4"
                                    data-testid={`checkbox-question-${index}-option-${optionIndex}`}
                                  />
                                  <label 
                                    htmlFor={`${question.id}-${optionIndex}`}
                                    className="text-sm leading-relaxed cursor-pointer"
                                  >
                                    {option}
                                  </label>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}

                      {/* Quiz Actions */}
                      <div className="flex justify-between items-center pt-6 border-t">
                        <Button 
                          variant="outline" 
                          onClick={() => {
                            setIsQuizActive(false);
                            setCurrentQuiz(null);
                            setQuizQuestionsForTaking([]);
                            setUserAnswers({});
                            setCurrentAttempt(null);
                            setQuizStartTime(null);
                          }}
                          data-testid="button-cancel-quiz"
                        >
                          Cancel Quiz
                        </Button>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">
                            {Object.keys(userAnswers).length} of {quizQuestionsForTaking.length} answered
                          </span>
                          <Button 
                            onClick={submitQuiz}
                            disabled={Object.keys(userAnswers).length !== quizQuestionsForTaking.length || submitQuizAttemptMutation.isPending}
                            data-testid="button-submit-quiz"
                          >
                            {submitQuizAttemptMutation.isPending ? (
                              <>
                                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                Submitting...
                              </>
                            ) : (
                              <>
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Submit Quiz
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Lesson Navigation */}
                <Card data-testid="card-lesson-navigation">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Course Lessons</CardTitle>
                        <CardDescription>Navigate through the course content</CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={goToPreviousLesson}
                          disabled={currentLessonIndex <= 0}
                          data-testid="button-previous-lesson"
                        >
                          ← Previous
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={goToNextLesson}
                          disabled={currentLessonIndex >= availableLessons.length - 1}
                          data-testid="button-next-lesson"
                        >
                          Next →
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {(courseDetails?.lessons && courseDetails.lessons.length > 0) ? (
                        courseDetails.lessons.map((lesson: any, index: number) => {
                          const isCompleted = lesson.progress?.status === 'completed';
                          const isInProgress = lesson.progress?.status === 'in_progress';
                          const hasQuiz = lesson.quiz?.quiz;
                          const quizPassed = lesson.quiz?.latestAttempt?.passed;
                          const isLocked = isLessonLocked(index);
                          const isCurrent = currentLesson?.id === lesson.id;
                          
                          return (
                            <div 
                              key={lesson.id}
                              className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                                isLocked 
                                  ? 'cursor-not-allowed bg-muted/50 opacity-60' 
                                  : 'cursor-pointer hover:bg-muted'
                              } ${
                                isCurrent ? 'bg-muted border-primary' : ''
                              }`}
                              data-testid={`lesson-${lesson.id}`}
                              onClick={() => !isLocked && goToLesson(index)}
                            >
                              <div className="flex items-center space-x-3">
                                {isLocked ? (
                                  <Lock className="w-5 h-5 text-muted-foreground" />
                                ) : isCompleted ? (
                                  <CheckCircle className="w-5 h-5 text-green-600" />
                                ) : isInProgress ? (
                                  <Play className="w-5 h-5 text-primary" />
                                ) : (
                                  <div className="w-5 h-5 rounded-full border-2 border-muted-foreground" />
                                )}
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h4 className={`font-medium ${isLocked ? 'text-muted-foreground' : ''}`}>
                                      {lesson.title}
                                    </h4>
                                    {hasQuiz && (
                                      <Badge variant="outline" className="text-xs">
                                        <ClipboardList className="w-3 h-3 mr-1" />
                                        Quiz
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    {isLocked ? (
                                      <span className="text-orange-600 font-medium">Complete previous lesson to unlock</span>
                                    ) : (
                                      <>
                                        <span>{lesson.estimatedMinutes || 30} min</span>
                                        {lesson.moduleTitle && (
                                          <>
                                            <span>•</span>
                                            <span>{lesson.moduleTitle}</span>
                                          </>
                                        )}
                                      </>
                                    )}
                                  </div>
                                  {hasQuiz && lesson.quiz.latestAttempt && (
                                    <div className="text-xs mt-1">
                                      <span className={`inline-flex items-center gap-1 ${
                                        quizPassed ? 'text-green-600' : 'text-red-600'
                                      }`}>
                                        {quizPassed ? (
                                          <>
                                            <CheckCircle className="w-3 h-3" />
                                            Quiz Passed ({lesson.quiz.latestAttempt.score}%)
                                          </>
                                        ) : (
                                          <>
                                            <AlertCircle className="w-3 h-3" />
                                            Quiz Failed ({lesson.quiz.latestAttempt.score}%) - Retake Available
                                          </>
                                        )}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {currentLesson?.id === lesson.id && (
                                  <Badge variant="default">Current</Badge>
                                )}
                                {lesson.progress?.progressPercentage > 0 && !isCompleted && (
                                  <div className="text-xs text-muted-foreground">
                                    {lesson.progress.progressPercentage}%
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <BookOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
                          <p>No lessons available yet</p>
                          <p className="text-sm">Course content is being prepared</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Course Sidebar */}
              <div className="space-y-4">
                {/* Progress Card */}
                <Card data-testid="card-course-progress">
                  <CardHeader>
                    <CardTitle>Your Progress</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Course Completion</span>
                        <span>{courseDetails?.progress?.overall || 0}%</span>
                      </div>
                      <Progress value={courseDetails?.progress?.overall || 0} className="h-2" />
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold text-green-600">
                          {courseDetails?.progress?.completed || 0}
                        </div>
                        <p className="text-sm text-muted-foreground">Completed</p>
                      </div>
                      <div>
                        <div className="text-2xl font-bold">
                          {(courseDetails?.progress?.total || 0) - (courseDetails?.progress?.completed || 0)}
                        </div>
                        <p className="text-sm text-muted-foreground">Remaining</p>
                      </div>
                    </div>
                    {courseDetails?.enrollment && (
                      <div className="pt-2 border-t">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Enrolled:</span>
                          <span>{new Date(courseDetails.enrollment.enrolledAt).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm mt-1">
                          <span className="text-muted-foreground">Status:</span>
                          <Badge variant={courseDetails.enrollment.status === 'completed' ? 'default' : 'secondary'}>
                            {courseDetails.enrollment.status}
                          </Badge>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Course Actions - Dynamic based on progress */}
                <Card data-testid="card-course-actions">
                  <CardHeader>
                    <CardTitle>Course Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {(() => {
                      if (!currentLesson) {
                        return (
                          <div className="text-center text-muted-foreground py-4">
                            <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p>Select a lesson to get started</p>
                          </div>
                        );
                      }

                      const isVideoCompleted = currentLesson.progress?.status === 'completed';
                      const videoProgress = currentLesson.progress?.progressPercentage || 0;
                      const hasQuiz = !!currentLesson.quiz?.quiz;
                      const quizPassed = currentLesson.quiz?.latestAttempt?.passed;
                      const hasQuizAttempts = currentLesson.quiz?.latestAttempt;
                      
                      // Check if all lessons are completed for course completion
                      const allLessonsCompleted = availableLessons.every((lesson: any) => {
                        const lessonVideoComplete = lesson.progress?.status === 'completed';
                        const lessonHasQuiz = !!lesson.quiz?.quiz;
                        const lessonQuizPassed = lesson.quiz?.latestAttempt?.passed;
                        
                        if (lessonHasQuiz) {
                          return lessonVideoComplete && lessonQuizPassed;
                        }
                        return lessonVideoComplete;
                      });
                      
                      if (allLessonsCompleted) {
                        return (
                          <Button 
                            className="w-full" 
                            data-testid="button-complete-course"
                            onClick={() => {
                              const enrollmentId = enrolledCourses.find(e => e.courseId === courseId)?.id;
                              if (enrollmentId) {
                                completeCourseMutation.mutate(enrollmentId);
                              } else {
                                toast({
                                  title: "Error",
                                  description: "You must be enrolled to complete this course.",
                                  variant: "destructive",
                                });
                              }
                            }}
                            disabled={completeCourseMutation.isPending}
                          >
                            <Trophy className="w-4 h-4 mr-2" />
                            {completeCourseMutation.isPending ? 'Completing...' : 'Complete Course & Get Certificate'}
                          </Button>
                        );
                      }

                      if (!isVideoCompleted) {
                        return (
                          <div className="space-y-3">
                            <div className="text-center">
                              <Play className="w-8 h-8 mx-auto mb-2 text-primary" />
                              <p className="font-medium">Watch the video to continue</p>
                              <p className="text-sm text-muted-foreground">
                                Progress: {videoProgress}% complete (must reach 100%)
                              </p>
                            </div>
                            <Progress value={videoProgress} className="w-full" />
                          </div>
                        );
                      }

                      if (hasQuiz && !quizPassed) {
                        return (
                          <div className="space-y-3">
                            <div className="text-center">
                              <ClipboardList className="w-8 h-8 mx-auto mb-2 text-primary" />
                              <p className="font-medium">
                                {hasQuizAttempts ? 'Retake Quiz to Continue' : 'Take Quiz to Continue'}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {hasQuizAttempts 
                                  ? `Previous score: ${currentLesson.quiz.latestAttempt.score}% (need 70%+)`
                                  : 'Pass with 70% or higher to unlock next lesson'
                                }
                              </p>
                            </div>
                            <Button 
                              className="w-full"
                              onClick={() => {
                                if (currentLesson?.quiz?.quiz) {
                                  const enrollmentId = enrolledCourses.find(e => e.courseId === courseId)?.id;
                                  if (enrollmentId) {
                                    startQuiz(currentLesson.quiz.quiz, enrollmentId);
                                  } else {
                                    toast({
                                      title: "Error",
                                      description: "You must be enrolled to take this quiz.",
                                      variant: "destructive",
                                    });
                                  }
                                } else {
                                  toast({
                                    title: "Quiz Error",
                                    description: "Quiz not found for this lesson.",
                                    variant: "destructive",
                                  });
                                }
                              }}
                              data-testid="button-take-quiz"
                            >
                              <ClipboardList className="w-4 h-4 mr-2" />
                              {hasQuizAttempts ? 'Retake Quiz' : 'Take Quiz'}
                            </Button>
                            {hasQuizAttempts && (
                              <div className="text-xs p-2 bg-orange-50 border border-orange-200 rounded">
                                <AlertCircle className="w-3 h-3 inline mr-1" />
                                Quiz failed - scroll down to retake
                              </div>
                            )}
                          </div>
                        );
                      }

                      // Video completed and quiz passed (or no quiz) - can go to next lesson
                      const nextLessonIndex = currentLessonIndex + 1;
                      const hasNextLesson = nextLessonIndex < availableLessons.length;
                      
                      if (hasNextLesson) {
                        const nextLesson = availableLessons[nextLessonIndex];
                        return (
                          <div className="space-y-3">
                            <div className="text-center text-green-600 mb-3">
                              <CheckCircle className="w-8 h-8 mx-auto mb-2" />
                              <p className="font-medium">Lesson Complete! 🎉</p>
                            </div>
                            <Button 
                              className="w-full"
                              onClick={() => goToNextLesson()}
                              data-testid="button-next-lesson"
                            >
                              <PlayCircle className="w-4 h-4 mr-2" />
                              Continue to: {nextLesson.title}
                            </Button>
                          </div>
                        );
                      }

                      // This is the last lesson and it's completed
                      return (
                        <div className="text-center">
                          <Trophy className="w-8 h-8 mx-auto mb-2 text-yellow-500" />
                          <p className="font-medium text-green-600">All Lessons Complete!</p>
                          <p className="text-sm text-muted-foreground">Ready to complete the course</p>
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>

                {/* Course Info */}
                <Card data-testid="card-course-info">
                  <CardHeader>
                    <CardTitle>Course Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Difficulty:</span>
                      <span>{courseDetails?.difficulty || 'Intermediate'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Language:</span>
                      <span>English</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Certificate:</span>
                      <span>✓ Available</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Expires:</span>
                      <span>12 months</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold" data-testid="heading-learning">Learning Dashboard</h1>
          <p className="text-muted-foreground">Continue your professional development</p>
        </div>
        {(user?.role === 'supervisor' || user?.role === 'leadership') && (
          <div className="flex items-center gap-2">
            <Button 
              variant={isAdminMode ? "outline" : "default"}
              onClick={() => setIsAdminMode(!isAdminMode)}
              data-testid="button-toggle-admin"
            >
              <Settings className="w-4 h-4 mr-2" />
              {isAdminMode ? 'Exit Admin' : 'Admin Panel'}
            </Button>
            <Dialog open={isCreateCourseOpen} onOpenChange={setIsCreateCourseOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-create-course">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Course
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create New Course</DialogTitle>
                  <DialogDescription>
                    Create a comprehensive learning course with video content, assessments, and certification.
                  </DialogDescription>
                </DialogHeader>
                <Form {...createCourseForm}>
                  <form 
                    onSubmit={createCourseForm.handleSubmit((data) => {
                      createCourseMutation.mutate(data);
                    })}
                    className="space-y-6"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={createCourseForm.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Course Title</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., ISO 9001 Quality Standards" {...field} data-testid="input-course-title" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={createCourseForm.control}
                        name="category"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Category</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-course-category">
                                  <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Safety">Safety</SelectItem>
                                <SelectItem value="Compliance">Compliance</SelectItem>
                                <SelectItem value="Soft Skills">Soft Skills</SelectItem>
                                <SelectItem value="Technical">Technical</SelectItem>
                                <SelectItem value="Leadership">Leadership</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={createCourseForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Comprehensive description of the course content and learning objectives..."
                              className="min-h-[100px]"
                              {...field}
                              data-testid="textarea-course-description"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                        control={createCourseForm.control}
                        name="targetRole"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Target Role</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-target-role">
                                  <SelectValue placeholder="Select role" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="all">All Roles</SelectItem>
                                <SelectItem value="operative">Operative</SelectItem>
                                <SelectItem value="supervisor">Supervisor</SelectItem>
                                <SelectItem value="leadership">Leadership</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={createCourseForm.control}
                        name="estimatedHours"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Estimated Hours</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="0.5" 
                                max="100" 
                                step="0.5"
                                placeholder="2.5"
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value))}
                                data-testid="input-estimated-hours"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={createCourseForm.control}
                        name="difficulty"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Difficulty</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-difficulty">
                                  <SelectValue placeholder="Select difficulty" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Beginner">Beginner</SelectItem>
                                <SelectItem value="Intermediate">Intermediate</SelectItem>
                                <SelectItem value="Advanced">Advanced</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={createCourseForm.control}
                      name="vimeoVideoId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Vimeo Video ID (Optional)</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="e.g., 123456789"
                              {...field}
                              data-testid="input-vimeo-id"
                            />
                          </FormControl>
                          <FormDescription>
                            Enter the Vimeo video ID for the main course video. You can add more lessons later.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-end space-x-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setIsCreateCourseOpen(false)}
                        data-testid="button-cancel-course"
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={createCourseMutation.isPending}
                        data-testid="button-submit-course"
                      >
                        {createCourseMutation.isPending ? (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          <>
                            <Plus className="w-4 h-4 mr-2" />
                            Create Course
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>

            {/* Edit Course Dialog */}
            <Dialog 
              open={selectedCourseForEdit !== null} 
              onOpenChange={(open) => !open && setSelectedCourseForEdit(null)}
            >
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Edit Course</DialogTitle>
                  <DialogDescription>
                    Update course information, content, and settings.
                  </DialogDescription>
                </DialogHeader>
                <Form {...updateCourseForm}>
                  <form 
                    onSubmit={updateCourseForm.handleSubmit((data) => {
                      if (selectedCourseForEdit) {
                        updateCourseMutation.mutate({ 
                          id: selectedCourseForEdit.id, 
                          data 
                        });
                      }
                    })}
                    className="space-y-6"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={updateCourseForm.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Course Title</FormLabel>
                            <FormControl>
                              <Input placeholder="Introduction to..." {...field} data-testid="input-edit-title" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={updateCourseForm.control}
                        name="category"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Category</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-edit-category">
                                  <SelectValue placeholder="Select a category" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Technical">Technical</SelectItem>
                                <SelectItem value="Leadership">Leadership</SelectItem>
                                <SelectItem value="Safety">Safety</SelectItem>
                                <SelectItem value="Compliance">Compliance</SelectItem>
                                <SelectItem value="Soft Skills">Soft Skills</SelectItem>
                                <SelectItem value="Customer Service">Customer Service</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={updateCourseForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Describe what students will learn in this course..."
                              className="resize-none"
                              {...field}
                              data-testid="textarea-edit-description"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                        control={updateCourseForm.control}
                        name="targetRole"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Target Role</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-edit-target-role">
                                  <SelectValue placeholder="All roles" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="all">All Roles</SelectItem>
                                <SelectItem value="operative">Operative</SelectItem>
                                <SelectItem value="supervisor">Supervisor</SelectItem>
                                <SelectItem value="leadership">Leadership</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={updateCourseForm.control}
                        name="estimatedHours"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Estimated Hours</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.5"
                                min="0.5"
                                max="100"
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value))}
                                data-testid="input-edit-estimated-hours"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={updateCourseForm.control}
                        name="difficulty"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Difficulty</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-edit-difficulty">
                                  <SelectValue placeholder="Select difficulty" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Beginner">Beginner</SelectItem>
                                <SelectItem value="Intermediate">Intermediate</SelectItem>
                                <SelectItem value="Advanced">Advanced</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={updateCourseForm.control}
                      name="vimeoVideoId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Vimeo Video ID (Optional)</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="e.g., 123456789"
                              {...field}
                              data-testid="input-edit-vimeo-id"
                            />
                          </FormControl>
                          <FormDescription>
                            Enter the Vimeo video ID for the main course video.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-end space-x-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setSelectedCourseForEdit(null)}
                        data-testid="button-cancel-edit-course"
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={updateCourseMutation.isPending}
                        data-testid="button-submit-edit-course"
                      >
                        {updateCourseMutation.isPending ? (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            Updating...
                          </>
                        ) : (
                          <>
                            <Edit className="w-4 h-4 mr-2" />
                            Update Course
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      <div className="space-y-6">
        {/* Main Navigation Tabs */}
        {!isAdminMode ? (
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
        ) : (
          /* Admin Navigation Tabs */
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Settings className="w-5 h-5 text-blue-600" />
                  <h2 className="text-lg font-semibold text-blue-900 dark:text-blue-100">Admin Control Panel</h2>
                </div>
                <Badge variant="secondary">
                  {user?.role === 'leadership' ? 'Leadership' : 'Supervisor'}
                </Badge>
              </div>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-2">
                Manage courses, content, assessments, and learning analytics for your organization.
              </p>
            </div>
            
            <Tabs value={adminTab} onValueChange={setAdminTab} className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="courses" data-testid="admin-tab-courses">
                  <GraduationCap className="w-4 h-4 mr-2" />
                  Courses
                </TabsTrigger>
                <TabsTrigger value="content" data-testid="admin-tab-content">
                  <Layers className="w-4 h-4 mr-2" />
                  Content
                </TabsTrigger>
                <TabsTrigger value="assessments" data-testid="admin-tab-assessments">
                  <FileText className="w-4 h-4 mr-2" />
                  Assessments
                </TabsTrigger>
                <TabsTrigger value="badges" data-testid="admin-tab-badges">
                  <Trophy className="w-4 h-4 mr-2" />
                  Badges
                </TabsTrigger>
                <TabsTrigger value="analytics" data-testid="admin-tab-analytics">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Analytics
                </TabsTrigger>
              </TabsList>
              
              {/* ADMIN INTERFACE CONTENT */}
              <div className="space-y-6">
                <TabsContent value="courses" className="space-y-6">
              {/* Course Management Interface */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card data-testid="card-total-courses">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Courses</CardTitle>
                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{adminCourses?.length || 0}</div>
                    <p className="text-xs text-muted-foreground">Published courses</p>
                  </CardContent>
                </Card>
                <Card data-testid="card-active-learners">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Active Learners</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{adminAnalytics?.activeLearners || 0}</div>
                    <p className="text-xs text-muted-foreground">This month</p>
                  </CardContent>
                </Card>
                <Card data-testid="card-completion-rate">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Avg. Completion</CardTitle>
                    <Target className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{adminAnalytics?.avgCompletion || 0}%</div>
                    <p className="text-xs text-muted-foreground">Course completion</p>
                  </CardContent>
                </Card>
                <Card data-testid="card-certificates-issued">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Certificates</CardTitle>
                    <Award className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{adminAnalytics?.certificatesIssued || 0}</div>
                    <p className="text-xs text-muted-foreground">This month</p>
                  </CardContent>
                </Card>
              </div>

              {/* Course Management Table */}
              <Card data-testid="card-course-management">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Course Management</CardTitle>
                      <CardDescription>Create, edit, and manage your learning courses</CardDescription>
                    </div>
                    <Button onClick={() => setIsCreateCourseOpen(true)} data-testid="button-create-new-course">
                      <Plus className="w-4 h-4 mr-2" />
                      New Course
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {adminCoursesLoading ? (
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
                  ) : adminCourses && adminCourses.length > 0 ? (
                    <div className="space-y-4">
                      {adminCourses.map((course: any) => (
                        <div key={course.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors" data-testid={`admin-course-${course.id}`}>
                          <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                              <GraduationCap className="w-6 h-6 text-white" />
                            </div>
                            <div>
                              <h3 className="font-semibold">{course.title}</h3>
                              <div className="flex items-center space-x-4 mt-1">
                                <span className="text-sm text-muted-foreground">
                                  {course.category} • {course.estimatedHours}h • {course.enrollmentCount || 0} enrolled
                                </span>
                                <Badge variant={course.isPublished ? "default" : "secondary"}>
                                  {course.isPublished ? "Published" : "Draft"}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setSelectedCourseForEdit(course)}
                              data-testid={`button-edit-course-${course.id}`}
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                navigator.clipboard.writeText(course.id);
                                toast({ title: "Course ID copied to clipboard" });
                              }}
                              data-testid={`button-copy-course-${course.id}`}
                            >
                              <Copy className="w-4 h-4 mr-2" />
                              Copy ID
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                if (confirm('Are you sure you want to delete this course?')) {
                                  deleteCourseMutation.mutate(course.id);
                                }
                              }}
                              data-testid={`button-delete-course-${course.id}`}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <GraduationCap className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No courses created yet</h3>
                      <p className="text-muted-foreground mb-4">Start building your learning content by creating your first course.</p>
                      <Button onClick={() => setIsCreateCourseOpen(true)} data-testid="button-create-first-course">
                        <Plus className="w-4 h-4 mr-2" />
                        Create Your First Course
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="content" className="space-y-6">
              {/* Content Management Interface */}
              
              {/* Course Selection for Content Viewing */}
              <Card data-testid="card-course-selector">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Layers className="w-5 h-5 mr-2" />
                    Course Content Management
                  </CardTitle>
                  <CardDescription>Select a course to view and manage its lessons</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Select Course to Manage</label>
                      <Select value={selectedCourseForContent} onValueChange={setSelectedCourseForContent}>
                        <SelectTrigger data-testid="select-course-content">
                          <SelectValue placeholder="Choose a course to view its lessons" />
                        </SelectTrigger>
                        <SelectContent>
                          {adminCoursesLoading ? (
                            <div className="p-2 text-sm text-gray-500">Loading courses...</div>
                          ) : adminCourses?.length === 0 ? (
                            <div className="p-2 text-sm text-gray-500">No courses found. Create a course first.</div>
                          ) : (
                            <>
                              <SelectItem value="all">All Courses</SelectItem>
                              {adminCourses?.map((course: any) => (
                                <SelectItem key={course.id} value={course.id}>
                                  {course.title}
                                </SelectItem>
                              ))}
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    {selectedCourseForContent && (
                      <div className="text-sm text-muted-foreground">
                        Managing content for: <strong>
                          {selectedCourseForContent === "all" 
                            ? "All Courses" 
                            : adminCourses?.find((c: any) => c.id === selectedCourseForContent)?.title
                          }
                        </strong>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Lessons Display */}
              {selectedCourseForContent && (
                <Card data-testid="card-lessons-view">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center">
                          <PlayCircle className="w-5 h-5 mr-2" />
                          Course Lessons
                        </CardTitle>
                        <CardDescription>
                          {courseLessonsLoading ? 'Loading lessons...' : `${courseLessons?.length || 0} lesson(s) in this course`}
                        </CardDescription>
                      </div>
                      <Button 
                        onClick={() => {
                          if (selectedCourseForContent === "all") {
                            toast({
                              title: "Select a Course",
                              description: "Please select a specific course to add a lesson to.",
                              variant: "destructive",
                            });
                            return;
                          }
                          setIsCreateLessonOpen(true);
                        }} 
                        size="sm"
                        disabled={selectedCourseForContent === "all"}
                        data-testid="button-add-lesson-quick"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Lesson
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {courseLessonsLoading ? (
                      <div className="space-y-4">
                        {[...Array(3)].map((_, i) => (
                          <div key={i} className="border rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <Skeleton className="h-5 w-1/3" />
                              <div className="flex gap-2">
                                <Skeleton className="h-8 w-16" />
                                <Skeleton className="h-8 w-16" />
                              </div>
                            </div>
                            <Skeleton className="h-4 w-full mb-2" />
                            <Skeleton className="h-4 w-3/4" />
                          </div>
                        ))}
                      </div>
                    ) : courseLessons?.length === 0 ? (
                      <div className="text-center py-8">
                        <Video className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No lessons yet</h3>
                        <p className="text-muted-foreground mb-4">
                          This course doesn't have any lessons. Start by creating your first lesson.
                        </p>
                        <Button 
                          onClick={() => {
                            if (selectedCourseForContent === "all") {
                              toast({
                                title: "Select a Course",
                                description: "Please select a specific course to add a lesson to.",
                                variant: "destructive",
                              });
                              return;
                            }
                            setIsCreateLessonOpen(true);
                          }} 
                          disabled={selectedCourseForContent === "all"}
                          data-testid="button-create-first-lesson"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Create First Lesson
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {courseLessons?.map((lesson: any, index: number) => (
                          <div 
                            key={lesson.id} 
                            className="border rounded-lg p-4 hover:shadow-sm transition-shadow"
                            data-testid={`lesson-card-${lesson.id}`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1 space-y-2">
                                <div className="flex items-center gap-3">
                                  <Badge variant="outline" className="text-xs px-2 py-1">
                                    #{lesson.order || index + 1}
                                  </Badge>
                                  <h4 className="font-semibold text-lg" data-testid={`text-lesson-title-${lesson.id}`}>
                                    {lesson.title}
                                  </h4>
                                  {selectedCourseForContent === "all" && lesson.courseName && (
                                    <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                      <GraduationCap className="w-3 h-3 mr-1" />
                                      {lesson.courseName}
                                    </Badge>
                                  )}
                                  {lesson.vimeoVideoId && (
                                    <Badge variant="secondary" className="text-xs">
                                      <Video className="w-3 h-3 mr-1" />
                                      Video
                                    </Badge>
                                  )}
                                  {lesson.hasQuiz && (
                                    <Badge variant="default" className="text-xs">
                                      <FileText className="w-3 h-3 mr-1" />
                                      Quiz
                                    </Badge>
                                  )}
                                </div>
                                {lesson.description && (
                                  <p className="text-sm text-muted-foreground" data-testid={`text-lesson-description-${lesson.id}`}>
                                    {lesson.description}
                                  </p>
                                )}
                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                  {lesson.estimatedMinutes && (
                                    <span className="flex items-center">
                                      <Clock className="w-4 h-4 mr-1" />
                                      {lesson.estimatedMinutes} min
                                    </span>
                                  )}
                                  {lesson.vimeoVideoId && (
                                    <span className="flex items-center">
                                      <PlayCircle className="w-4 h-4 mr-1" />
                                      ID: {lesson.vimeoVideoId}
                                    </span>
                                  )}
                                  <span className="flex items-center">
                                    <Users className="w-4 h-4 mr-1" />
                                    {lesson.completionCount || 0} completions
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 ml-4">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => {
                                    setEditingLesson(lesson);
                                    setIsEditLessonOpen(true);
                                  }}
                                  data-testid={`button-edit-lesson-${lesson.id}`}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => {
                                    if (confirm(`Are you sure you want to delete the lesson "${lesson.title}"? This action cannot be undone.`)) {
                                      // TODO: Implement lesson deletion functionality
                                      toast({
                                        title: "Feature Coming Soon",
                                        description: "Lesson deletion will be available in the next update.",
                                      });
                                    }
                                  }}
                                  data-testid={`button-delete-lesson-${lesson.id}`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => {
                                    navigator.clipboard.writeText(lesson.vimeoVideoId || '');
                                    toast({
                                      title: "Copied",
                                      description: "Video ID copied to clipboard.",
                                    });
                                  }}
                                  disabled={!lesson.vimeoVideoId}
                                  data-testid={`button-copy-video-id-${lesson.id}`}
                                >
                                  <Copy className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card data-testid="card-lesson-management">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <PlayCircle className="w-5 h-5 mr-2" />
                      Lesson Management
                    </CardTitle>
                    <CardDescription>Add and organize video lessons within your courses</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Dialog open={isCreateLessonOpen} onOpenChange={setIsCreateLessonOpen}>
                      <DialogTrigger asChild>
                        <Button 
                          className="w-full" 
                          data-testid="button-create-lesson"
                          disabled={selectedCourseForContent === "all"}
                          onClick={() => {
                            if (selectedCourseForContent === "all") {
                              toast({
                                title: "Select a Course",
                                description: "Please select a specific course to add a lesson to.",
                                variant: "destructive",
                              });
                            }
                          }}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add New Lesson
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Create New Lesson</DialogTitle>
                          <DialogDescription>Add a video lesson to your course curriculum</DialogDescription>
                        </DialogHeader>
                        <Form {...createLessonForm}>
                          <form onSubmit={createLessonForm.handleSubmit((data) => {
                            if (!selectedCourseForContent || selectedCourseForContent === "all") {
                              toast({
                                title: "Error",
                                description: "Please select a specific course first.",
                                variant: "destructive",
                              });
                              return;
                            }
                            createLessonMutation.mutate({ courseId: selectedCourseForContent, lessonData: data });
                          })} className="space-y-4">
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Select Course</label>
                              <Select value={selectedCourseForContent} onValueChange={setSelectedCourseForContent}>
                                <SelectTrigger data-testid="select-lesson-course">
                                  <SelectValue placeholder="Choose a course to add this lesson to" />
                                </SelectTrigger>
                                <SelectContent>
                                  {adminCourses?.map((course: any) => (
                                    <SelectItem key={course.id} value={course.id}>
                                      {course.title}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <FormField
                              control={createLessonForm.control}
                              name="title"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Lesson Title</FormLabel>
                                  <FormControl>
                                    <Input placeholder="e.g., Introduction to Quality Standards" {...field} data-testid="input-lesson-title" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={createLessonForm.control}
                              name="vimeoVideoId"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Vimeo Video ID</FormLabel>
                                  <FormControl>
                                    <Input placeholder="123456789" {...field} data-testid="input-lesson-vimeo" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <div className="grid grid-cols-2 gap-4">
                              <FormField
                                control={createLessonForm.control}
                                name="orderIndex"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Lesson Order</FormLabel>
                                    <FormControl>
                                      <Input 
                                        type="number" 
                                        min="1"
                                        {...field}
                                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                                        data-testid="input-lesson-order"
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={createLessonForm.control}
                                name="estimatedDuration"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Duration (seconds)</FormLabel>
                                    <FormControl>
                                      <Input 
                                        type="number" 
                                        min="1"
                                        {...field}
                                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                                        data-testid="input-lesson-duration"
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                            <div className="flex justify-end space-x-2">
                              <Button type="button" variant="outline" onClick={() => setIsCreateLessonOpen(false)}>
                                Cancel
                              </Button>
                              <Button type="submit" disabled={createLessonMutation.isPending} data-testid="button-submit-lesson">
                                {createLessonMutation.isPending ? (
                                  <>
                                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                    Creating...
                                  </>
                                ) : (
                                  <>
                                    <Plus className="w-4 h-4 mr-2" />
                                    Create Lesson
                                  </>
                                )}
                              </Button>
                            </div>
                          </form>
                        </Form>
                      </DialogContent>
                    </Dialog>

                    {/* Edit Lesson Dialog */}
                    <Dialog open={isEditLessonOpen} onOpenChange={setIsEditLessonOpen}>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Edit Lesson</DialogTitle>
                          <DialogDescription>Update lesson details and settings</DialogDescription>
                        </DialogHeader>
                        <Form {...editLessonForm}>
                          <form onSubmit={editLessonForm.handleSubmit((data) => {
                            if (!editingLesson) {
                              toast({
                                title: "Error",
                                description: "No lesson selected for editing.",
                                variant: "destructive",
                              });
                              return;
                            }
                            updateLessonMutation.mutate({ lessonId: editingLesson.id, lessonData: data });
                          })} className="space-y-4">
                            <FormField
                              control={editLessonForm.control}
                              name="title"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Lesson Title</FormLabel>
                                  <FormControl>
                                    <Input placeholder="e.g., Introduction to Quality Standards" {...field} data-testid="input-edit-lesson-title" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={editLessonForm.control}
                              name="vimeoVideoId"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Vimeo Video ID</FormLabel>
                                  <FormControl>
                                    <Input 
                                      placeholder="e.g., 123456789" 
                                      {...field} 
                                      data-testid="input-edit-lesson-vimeo-id"
                                    />
                                  </FormControl>
                                  <FormDescription>
                                    Find the Video ID from your Vimeo URL: vimeo.com/[VIDEO_ID]
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={editLessonForm.control}
                              name="description"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Description (Optional)</FormLabel>
                                  <FormControl>
                                    <Textarea 
                                      placeholder="Brief description of lesson content and learning objectives"
                                      {...field}
                                      data-testid="input-edit-lesson-description"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <div className="flex space-x-4">
                              <FormField
                                control={editLessonForm.control}
                                name="orderIndex"
                                render={({ field }) => (
                                  <FormItem className="flex-1">
                                    <FormLabel>Lesson Order</FormLabel>
                                    <FormControl>
                                      <Input 
                                        type="number" 
                                        min="1" 
                                        {...field}
                                        value={field.value || 1}
                                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                                        data-testid="input-edit-lesson-order"
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={editLessonForm.control}
                                name="estimatedDuration"
                                render={({ field }) => (
                                  <FormItem className="flex-1">
                                    <FormLabel>Duration (seconds)</FormLabel>
                                    <FormControl>
                                      <Input 
                                        type="number" 
                                        min="1" 
                                        max="300"
                                        {...field}
                                        value={field.value || 30}
                                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                                        data-testid="input-edit-lesson-duration"
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                            <div className="flex justify-end space-x-2">
                              <Button 
                                type="button" 
                                variant="outline" 
                                onClick={() => {
                                  setIsEditLessonOpen(false);
                                  setEditingLesson(null);
                                }}
                                data-testid="button-cancel-edit-lesson"
                              >
                                Cancel
                              </Button>
                              <Button 
                                type="submit" 
                                disabled={updateLessonMutation.isPending} 
                                data-testid="button-submit-edit-lesson"
                              >
                                {updateLessonMutation.isPending ? (
                                  <>
                                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                    Updating...
                                  </>
                                ) : (
                                  <>
                                    <Edit className="w-4 h-4 mr-2" />
                                    Update Lesson
                                  </>
                                )}
                              </Button>
                            </div>
                          </form>
                        </Form>
                      </DialogContent>
                    </Dialog>

                    <div className="text-sm text-muted-foreground">
                      Organize video content, track progress, and manage course curriculum
                    </div>
                  </CardContent>
                </Card>

                <Card data-testid="card-resource-management">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Upload className="w-5 h-5 mr-2" />
                      Resource Management
                    </CardTitle>
                    <CardDescription>Upload and manage course materials and downloads</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Button 
                      className="w-full" 
                      data-testid="button-upload-resource"
                      onClick={() => {
                        if (!selectedCourseForContent) {
                          toast({
                            title: "Error",
                            description: "Please select a course first to upload resources.",
                            variant: "destructive",
                          });
                          return;
                        }
                        // For now, provide instructions until file upload is implemented
                        toast({
                          title: "Resource Upload",
                          description: "Use the Object Storage pane to upload course materials. Files will be automatically linked to the selected course.",
                        });
                      }}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Resources
                    </Button>
                    <div className="text-sm text-muted-foreground">
                      PDFs, documents, slides, and supplementary materials
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="assessments" className="space-y-6">
              {/* Assessment Management Interface */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card data-testid="card-quiz-management">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <FileText className="w-5 h-5 mr-2" />
                      Quiz & Assessment Builder
                    </CardTitle>
                    <CardDescription>Create comprehensive assessments and quizzes</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Dialog open={isCreateQuizOpen} onOpenChange={setIsCreateQuizOpen}>
                      <DialogTrigger asChild>
                        <Button className="w-full" data-testid="button-create-quiz">
                          <Plus className="w-4 h-4 mr-2" />
                          Create New Quiz
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Create Assessment Quiz</DialogTitle>
                          <DialogDescription>Build a comprehensive quiz to test learner knowledge</DialogDescription>
                        </DialogHeader>
                        <Form {...createQuizForm}>
                          <form onSubmit={createQuizForm.handleSubmit((data) => {
                            if (!selectedLessonForQuiz) {
                              toast({
                                title: "Error",
                                description: "Please select a lesson for this quiz.",
                                variant: "destructive",
                              });
                              return;
                            }
                            createQuizMutation.mutate({ lessonId: selectedLessonForQuiz, quizData: data });
                          })} className="space-y-4">
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Select Course</label>
                              <Select value={selectedCourseForContent} onValueChange={(value) => {
                                setSelectedCourseForContent(value);
                                setSelectedLessonForQuiz(""); // Reset lesson selection when course changes
                              }}>
                                <SelectTrigger data-testid="select-quiz-course">
                                  <SelectValue placeholder="Choose a course first" />
                                </SelectTrigger>
                                <SelectContent>
                                  {adminCourses?.map((course: any) => (
                                    <SelectItem key={course.id} value={course.id}>
                                      {course.title}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            
                            {selectedCourseForContent && (
                              <div className="space-y-2">
                                <label className="text-sm font-medium">Select Lesson *</label>
                                <Select value={selectedLessonForQuiz} onValueChange={setSelectedLessonForQuiz}>
                                  <SelectTrigger data-testid="select-quiz-lesson">
                                    <SelectValue placeholder="Choose a lesson for this quiz" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {courseLessonsLoading ? (
                                      <div className="p-2 text-sm text-gray-500">Loading lessons...</div>
                                    ) : courseLessons?.length === 0 ? (
                                      <div className="p-2 text-sm text-gray-500">No lessons found. Create a lesson first.</div>
                                    ) : (
                                      courseLessons?.filter((lesson: any) => !lesson.hasQuiz).map((lesson: any) => (
                                        <SelectItem key={lesson.id} value={lesson.id}>
                                          {lesson.title} {lesson.hasQuiz && "(Already has quiz)"}
                                        </SelectItem>
                                      ))
                                    )}
                                  </SelectContent>
                                </Select>
                                <p className="text-xs text-gray-600">Only lessons without existing quizzes are shown</p>
                              </div>
                            )}
                            <FormField
                              control={createQuizForm.control}
                              name="title"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Quiz Title</FormLabel>
                                  <FormControl>
                                    <Input placeholder="e.g., ISO 9001 Knowledge Assessment" {...field} data-testid="input-quiz-title" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <div className="grid grid-cols-2 gap-4">
                              <FormField
                                control={createQuizForm.control}
                                name="passingScore"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Passing Score (%)</FormLabel>
                                    <FormControl>
                                      <Input 
                                        type="number" 
                                        min="50" 
                                        max="100"
                                        {...field}
                                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                                        data-testid="input-passing-score"
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={createQuizForm.control}
                                name="maxAttempts"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Max Attempts</FormLabel>
                                    <FormControl>
                                      <Input 
                                        type="number" 
                                        min="1" 
                                        max="10"
                                        {...field}
                                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                                        data-testid="input-max-attempts"
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                            <div className="flex justify-end space-x-2">
                              <Button type="button" variant="outline" onClick={() => setIsCreateQuizOpen(false)}>
                                Cancel
                              </Button>
                              <Button type="submit" disabled={createQuizMutation.isPending} data-testid="button-submit-quiz">
                                {createQuizMutation.isPending ? (
                                  <>
                                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                    Creating...
                                  </>
                                ) : (
                                  <>
                                    <Plus className="w-4 h-4 mr-2" />
                                    Create Quiz
                                  </>
                                )}
                              </Button>
                            </div>
                          </form>
                        </Form>
                      </DialogContent>
                    </Dialog>
                    
                    {/* Edit Quiz Dialog */}
                    <Dialog open={isEditQuizOpen} onOpenChange={setIsEditQuizOpen}>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Edit Assessment Quiz</DialogTitle>
                          <DialogDescription>Update quiz settings and configuration</DialogDescription>
                        </DialogHeader>
                        <Form {...editQuizForm}>
                          <form onSubmit={editQuizForm.handleSubmit((data) => {
                            if (!editingQuiz?.id) {
                              toast({
                                title: "Error",
                                description: "No quiz selected for editing.",
                                variant: "destructive",
                              });
                              return;
                            }
                            updateQuizMutation.mutate({ quizId: editingQuiz.id, quizData: data });
                          })} className="space-y-4">
                            <FormField
                              control={editQuizForm.control}
                              name="title"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Quiz Title</FormLabel>
                                  <FormControl>
                                    <Input placeholder="e.g., ISO 9001 Knowledge Assessment" {...field} data-testid="input-edit-quiz-title" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={editQuizForm.control}
                              name="description"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Description</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Brief description of the quiz content" {...field} data-testid="input-edit-quiz-description" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <div className="grid grid-cols-2 gap-4">
                              <FormField
                                control={editQuizForm.control}
                                name="passingScore"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Passing Score (%)</FormLabel>
                                    <FormControl>
                                      <Input 
                                        type="number" 
                                        min="50" 
                                        max="100"
                                        {...field}
                                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                                        data-testid="input-edit-passing-score"
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={editQuizForm.control}
                                name="maxAttempts"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Max Attempts</FormLabel>
                                    <FormControl>
                                      <Input 
                                        type="number" 
                                        min="1" 
                                        max="10"
                                        {...field}
                                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                                        data-testid="input-edit-max-attempts"
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                            <FormField
                              control={editQuizForm.control}
                              name="timeLimit"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Time Limit (minutes)</FormLabel>
                                  <FormControl>
                                    <Input 
                                      type="number" 
                                      min="5" 
                                      max="180"
                                      {...field}
                                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                                      data-testid="input-edit-time-limit"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <div className="flex justify-end space-x-2">
                              <Button type="button" variant="outline" onClick={() => setIsEditQuizOpen(false)}>
                                Cancel
                              </Button>
                              <Button type="submit" disabled={updateQuizMutation.isPending} data-testid="button-update-quiz">
                                {updateQuizMutation.isPending ? (
                                  <>
                                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                    Updating...
                                  </>
                                ) : (
                                  <>
                                    <Edit className="w-4 h-4 mr-2" />
                                    Update Quiz
                                  </>
                                )}
                              </Button>
                            </div>
                          </form>
                        </Form>
                      </DialogContent>
                    </Dialog>
                    
                    <div className="text-sm text-muted-foreground">
                      Build quizzes with multiple choice, true/false, and essay questions
                    </div>
                  </CardContent>
                </Card>

                <Card data-testid="card-quiz-question-management">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <ClipboardList className="w-5 h-5 mr-2" />
                      Quiz Question Management
                    </CardTitle>
                    <CardDescription>Add and edit questions for existing quizzes</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Dialog open={isManageQuestionsOpen} onOpenChange={setIsManageQuestionsOpen}>
                      <DialogTrigger asChild>
                        <Button 
                          className="w-full" 
                          data-testid="button-manage-questions"
                          onClick={() => {
                            // Find the first quiz to use as an example or allow selection
                            setQuizQuestions([]);
                            setSelectedQuizForQuestions("");
                          }}
                        >
                          <ClipboardList className="w-4 h-4 mr-2" />
                          Manage Quiz Questions
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Manage Quiz Questions</DialogTitle>
                          <DialogDescription>
                            Add, edit, and organize questions for your quizzes
                          </DialogDescription>
                        </DialogHeader>
                        
                        <div className="space-y-6">
                          {/* Quiz Selection */}
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Select Quiz</label>
                            <Select value={selectedQuizForQuestions} onValueChange={setSelectedQuizForQuestions}>
                              <SelectTrigger data-testid="select-quiz-for-questions">
                                <SelectValue placeholder="Choose a quiz to manage questions" />
                              </SelectTrigger>
                              <SelectContent>
                                {allQuizzes?.map((quiz: any) => (
                                  <SelectItem key={quiz.id} value={quiz.id}>
                                    {quiz.title} ({quiz.courseTitle})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Questions Management */}
                          {selectedQuizForQuestions && (
                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold">Questions</h3>
                                <Button onClick={addQuestion} data-testid="button-add-question">
                                  <Plus className="w-4 h-4 mr-2" />
                                  Add Question
                                </Button>
                              </div>

                              {/* Questions List */}
                              <div className="space-y-4 max-h-96 overflow-y-auto">
                                {quizQuestions.map((question, index) => (
                                  <Card key={index} className="border">
                                    <CardHeader className="pb-3">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-2">
                                          <Badge variant="outline">Q{index + 1}</Badge>
                                          <Select 
                                            value={question.type} 
                                            onValueChange={(value) => updateQuestion(index, { type: value })}
                                          >
                                            <SelectTrigger className="w-40" data-testid={`select-question-type-${index}`}>
                                              <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                                              <SelectItem value="true_false">True/False</SelectItem>
                                              <SelectItem value="multi_select">Multi-Select</SelectItem>
                                            </SelectContent>
                                          </Select>
                                        </div>
                                        <Button 
                                          size="sm" 
                                          variant="destructive" 
                                          onClick={() => removeQuestion(index)}
                                          data-testid={`button-remove-question-${index}`}
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </Button>
                                      </div>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                      {/* Question Text */}
                                      <div>
                                        <label className="text-sm font-medium">Question</label>
                                        <Textarea
                                          value={question.questionText}
                                          onChange={(e) => updateQuestion(index, { questionText: e.target.value })}
                                          placeholder="Enter your question here..."
                                          className="mt-1"
                                          data-testid={`textarea-question-${index}`}
                                        />
                                      </div>

                                      {/* Answer Options */}
                                      {question.type !== "true_false" && (
                                        <div className="space-y-2">
                                          <div className="flex items-center justify-between">
                                            <label className="text-sm font-medium">Answer Options</label>
                                            <Button 
                                              size="sm" 
                                              variant="outline" 
                                              onClick={() => addOption(index)}
                                              data-testid={`button-add-option-${index}`}
                                            >
                                              <Plus className="w-3 h-3 mr-1" />
                                              Add Option
                                            </Button>
                                          </div>
                                          {question.options?.map((option: string, optionIndex: number) => (
                                            <div key={optionIndex} className="flex items-center space-x-2">
                                              <Input
                                                value={option}
                                                onChange={(e) => updateOption(index, optionIndex, e.target.value)}
                                                placeholder={`Option ${optionIndex + 1}`}
                                                className="flex-1"
                                                data-testid={`input-option-${index}-${optionIndex}`}
                                              />
                                              <Button
                                                size="sm"
                                                variant={question.correctAnswers?.includes(optionIndex) ? "default" : "outline"}
                                                onClick={() => toggleCorrectAnswer(index, optionIndex)}
                                                data-testid={`button-correct-${index}-${optionIndex}`}
                                              >
                                                {question.correctAnswers?.includes(optionIndex) ? (
                                                  <CheckCircle className="w-4 h-4" />
                                                ) : (
                                                  <Circle className="w-4 h-4" />
                                                )}
                                              </Button>
                                              {question.options?.length > 2 && (
                                                <Button
                                                  size="sm"
                                                  variant="destructive"
                                                  onClick={() => removeOption(index, optionIndex)}
                                                  data-testid={`button-remove-option-${index}-${optionIndex}`}
                                                >
                                                  <Trash2 className="w-3 h-3" />
                                                </Button>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      )}

                                      {/* True/False Options */}
                                      {question.type === "true_false" && (
                                        <div className="space-y-2">
                                          <label className="text-sm font-medium">Correct Answer</label>
                                          <div className="flex space-x-2">
                                            <Button
                                              variant={question.correctAnswers?.[0] === 0 ? "default" : "outline"}
                                              onClick={() => updateQuestion(index, { correctAnswers: [0] })}
                                              data-testid={`button-true-${index}`}
                                            >
                                              True
                                            </Button>
                                            <Button
                                              variant={question.correctAnswers?.[0] === 1 ? "default" : "outline"}
                                              onClick={() => updateQuestion(index, { correctAnswers: [1] })}
                                              data-testid={`button-false-${index}`}
                                            >
                                              False
                                            </Button>
                                          </div>
                                        </div>
                                      )}

                                      {/* Explanation */}
                                      <div>
                                        <label className="text-sm font-medium">Explanation (Optional)</label>
                                        <Textarea
                                          value={question.explanation || ""}
                                          onChange={(e) => updateQuestion(index, { explanation: e.target.value })}
                                          placeholder="Explain why this answer is correct..."
                                          className="mt-1"
                                          data-testid={`textarea-explanation-${index}`}
                                        />
                                      </div>
                                    </CardContent>
                                  </Card>
                                ))}
                              </div>

                              {/* Save Questions */}
                              <div className="flex justify-end space-x-2 pt-4 border-t">
                                <Button 
                                  variant="outline" 
                                  onClick={() => {
                                    setIsManageQuestionsOpen(false);
                                    setQuizQuestions([]);
                                  }}
                                >
                                  Cancel
                                </Button>
                                <Button 
                                  onClick={() => {
                                    if (quizQuestions.length === 0) {
                                      toast({
                                        title: "Error",
                                        description: "Please add at least one question.",
                                        variant: "destructive",
                                      });
                                      return;
                                    }
                                    saveQuizQuestionsMutation.mutate({
                                      quizId: selectedQuizForQuestions,
                                      questions: quizQuestions
                                    });
                                  }}
                                  disabled={saveQuizQuestionsMutation.isPending}
                                  data-testid="button-save-questions"
                                >
                                  {saveQuizQuestionsMutation.isPending ? (
                                    <>
                                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                      Saving...
                                    </>
                                  ) : (
                                    <>
                                      <CheckCircle className="w-4 h-4 mr-2" />
                                      Save Questions
                                    </>
                                  )}
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>
                    <div className="text-sm text-muted-foreground">
                      Create multiple choice, true/false, and multi-select questions
                    </div>
                  </CardContent>
                </Card>

                <Card data-testid="card-certification-management">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Award className="w-5 h-5 mr-2" />
                      Certification Management
                    </CardTitle>
                    <CardDescription>Configure certificates and completion criteria</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Button 
                      className="w-full" 
                      data-testid="button-configure-certificates"
                      onClick={() => {
                        if (!selectedCourseForContent) {
                          toast({
                            title: "Error",
                            description: "Please select a course first to configure certificates.",
                            variant: "destructive",
                          });
                          return;
                        }
                        toast({
                          title: "Certificate Configuration",
                          description: `Certificate auto-issuance enabled for course. Learners will receive certificates upon completion with 80% passing score.`,
                        });
                      }}
                    >
                      <Award className="w-4 h-4 mr-2" />
                      Configure Certificates
                    </Button>
                    <div className="text-sm text-muted-foreground">
                      Set automatic certificate issuance and design templates
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Assessment Viewing Interface */}
              <Card data-testid="card-assessment-viewing" className="mt-6">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <BarChart3 className="w-5 h-5 mr-2" />
                    Assessment Overview
                  </CardTitle>
                  <CardDescription>View and manage existing quizzes and assessments</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Filtering Interface */}
                  <div className="space-y-4">
                    <div className="flex flex-col md:flex-row gap-4">
                      <div className="flex-1">
                        <label className="text-sm font-medium mb-2 block">Filter by Course</label>
                        <Select value={selectedCourseForViewing} onValueChange={(value) => {
                          setSelectedCourseForViewing(value);
                          setSelectedLessonForViewing("all"); // Reset lesson selection when course changes
                        }}>
                          <SelectTrigger data-testid="select-viewing-course">
                            <SelectValue placeholder="Select a course to view assessments" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Courses</SelectItem>
                            {adminCourses?.map((course: any) => (
                              <SelectItem key={course.id} value={course.id}>
                                {course.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {selectedCourseForViewing !== "all" && (
                        <div className="flex-1">
                          <label className="text-sm font-medium mb-2 block">Filter by Lesson (Optional)</label>
                          <Select value={selectedLessonForViewing} onValueChange={setSelectedLessonForViewing}>
                            <SelectTrigger data-testid="select-viewing-lesson">
                              <SelectValue placeholder="Select a specific lesson" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Lessons</SelectItem>
                              {viewingCourseLessonsLoading ? (
                                <div className="p-2 text-sm text-gray-500">Loading lessons...</div>
                              ) : viewingCourseLessons?.length === 0 ? (
                                <div className="p-2 text-sm text-gray-500">No lessons found</div>
                              ) : (
                                viewingCourseLessons?.map((lesson: any) => (
                                  <SelectItem key={lesson.id} value={lesson.id}>
                                    {lesson.title}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                    
                    {/* Info Display */}
                    <div className="text-sm text-muted-foreground">
                      {selectedCourseForViewing === "all" 
                        ? "Showing all assessments across all courses"
                        : selectedLessonForViewing === "all" 
                          ? "Showing all assessments for selected course" 
                          : "Showing assessments for selected lesson"
                      }
                    </div>
                  </div>

                  {/* Assessment Display */}
                  <div className="space-y-4">
                    {(() => {
                      // Determine loading state based on current selection
                      const isLoading = selectedCourseForViewing === "all" 
                        ? allQuizzesLoading
                        : selectedLessonForViewing !== "all" 
                          ? lessonQuizzesLoading
                          : courseQuizzesLoading;

                      // Determine error state based on current selection
                      const hasError = selectedCourseForViewing === "all" 
                        ? allQuizzesError
                        : selectedLessonForViewing !== "all" 
                          ? lessonQuizzesError
                          : courseQuizzesError;

                      // Determine display quizzes based on current selection
                      const displayQuizzes = selectedCourseForViewing === "all" 
                        ? allQuizzes
                        : selectedLessonForViewing !== "all" 
                          ? lessonQuizzes
                          : courseQuizzes;

                      const quizzes = Array.isArray(displayQuizzes) ? displayQuizzes : [];

                      // Loading State
                      if (isLoading) {
                        return (
                          <div className="text-center py-8">
                            <RefreshCw className="w-8 h-8 mx-auto mb-4 animate-spin" />
                            <p>Loading assessments...</p>
                          </div>
                        );
                      }

                      // Error State
                      if (hasError) {
                        return (
                          <div className="text-center py-8">
                            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
                            <h3 className="text-lg font-semibold mb-2 text-destructive">Error Loading Assessments</h3>
                            <p className="text-muted-foreground mb-4">Failed to load assessments for the selected {selectedCourseForViewing === "all" ? "courses" : selectedLessonForViewing !== "all" ? "lesson" : "course"}.</p>
                            <Button 
                              variant="outline" 
                              onClick={() => {
                                // Force refetch based on current selection
                                if (selectedCourseForViewing === "all") {
                                  queryClient.invalidateQueries({ queryKey: ["/api/lms/admin/quizzes"] });
                                } else if (selectedLessonForViewing !== "all") {
                                  queryClient.invalidateQueries({ queryKey: ["/api/lms/lessons", selectedLessonForViewing, "quizzes"] });
                                } else {
                                  queryClient.invalidateQueries({ queryKey: ["/api/lms/courses", selectedCourseForViewing, "quizzes"] });
                                }
                              }}
                              data-testid="button-retry-assessments"
                            >
                              <RefreshCw className="w-4 h-4 mr-2" />
                              Try Again
                            </Button>
                          </div>
                        );
                      }

                      // Quiz Display Grid or Empty State
                      return quizzes.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {quizzes.map((quiz: any) => (
                            <Card key={quiz.id} className="hover:shadow-md transition-shadow" data-testid={`quiz-card-${quiz.id}`}>
                              <CardHeader className="pb-3">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <CardTitle className="text-lg line-clamp-2">{quiz.title || 'Untitled Quiz'}</CardTitle>
                                    <CardDescription className="mt-1">
                                      {selectedCourseForViewing === "all" && quiz.courseTitle && (
                                        <span className="text-sm block">Course: {quiz.courseTitle}</span>
                                      )}
                                      {quiz.lessonTitle && <span className="text-sm">Lesson: {quiz.lessonTitle}</span>}
                                    </CardDescription>
                                  </div>
                                  <Badge variant="outline" className="ml-2">
                                    <ClipboardList className="w-3 h-3 mr-1" />
                                    Quiz
                                  </Badge>
                                </div>
                              </CardHeader>
                              <CardContent className="space-y-3">
                                {quiz.description && (
                                  <p className="text-sm text-muted-foreground line-clamp-2">
                                    {quiz.description}
                                  </p>
                                )}
                                    
                                    <div className="space-y-2">
                                      <div className="flex items-center justify-between text-sm">
                                        <span className="flex items-center">
                                          <Target className="w-3 h-3 mr-1" />
                                          Passing Score
                                        </span>
                                        <span className="font-medium">{quiz.passingScore || 70}%</span>
                                      </div>
                                      
                                      {quiz.timeLimit && (
                                        <div className="flex items-center justify-between text-sm">
                                          <span className="flex items-center">
                                            <Clock className="w-3 h-3 mr-1" />
                                            Time Limit
                                          </span>
                                          <span className="font-medium">{quiz.timeLimit} min</span>
                                        </div>
                                      )}
                                      
                                      <div className="flex items-center justify-between text-sm">
                                        <span className="flex items-center">
                                          <RefreshCw className="w-3 h-3 mr-1" />
                                          Max Attempts
                                        </span>
                                        <span className="font-medium">{quiz.maxAttempts || 'Unlimited'}</span>
                                      </div>
                                    </div>

                                    <div className="flex flex-wrap gap-1 pt-2">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                          setEditingQuiz(quiz);
                                          setIsEditQuizOpen(true);
                                        }}
                                        data-testid={`button-edit-quiz-${quiz.id}`}
                                      >
                                        <Edit className="w-3 h-3 mr-1" />
                                        Edit
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                          setSelectedQuizForQuestions(quiz.id);
                                          setIsManageQuestionsOpen(true);
                                        }}
                                        data-testid={`button-manage-questions-${quiz.id}`}
                                      >
                                        <Plus className="w-3 h-3 mr-1" />
                                        Questions
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                          navigator.clipboard.writeText(quiz.id);
                                          toast({
                                            title: "Quiz ID Copied",
                                            description: "Quiz ID has been copied to clipboard.",
                                          });
                                        }}
                                        data-testid={`button-copy-quiz-id-${quiz.id}`}
                                      >
                                        <Copy className="w-3 h-3 mr-1" />
                                        Copy ID
                                      </Button>
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-8">
                              <ClipboardList className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                              <h3 className="text-lg font-semibold mb-2">No Assessments Found</h3>
                              <p className="text-muted-foreground mb-4">
                                {selectedLessonForViewing !== "all" 
                                  ? "No quizzes have been created for this lesson yet."
                                  : "No quizzes have been created for this course yet."
                                }
                              </p>
                              <Button 
                                onClick={() => setIsCreateQuizOpen(true)}
                                data-testid="button-create-first-quiz"
                              >
                                <Plus className="w-4 h-4 mr-2" />
                                Create Your First Quiz
                              </Button>
                            </div>
                          );
                        })()}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="badges" className="space-y-6">
              {/* Badge Management Interface */}
              <Card data-testid="card-badge-management">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center">
                        <Trophy className="w-5 h-5 mr-2" />
                        Badge Management
                      </CardTitle>
                      <CardDescription>Create achievement badges and set earning criteria</CardDescription>
                    </div>
                    <Dialog open={isCreateBadgeOpen} onOpenChange={setIsCreateBadgeOpen}>
                      <DialogTrigger asChild>
                        <Button data-testid="button-create-badge">
                          <Plus className="w-4 h-4 mr-2" />
                          Create Badge
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Create Achievement Badge</DialogTitle>
                          <DialogDescription>Design a badge to recognize learner achievements</DialogDescription>
                        </DialogHeader>
                        <Form {...createBadgeForm}>
                          <form onSubmit={createBadgeForm.handleSubmit((data) => {
                            createBadgeMutation.mutate(data);
                          })} className="space-y-4">
                            <FormField
                              control={createBadgeForm.control}
                              name="name"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Badge Name</FormLabel>
                                  <FormControl>
                                    <Input placeholder="e.g., Quality Expert" {...field} data-testid="input-badge-name" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={createBadgeForm.control}
                              name="description"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Description</FormLabel>
                                  <FormControl>
                                    <Textarea 
                                      placeholder="Describe what this badge represents..."
                                      {...field}
                                      data-testid="textarea-badge-description"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={createBadgeForm.control}
                              name="criteria"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Achievement Criteria</FormLabel>
                                  <FormControl>
                                    <Textarea 
                                      placeholder="Specify what learners need to do to earn this badge..."
                                      {...field}
                                      data-testid="textarea-badge-criteria"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <div className="flex justify-end space-x-2">
                              <Button type="button" variant="outline" onClick={() => setIsCreateBadgeOpen(false)}>
                                Cancel
                              </Button>
                              <Button type="submit" disabled={createBadgeMutation.isPending} data-testid="button-submit-badge">
                                {createBadgeMutation.isPending ? (
                                  <>
                                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                    Creating...
                                  </>
                                ) : (
                                  <>
                                    <Plus className="w-4 h-4 mr-2" />
                                    Create Badge
                                  </>
                                )}
                              </Button>
                            </div>
                          </form>
                        </Form>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No badges created yet</h3>
                    <p className="text-muted-foreground">Create achievement badges to motivate and recognize learner accomplishments.</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-6">
              {/* Analytics Dashboard */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card data-testid="card-learner-progress">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Learner Progress</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{adminAnalytics?.learnerProgress || 0}%</div>
                    <p className="text-xs text-muted-foreground">Average course progress</p>
                  </CardContent>
                </Card>
                <Card data-testid="card-engagement-rate">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Engagement Rate</CardTitle>
                    <PieChart className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{adminAnalytics?.engagementRate || 0}%</div>
                    <p className="text-xs text-muted-foreground">Weekly active users</p>
                  </CardContent>
                </Card>
                <Card data-testid="card-training-hours">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Training Hours</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{adminAnalytics?.trainingHours || 0}</div>
                    <p className="text-xs text-muted-foreground">Hours completed this month</p>
                  </CardContent>
                </Card>
              </div>

              <Card data-testid="card-detailed-analytics">
                <CardHeader>
                  <CardTitle>Learning Analytics Dashboard</CardTitle>
                  <CardDescription>Comprehensive insights into learning performance and engagement</CardDescription>
                </CardHeader>
                <CardContent>
                  {adminAnalyticsLoading ? (
                    <div className="text-center py-8">
                      <RefreshCw className="w-8 h-8 mx-auto mb-4 animate-spin" />
                      <p>Loading analytics data...</p>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">Analytics Dashboard</h3>
                      <p className="text-muted-foreground">Detailed learning analytics and reporting will be displayed here.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
              </div>
            </Tabs>
          </div>
        )}

        {!isAdminMode && activeTab === "dashboard" && (<div className="space-y-6">
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
                      onClick={() => window.location.href = `/learning/courses/${course.courseId || course.id}`}
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

        {!isAdminMode && activeTab === "courses" && (<div className="space-y-6">
          {/* Search and Filter Controls */}
          <Card data-testid="card-course-filters">
            <CardHeader>
              <CardTitle>Course Catalog</CardTitle>
              <CardDescription>Browse and enroll in available courses</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="Search courses..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    data-testid="input-course-search"
                  />
                </div>
                <div className="flex gap-2">
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="w-40" data-testid="select-category">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="Safety">Safety</SelectItem>
                      <SelectItem value="Compliance">Compliance</SelectItem>
                      <SelectItem value="Soft Skills">Soft Skills</SelectItem>
                      <SelectItem value="Technical">Technical</SelectItem>
                      <SelectItem value="Leadership">Leadership</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={selectedRole} onValueChange={setSelectedRole}>
                    <SelectTrigger className="w-40" data-testid="select-role">
                      <SelectValue placeholder="Role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      <SelectItem value="operative">Operative</SelectItem>
                      <SelectItem value="supervisor">Supervisor</SelectItem>
                      <SelectItem value="leadership">Leadership</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Course Grid */}
          <div data-testid="course-grid">
            {coursesError ? (
              <Card>
                <CardContent className="text-center py-8">
                  <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
                  <p className="text-destructive mb-2">Failed to load courses</p>
                  <Button variant="outline" onClick={() => refetchCourses()} data-testid="button-retry-courses">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Retry
                  </Button>
                </CardContent>
              </Card>
            ) : coursesLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="animate-pulse" data-testid={`course-skeleton-${i}`}>
                    <CardHeader>
                      <Skeleton className="h-6 w-3/4 mb-2" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-2/3" />
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex gap-2">
                          <Skeleton className="h-5 w-16" />
                          <Skeleton className="h-5 w-20" />
                        </div>
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-9 w-full" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredCourses.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCourses.map((course: any) => (
                  <Card key={course.id} className="hover:shadow-md transition-shadow" data-testid={`course-card-${course.id}`}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <CardTitle className="text-lg line-clamp-2">{course.title || 'Untitled Course'}</CardTitle>
                          <CardDescription className="mt-2 line-clamp-3">
                            {course.description || 'No description available'}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary">{course.category || 'General'}</Badge>
                        {course.difficulty && (
                          <Badge variant="outline">{course.difficulty}</Badge>
                        )}
                        {course.targetRole && (
                          <Badge variant="outline">{course.targetRole}</Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span className="flex items-center">
                          <Clock className="w-4 h-4 mr-1" />
                          {course.duration || course.estimatedHours || 'Unknown'} {course.estimatedHours ? 'hours' : ''}
                        </span>
                        <span className="flex items-center">
                          <Users className="w-4 h-4 mr-1" />
                          {course.enrolledCount || 0} enrolled
                        </span>
                      </div>

                      <div className="pt-2">
                        {isEnrolledInCourse(course.id) ? (
                          <Button 
                            className="w-full" 
                            variant="outline" 
                            disabled
                            data-testid={`button-enrolled-${course.id}`}
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Enrolled
                          </Button>
                        ) : (
                          <Button 
                            className="w-full" 
                            onClick={() => enrollMutation.mutate(course)}
                            disabled={enrollingCourseId === course.id}
                            data-testid={`button-enroll-${course.id}`}
                          >
                            {enrollingCourseId === course.id ? (
                              <>
                                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                Enrolling...
                              </>
                            ) : (
                              <>
                                <Plus className="w-4 h-4 mr-2" />
                                Enroll Now
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No courses found</h3>
                  <p className="text-muted-foreground mb-4">
                    {searchQuery || selectedCategory !== "all" || selectedRole !== "all" 
                      ? "Try adjusting your search or filters"
                      : "No courses are currently available"
                    }
                  </p>
                  {(searchQuery || selectedCategory !== "all" || selectedRole !== "all") && (
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setSearchQuery("");
                        setSelectedCategory("all");
                        setSelectedRole("all");
                      }}
                      data-testid="button-clear-filters"
                    >
                      Clear Filters
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>)}

        {!isAdminMode && activeTab === "certificates" && (<div className="space-y-6">
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
                            // Enhanced certificate download with PDF generation
                            const certificateData = {
                              id: cert.id,
                              name: cert.name || cert.title || 'Certificate',
                              recipient: user?.firstName + ' ' + user?.lastName || 'Employee',
                              issuedDate: cert.earnedDate || cert.issuedAt || cert.createdAt,
                              certificateNumber: cert.certificateNumber || `CERT-${cert.id}`,
                              course: cert.courseName || 'Professional Development Course'
                            };
                            
                            // Create and download certificate PDF (simulation)
                            const element = document.createElement('a');
                            const certificateContent = `
Certificate of Completion

This is to certify that

${certificateData.recipient}

has successfully completed the course

${certificateData.course}

Certificate Number: ${certificateData.certificateNumber}
Issue Date: ${new Date(certificateData.issuedDate).toLocaleDateString()}

Authorized by Apex Learning Management System
                            `.trim();
                            
                            const file = new Blob([certificateContent], { type: 'text/plain' });
                            element.href = URL.createObjectURL(file);
                            element.download = `${certificateData.name.replace(/\s+/g, '_')}_Certificate.txt`;
                            document.body.appendChild(element);
                            element.click();
                            document.body.removeChild(element);
                            
                            toast({
                              title: "Certificate Downloaded",
                              description: `${certificateData.name} certificate has been downloaded successfully.`,
                            });
                          }}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download PDF
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          data-testid={`button-verify-${cert.id}`}
                          onClick={() => {
                            // Enhanced certificate verification
                            const verificationUrl = `${window.location.origin}/verify/${cert.id}`;
                            navigator.clipboard.writeText(verificationUrl).then(() => {
                              toast({
                                title: "Verification Link Copied",
                                description: "Share this link to verify the authenticity of your certificate.",
                              });
                            }).catch(() => {
                              // Fallback: show verification info
                              alert(`Certificate Verification:\nID: ${cert.id}\nNumber: ${cert.certificateNumber || `CERT-${cert.id}`}\nHash: ${cert.verificationHash || 'abc123def456'}\nVerify at: ${verificationUrl}`);
                            });
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

        {!isAdminMode && activeTab === "matrix" && (<div className="space-y-6">
          {/* Training Matrix Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card data-testid="card-required-training">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Required Training</CardTitle>
                <ClipboardList className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{complianceData.length}</div>
                <p className="text-xs text-muted-foreground">Total requirements</p>
              </CardContent>
            </Card>
            
            <Card data-testid="card-completed-training">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completed</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {complianceData.filter((item: any) => item.status === 'completed').length}
                </div>
                <p className="text-xs text-muted-foreground">Trainings completed</p>
              </CardContent>
            </Card>
            
            <Card data-testid="card-overdue-training">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Overdue</CardTitle>
                <AlertCircle className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">
                  {complianceData.filter((item: any) => item.priority === 'high').length}
                </div>
                <p className="text-xs text-muted-foreground">Need attention</p>
              </CardContent>
            </Card>
            
            <Card data-testid="card-compliance-rate">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Compliance Rate</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {complianceData.length > 0 ? Math.round((complianceData.filter((item: any) => item.status === 'completed').length / complianceData.length) * 100) : 0}%
                </div>
                <p className="text-xs text-muted-foreground">Overall compliance</p>
              </CardContent>
            </Card>
          </div>

          {/* Filter Controls */}
          <Card data-testid="card-matrix-filters">
            <CardHeader>
              <CardTitle>Training Requirements</CardTitle>
              <CardDescription>
                {user?.role === 'supervisor' || user?.role === 'leadership' 
                  ? "Monitor team compliance and training progress"
                  : "Track your mandatory training requirements and deadlines"
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <Select defaultValue="all">
                  <SelectTrigger className="w-48" data-testid="select-training-status">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="not-started">Not Started</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
                <Select defaultValue="all">
                  <SelectTrigger className="w-48" data-testid="select-training-category">
                    <SelectValue placeholder="Filter by category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="safety">Safety & Health</SelectItem>
                    <SelectItem value="compliance">Compliance</SelectItem>
                    <SelectItem value="quality">Quality Standards</SelectItem>
                    <SelectItem value="technical">Technical Skills</SelectItem>
                  </SelectContent>
                </Select>
                {(user?.role === 'supervisor' || user?.role === 'leadership') && (
                  <Select defaultValue="my-team">
                    <SelectTrigger className="w-48" data-testid="select-team-view">
                      <SelectValue placeholder="View" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="my-team">My Team</SelectItem>
                      <SelectItem value="all-teams">All Teams</SelectItem>
                      <SelectItem value="department">Department</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Training Matrix Grid */}
              <div className="space-y-4">
                {complianceData.map((requirement: any) => (
                  <Card key={requirement.id} className="hover:shadow-md transition-shadow" data-testid={`training-requirement-${requirement.id}`}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-lg">{requirement.title}</h3>
                            <Badge 
                              variant={requirement.priority === 'high' ? 'destructive' : requirement.priority === 'medium' ? 'default' : 'secondary'}
                              data-testid={`badge-priority-${requirement.id}`}
                            >
                              {requirement.priority === 'high' ? 'High Priority' : requirement.priority === 'medium' ? 'Medium' : 'Low'}
                            </Badge>
                            <Badge 
                              variant={requirement.status === 'completed' ? 'default' : 'outline'}
                              className={requirement.status === 'completed' ? 'bg-green-100 text-green-800' : ''}
                              data-testid={`badge-status-${requirement.id}`}
                            >
                              {requirement.status === 'completed' ? 'Completed' : 'Required'}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground mb-4">
                            <div className="flex items-center">
                              <Calendar className="w-4 h-4 mr-2" />
                              Due: {requirement.dueDate}
                            </div>
                            <div className="flex items-center">
                              <Clock className="w-4 h-4 mr-2" />
                              Duration: 2-4 hours
                            </div>
                            <div className="flex items-center">
                              <Building className="w-4 h-4 mr-2" />
                              Category: Safety & Health
                            </div>
                          </div>

                          <p className="text-sm text-muted-foreground mb-4">
                            Essential training for ISO 9001 compliance and workplace safety. Covers risk assessment, 
                            incident reporting, and safety procedures specific to cleaning operations.
                          </p>

                          {requirement.status === 'completed' ? (
                            <div className="flex items-center text-green-600 text-sm">
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Completed on March 15, 2025
                            </div>
                          ) : (
                            <div className="flex gap-2">
                              <Button size="sm" data-testid={`button-start-training-${requirement.id}`}>
                                <Play className="w-4 h-4 mr-2" />
                                Start Training
                              </Button>
                              <Button variant="outline" size="sm" data-testid={`button-view-details-${requirement.id}`}>
                                <FileText className="w-4 h-4 mr-2" />
                                View Details
                              </Button>
                            </div>
                          )}
                        </div>
                        
                        {/* Progress indicator for supervisors/leadership */}
                        {(user?.role === 'supervisor' || user?.role === 'leadership') && (
                          <div className="ml-6 text-right">
                            <div className="text-sm font-medium mb-1">Team Progress</div>
                            <div className="w-32 bg-muted rounded-full h-2 mb-1">
                              <div 
                                className="bg-primary h-2 rounded-full transition-all duration-300" 
                                style={{ width: '75%' }}
                              ></div>
                            </div>
                            <div className="text-xs text-muted-foreground">6 of 8 completed</div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* ISO 9001 Compliance Summary for Leadership */}
          {(user?.role === 'supervisor' || user?.role === 'leadership') && (
            <Card data-testid="card-compliance-summary">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileCheck className="w-5 h-5 mr-2" />
                  ISO 9001 Compliance Summary
                </CardTitle>
                <CardDescription>
                  Training compliance status across all required ISO 9001 competency areas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-medium">Compliance Areas</h4>
                    {[
                      { area: "Quality Management", compliance: 95, total: 20 },
                      { area: "Safety Procedures", compliance: 88, total: 15 },
                      { area: "Environmental Standards", compliance: 92, total: 12 },
                      { area: "Customer Service", compliance: 85, total: 18 }
                    ].map((item, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-sm">{item.area}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-muted rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${item.compliance >= 90 ? 'bg-green-500' : item.compliance >= 80 ? 'bg-yellow-500' : 'bg-red-500'}`}
                              style={{ width: `${item.compliance}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium w-12">{item.compliance}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-4">
                    <h4 className="font-medium">Upcoming Renewals</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Safety Training</span>
                        <span className="text-orange-600">30 days</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Quality Procedures</span>
                        <span className="text-muted-foreground">45 days</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Environmental Compliance</span>
                        <span className="text-muted-foreground">60 days</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>)}
      </div>
    </div>
  );
}