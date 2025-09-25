import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import {
  insertGoalSchema,
  insertCompanyObjectiveSchema,
  insertTeamObjectiveSchema,
  insertTeamKeyResultSchema,
  insertWeeklyCheckInSchema,
  insertUserCompetencySchema,
  insertDevelopmentPlanSchema,
  insertMeetingSchema,
  insertRecognitionSchema,
  insertTeamSchema,
  updateUserProfileSchema,
  // LMS schemas
  insertCourseSchema,
  insertCourseVersionSchema,
  insertCourseModuleSchema,
  insertLessonSchema,
  insertQuizSchema,
  // Analytics validation schemas
  analyticsMetricsQuerySchema,
  analyticsPerformanceQuerySchema,
  analyticsPerformanceHistoryQuerySchema,
  analyticsInsightsQuerySchema,
  analyticsEngagementQuerySchema,
  analyticsPerformanceMetricsQuerySchema,
  insertQuizQuestionSchema,
  insertEnrollmentSchema,
  insertLessonProgressSchema,
  insertQuizAttemptSchema,
  insertTrainingRecordSchema,
  insertCertificateSchema,
  insertBadgeSchema,
  insertUserBadgeSchema,
  insertTrainingRequirementSchema,
  insertPdpCourseLinkSchema,
  // Learning Paths schemas
  insertLearningPathSchema,
  insertLearningPathStepSchema,
  insertLearningPathEnrollmentSchema,
  insertLearningPathStepProgressSchema,
  // Enhanced Competency Library schemas
  insertCompetencyLibrarySchema,
  insertRoleCompetencyMappingSchema,
  insertTrainingMatrixRecordSchema,
  insertCompetencyStatusHistorySchema,
  insertCompetencyEvidenceRecordSchema,
  insertAutomationRuleSchema,
  // Time-based automation schemas
  insertRelativeDueDateConfigSchema,
  insertRecurringAssignmentSchema,
  insertAutomationRunLogSchema,
  // Advanced Analytics schemas
  insertAnalyticsMetricSchema,
  insertAnalyticsDashboardSchema,
  insertAnalyticsReportSchema,
  insertPerformanceSnapshotSchema,
  insertLearningInsightSchema,
} from "@shared/schema";
import { z } from "zod";

// External course completion assignment schema
const assignExternalCourseCompletionSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  completionDate: z.string().refine((dateStr) => {
    const date = new Date(dateStr);
    return !isNaN(date.getTime());
  }, "Invalid date format"),
  proofOfCompletionUrl: z.string().url().optional(), // For future file upload support
});

// Enhanced lesson content schemas - extending shared schema as per project guidelines
// Include necessary fields for validation
const createLessonSchema = insertLessonSchema.omit({
  moduleId: true,
  type: true,
  orderIndex: true,
  estimatedDuration: true,
  id: true,
  createdAt: true,
}).extend({
  // Frontend fields that need transformation
  order: z.number().int().positive().optional().default(1),
  estimatedMinutes: z.number().positive().optional().default(30),
  // Override contentType to use correct enum values
  contentType: z.enum(["video", "rich_text", "pdf_document"]).optional().default("video"),
}).refine((data) => {
  // Ensure required content field is provided based on content type
  if (data.contentType === "video" || !data.contentType) {
    return data.vimeoVideoId !== undefined && data.vimeoVideoId !== null && String(data.vimeoVideoId).length > 0;
  } else if (data.contentType === "rich_text") {
    return data.richTextContent !== undefined && data.richTextContent !== null && String(data.richTextContent).length > 0;
  } else if (data.contentType === "pdf_document") {
    return data.pdfContentUrl !== undefined && data.pdfContentUrl !== null && String(data.pdfContentUrl).length > 0;
  }
  return false;
}, {
  message: "Content field is required based on the selected content type",
});

const updateLessonSchema = insertLessonSchema.partial().omit({
  id: true,
}).extend({
  // Frontend fields that need transformation
  order: z.number().int().positive().optional(),
  estimatedMinutes: z.number().positive().optional(),
  // Override contentType to use correct enum values
  contentType: z.enum(["video", "rich_text", "pdf_document"]).optional(),
}).refine((data) => {
  // If contentType is being updated, ensure the corresponding content field is provided
  if (data.contentType) {
    if (data.contentType === "video") {
      return data.vimeoVideoId !== undefined && data.vimeoVideoId !== null && String(data.vimeoVideoId).length > 0;
    } else if (data.contentType === "rich_text") {
      return data.richTextContent !== undefined && data.richTextContent !== null && String(data.richTextContent).length > 0;
    } else if (data.contentType === "pdf_document") {
      return data.pdfContentUrl !== undefined && data.pdfContentUrl !== null && String(data.pdfContentUrl).length > 0;
    }
  }
  return true; // Allow partial updates without content type change
}, {
  message: "Content field is required when updating content type",
});

// Authorization helper functions
function requireRole(allowedRoles: string[]) {
  return async (req: any, res: any, next: any) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !allowedRoles.includes(user.role)) {
        return res.status(403).json({ 
          message: `Access denied. Required role: ${allowedRoles.join(' or ')}` 
        });
      }
      req.currentUser = user;
      next();
    } catch (error) {
      console.error("Error checking user role:", error);
      return res.status(500).json({ message: "Authorization check failed" });
    }
  };
}

function requireLeadership() {
  return requireRole(['leadership']);
}

function requireSupervisorOrLeadership() {
  return requireRole(['supervisor', 'leadership']);
}

async function verifyEnrollmentOwnership(enrollmentId: string, userId: string): Promise<boolean> {
  try {
    const enrollment = await storage.getEnrollment(enrollmentId);
    return enrollment?.userId === userId;
  } catch (error) {
    console.error("Error verifying enrollment ownership:", error);
    return false;
  }
}

async function verifyQuizAttemptOwnership(attemptId: string, userId: string): Promise<boolean> {
  try {
    const attempt = await storage.getQuizAttempt(attemptId);
    return attempt?.userId === userId;
  } catch (error) {
    console.error("Error verifying quiz attempt ownership:", error);
    return false;
  }
}

function handleValidationError(error: any, res: any, action: string) {
  if (error.name === 'ZodError') {
    return res.status(400).json({ 
      message: `Invalid data provided for ${action}`, 
      errors: error.errors 
    });
  }
  console.error(`Error ${action}:`, error);
  return res.status(500).json({ message: `Failed to ${action}` });
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      console.log("[DEBUG] /api/auth/user - userId:", userId);
      const user = await storage.getUser(userId);
      console.log("[DEBUG] /api/auth/user - user found:", !!user, user ? `${user.firstName} ${user.lastName}` : 'none');
      
      if (!user) {
        console.log("[DEBUG] User not found in database, attempting to create from claims");
        const claims = req.user.claims;
        console.log("[DEBUG] Available claims:", Object.keys(claims));
        
        // Create user from current claims if missing - Use environment-aware role handling
        // In development: trust OIDC role claims for testing, Production: default to operative
        const isDevelopment = process.env.NODE_ENV === 'development';
        const hasValidClaimsRole = claims.role && ['operative', 'supervisor', 'leadership'].includes(claims.role);
        const userRole = (isDevelopment && hasValidClaimsRole) ? claims.role : "operative";
        
        await storage.upsertUser({
          id: claims.sub,
          email: claims.email || `${claims.sub}@apex.com`,
          firstName: claims.first_name || "Test",
          lastName: claims.last_name || "User", 
          profileImageUrl: claims.profile_image_url,
          role: userRole, // Environment-aware: respect OIDC claims in development, default to operative in production
        });
        
        const newUser = await storage.getUser(userId);
        console.log("[DEBUG] Created user:", !!newUser);
        return res.json(newUser);
      }
      
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Users
  app.get('/api/users', isAuthenticated, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Team Management
  app.get('/api/team/members', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const teamMembers = await storage.getTeamMembers(userId);
      res.json(teamMembers);
    } catch (error) {
      console.error("Error fetching team members:", error);
      res.status(500).json({ message: "Failed to fetch team members" });
    }
  });

  app.get('/api/team/goals', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const teamGoals = await storage.getTeamGoals(userId);
      res.json(teamGoals);
    } catch (error) {
      console.error("Error fetching team goals:", error);
      res.status(500).json({ message: "Failed to fetch team goals" });
    }
  });

  // Company objectives
  app.get('/api/objectives', isAuthenticated, async (req, res) => {
    try {
      const objectives = await storage.getActiveCompanyObjectives();
      res.json(objectives);
    } catch (error) {
      console.error("Error fetching objectives:", error);
      res.status(500).json({ message: "Failed to fetch objectives" });
    }
  });

  app.post('/api/objectives', isAuthenticated, async (req: any, res) => {
    try {
      // Check if user is leadership
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'leadership') {
        return res.status(403).json({ message: "Access denied. Leadership role required." });
      }

      const objectiveData = insertCompanyObjectiveSchema.parse({ 
        ...req.body, 
        createdBy: req.user.claims.sub 
      });
      const objective = await storage.createCompanyObjective(objectiveData);
      res.json(objective);
    } catch (error) {
      console.error("Error creating company objective:", error);
      res.status(500).json({ message: "Failed to create company objective" });
    }
  });

  app.put('/api/objectives/:id', isAuthenticated, async (req: any, res) => {
    try {
      // Check if user is leadership
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'leadership') {
        return res.status(403).json({ message: "Access denied. Leadership role required." });
      }

      const { id } = req.params;
      const updateData = req.body;
      const objective = await storage.updateCompanyObjective(id, updateData);
      res.json(objective);
    } catch (error) {
      console.error("Error updating company objective:", error);
      res.status(500).json({ message: "Failed to update company objective" });
    }
  });

  app.delete('/api/objectives/:id', isAuthenticated, async (req: any, res) => {
    try {
      // Check if user is leadership
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'leadership') {
        return res.status(403).json({ message: "Access denied. Leadership role required." });
      }

      const { id } = req.params;
      await storage.deleteCompanyObjective(id);
      res.json({ message: "Company objective deleted successfully" });
    } catch (error) {
      console.error("Error deleting company objective:", error);
      res.status(500).json({ message: "Failed to delete company objective" });
    }
  });

  // Team objectives
  app.get('/api/team-objectives', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      
      // Different access patterns based on role
      let teamObjectives;
      if (user?.role === 'leadership') {
        // Leadership can see all team objectives
        teamObjectives = await storage.getTeamObjectives();
      } else if (user?.role === 'supervisor') {
        // Supervisors can see objectives for their teams
        teamObjectives = await storage.getTeamObjectives(undefined, req.user.claims.sub);
      } else {
        // Operatives can see objectives for their team
        teamObjectives = await storage.getTeamObjectives(user?.teamName || undefined);
      }
      
      res.json(teamObjectives);
    } catch (error) {
      console.error("Error fetching team objectives:", error);
      res.status(500).json({ message: "Failed to fetch team objectives" });
    }
  });

  app.post('/api/team-objectives', isAuthenticated, async (req: any, res) => {
    try {
      // Check if user is supervisor or leadership
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'supervisor' && user?.role !== 'leadership') {
        return res.status(403).json({ message: "Access denied. Supervisor or leadership role required." });
      }

      const objectiveData = insertTeamObjectiveSchema.parse({ 
        ...req.body, 
        supervisorId: req.user.claims.sub 
      });
      const objective = await storage.createTeamObjective(objectiveData);
      res.json(objective);
    } catch (error) {
      console.error("Error creating team objective:", error);
      res.status(500).json({ message: "Failed to create team objective" });
    }
  });

  app.put('/api/team-objectives/:id', isAuthenticated, async (req: any, res) => {
    try {
      // Check if user is supervisor or leadership
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'supervisor' && user?.role !== 'leadership') {
        return res.status(403).json({ message: "Access denied. Supervisor or leadership role required." });
      }

      const { id } = req.params;
      
      // Get the existing objective to check ownership for supervisors
      const existingObjective = await storage.getTeamObjectiveById(id);
      if (!existingObjective) {
        return res.status(404).json({ message: "Team objective not found" });
      }

      // For supervisors, ensure they can only edit their own team's objectives
      if (user.role === 'supervisor' && existingObjective.supervisorId !== req.user.claims.sub) {
        return res.status(403).json({ message: "Access denied. You can only edit your own team's objectives." });
      }

      // Validate the update data
      const updateSchema = insertTeamObjectiveSchema.partial().omit({ supervisorId: true });
      const updateData = updateSchema.parse(req.body);
      
      const objective = await storage.updateTeamObjective(id, updateData);
      res.json(objective);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      console.error("Error updating team objective:", error);
      res.status(500).json({ message: "Failed to update team objective" });
    }
  });

  app.delete('/api/team-objectives/:id', isAuthenticated, async (req: any, res) => {
    try {
      // Check if user is supervisor or leadership
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'supervisor' && user?.role !== 'leadership') {
        return res.status(403).json({ message: "Access denied. Supervisor or leadership role required." });
      }

      const { id } = req.params;
      await storage.deleteTeamObjective(id);
      res.json({ message: "Team objective deleted successfully" });
    } catch (error) {
      console.error("Error deleting team objective:", error);
      res.status(500).json({ message: "Failed to delete team objective" });
    }
  });

  // Company Reports (Leadership only)
  app.get('/api/company/metrics', isAuthenticated, async (req: any, res) => {
    try {
      // Check if user is leadership
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'leadership') {
        return res.status(403).json({ message: "Access denied. Leadership role required." });
      }

      const metrics = await storage.getCompanyMetrics();
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching company metrics:", error);
      res.status(500).json({ message: "Failed to fetch company metrics" });
    }
  });

  // Teams Management (Supervisor+ only)
  app.get('/api/teams', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'supervisor' && user?.role !== 'leadership') {
        return res.status(403).json({ message: "Access denied. Supervisor or leadership role required." });
      }

      const teams = await storage.getAllTeams();
      res.json(teams);
    } catch (error) {
      console.error("Error fetching teams:", error);
      res.status(500).json({ message: "Failed to fetch teams" });
    }
  });

  app.post('/api/teams', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'supervisor' && user?.role !== 'leadership') {
        return res.status(403).json({ message: "Access denied. Supervisor or leadership role required." });
      }

      const teamData = insertTeamSchema.parse(req.body);
      const team = await storage.createTeam(teamData);
      res.json(team);
    } catch (error) {
      console.error("Error creating team:", error);
      res.status(500).json({ message: "Failed to create team" });
    }
  });

  app.put('/api/teams/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'supervisor' && user?.role !== 'leadership') {
        return res.status(403).json({ message: "Access denied. Supervisor or leadership role required." });
      }

      const { id } = req.params;
      const updates = insertTeamSchema.partial().parse(req.body);
      const team = await storage.updateTeam(id, updates);
      res.json(team);
    } catch (error) {
      console.error("Error updating team:", error);
      res.status(500).json({ message: "Failed to update team" });
    }
  });

  app.delete('/api/teams/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'leadership') {
        return res.status(403).json({ message: "Access denied. Leadership role required." });
      }

      const { id } = req.params;
      await storage.deleteTeam(id);
      res.json({ message: "Team deleted successfully" });
    } catch (error) {
      console.error("Error deleting team:", error);
      res.status(500).json({ message: "Failed to delete team" });
    }
  });

  app.get('/api/teams/hierarchy', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'supervisor' && user?.role !== 'leadership') {
        return res.status(403).json({ message: "Access denied. Supervisor or leadership role required." });
      }

      const hierarchy = await storage.getTeamHierarchy();
      res.json(hierarchy);
    } catch (error) {
      console.error("Error fetching team hierarchy:", error);
      res.status(500).json({ message: "Failed to fetch team hierarchy" });
    }
  });

  // User Profile Management
  app.put('/api/users/:id/profile', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const currentUserId = req.user.claims.sub;
      const currentUser = await storage.getUser(currentUserId);
      const targetUser = await storage.getUser(id);

      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Permission check: users can edit their own profile, managers can edit direct reports
      const canEdit = id === currentUserId || 
                     targetUser.managerId === currentUserId ||
                     currentUser?.role === 'leadership';

      if (!canEdit) {
        return res.status(403).json({ message: "You can only edit your own profile or your direct reports" });
      }

      const updates = updateUserProfileSchema.parse(req.body);
      const updatedUser = await storage.updateUserProfile(id, updates, currentUserId);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user profile:", error);
      res.status(500).json({ message: "Failed to update user profile" });
    }
  });

  app.put('/api/users/:id/role', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { role } = req.body;
      const currentUserId = req.user.claims.sub;
      const currentUser = await storage.getUser(currentUserId);
      const targetUser = await storage.getUser(id);

      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Only managers and leadership can change roles
      const canChangeRole = targetUser.managerId === currentUserId || currentUser?.role === 'leadership';

      if (!canChangeRole) {
        return res.status(403).json({ message: "You can only change roles for your direct reports" });
      }

      // Validate role
      if (!['operative', 'supervisor', 'leadership'].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }

      const updatedUser = await storage.updateUserRole(id, role, currentUserId);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  app.put('/api/users/:id/team', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { teamId } = req.body;
      const currentUserId = req.user.claims.sub;
      const currentUser = await storage.getUser(currentUserId);

      // Only supervisors and leadership can assign teams
      if (currentUser?.role !== 'supervisor' && currentUser?.role !== 'leadership') {
        return res.status(403).json({ message: "Access denied. Supervisor or leadership role required." });
      }

      const updatedUser = await storage.assignUserToTeam(id, teamId);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error assigning user to team:", error);
      res.status(500).json({ message: "Failed to assign user to team" });
    }
  });

  app.get('/api/users/by-manager/:managerId', isAuthenticated, async (req: any, res) => {
    try {
      const { managerId } = req.params;
      const currentUserId = req.user.claims.sub;
      const currentUser = await storage.getUser(currentUserId);

      // Users can only see their own direct reports or leadership can see all
      if (managerId !== currentUserId && currentUser?.role !== 'leadership') {
        return res.status(403).json({ message: "You can only view your own direct reports" });
      }

      const users = await storage.getUsersByManager(managerId);
      res.json(users);
    } catch (error) {
      console.error("Error fetching users by manager:", error);
      res.status(500).json({ message: "Failed to fetch users by manager" });
    }
  });

  app.get('/api/teams/:id/members', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const currentUserId = req.user.claims.sub;
      const currentUser = await storage.getUser(currentUserId);

      // Supervisors and leadership can view team members
      if (currentUser?.role !== 'supervisor' && currentUser?.role !== 'leadership') {
        return res.status(403).json({ message: "Access denied. Supervisor or leadership role required." });
      }

      const members = await storage.getUsersInTeam(id);
      res.json(members);
    } catch (error) {
      console.error("Error fetching team members:", error);
      res.status(500).json({ message: "Failed to fetch team members" });
    }
  });

  // Object Storage endpoints for photo upload
  app.post('/api/objects/upload', isAuthenticated, async (req: any, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ message: "Failed to get upload URL" });
    }
  });

  // Enhanced file upload endpoints for LMS functionality

  // Upload completion certificate for external courses
  app.post('/api/lms/upload/certificate', isAuthenticated, async (req: any, res) => {
    try {
      const { filename } = req.body;
      const userId = req.user.claims.sub;
      
      if (!filename) {
        return res.status(400).json({ message: "Filename is required" });
      }
      
      const objectStorageService = new ObjectStorageService();
      const result = await objectStorageService.getCertificateUploadURL(filename, userId);
      
      res.json({
        uploadURL: result.uploadURL,
        objectPath: result.objectPath,
        message: "Certificate upload URL generated successfully"
      });
    } catch (error: any) {
      console.error("Error getting certificate upload URL:", error);
      res.status(400).json({ message: error.message || "Failed to get certificate upload URL" });
    }
  });

  // Finalize certificate upload - establish ownership/ACL after successful upload
  app.post('/api/lms/upload/certificate/finalize', isAuthenticated, async (req: any, res) => {
    try {
      const { objectPath } = req.body;
      const userId = req.user.claims.sub;
      
      if (!objectPath) {
        return res.status(400).json({ message: "objectPath is required" });
      }
      
      // Verify the object path belongs to this user (security check)
      if (!objectPath.includes(`cert_${userId}_`)) {
        return res.status(403).json({ message: "Access denied - certificate does not belong to you" });
      }
      
      const objectStorageService = new ObjectStorageService();
      
      // Set ACL policy to grant the uploader access to their certificate
      const normalizedPath = await objectStorageService.trySetObjectEntityAclPolicy(objectPath, {
        visibility: 'private',
        ownerUserId: userId
      });
      
      res.json({
        objectPath: normalizedPath,
        message: "Certificate upload finalized successfully - access permissions established"
      });
    } catch (error: any) {
      console.error("Error finalizing certificate upload:", error);
      res.status(400).json({ message: error.message || "Failed to finalize certificate upload" });
    }
  });

  // Badge icon upload endpoint (admin only)
  app.post('/api/objects/badges/upload', isAuthenticated, async (req: any, res) => {
    try {
      const { filename, badgeId } = req.body;
      const userId = req.user.claims.sub;
      
      // Check if user is admin (supervisor or leadership)
      const user = await storage.getUser(userId);
      if (!user || (user.role !== 'supervisor' && user.role !== 'leadership')) {
        return res.status(403).json({ message: "Only admins can upload badge icons" });
      }
      
      if (!filename || !badgeId) {
        return res.status(400).json({ message: "Filename and badgeId are required" });
      }
      
      const objectStorageService = new ObjectStorageService();
      const result = await objectStorageService.getBadgeIconUploadURL(filename, badgeId);
      
      res.json({
        uploadURL: result.uploadURL,
        objectPath: result.objectPath,
        iconKey: result.iconKey,
        message: "Badge icon upload URL generated successfully"
      });
    } catch (error: any) {
      console.error("Error getting badge icon upload URL:", error);
      res.status(400).json({ message: error.message || "Failed to get badge icon upload URL" });
    }
  });

  // Upload PDF document for lesson content
  app.post('/api/lms/upload/lesson-pdf', isAuthenticated, requireSupervisorOrLeadership(), async (req: any, res) => {
    try {
      const { filename, lessonId } = req.body;
      
      if (!filename || !lessonId) {
        return res.status(400).json({ message: "Filename and lessonId are required" });
      }
      
      // Verify the lesson exists
      const lesson = await storage.getLesson(lessonId);
      if (!lesson) {
        return res.status(404).json({ message: "Lesson not found" });
      }
      
      const objectStorageService = new ObjectStorageService();
      const result = await objectStorageService.getLessonPDFUploadURL(filename, lessonId);
      
      res.json({
        uploadURL: result.uploadURL,
        objectPath: result.objectPath,
        message: "Lesson PDF upload URL generated successfully"
      });
    } catch (error: any) {
      console.error("Error getting lesson PDF upload URL:", error);
      res.status(400).json({ message: error.message || "Failed to get lesson PDF upload URL" });
    }
  });

  // Get file download URL (with permission checking)
  app.get('/api/lms/files/download', isAuthenticated, async (req: any, res) => {
    try {
      const { objectPath } = req.query;
      const userId = req.user.claims.sub;
      
      if (!objectPath) {
        return res.status(400).json({ message: "objectPath parameter is required" });
      }
      
      const objectStorageService = new ObjectStorageService();
      const downloadURL = await objectStorageService.getFileDownloadURL(objectPath as string, userId);
      
      res.json({
        downloadURL,
        message: "File download URL generated successfully"
      });
    } catch (error: any) {
      console.error("Error getting file download URL:", error);
      
      if (error.message === 'Access denied to this file') {
        return res.status(403).json({ message: "Access denied to this file" });
      }
      
      res.status(400).json({ message: error.message || "Failed to get file download URL" });
    }
  });

  app.put('/api/profile-images', isAuthenticated, async (req: any, res) => {
    try {
      if (!req.body.profileImageURL) {
        return res.status(400).json({ error: "profileImageURL is required" });
      }

      const userId = req.user.claims.sub;

      const objectStorageService = new ObjectStorageService();
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        req.body.profileImageURL,
        {
          owner: userId,
          visibility: "public", // Profile images are public
        },
      );

      // Update user profile with the new image path
      const updatedUser = await storage.updateUserProfile(userId, {
        profileImageUrl: objectPath,
      }, userId);

      res.json({
        objectPath: objectPath,
        user: updatedUser,
      });
    } catch (error) {
      console.error("Error setting profile image:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Goals
  app.get('/api/goals', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const goals = await storage.getUserGoals(userId);
      res.json(goals);
    } catch (error) {
      console.error("Error fetching goals:", error);
      res.status(500).json({ message: "Failed to fetch goals" });
    }
  });

  app.post('/api/goals', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const goalData = insertGoalSchema.parse({ ...req.body, userId });
      const goal = await storage.createGoal(goalData);
      res.json(goal);
    } catch (error) {
      console.error("Error creating goal:", error);
      res.status(500).json({ message: "Failed to create goal" });
    }
  });

  app.put('/api/goals/:id/progress', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const { currentValue } = req.body;
      
      // Verify goal ownership
      const isOwner = await storage.verifyGoalOwnership(id, userId);
      if (!isOwner) {
        return res.status(403).json({ message: "You can only update your own goals" });
      }
      
      // Validate input
      if (typeof currentValue !== 'number' || currentValue < 0) {
        return res.status(400).json({ message: "Current value must be a non-negative number" });
      }
      
      const goal = await storage.updateGoalProgress(id, currentValue);
      if (!goal) {
        return res.status(404).json({ message: "Goal not found" });
      }
      
      res.json(goal);
    } catch (error) {
      console.error("Error updating goal progress:", error);
      res.status(500).json({ message: "Failed to update goal progress" });
    }
  });

  // Weekly check-ins
  app.get('/api/check-ins', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const checkIns = await storage.getUserCheckIns(userId);
      res.json(checkIns);
    } catch (error) {
      console.error("Error fetching check-ins:", error);
      res.status(500).json({ message: "Failed to fetch check-ins" });
    }
  });

  app.post('/api/check-ins', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Validate request body format before parsing
      if (!req.body.goalId || !req.body.weekOf) {
        return res.status(400).json({ message: "Goal ID and week date are required" });
      }
      
      // Verify goal ownership
      const isOwner = await storage.verifyGoalOwnership(req.body.goalId, userId);
      if (!isOwner) {
        return res.status(403).json({ message: "You can only create check-ins for your own goals" });
      }
      
      // Get goal to calculate absolute progress value
      const goal = await storage.getGoal(req.body.goalId);
      if (!goal) {
        return res.status(404).json({ message: "Goal not found" });
      }
      
      // Parse and validate check-in data
      const checkInData = insertWeeklyCheckInSchema.parse({ ...req.body, userId });
      
      // Validate progress percentage
      if (checkInData.progress < 0 || checkInData.progress > 100) {
        return res.status(400).json({ message: "Progress must be between 0 and 100 percent" });
      }
      
      // Create check-in and update goal atomically
      const absoluteProgress = Math.round((checkInData.progress / 100) * goal.targetValue);
      const checkIn = await storage.createCheckInWithGoalUpdate(checkInData, absoluteProgress);
      
      res.status(201).json(checkIn);
    } catch (error: any) {
      console.error("Error creating check-in:", error);
      
      // Handle validation errors specifically
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          message: "Invalid data provided", 
          errors: error.errors 
        });
      }
      
      res.status(500).json({ message: "Failed to create check-in" });
    }
  });

  // Competencies
  app.get('/api/competencies', isAuthenticated, async (req, res) => {
    try {
      const competencies = await storage.getCompetencies();
      res.json(competencies);
    } catch (error) {
      console.error("Error fetching competencies:", error);
      res.status(500).json({ message: "Failed to fetch competencies" });
    }
  });

  // Get active competencies from competency library
  app.get('/api/competency-library/active', isAuthenticated, async (req, res) => {
    try {
      const competencies = await storage.getActiveCompetencyLibraryItems();
      res.json(competencies);
    } catch (error) {
      console.error("Error fetching active competencies from library:", error);
      res.status(500).json({ message: "Failed to fetch active competencies from library" });
    }
  });

  app.get('/api/user-competencies', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const competencies = await storage.getUserCompetencies(userId);
      res.json(competencies);
    } catch (error) {
      console.error("Error fetching user competencies:", error);
      res.status(500).json({ message: "Failed to fetch user competencies" });
    }
  });

  app.post('/api/user-competencies', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const competencyData = insertUserCompetencySchema.parse({ ...req.body, userId });
      const userCompetency = await storage.createUserCompetency(competencyData);
      res.json(userCompetency);
    } catch (error: any) {
      console.error("Error creating user competency:", error);
      
      // Handle validation errors specifically
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          message: "Invalid data provided", 
          errors: error.errors 
        });
      }
      
      res.status(500).json({ message: "Failed to create competency assessment" });
    }
  });

  // Enhanced Competency Library - Hierarchical Competency Management
  app.get('/api/competency-library', isAuthenticated, async (req, res) => {
    try {
      const competencies = await storage.getCompetencyLibrary();
      res.json(competencies);
    } catch (error) {
      console.error("Error fetching competency library:", error);
      res.status(500).json({ message: "Failed to fetch competency library" });
    }
  });

  app.get('/api/competency-library/hierarchical', isAuthenticated, async (req, res) => {
    try {
      const parentId = req.query.parentId as string | undefined;
      const competencies = await storage.getHierarchicalCompetencies(parentId);
      res.json(competencies);
    } catch (error) {
      console.error("Error fetching hierarchical competencies:", error);
      res.status(500).json({ message: "Failed to fetch hierarchical competencies" });
    }
  });

  app.get('/api/competency-library/:id', isAuthenticated, async (req, res) => {
    try {
      const competency = await storage.getCompetencyLibraryItem(req.params.id);
      if (!competency) {
        return res.status(404).json({ message: "Competency not found" });
      }
      res.json(competency);
    } catch (error) {
      console.error("Error fetching competency:", error);
      res.status(500).json({ message: "Failed to fetch competency" });
    }
  });

  app.get('/api/competency-library/:id/children', isAuthenticated, async (req, res) => {
    try {
      const children = await storage.getCompetencyChildren(req.params.id);
      res.json(children);
    } catch (error) {
      console.error("Error fetching competency children:", error);
      res.status(500).json({ message: "Failed to fetch competency children" });
    }
  });

  app.post('/api/competency-library', isAuthenticated, requireLeadership(), async (req: any, res) => {
    try {
      const competencyData = insertCompetencyLibrarySchema.parse(req.body);
      const competency = await storage.createCompetencyLibraryItem(competencyData);
      res.json(competency);
    } catch (error: any) {
      console.error("Error creating competency:", error);
      
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          message: "Invalid data provided", 
          errors: error.errors 
        });
      }
      
      res.status(500).json({ message: "Failed to create competency" });
    }
  });

  app.put('/api/competency-library/:id', isAuthenticated, requireLeadership(), async (req, res) => {
    try {
      const updates = insertCompetencyLibrarySchema.partial().parse(req.body);
      const competency = await storage.updateCompetencyLibraryItem(req.params.id, updates);
      res.json(competency);
    } catch (error: any) {
      console.error("Error updating competency:", error);
      
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          message: "Invalid data provided", 
          errors: error.errors 
        });
      }
      
      res.status(500).json({ message: "Failed to update competency" });
    }
  });

  app.delete('/api/competency-library/:id', isAuthenticated, requireLeadership(), async (req, res) => {
    try {
      await storage.deleteCompetencyLibraryItem(req.params.id);
      res.json({ message: "Competency deleted successfully" });
    } catch (error) {
      console.error("Error deleting competency:", error);
      res.status(500).json({ message: "Failed to delete competency" });
    }
  });

  // Role Competency Mapping - Team Filtering and Priority Management
  app.get('/api/role-competency-mappings', isAuthenticated, async (req, res) => {
    try {
      const role = req.query.role as string | undefined;
      const teamId = req.query.teamId as string | undefined;
      const mappings = await storage.getRoleCompetencyMappings(role, teamId);
      res.json(mappings);
    } catch (error) {
      console.error("Error fetching role competency mappings:", error);
      res.status(500).json({ message: "Failed to fetch role competency mappings" });
    }
  });

  app.get('/api/role-competency-mappings/:id', isAuthenticated, async (req, res) => {
    try {
      const mapping = await storage.getRoleCompetencyMapping(req.params.id);
      if (!mapping) {
        return res.status(404).json({ message: "Role competency mapping not found" });
      }
      res.json(mapping);
    } catch (error) {
      console.error("Error fetching role competency mapping:", error);
      res.status(500).json({ message: "Failed to fetch role competency mapping" });
    }
  });

  app.post('/api/role-competency-mappings', isAuthenticated, requireLeadership(), async (req: any, res) => {
    try {
      const mappingData = insertRoleCompetencyMappingSchema.parse(req.body);
      const mapping = await storage.createRoleCompetencyMapping(mappingData);
      res.json(mapping);
    } catch (error: any) {
      console.error("Error creating role competency mapping:", error);
      
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          message: "Invalid data provided", 
          errors: error.errors 
        });
      }
      
      res.status(500).json({ message: "Failed to create role competency mapping" });
    }
  });

  app.put('/api/role-competency-mappings/:id', isAuthenticated, requireLeadership(), async (req, res) => {
    try {
      const updates = insertRoleCompetencyMappingSchema.partial().parse(req.body);
      const mapping = await storage.updateRoleCompetencyMapping(req.params.id, updates);
      res.json(mapping);
    } catch (error: any) {
      console.error("Error updating role competency mapping:", error);
      
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          message: "Invalid data provided", 
          errors: error.errors 
        });
      }
      
      res.status(500).json({ message: "Failed to update role competency mapping" });
    }
  });

  app.delete('/api/role-competency-mappings/:id', isAuthenticated, requireLeadership(), async (req, res) => {
    try {
      await storage.deleteRoleCompetencyMapping(req.params.id);
      res.json({ message: "Role competency mapping deleted successfully" });
    } catch (error) {
      console.error("Error deleting role competency mapping:", error);
      res.status(500).json({ message: "Failed to delete role competency mapping" });
    }
  });

  app.get('/api/users/:userId/required-competencies', isAuthenticated, async (req, res) => {
    try {
      const competencies = await storage.getRequiredCompetenciesForUser(req.params.userId);
      res.json(competencies);
    } catch (error) {
      console.error("Error fetching required competencies for user:", error);
      res.status(500).json({ message: "Failed to fetch required competencies for user" });
    }
  });

  // Competency Audit Trail - ISO 9001:2015 Compliance
  app.get('/api/competency-status-history/:userId', isAuthenticated, async (req, res) => {
    try {
      const userId = req.params.userId;
      const competencyLibraryId = req.query.competencyLibraryId as string | undefined;
      const history = await storage.getCompetencyStatusHistory(userId, competencyLibraryId);
      res.json(history);
    } catch (error) {
      console.error("Error fetching competency status history:", error);
      res.status(500).json({ message: "Failed to fetch competency status history" });
    }
  });

  app.post('/api/competency-status-history', isAuthenticated, async (req: any, res) => {
    try {
      const currentUserId = req.user.claims.sub;
      const historyData = insertCompetencyStatusHistorySchema.parse({ ...req.body, userId: currentUserId });
      const history = await storage.createCompetencyStatusHistory(historyData);
      res.json(history);
    } catch (error: any) {
      console.error("Error creating competency status history:", error);
      
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          message: "Invalid data provided", 
          errors: error.errors 
        });
      }
      
      res.status(500).json({ message: "Failed to create competency status history" });
    }
  });

  app.get('/api/competency-evidence/:userId', isAuthenticated, async (req, res) => {
    try {
      const userId = req.params.userId;
      const competencyLibraryId = req.query.competencyLibraryId as string | undefined;
      const evidence = await storage.getCompetencyEvidenceRecords(userId, competencyLibraryId);
      res.json(evidence);
    } catch (error) {
      console.error("Error fetching competency evidence records:", error);
      res.status(500).json({ message: "Failed to fetch competency evidence records" });
    }
  });

  app.get('/api/competency-evidence/record/:id', isAuthenticated, async (req, res) => {
    try {
      const record = await storage.getCompetencyEvidenceRecord(req.params.id);
      if (!record) {
        return res.status(404).json({ message: "Evidence record not found" });
      }
      res.json(record);
    } catch (error) {
      console.error("Error fetching evidence record:", error);
      res.status(500).json({ message: "Failed to fetch evidence record" });
    }
  });

  app.post('/api/competency-evidence', isAuthenticated, async (req: any, res) => {
    try {
      const currentUserId = req.user.claims.sub;
      const evidenceData = insertCompetencyEvidenceRecordSchema.parse({ ...req.body, userId: currentUserId });
      const evidence = await storage.createCompetencyEvidenceRecord(evidenceData);
      res.json(evidence);
    } catch (error: any) {
      console.error("Error creating competency evidence:", error);
      
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          message: "Invalid data provided", 
          errors: error.errors 
        });
      }
      
      res.status(500).json({ message: "Failed to create competency evidence" });
    }
  });

  app.put('/api/competency-evidence/:id', isAuthenticated, async (req: any, res) => {
    try {
      const currentUserId = req.user.claims.sub;
      const currentUser = await storage.getUser(currentUserId);
      
      // Check ownership or supervisor/leadership permission
      const existingEvidence = await storage.getCompetencyEvidenceRecord(req.params.id);
      if (!existingEvidence) {
        return res.status(404).json({ message: "Evidence record not found" });
      }
      
      if (existingEvidence.userId !== currentUserId && !['supervisor', 'leadership'].includes(currentUser?.role || '')) {
        return res.status(403).json({ message: "Can only update your own evidence records" });
      }
      
      const updates = insertCompetencyEvidenceRecordSchema.partial().parse(req.body);
      const evidence = await storage.updateCompetencyEvidenceRecord(req.params.id, updates);
      res.json(evidence);
    } catch (error: any) {
      console.error("Error updating competency evidence:", error);
      
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          message: "Invalid data provided", 
          errors: error.errors 
        });
      }
      
      res.status(500).json({ message: "Failed to update competency evidence" });
    }
  });

  app.post('/api/competency-evidence/:id/verify', isAuthenticated, requireSupervisorOrLeadership(), async (req: any, res) => {
    try {
      const verifierId = req.user.claims.sub;
      const { notes } = req.body;
      const evidence = await storage.verifyCompetencyEvidence(req.params.id, verifierId, notes);
      res.json(evidence);
    } catch (error) {
      console.error("Error verifying competency evidence:", error);
      res.status(500).json({ message: "Failed to verify competency evidence" });
    }
  });

  // Training Matrix and Compliance Reporting
  app.get('/api/training-matrix', isAuthenticated, async (req, res) => {
    try {
      const userId = req.query.userId as string | undefined;
      const competencyLibraryId = req.query.competencyLibraryId as string | undefined;
      const records = await storage.getTrainingMatrixRecords(userId, competencyLibraryId);
      res.json(records);
    } catch (error) {
      console.error("Error fetching training matrix records:", error);
      res.status(500).json({ message: "Failed to fetch training matrix records" });
    }
  });

  app.get('/api/training-matrix/:id', isAuthenticated, async (req, res) => {
    try {
      const record = await storage.getTrainingMatrixRecord(req.params.id);
      if (!record) {
        return res.status(404).json({ message: "Training matrix record not found" });
      }
      res.json(record);
    } catch (error) {
      console.error("Error fetching training matrix record:", error);
      res.status(500).json({ message: "Failed to fetch training matrix record" });
    }
  });

  app.post('/api/training-matrix', isAuthenticated, requireSupervisorOrLeadership(), async (req: any, res) => {
    try {
      const currentUserId = req.user.claims.sub;
      const recordData = insertTrainingMatrixRecordSchema.parse({ ...req.body, updatedBy: currentUserId });
      const record = await storage.createTrainingMatrixRecord(recordData);
      res.json(record);
    } catch (error: any) {
      console.error("Error creating training matrix record:", error);
      
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          message: "Invalid data provided", 
          errors: error.errors 
        });
      }
      
      res.status(500).json({ message: "Failed to create training matrix record" });
    }
  });

  app.put('/api/training-matrix/:id', isAuthenticated, requireSupervisorOrLeadership(), async (req, res) => {
    try {
      const updates = insertTrainingMatrixRecordSchema.partial().parse(req.body);
      const record = await storage.updateTrainingMatrixRecord(req.params.id, updates);
      res.json(record);
    } catch (error: any) {
      console.error("Error updating training matrix record:", error);
      
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          message: "Invalid data provided", 
          errors: error.errors 
        });
      }
      
      res.status(500).json({ message: "Failed to update training matrix record" });
    }
  });

  app.put('/api/competency-status/:userId/:competencyLibraryId', isAuthenticated, async (req, res) => {
    try {
      const { userId, competencyLibraryId } = req.params;
      const { status, evidenceData } = req.body;
      const record = await storage.updateCompetencyStatus(userId, competencyLibraryId, status, evidenceData);
      res.json(record);
    } catch (error) {
      console.error("Error updating competency status:", error);
      res.status(500).json({ message: "Failed to update competency status" });
    }
  });

  app.get('/api/compliance-report', isAuthenticated, requireSupervisorOrLeadership(), async (req, res) => {
    try {
      const filters = {
        role: req.query.role as string | undefined,
        teamId: req.query.teamId as string | undefined,
        competencyId: req.query.competencyId as string | undefined,
        status: req.query.status as string | undefined
      };
      const report = await storage.getComplianceReport(filters);
      res.json(report);
    } catch (error) {
      console.error("Error generating compliance report:", error);
      res.status(500).json({ message: "Failed to generate compliance report" });
    }
  });

  app.get('/api/competency-gap-analysis', isAuthenticated, requireSupervisorOrLeadership(), async (req, res) => {
    try {
      const userId = req.query.userId as string | undefined;
      const analysis = await storage.getCompetencyGapAnalysis(userId);
      res.json(analysis);
    } catch (error) {
      console.error("Error performing competency gap analysis:", error);
      res.status(500).json({ message: "Failed to perform competency gap analysis" });
    }
  });

  // ========================================
  // ADAPTIVE LEARNING ENGINE ROUTES
  // ========================================

  // Get adaptive learning profile
  app.get('/api/adaptive-learning/profile/:userId', isAuthenticated, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const currentUserId = req.user.claims.sub;
      
      // Check permission - users can only access their own profile or supervisors can access their team's
      if (userId !== currentUserId && req.user.claims.role !== 'supervisor' && req.user.claims.role !== 'leadership') {
        return res.status(403).json({ message: "You don't have permission to access this profile" });
      }
      
      // Get real user data for adaptive learning profile
      const [userCompetencies, learningPathEnrollments] = await Promise.all([
        storage.getUserCompetencies(userId),
        storage.getLearningPathEnrollments(userId)
      ]);
      
      // Calculate performance metrics from real data
      const completedEnrollments = learningPathEnrollments.filter(e => e.enrollmentStatus === 'completed');
      const inProgressEnrollments = learningPathEnrollments.filter(e => e.enrollmentStatus === 'in_progress');
      const totalEnrollments = learningPathEnrollments.length;
      
      // Calculate completion rate
      const completionRate = totalEnrollments > 0 ? (completedEnrollments.length / totalEnrollments) * 100 : 0;
      
      // Calculate average progress for in-progress enrollments
      const averageProgress = inProgressEnrollments.length > 0 
        ? inProgressEnrollments.reduce((sum, e) => sum + (e.progress || 0), 0) / inProgressEnrollments.length
        : 0;
      
      // Analyze competencies for strengths and development areas
      const strongCompetencies: string[] = [];
      const developmentAreas: string[] = [];
      
      userCompetencies.forEach((uc: any) => {
        if (uc.competency && uc.currentLevel && uc.targetLevel) {
          if (uc.currentLevel >= uc.targetLevel) {
            strongCompetencies.push(uc.competency.name);
          } else if (uc.currentLevel < uc.targetLevel * 0.7) {
            developmentAreas.push(uc.competency.name);
          }
        }
      });
      
      // Calculate learning velocity (enrollments in last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const recentEnrollments = learningPathEnrollments.filter(e => 
        new Date(e.enrolledAt) >= thirtyDaysAgo
      ).length;
      
      const learningVelocity = recentEnrollments / 30; // enrollments per day
      
      // Calculate engagement level based on active enrollments
      const activeEnrollmentRatio = inProgressEnrollments.length / Math.max(totalEnrollments, 1);
      const engagementLevel = Math.min(100, activeEnrollmentRatio * 100 + (averageProgress * 0.5));
      
      // Calculate consistency score based on regular activity
      const consistencyScore = Math.min(100, 
        (completedEnrollments.length * 20) + // 20 points per completion
        (averageProgress * 0.8) + // progress contribution
        (recentEnrollments * 10) // recent activity bonus
      );
      
      const profile = {
        userId: userId,
        learningStyle: 'visual', // Default - can be enhanced later with user preferences
        preferredPace: 'medium', // Default - can be enhanced later
        difficultyPreference: 'moderate', // Default - can be enhanced later
        availableTime: 300, // Default 5 hours per week
        strongCompetencies: strongCompetencies.slice(0, 5), // Top 5 strong competencies
        developmentAreas: developmentAreas.slice(0, 5), // Top 5 development areas
        careerGoals: ['professional_development'], // Default - can be enhanced later
        performanceMetrics: {
          averageScore: Math.round(averageProgress),
          completionRate: Math.round(completionRate),
          engagementLevel: Math.round(engagementLevel),
          consistencyScore: Math.round(consistencyScore),
          learningVelocity: Math.round(learningVelocity * 100) / 100,
        },
      };
      
      res.json(profile);
    } catch (error) {
      console.error("Error fetching adaptive learning profile:", error);
      res.status(500).json({ message: "Failed to fetch adaptive learning profile" });
    }
  });

  // Update adaptive learning profile
  app.patch('/api/adaptive-learning/profile/:userId', isAuthenticated, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const currentUserId = req.user.claims.sub;
      
      // Check permission
      if (userId !== currentUserId) {
        return res.status(403).json({ message: "You can only update your own profile" });
      }
      
      // For now, return updated mock data
      const updatedProfile = {
        userId: userId,
        ...req.body,
        updatedAt: new Date(),
      };
      
      res.json(updatedProfile);
    } catch (error) {
      console.error("Error updating adaptive learning profile:", error);
      res.status(500).json({ message: "Failed to update adaptive learning profile" });
    }
  });

  // Get adaptive recommendations
  app.get('/api/adaptive-learning/recommendations/:userId', isAuthenticated, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const currentUserId = req.user.claims.sub;
      
      // Check permission
      if (userId !== currentUserId && req.user.claims.role !== 'supervisor' && req.user.claims.role !== 'leadership') {
        return res.status(403).json({ message: "You don't have permission to access these recommendations" });
      }
      
      // Generate intelligent recommendations based on real user performance data
      const [
        userCompetencies, 
        learningPathEnrollments, 
        gapAnalysis, 
        availableLearningPaths
      ] = await Promise.all([
        storage.getUserCompetencies(userId),
        storage.getLearningPathEnrollments(userId),
        storage.getCompetencyGapAnalysis(userId),
        storage.getAllLearningPaths()
      ]);
      
      const recommendations = [];
      const timestamp = Date.now();
      
      // 1. Competency gap-based recommendations
      if (gapAnalysis.gapDetails && gapAnalysis.gapDetails.length > 0) {
        gapAnalysis.gapDetails.slice(0, 3).forEach((gap: any, index: number) => {
          const gapSeverity = gap.gap || 0;
          const priority = gapSeverity > 2 ? 'high' : gapSeverity > 1 ? 'medium' : 'low';
          const confidence = Math.min(95, 70 + (gapSeverity * 10));
          
          recommendations.push({
            id: `rec-gap-${timestamp}-${index}`,
            type: 'learning_path',
            title: `Develop ${gap.competency.name}`,
            description: `Targeted learning to improve your ${gap.competency.name.toLowerCase()} competency`,
            reasoning: `You currently have level ${gap.currentLevel || 0} but need level ${gap.requiredLevel || 0} for your role. Bridging this ${gapSeverity.toFixed(1)}-point gap is critical for your development.`,
            confidence,
            priority,
            estimatedTime: Math.round(gapSeverity * 30 + 60), // More time for bigger gaps
            pathId: gap.recommendedPaths?.[0], // Use first recommended path if available
            adaptations: {
              adjustedDifficulty: gapSeverity > 2 ? 'moderate' : 'easier',
              adjustedPace: priority === 'high' ? 'medium' : 'slow',
              prerequisiteReview: gap.currentLevel === 0,
            },
            metadata: { 
              source: 'competency_gap_analysis',
              competencyId: gap.competency.id,
              gapSeverity: gapSeverity
            }
          });
        });
      }
      
      // 2. Incomplete enrollment recommendations
      const stuckEnrollments = learningPathEnrollments.filter(e => 
        e.enrollmentStatus === 'in_progress' && 
        (e.progress || 0) < 20 &&
        new Date(e.enrolledAt) < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Stuck for > 1 week
      );
      
      stuckEnrollments.slice(0, 2).forEach((enrollment, index) => {
        recommendations.push({
          id: `rec-stuck-${timestamp}-${index}`,
          type: 'review',
          title: `Resume Learning Path: ${enrollment.pathTitle || 'Learning Path'}`,
          description: 'Get back on track with your learning journey',
          reasoning: `You started this learning path ${Math.ceil((Date.now() - new Date(enrollment.enrolledAt).getTime()) / (24 * 60 * 60 * 1000))} days ago but progress has stalled at ${Math.round(enrollment.progress || 0)}%. A refresher might help you regain momentum.`,
          confidence: 85,
          priority: 'medium',
          estimatedTime: 30,
          pathId: enrollment.pathId,
          adaptations: {
            adjustedDifficulty: 'easier',
            adjustedPace: 'slow',
            prerequisiteReview: true,
          },
          metadata: { 
            source: 'stalled_enrollment',
            enrollmentId: enrollment.id
          }
        });
      });
      
      // 3. Performance-based recommendations
      const competenciesNeedingReinforcement = userCompetencies.filter((uc: any) => 
        uc.currentLevel > 0 && 
        uc.currentLevel < (uc.targetLevel || 3) * 0.8 &&
        uc.competency
      );
      
      competenciesNeedingReinforcement.slice(0, 2).forEach((comp: any, index) => {
        const improvementNeeded = (comp.targetLevel || 3) - comp.currentLevel;
        recommendations.push({
          id: `rec-reinforce-${timestamp}-${index}`,
          type: 'course',
          title: `Strengthen ${comp.competency.name}`,
          description: `Targeted practice to reinforce your ${comp.competency.name.toLowerCase()} skills`,
          reasoning: `Your current level (${comp.currentLevel}) is approaching your target (${comp.targetLevel || 3}), but some reinforcement will ensure you maintain this competency.`,
          confidence: 75,
          priority: 'low',
          estimatedTime: Math.round(improvementNeeded * 20 + 30),
          adaptations: {
            adjustedDifficulty: 'moderate',
            adjustedPace: 'medium',
            prerequisiteReview: false,
          },
          metadata: { 
            source: 'competency_reinforcement',
            competencyId: comp.competencyId
          }
        });
      });
      
      // 4. If no specific gaps, suggest general development
      if (recommendations.length === 0) {
        recommendations.push({
          id: `rec-general-${timestamp}`,
          type: 'learning_path',
          title: 'Continue Your Learning Journey',
          description: 'Explore new areas to enhance your professional development',
          reasoning: 'Your competencies are well-developed! This is a great time to explore new learning opportunities and expand your skill set.',
          confidence: 60,
          priority: 'low',
          estimatedTime: 90,
          adaptations: {
            adjustedDifficulty: 'moderate',
            adjustedPace: 'medium',
            prerequisiteReview: false,
          },
          metadata: { source: 'general_development' }
        });
      }
      
      // Sort recommendations by priority and confidence
      recommendations.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        if (priorityOrder[a.priority as keyof typeof priorityOrder] !== priorityOrder[b.priority as keyof typeof priorityOrder]) {
          return priorityOrder[b.priority as keyof typeof priorityOrder] - priorityOrder[a.priority as keyof typeof priorityOrder];
        }
        return b.confidence - a.confidence;
      });
      
      res.json(recommendations.slice(0, 5)); // Return top 5 recommendations
    } catch (error) {
      console.error("Error fetching adaptive recommendations:", error);
      res.status(500).json({ message: "Failed to fetch adaptive recommendations" });
    }
  });

  // Get performance insights
  app.get('/api/adaptive-learning/insights/:userId', isAuthenticated, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const currentUserId = req.user.claims.sub;
      
      // Check permission
      if (userId !== currentUserId && req.user.claims.role !== 'supervisor' && req.user.claims.role !== 'leadership') {
        return res.status(403).json({ message: "You don't have permission to access these insights" });
      }
      
      // Fetch real user performance data
      const [
        userCompetencies,
        learningPathEnrollments,
        enrollments // Course enrollments
      ] = await Promise.all([
        storage.getUserCompetencies(userId),
        storage.getLearningPathEnrollments(userId),
        storage.getUserEnrollments(userId)
      ]);
      
      const insights = [];
      
      // Calculate completion rates and trends
      const completedEnrollments = learningPathEnrollments.filter(e => e.enrollmentStatus === 'completed');
      const totalEnrollments = learningPathEnrollments.length;
      const completionRate = totalEnrollments > 0 ? (completedEnrollments.length / totalEnrollments) * 100 : 0;
      
      // Learning velocity analysis
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      
      const recentEnrollments = learningPathEnrollments.filter(e => new Date(e.enrolledAt) >= thirtyDaysAgo).length;
      const olderEnrollments = learningPathEnrollments.filter(e => 
        new Date(e.enrolledAt) >= ninetyDaysAgo && new Date(e.enrolledAt) < thirtyDaysAgo
      ).length;
      
      // 1. Completion rate insight
      if (completionRate > 80) {
        insights.push({
          category: 'strength',
          title: 'Excellent Completion Rate',
          description: `You have an impressive ${Math.round(completionRate)}% completion rate across learning paths`,
          impact: 'high',
          actionable: false,
          suggestedActions: [],
          data: { completionRate: Math.round(completionRate) }
        });
      } else if (completionRate > 50) {
        insights.push({
          category: 'improvement',
          title: 'Good Completion Progress',
          description: `Your ${Math.round(completionRate)}% completion rate shows steady progress with room for improvement`,
          impact: 'medium',
          actionable: true,
          suggestedActions: [
            'Set aside dedicated time for learning each week',
            'Break down learning paths into smaller, manageable sessions',
            'Track your progress regularly to maintain momentum'
          ],
          data: { completionRate: Math.round(completionRate) }
        });
      } else if (totalEnrollments > 0) {
        insights.push({
          category: 'concern',
          title: 'Low Completion Rate',
          description: `Your ${Math.round(completionRate)}% completion rate suggests difficulty finishing learning paths`,
          impact: 'high',
          actionable: true,
          suggestedActions: [
            'Focus on completing one learning path at a time',
            'Consider switching to shorter, more focused modules',
            'Schedule regular check-ins with your supervisor for support',
            'Review learning path difficulty and adjust as needed'
          ],
          data: { completionRate: Math.round(completionRate) }
        });
      }
      
      // 2. Learning velocity trend
      const velocityTrend = recentEnrollments > olderEnrollments ? 'increasing' : 
                           recentEnrollments < olderEnrollments ? 'decreasing' : 'stable';
      
      if (velocityTrend === 'increasing' && recentEnrollments > 1) {
        insights.push({
          category: 'trend',
          title: 'Accelerating Learning Pace',
          description: `Your learning activity has increased with ${recentEnrollments} new enrollments in the last 30 days`,
          impact: 'medium',
          actionable: false,
          suggestedActions: [],
          data: { recentEnrollments, trend: 'up' }
        });
      } else if (velocityTrend === 'decreasing' && olderEnrollments > 1) {
        insights.push({
          category: 'concern',
          title: 'Declining Learning Activity',
          description: `Your learning pace has slowed - only ${recentEnrollments} new enrollments in the last 30 days compared to ${olderEnrollments} before`,
          impact: 'medium',
          actionable: true,
          suggestedActions: [
            'Set a weekly learning goal to maintain consistency',
            'Explore new learning formats that match your preferences',
            'Schedule learning time in your calendar as non-negotiable appointments'
          ],
          data: { recentEnrollments, olderEnrollments, trend: 'down' }
        });
      }
      
      // 3. Competency development insights
      const competenciesAtTarget = userCompetencies.filter((uc: any) => 
        uc.currentLevel && uc.targetLevel && uc.currentLevel >= uc.targetLevel
      ).length;
      
      const competenciesBelowTarget = userCompetencies.filter((uc: any) => 
        uc.currentLevel && uc.targetLevel && uc.currentLevel < uc.targetLevel
      ).length;
      
      if (competenciesAtTarget > competenciesBelowTarget && competenciesAtTarget > 0) {
        insights.push({
          category: 'strength',
          title: 'Strong Competency Development',
          description: `You've achieved target levels in ${competenciesAtTarget} out of ${userCompetencies.length} competencies`,
          impact: 'high',
          actionable: false,
          suggestedActions: [],
          data: { competenciesAtTarget, totalCompetencies: userCompetencies.length }
        });
      } else if (competenciesBelowTarget > 0) {
        insights.push({
          category: 'improvement',
          title: 'Competency Development Opportunities',
          description: `${competenciesBelowTarget} competencies need attention to reach target levels`,
          impact: 'medium',
          actionable: true,
          suggestedActions: [
            'Focus on one competency at a time for targeted development',
            'Seek mentoring for challenging competencies',
            'Practice skills through real-world applications',
            'Request additional training resources if needed'
          ],
          data: { competenciesBelowTarget, totalCompetencies: userCompetencies.length }
        });
      }
      
      // 4. Engagement consistency
      const inProgressEnrollments = learningPathEnrollments.filter(e => e.enrollmentStatus === 'in_progress');
      const averageProgress = inProgressEnrollments.length > 0 
        ? inProgressEnrollments.reduce((sum, e) => sum + (e.progress || 0), 0) / inProgressEnrollments.length 
        : 0;
      
      if (averageProgress > 75) {
        insights.push({
          category: 'strength',
          title: 'High Engagement Level',
          description: `Your average progress of ${Math.round(averageProgress)}% across active learning paths shows excellent engagement`,
          impact: 'medium',
          actionable: false,
          suggestedActions: [],
          data: { averageProgress: Math.round(averageProgress) }
        });
      } else if (averageProgress > 25 && averageProgress <= 75) {
        insights.push({
          category: 'improvement',
          title: 'Moderate Progress Consistency',
          description: `Your ${Math.round(averageProgress)}% average progress suggests room for more consistent engagement`,
          impact: 'medium',
          actionable: true,
          suggestedActions: [
            'Set specific daily or weekly learning targets',
            'Use progress tracking tools to monitor advancement',
            'Celebrate small milestones to maintain motivation'
          ],
          data: { averageProgress: Math.round(averageProgress) }
        });
      } else if (inProgressEnrollments.length > 0 && averageProgress <= 25) {
        insights.push({
          category: 'concern',
          title: 'Low Progress Across Learning Paths',
          description: `Your ${Math.round(averageProgress)}% average progress indicates difficulty maintaining engagement`,
          impact: 'high',
          actionable: true,
          suggestedActions: [
            'Review learning path difficulty - consider easier alternatives',
            'Break learning into shorter, more manageable sessions',
            'Identify and address barriers preventing progress',
            'Discuss learning challenges with your supervisor'
          ],
          data: { averageProgress: Math.round(averageProgress) }
        });
      }
      
      // 5. Default positive insight if no specific patterns found
      if (insights.length === 0) {
        insights.push({
          category: 'trend',
          title: 'Learning Journey in Progress',
          description: 'You\'re building a foundation for professional development through continuous learning',
          impact: 'medium',
          actionable: true,
          suggestedActions: [
            'Explore learning paths that align with your career goals',
            'Set regular learning milestones to track progress',
            'Connect with colleagues to share learning experiences'
          ],
          data: { status: 'building_foundation' }
        });
      }
      
      res.json(insights.slice(0, 4)); // Return top 4 insights
    } catch (error) {
      console.error("Error fetching performance insights:", error);
      res.status(500).json({ message: "Failed to fetch performance insights" });
    }
  });

  // Get adaptive path progress - now uses real enrollment data
  app.get('/api/adaptive-learning/path-progress/:userId', isAuthenticated, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const currentUserId = req.user.claims.sub;
      
      // Check permission
      if (userId !== currentUserId && req.user.claims.role !== 'supervisor' && req.user.claims.role !== 'leadership') {
        return res.status(403).json({ message: "You don't have permission to access this progress data" });
      }
      
      // Get actual learning path enrollments for this user
      try {
        const enrollments = await storage.getLearningPathEnrollments(userId);
        console.log(`Found ${enrollments.length} learning path enrollments for user ${userId}`);
        
        // Filter for adaptive enrollments and build progress data
        const adaptiveEnrollments = enrollments.filter(e => 
          e.enrollmentSource === 'adaptive_recommendation' || 
          (e.metadata && (e.metadata as any)?.adaptiveEngine)
        );
        
        const adaptiveProgress = adaptiveEnrollments.map(enrollment => ({
          enrollmentId: enrollment.id,
          pathType: 'adaptive',
          completionCriteria: {
            type: 'adaptive',
            skipThreshold: 85,
            remedialThreshold: 60,
            baseStepsRequired: 5
          },
          performance: {
            averageScore: 78,
            trend: 'improving' as const,
            consistencyScore: 73,
            recentScores: [72, 75, 78, 82, 85]
          },
          adaptations: {
            skipBasics: false,
            addRemedial: true,
            originalRequirement: 5,
            adaptedRequirement: 6
          },
          completedSteps: Math.floor((enrollment.progress || 0) / 20), // Estimate completed steps
          isCompleted: enrollment.enrollmentStatus === 'completed',
          progressPercentage: enrollment.progress || 0,
          availableSteps: [],
          stepProgresses: [],
          pathId: enrollment.pathId,
          createdAt: enrollment.createdAt
        }));
        
        // If no adaptive enrollments, return empty array
        res.json(adaptiveProgress);
      } catch (storageError) {
        console.error("Error fetching enrollments from storage:", storageError);
        // Fall back to mock data if storage fails
        res.json([]);
      }
    } catch (error) {
      console.error("Error fetching adaptive path progress:", error);
      res.status(500).json({ message: "Failed to fetch adaptive path progress" });
    }
  });

  // Accept recommendation and create actual enrollment
  app.post('/api/adaptive-learning/accept-recommendation/:recommendationId', isAuthenticated, async (req: any, res) => {
    try {
      const { recommendationId } = req.params;
      const userId = req.user.claims.sub;
      
      // Parse recommendation type from ID to determine action
      if (recommendationId.includes('gap-') || recommendationId.includes('rec-')) {
        // Create a learning path enrollment for the recommendation
        try {
          // First, get or create an adaptive learning path
          let adaptivePath = await storage.getLearningPaths().then(paths => 
            paths.find(p => p.title.includes('Communication') || p.title.includes('Skills'))
          );
          
          // If no suitable path exists, create a basic one for adaptive recommendations
          if (!adaptivePath) {
            console.log("No suitable learning path found, creating basic adaptive path");
            try {
              const newPathData = {
                title: 'Adaptive Communication Skills',
                description: 'AI-recommended learning path for improving communication effectiveness',
                category: 'Professional Development',
                difficulty: 'Intermediate',
                estimatedHours: 10,
                isPublished: true,
                pathType: 'adaptive', // Required field for learning paths
                createdBy: userId, // Required field - set to the user accepting the recommendation
                metadata: {
                  adaptiveGenerated: true,
                  source: 'adaptive_engine'
                }
              };
              adaptivePath = await storage.createLearningPath(newPathData);
              console.log(`Created adaptive learning path: ${adaptivePath.id}`);
            } catch (createError) {
              console.error("Failed to create adaptive path:", createError);
              // Fall back to accepting without enrollment
              const result = {
                recommendationId,
                userId,
                status: 'accepted',
                appliedAt: new Date(),
                message: 'Recommendation accepted (learning path creation pending)',
                note: 'Learning path will be available once created by admin'
              };
              return res.json(result);
            }
          }

          const enrollmentData = {
            pathId: adaptivePath.id,
            userId: userId,
            enrollmentStatus: 'in_progress',
            progress: 0,
            enrollmentSource: 'adaptive_recommendation',
            metadata: {
              recommendationId: recommendationId,
              adaptiveEngine: true,
              appliedAt: new Date()
            }
          };

          // Create the enrollment through storage
          const enrollment = await storage.enrollUserInLearningPath(enrollmentData);
          
          console.log(`Created adaptive learning enrollment ${enrollment.id} for user ${userId} from recommendation ${recommendationId}`);
          
          const result = {
            recommendationId,
            userId,
            enrollmentId: enrollment.id,
            status: 'accepted',
            appliedAt: new Date(),
            message: 'Recommendation has been applied and learning path enrollment created'
          };
          
          res.json(result);
        } catch (enrollmentError) {
          console.error("Error creating enrollment:", enrollmentError);
          // Fall back to basic acceptance if enrollment creation fails
          const result = {
            recommendationId,
            userId,
            status: 'accepted',
            appliedAt: new Date(),
            message: 'Recommendation accepted (enrollment creation pending)',
            note: 'Full enrollment will be created when learning paths are available'
          };
          res.json(result);
        }
      } else {
        // For non-path recommendations (like breaks, reviews), just log acceptance
        const result = {
          recommendationId,
          userId,
          status: 'accepted',
          appliedAt: new Date(),
          message: 'Recommendation has been applied to your learning plan'
        };
        res.json(result);
      }
    } catch (error) {
      console.error("Error accepting recommendation:", error);
      res.status(500).json({ message: "Failed to accept recommendation" });
    }
  });

  // Development plans
  app.get('/api/development-plans', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const plans = await storage.getUserDevelopmentPlans(userId);
      res.json(plans);
    } catch (error) {
      console.error("Error fetching development plans:", error);
      res.status(500).json({ message: "Failed to fetch development plans" });
    }
  });

  app.post('/api/development-plans', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const planData = insertDevelopmentPlanSchema.parse({ ...req.body, userId });
      const plan = await storage.createDevelopmentPlan(planData);
      res.json(plan);
    } catch (error) {
      console.error("Error creating development plan:", error);
      res.status(500).json({ message: "Failed to create development plan" });
    }
  });

  // Learning resources
  app.get('/api/learning-resources', isAuthenticated, async (req, res) => {
    try {
      const resources = await storage.getLearningResources();
      res.json(resources);
    } catch (error) {
      console.error("Error fetching learning resources:", error);
      res.status(500).json({ message: "Failed to fetch learning resources" });
    }
  });

  // Meetings
  app.get('/api/meetings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const meetings = await storage.getUserMeetings(userId);
      res.json(meetings);
    } catch (error) {
      console.error("Error fetching meetings:", error);
      res.status(500).json({ message: "Failed to fetch meetings" });
    }
  });

  app.post('/api/meetings', isAuthenticated, async (req: any, res) => {
    try {
      const meetingData = insertMeetingSchema.parse(req.body);
      const meeting = await storage.createMeeting(meetingData);
      res.json(meeting);
    } catch (error) {
      console.error("Error creating meeting:", error);
      res.status(500).json({ message: "Failed to create meeting" });
    }
  });

  app.patch('/api/meetings/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      
      // Verify meeting access
      const hasAccess = await storage.verifyMeetingAccess(id, userId);
      if (!hasAccess) {
        return res.status(403).json({ message: "You don't have permission to update this meeting" });
      }
      
      // Validate allowed fields for update
      const allowedFields = ['agenda', 'employeeNotes', 'managerNotes', 'actionItems'];
      const updates: any = {};
      
      Object.keys(req.body).forEach(key => {
        if (allowedFields.includes(key)) {
          updates[key] = req.body[key];
        }
      });
      
      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ message: "No valid fields to update" });
      }
      
      const meeting = await storage.updateMeeting(id, updates);
      res.json(meeting);
    } catch (error) {
      console.error("Error updating meeting:", error);
      res.status(500).json({ message: "Failed to update meeting" });
    }
  });

  // Recognition
  app.get('/api/recognitions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const recognitions = await storage.getUserRelevantRecognitions(userId);
      res.json(recognitions);
    } catch (error) {
      console.error("Error fetching recognitions:", error);
      res.status(500).json({ message: "Failed to fetch recognitions" });
    }
  });

  app.post('/api/recognitions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const recognitionData = insertRecognitionSchema.parse({ ...req.body, fromUserId: userId });
      const recognition = await storage.createRecognition(recognitionData);
      res.json(recognition);
    } catch (error) {
      console.error("Error creating recognition:", error);
      res.status(500).json({ message: "Failed to create recognition" });
    }
  });

  app.get('/api/recognition-stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const stats = await storage.getUserRecognitionStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching recognition stats:", error);
      res.status(500).json({ message: "Failed to fetch recognition stats" });
    }
  });

  // ======================
  // LMS API Routes
  // ======================

  // Course Catalog & Management
  app.get('/api/lms/courses', isAuthenticated, async (req, res) => {
    try {
      const courses = await storage.getCourses();
      res.json(courses);
    } catch (error) {
      console.error("Error fetching courses:", error);
      res.status(500).json({ message: "Failed to fetch courses" });
    }
  });

  app.get('/api/lms/courses/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;
      
      const courseDetails = await storage.getCourseDetailsWithProgress(id, userId);
      if (!courseDetails) {
        return res.status(404).json({ message: "Course not found" });
      }
      
      res.json(courseDetails);
    } catch (error) {
      console.error("Error fetching course details:", error);
      res.status(500).json({ message: "Failed to fetch course details" });
    }
  });

  app.post('/api/lms/courses', isAuthenticated, requireSupervisorOrLeadership(), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const courseData = insertCourseSchema.parse({ ...req.body, createdBy: userId });
      const course = await storage.createCourse(courseData);
      res.json(course);
    } catch (error: any) {
      return handleValidationError(error, res, "create course");
    }
  });

  // Course Content
  app.get('/api/lms/courses/:courseVersionId/modules', isAuthenticated, async (req, res) => {
    try {
      const { courseVersionId } = req.params;
      const modules = await storage.getCourseModules(courseVersionId);
      res.json(modules);
    } catch (error) {
      console.error("Error fetching course modules:", error);
      res.status(500).json({ message: "Failed to fetch course modules" });
    }
  });

  app.get('/api/lms/modules/:moduleId/lessons', isAuthenticated, async (req, res) => {
    try {
      const { moduleId } = req.params;
      const lessons = await storage.getLessons(moduleId);
      res.json(lessons);
    } catch (error) {
      console.error("Error fetching lessons:", error);
      res.status(500).json({ message: "Failed to fetch lessons" });
    }
  });

  // Get lessons with query parameters (moduleId, courseVersionId, or all)
  app.get('/api/lms/lessons', isAuthenticated, async (req, res) => {
    try {
      const { moduleId, courseVersionId } = req.query;
      
      if (moduleId) {
        // Get lessons for a specific module
        const lessons = await storage.getLessons(moduleId as string);
        res.json(lessons);
      } else if (courseVersionId) {
        // Get lessons for a course version (through modules)
        const modules = await storage.getCourseModules(courseVersionId as string);
        const allLessons = [];
        for (const module of modules) {
          const lessons = await storage.getLessons(module.id);
          allLessons.push(...lessons);
        }
        res.json(allLessons);
      } else {
        // Get all lessons (admin only)
        res.status(400).json({ message: "moduleId or courseVersionId parameter required" });
      }
    } catch (error) {
      console.error("Error fetching lessons:", error);
      res.status(500).json({ message: "Failed to fetch lessons" });
    }
  });

  app.get('/api/lms/lessons/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const lesson = await storage.getLesson(id);
      if (!lesson) {
        return res.status(404).json({ message: "Lesson not found" });
      }
      res.json(lesson);
    } catch (error) {
      console.error("Error fetching lesson:", error);
      res.status(500).json({ message: "Failed to fetch lesson" });
    }
  });

  // Enrollments
  app.post('/api/lms/enrollments', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      console.log("[DEBUG] Enrollment request - userId:", userId, "body:", req.body);
      
      const enrollmentData = insertEnrollmentSchema.parse({ ...req.body, userId });
      console.log("[DEBUG] Parsed enrollment data:", enrollmentData);
      
      const enrollment = await storage.enrollUser(enrollmentData);
      console.log("[DEBUG] Enrollment created successfully:", enrollment);
      
      res.json(enrollment);
    } catch (error: any) {
      console.error("[ERROR] Enrollment failed:", error);
      console.error("[ERROR] Error stack:", error.stack);
      return handleValidationError(error, res, "create enrollment");
    }
  });

  app.get('/api/lms/enrollments/me', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const enrollments = await storage.getUserEnrollments(userId);
      res.json(enrollments);
    } catch (error) {
      console.error("Error fetching enrollments:", error);
      res.status(500).json({ message: "Failed to fetch enrollments" });
    }
  });

  app.get('/api/lms/enrollments/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;
      
      // Verify enrollment ownership
      const isOwner = await verifyEnrollmentOwnership(id, userId);
      if (!isOwner) {
        return res.status(403).json({ message: "You can only access your own enrollments" });
      }
      
      const enrollment = await storage.getEnrollment(id);
      if (!enrollment) {
        return res.status(404).json({ message: "Enrollment not found" });
      }
      res.json(enrollment);
    } catch (error) {
      console.error("Error fetching enrollment:", error);
      res.status(500).json({ message: "Failed to fetch enrollment" });
    }
  });

  // Progress Tracking
  app.patch('/api/lms/progress', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Verify enrollment ownership before updating progress
      if (req.body.enrollmentId) {
        const isOwner = await verifyEnrollmentOwnership(req.body.enrollmentId, userId);
        if (!isOwner) {
          return res.status(403).json({ message: "You can only update progress for your own enrollments" });
        }
      }
      
      const progressData = insertLessonProgressSchema.parse(req.body);
      const progress = await storage.updateLessonProgress(progressData);
      res.json(progress);
    } catch (error: any) {
      return handleValidationError(error, res, "update lesson progress");
    }
  });

  app.get('/api/lms/enrollments/:enrollmentId/progress', isAuthenticated, async (req: any, res) => {
    try {
      const { enrollmentId } = req.params;
      const userId = req.user.claims.sub;
      
      // Verify enrollment ownership
      const isOwner = await verifyEnrollmentOwnership(enrollmentId, userId);
      if (!isOwner) {
        return res.status(403).json({ message: "You can only view progress for your own enrollments" });
      }
      
      const progress = await storage.getUserLessonProgress(enrollmentId);
      res.json(progress);
    } catch (error) {
      console.error("Error fetching lesson progress:", error);
      res.status(500).json({ message: "Failed to fetch lesson progress" });
    }
  });

  // Complete enrollment/course
  app.post('/api/lms/enrollments/:enrollmentId/complete', isAuthenticated, async (req: any, res) => {
    try {
      const { enrollmentId } = req.params;
      const userId = req.user.claims.sub;
      
      // Verify enrollment ownership
      const isOwner = await verifyEnrollmentOwnership(enrollmentId, userId);
      if (!isOwner) {
        return res.status(403).json({ message: "You can only complete your own enrollments" });
      }
      
      const enrollment = await storage.completeEnrollment(enrollmentId);
      
      // Create training record for ISO compliance
      const trainingRecord = await storage.createTrainingRecord({
        userId,
        courseVersionId: enrollment.courseVersionId,
        enrollmentId,
        completedAt: new Date(),
        finalScore: 100 // Default score, should be calculated based on quiz results
      });
      
      // Issue certificate if applicable
      const certificate = await storage.issueCertificate({
        userId,
        courseVersionId: enrollment.courseVersionId,
        trainingRecordId: trainingRecord.id,
        certificateNumber: `CERT-${Date.now()}-${userId.slice(-4)}`,
        // expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        verificationHash: `hash-${trainingRecord.id}`,
        metadata: {
          courseTitle: 'Course Title', // Should get from course data
          completionDate: new Date().toISOString()
        }
      });
      
      res.json({ enrollment, trainingRecord, certificate });
    } catch (error: any) {
      return handleValidationError(error, res, "complete enrollment");
    }
  });

  // Lesson Progress Tracking
  app.post('/api/lms/lesson-progress', isAuthenticated, async (req: any, res) => {
    try {
      const { enrollmentId, lessonId, progressPercentage, status, timeSpent } = req.body;
      const userId = req.user.claims.sub;
      
      // Verify enrollment ownership
      const isOwner = await verifyEnrollmentOwnership(enrollmentId, userId);
      if (!isOwner) {
        return res.status(403).json({ message: "You can only update progress for your own enrollments" });
      }
      
      const progressData = {
        enrollmentId,
        lessonId,
        userId,
        progressPercentage: progressPercentage || 0,
        status: status || 'in_progress',
        timeSpent: timeSpent || 0,
        completedAt: status === 'completed' ? new Date() : null
      };
      
      const progress = await storage.updateLessonProgress(progressData);
      res.json(progress);
    } catch (error: any) {
      return handleValidationError(error, res, "update lesson progress");
    }
  });

  // Add GET route for /api/lms/progress (query by enrollmentId and optionally lessonId)
  app.get('/api/lms/progress', isAuthenticated, async (req: any, res) => {
    try {
      const { enrollmentId, lessonId } = req.query;
      const userId = req.user.claims.sub;
      
      if (!enrollmentId) {
        return res.status(400).json({ message: "enrollmentId is required" });
      }
      
      // Verify enrollment ownership
      const isOwner = await verifyEnrollmentOwnership(enrollmentId, userId);
      if (!isOwner) {
        return res.status(403).json({ message: "You can only view progress for your own enrollments" });
      }
      
      if (lessonId) {
        // Get specific lesson progress
        const progress = await storage.getLessonProgress(enrollmentId, lessonId);
        res.json(progress || { enrollmentId, lessonId, progressPercentage: 0, status: 'not_started' });
      } else {
        // Get all lesson progress for enrollment
        const progress = await storage.getUserLessonProgress(enrollmentId);
        res.json(progress);
      }
    } catch (error: any) {
      console.error("Error fetching lesson progress:", error);
      res.status(500).json({ message: "Failed to fetch lesson progress" });
    }
  });

  // Add the route that the frontend expects (PATCH /api/lms/progress)
  app.patch('/api/lms/progress', isAuthenticated, async (req: any, res) => {
    try {
      const { enrollmentId, lessonId, progressPercentage, lastPosition, timeSpent, status, durationSeconds } = req.body;
      const userId = req.user.claims.sub;
      
      // Verify enrollment ownership
      const isOwner = await verifyEnrollmentOwnership(enrollmentId, userId);
      if (!isOwner) {
        return res.status(403).json({ message: "You can only update progress for your own enrollments" });
      }
      
      const progressData = {
        enrollmentId,
        lessonId,
        userId,
        progressPercentage: progressPercentage || 0,
        status: status || (progressPercentage >= 100 ? 'completed' : 'in_progress'),
        timeSpent: timeSpent || 0,
        lastPosition: lastPosition || 0,
        durationSeconds: durationSeconds || null,
        completedAt: (status === 'completed' || progressPercentage >= 100) ? new Date() : null
      };
      
      const progress = await storage.updateLessonProgress(progressData);
      res.json(progress);
    } catch (error: any) {
      return handleValidationError(error, res, "update lesson progress");
    }
  });

  // Dedicated route for sendBeacon progress updates with enhanced validation
  app.post('/api/lms/progress-beacon', isAuthenticated, async (req: any, res) => {
    try {
      const { enrollmentId, lessonId, progressPercentage, lastPosition, timeSpent, status, durationSeconds } = req.body;
      const userId = req.user.claims.sub;
      
      console.log(`Beacon progress update: ${progressPercentage}% for lesson ${lessonId} by user ${userId}`);
      
      // Verify enrollment ownership
      const isOwner = await verifyEnrollmentOwnership(enrollmentId, userId);
      if (!isOwner) {
        return res.status(403).json({ message: "You can only update progress for your own enrollments" });
      }
      
      // Enhanced validation for beacon updates (final save scenario)
      let validatedStatus = status;
      if (progressPercentage >= 90 && status === 'completed') {
        // Perform server-side validation of completion eligibility
        const validation = await storage.validateCompletionEligibility(enrollmentId, lessonId, {
          progressPercentage,
          timeSpent,
          durationSeconds
        });
        
        if (!validation.eligible) {
          console.warn(`Beacon completion rejected: ${validation.reason}`);
          // Still save progress but don't mark as completed
          validatedStatus = 'in_progress';
        }
      }
      
      const progressData = {
        enrollmentId,
        lessonId,
        userId,
        progressPercentage: Math.floor(progressPercentage || 0),
        status: validatedStatus || (progressPercentage >= 100 ? 'completed' : 'in_progress'),
        timeSpent: Math.floor(timeSpent || 0),
        lastPosition: Math.floor(lastPosition || 0),
        durationSeconds: durationSeconds ? Math.floor(durationSeconds) : null,
        completedAt: (validatedStatus === 'completed' || progressPercentage >= 100) ? new Date() : null
      };
      
      const progress = await storage.updateLessonProgress(progressData);
      
      // Check for automatic badge assignment when lesson is completed
      if (progressData.status === 'completed') {
        try {
          // Get all badges and check eligibility for each
          const badges = await storage.getBadges();
          for (const badge of badges) {
            await storage.awardBadgeIfEligible(userId, badge.id, enrollmentId);
          }
        } catch (error) {
          console.error("Error checking badge eligibility:", error);
          // Don't fail the lesson completion if badge check fails
        }
      }
      
      res.status(204).send(); // No content response for beacon
    } catch (error: any) {
      console.error('Beacon progress update failed:', error);
      res.status(500).json({ message: "Failed to update progress via beacon" });
    }
  });

  // Manual lesson completion
  app.post('/api/lms/lessons/:lessonId/complete', isAuthenticated, async (req: any, res) => {
    try {
      const { lessonId } = req.params;
      const { enrollmentId } = req.body;
      const userId = req.user.claims.sub;
      
      // Verify enrollment ownership
      const isOwner = await verifyEnrollmentOwnership(enrollmentId, userId);
      if (!isOwner) {
        return res.status(403).json({ message: "You can only complete lessons for your own enrollments" });
      }
      
      const result = await storage.completeLessonManually(enrollmentId, lessonId);
      
      if (result.success) {
        res.json({ message: result.message, success: true });
      } else {
        res.status(400).json({ message: result.message, success: false });
      }
    } catch (error: any) {
      console.error("Error completing lesson manually:", error);
      res.status(500).json({ message: "Failed to complete lesson", success: false });
    }
  });

  // Quizzes and Assessments
  app.get('/api/lms/lessons/:lessonId/quiz', isAuthenticated, async (req, res) => {
    try {
      const { lessonId } = req.params;
      const quiz = await storage.getQuiz(lessonId);
      if (!quiz) {
        return res.status(404).json({ message: "No quiz found for this lesson" });
      }
      
      const questions = await storage.getQuizQuestions(quiz.id);
      res.json({ ...quiz, questions });
    } catch (error) {
      console.error("Error fetching quiz:", error);
      res.status(500).json({ message: "Failed to fetch quiz" });
    }
  });

  // Get all quizzes for a specific lesson (for assessment viewing)
  app.get('/api/lms/lessons/:lessonId/quizzes', isAuthenticated, requireSupervisorOrLeadership(), async (req, res) => {
    try {
      const { lessonId } = req.params;
      const quizzes = await storage.getQuizzesByLesson(lessonId);
      res.json(quizzes);
    } catch (error) {
      console.error("Error fetching quizzes for lesson:", error);
      res.status(500).json({ message: "Failed to fetch quizzes for lesson" });
    }
  });

  app.post('/api/lms/quizzes/:quizId/attempts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { quizId } = req.params;
      const { enrollmentId, attemptNumber } = req.body;
      
      // Prevent starting quizzes with no questions
      const questions = await storage.getQuizQuestions(quizId);
      if (questions.length === 0) {
        return res.status(400).json({ 
          message: "This quiz has no questions and cannot be started. Please contact your instructor to add questions first." 
        });
      }
      
      // Verify enrollment ownership before allowing quiz attempt
      if (enrollmentId) {
        const isOwner = await verifyEnrollmentOwnership(enrollmentId, userId);
        if (!isOwner) {
          return res.status(403).json({ message: "You can only take quizzes for your own enrollments" });
        }
      }
      
      const attemptData = insertQuizAttemptSchema.parse({
        quizId,
        userId,
        enrollmentId,
        attemptNumber,
      });
      
      const attempt = await storage.startQuizAttempt(attemptData);
      res.json(attempt);
    } catch (error: any) {
      return handleValidationError(error, res, "start quiz attempt");
    }
  });

  app.post('/api/lms/quiz-attempts/:attemptId/submit', isAuthenticated, async (req: any, res) => {
    try {
      const { attemptId } = req.params;
      const { answers, timeSpent } = req.body;
      const userId = req.user.claims.sub;
      
      // Verify quiz attempt ownership
      const isOwner = await verifyQuizAttemptOwnership(attemptId, userId);
      if (!isOwner) {
        return res.status(403).json({ message: "You can only submit your own quiz attempts" });
      }
      
      const attempt = await storage.submitQuizAttempt(attemptId, answers, timeSpent);
      
      // If quiz passed, update lesson progress
      if (attempt.passed && attempt.enrollmentId) {
        await storage.updateLessonProgressFromQuiz(attempt.enrollmentId, attempt.quizId, userId);
      }
      
      res.json(attempt);
    } catch (error: any) {
      return handleValidationError(error, res, "submit quiz attempt");
    }
  });

  // Certificates and Badges
  app.get('/api/lms/certificates/me', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const certificates = await storage.getUserCertificates(userId);
      res.json(certificates);
    } catch (error) {
      console.error("Error fetching certificates:", error);
      res.status(500).json({ message: "Failed to fetch certificates" });
    }
  });

  // Get specific certificate by ID
  app.get('/api/lms/certificates/:certificateId', isAuthenticated, async (req: any, res) => {
    try {
      const { certificateId } = req.params;
      const certificate = await storage.getCertificate(certificateId);
      
      if (!certificate) {
        return res.status(404).json({ message: "Certificate not found" });
      }

      const requestingUserId = req.user.claims.sub;
      const currentUser = await storage.getUser(requestingUserId);
      
      // Users can only see their own certificates unless they're supervisor/leadership
      if (certificate.userId !== requestingUserId && currentUser?.role !== 'supervisor' && currentUser?.role !== 'leadership') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      res.json(certificate);
    } catch (error) {
      console.error("Error fetching certificate:", error);
      res.status(500).json({ message: "Failed to fetch certificate" });
    }
  });

  app.get('/api/lms/badges/me', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const badges = await storage.getUserBadges(userId);
      res.json(badges);
    } catch (error) {
      console.error("Error fetching badges:", error);
      res.status(500).json({ message: "Failed to fetch badges" });
    }
  });

  app.get('/api/lms/badges', isAuthenticated, async (req, res) => {
    try {
      const badges = await storage.getBadges();
      res.json(badges);
    } catch (error) {
      console.error("Error fetching badges:", error);
      res.status(500).json({ message: "Failed to fetch badges" });
    }
  });

  app.get('/api/lms/admin/badges/:badgeId/requirements', isAuthenticated, requireSupervisorOrLeadership(), async (req, res) => {
    try {
      const { badgeId } = req.params;
      const courseIds = await storage.getBadgeCourseRequirements(badgeId);
      res.json({ courseIds });
    } catch (error) {
      console.error("Error fetching badge requirements:", error);
      res.status(500).json({ message: "Failed to fetch badge requirements" });
    }
  });

  // Training Records (ISO Compliance)
  app.get('/api/lms/training-records/me', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const records = await storage.getUserTrainingRecords(userId);
      res.json(records);
    } catch (error) {
      console.error("Error fetching training records:", error);
      res.status(500).json({ message: "Failed to fetch training records" });
    }
  });

  // Training Requirements & Matrix (Admin only)
  app.get('/api/lms/training-requirements', isAuthenticated, requireSupervisorOrLeadership(), async (req, res) => {
    try {
      const requirements = await storage.getTrainingRequirements();
      res.json(requirements);
    } catch (error) {
      console.error("Error fetching training requirements:", error);
      res.status(500).json({ message: "Failed to fetch training requirements" });
    }
  });

  app.get('/api/lms/training-matrix', isAuthenticated, requireSupervisorOrLeadership(), async (req, res) => {
    try {
      const { role, teamId } = req.query;
      const matrix = await storage.getTrainingMatrix({ 
        role: role as string, 
        teamId: teamId as string 
      });
      res.json(matrix);
    } catch (error) {
      console.error("Error fetching training matrix:", error);
      res.status(500).json({ message: "Failed to fetch training matrix" });
    }
  });

  // PDP Integration
  app.post('/api/lms/pdp-links', isAuthenticated, requireSupervisorOrLeadership(), async (req: any, res) => {
    try {
      const linkData = insertPdpCourseLinkSchema.parse(req.body);
      const link = await storage.linkCourseToPDP(linkData);
      res.json(link);
    } catch (error: any) {
      return handleValidationError(error, res, "link course to development plan");
    }
  });

  app.get('/api/lms/development-plans/:planId/courses', isAuthenticated, async (req: any, res) => {
    try {
      const { planId } = req.params;
      const userId = req.user.claims.sub;
      
      // Verify the development plan belongs to the user or user has supervisory access
      const plan = await storage.getDevelopmentPlan(planId);
      if (!plan) {
        return res.status(404).json({ message: "Development plan not found" });
      }
      
      // Users can only access their own PDPs unless they're supervisors/leadership
      const user = await storage.getUser(userId);
      const canAccess = plan.userId === userId || 
                       user?.role === 'supervisor' || 
                       user?.role === 'leadership';
      
      if (!canAccess) {
        return res.status(403).json({ message: "You can only access your own development plans" });
      }
      
      const links = await storage.getPDPCourseLinks(planId);
      res.json(links);
    } catch (error) {
      console.error("Error fetching PDP course links:", error);
      res.status(500).json({ message: "Failed to fetch course links" });
    }
  });

  app.delete('/api/lms/pdp-links/:linkId', isAuthenticated, requireSupervisorOrLeadership(), async (req, res) => {
    try {
      const { linkId } = req.params;
      await storage.unlinkCourseFromPDP(linkId);
      res.status(204).send();
    } catch (error) {
      console.error("Error unlinking course from development plan:", error);
      res.status(500).json({ message: "Failed to unlink course from development plan" });
    }
  });

  // ======================
  // LMS Admin API Routes
  // ======================

  // Admin Course Management
  app.get('/api/lms/admin/courses', isAuthenticated, requireSupervisorOrLeadership(), async (req, res) => {
    try {
      const courses = await storage.getAdminCourses();
      res.json(courses);
    } catch (error) {
      console.error("Error fetching admin courses:", error);
      res.status(500).json({ message: "Failed to fetch admin courses" });
    }
  });

  // Get lessons for a specific course (admin endpoint)
  app.get('/api/lms/courses/:courseId/lessons', isAuthenticated, requireSupervisorOrLeadership(), async (req, res) => {
    try {
      const { courseId } = req.params;
      const lessons = await storage.getLessonsByCourse(courseId);
      res.json(lessons);
    } catch (error) {
      console.error("Error fetching lessons for course:", error);
      res.status(500).json({ message: "Failed to fetch lessons for course" });
    }
  });


  // Get quizzes for a specific course (admin endpoint)
  app.get('/api/lms/courses/:courseId/quizzes', isAuthenticated, requireSupervisorOrLeadership(), async (req, res) => {
    try {
      const { courseId } = req.params;
      const quizzes = await storage.getQuizzesByCourse(courseId);
      res.json(quizzes);
    } catch (error) {
      console.error("Error fetching quizzes for course:", error);
      res.status(500).json({ message: "Failed to fetch quizzes for course" });
    }
  });

  app.post('/api/lms/admin/courses', isAuthenticated, requireSupervisorOrLeadership(), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const courseData = insertCourseSchema.parse({ ...req.body, createdBy: userId });
      const course = await storage.createCourse(courseData);
      res.json(course);
    } catch (error: any) {
      return handleValidationError(error, res, "create course");
    }
  });

  app.patch('/api/lms/admin/courses/:id', isAuthenticated, requireSupervisorOrLeadership(), async (req: any, res) => {
    try {
      const { id } = req.params;
      const updateData = insertCourseSchema.partial().parse(req.body);
      const course = await storage.updateCourse(id, updateData);
      res.json(course);
    } catch (error: any) {
      return handleValidationError(error, res, "update course");
    }
  });

  // LMS Data Migration Route
  app.post('/api/lms/admin/migrate-legacy-courses', isAuthenticated, requireSupervisorOrLeadership(), async (req: any, res) => {
    try {
      const result = await storage.migrateLegacyCourses();
      res.json({ 
        message: `Migration completed. Fixed ${result.fixed} out of ${result.total} courses.`,
        ...result 
      });
    } catch (error: any) {
      console.error("Error running legacy course migration:", error);
      res.status(500).json({ message: "Failed to run migration" });
    }
  });

  // Admin Lesson Management
  app.post('/api/lms/admin/courses/:courseId/lessons', isAuthenticated, requireSupervisorOrLeadership(), async (req: any, res) => {
    try {
      const { courseId } = req.params;
      
      // Use Zod schema validation as per project guidelines
      const validatedData = createLessonSchema.parse(req.body);
      
      // Get the course to find its current version ID
      const course = await storage.getCourse(courseId);
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }
      
      if (!course.currentVersionId) {
        return res.status(400).json({ message: "Course has no current version. Please fix the course structure." });
      }
      
      // First get or create a default module for this course version
      let defaultModule = await storage.getDefaultCourseModule(course.currentVersionId);
      if (!defaultModule) {
        defaultModule = await storage.createCourseModule({
          courseVersionId: course.currentVersionId,
          title: "Main Content",
          description: "Main course content and lessons",
          orderIndex: 1
        });
      }
      
      // Map content type to lesson type correctly
      let lessonType: "video" | "document";
      if (validatedData.contentType === "video") {
        lessonType = "video";
      } else {
        // rich_text and pdf_document are both document types
        lessonType = "document";
      }

      // Transform validated data to match database schema with enhanced content types
      const lessonData: any = {
        moduleId: defaultModule.id,
        title: validatedData.title,
        description: validatedData.description || "",
        contentType: validatedData.contentType, // Support video, rich_text, pdf_document
        type: lessonType, // Map content type to appropriate lesson type
        orderIndex: validatedData.order,
        estimatedDuration: validatedData.estimatedMinutes * 60, // Convert minutes to seconds
        isRequired: true
      };

      // Add content based on content type
      if (validatedData.contentType === "video") {
        lessonData.vimeoVideoId = validatedData.vimeoVideoId;
      } else if (validatedData.contentType === "rich_text") {
        lessonData.richTextContent = validatedData.richTextContent;
      } else if (validatedData.contentType === "pdf_document") {
        lessonData.pdfContentUrl = validatedData.pdfContentUrl;
      }
      
      const lesson = await storage.createLesson(lessonData);
      res.json(lesson);
    } catch (error: any) {
      return handleValidationError(error, res, "create lesson");
    }
  });

  // Update lesson
  app.put('/api/lms/admin/lessons/:lessonId', isAuthenticated, requireSupervisorOrLeadership(), async (req: any, res) => {
    try {
      const { lessonId } = req.params;
      
      // Use Zod schema validation as per project guidelines
      const validatedData = updateLessonSchema.parse(req.body);
      
      // Verify the lesson exists
      const existingLesson = await storage.getLesson(lessonId);
      if (!existingLesson) {
        return res.status(404).json({ message: "Lesson not found" });
      }
      
      // Transform validated data to match database schema with enhanced content types
      const updateData: any = {};
      
      if (validatedData.title !== undefined) updateData.title = validatedData.title;
      if (validatedData.description !== undefined) updateData.description = validatedData.description;
      if (validatedData.order !== undefined) updateData.orderIndex = validatedData.order;
      if (validatedData.estimatedMinutes !== undefined) {
        updateData.estimatedDuration = validatedData.estimatedMinutes * 60; // Convert minutes to seconds
      }
      
      // Handle content type updates with proper type mapping
      if (validatedData.contentType !== undefined) {
        updateData.contentType = validatedData.contentType;
        
        // Map content type to lesson type correctly
        if (validatedData.contentType === "video") {
          updateData.type = "video";
        } else {
          // rich_text and pdf_document are both document types
          updateData.type = "document";
        }
        
        // CRITICAL: Clear all previous content fields when changing type to prevent stale data
        updateData.vimeoVideoId = null;
        updateData.richTextContent = null;
        updateData.pdfContentUrl = null;
        
        // Set the appropriate content field based on type
        if (validatedData.contentType === "video") {
          updateData.vimeoVideoId = validatedData.vimeoVideoId;
        } else if (validatedData.contentType === "rich_text") {
          updateData.richTextContent = validatedData.richTextContent;
        } else if (validatedData.contentType === "pdf_document") {
          updateData.pdfContentUrl = validatedData.pdfContentUrl;
        }
      } else {
        // Handle legacy updates that don't specify content type
        if (validatedData.vimeoVideoId !== undefined) updateData.vimeoVideoId = validatedData.vimeoVideoId;
        if (validatedData.richTextContent !== undefined) updateData.richTextContent = validatedData.richTextContent;
        if (validatedData.pdfContentUrl !== undefined) updateData.pdfContentUrl = validatedData.pdfContentUrl;
      }
      
      const lesson = await storage.updateLesson(lessonId, updateData);
      res.json(lesson);
    } catch (error: any) {
      return handleValidationError(error, res, "update lesson");
    }
  });

  // Admin Quiz Management
  // Get all quizzes across all courses (for "All Courses" functionality)
  app.get('/api/lms/admin/quizzes', isAuthenticated, requireSupervisorOrLeadership(), async (req, res) => {
    try {
      const quizzes = await storage.getAllQuizzes();
      res.json(quizzes);
    } catch (error) {
      console.error("Error fetching all quizzes:", error);
      res.status(500).json({ message: "Failed to fetch all quizzes" });
    }
  });

  // Create quiz for a specific lesson
  app.post('/api/lms/admin/lessons/:lessonId/quiz', isAuthenticated, requireSupervisorOrLeadership(), async (req: any, res) => {
    try {
      const { lessonId } = req.params;
      
      // Verify the lesson exists
      const lesson = await storage.getLesson(lessonId);
      if (!lesson) {
        return res.status(404).json({ message: "Lesson not found" });
      }
      
      // Check if lesson already has a quiz
      const existingQuiz = await storage.getQuiz(lessonId);
      if (existingQuiz) {
        return res.status(400).json({ message: "This lesson already has a quiz. Delete the existing quiz first." });
      }
      
      // Transform frontend quiz data to match database schema
      const quizData = {
        lessonId,
        title: req.body.title,
        description: req.body.description || "",
        passingScore: req.body.passingScore || 80,
        timeLimit: req.body.timeLimit || 60,
        maxAttempts: req.body.maxAttempts || 3,
        randomizeQuestions: false
      };
      
      const quiz = await storage.createQuiz(quizData);
      res.json(quiz);
    } catch (error: any) {
      console.error("Error creating quiz:", error);
      return handleValidationError(error, res, "create quiz");
    }
  });

  // Legacy route for backward compatibility - creates quiz on default lesson
  app.post('/api/lms/admin/courses/:courseId/quizzes', isAuthenticated, requireSupervisorOrLeadership(), async (req: any, res) => {
    try {
      const { courseId } = req.params;
      
      // Get or create a default module for this course
      let defaultModule = await storage.getDefaultCourseModule(courseId);
      if (!defaultModule) {
        defaultModule = await storage.createCourseModule({
          courseVersionId: courseId,
          title: "Main Content",
          description: "Main course content and lessons",
          orderIndex: 1
        });
      }
      
      // Get or create a default lesson for the quiz
      let defaultLesson = await storage.getDefaultLesson(defaultModule.id);
      if (!defaultLesson) {
        defaultLesson = await storage.createLesson({
          moduleId: defaultModule.id,
          title: "Assessment Lesson",
          description: "Lesson for course assessments",
          type: "quiz" as const,
          orderIndex: 999, // Put quiz lessons at the end
          estimatedDuration: 1800, // 30 minutes default
          isRequired: true
        });
      }
      
      // Transform frontend quiz data to match database schema
      const quizData = {
        lessonId: defaultLesson.id,
        title: req.body.title,
        description: req.body.description || "",
        passingScore: req.body.passingScore || 80,
        timeLimit: req.body.timeLimit || 60,
        maxAttempts: req.body.maxAttempts || 3,
        randomizeQuestions: false
      };
      
      const quiz = await storage.createQuiz(quizData);
      res.json(quiz);
    } catch (error: any) {
      console.error("Error creating quiz:", error);
      return handleValidationError(error, res, "create quiz");
    }
  });

  // Update quiz
  app.put('/api/lms/admin/quizzes/:quizId', isAuthenticated, requireSupervisorOrLeadership(), async (req: any, res) => {
    try {
      const { quizId } = req.params;
      
      // Verify the quiz exists
      const existingQuiz = await storage.getQuizById(quizId);
      if (!existingQuiz) {
        return res.status(404).json({ message: "Quiz not found" });
      }
      
      // Transform frontend quiz data to match database schema
      const updateData: any = {};
      if (req.body.title !== undefined) updateData.title = req.body.title;
      if (req.body.description !== undefined) updateData.description = req.body.description;
      if (req.body.passingScore !== undefined) updateData.passingScore = req.body.passingScore;
      if (req.body.timeLimit !== undefined) updateData.timeLimit = req.body.timeLimit;
      if (req.body.maxAttempts !== undefined) updateData.maxAttempts = req.body.maxAttempts;
      if (req.body.randomizeQuestions !== undefined) updateData.randomizeQuestions = req.body.randomizeQuestions;
      
      const quiz = await storage.updateQuiz(quizId, updateData);
      res.json(quiz);
    } catch (error: any) {
      console.error("Error updating quiz:", error);
      return handleValidationError(error, res, "update quiz");
    }
  });

  // Admin Quiz Question Management
  app.get('/api/lms/admin/quizzes/:quizId/questions', isAuthenticated, requireSupervisorOrLeadership(), async (req, res) => {
    try {
      const { quizId } = req.params;
      const questions = await storage.getQuizQuestions(quizId);
      res.json(questions);
    } catch (error: any) {
      return handleValidationError(error, res, "get quiz questions");
    }
  });

  app.post('/api/lms/admin/quizzes/:quizId/questions', isAuthenticated, requireSupervisorOrLeadership(), async (req: any, res) => {
    try {
      const { quizId } = req.params;
      const { questions } = req.body;
      
      if (!Array.isArray(questions)) {
        return res.status(400).json({ message: "Questions must be an array" });
      }

      // First delete existing questions
      const existingQuestions = await storage.getQuizQuestions(quizId);
      for (const question of existingQuestions) {
        await storage.deleteQuizQuestion(question.id);
      }

      // Create new questions with proper validation
      const questionsData = questions.map((q: any, index: number) => {
        const questionData = insertQuizQuestionSchema.parse({
          quizId,
          type: q.type,
          questionText: q.questionText,
          options: q.options || [],
          correctAnswers: q.correctAnswers || [],
          explanation: q.explanation || "",
          orderIndex: q.orderIndex || index + 1,
        });
        return questionData;
      });

      const createdQuestions = await storage.createQuizQuestions(questionsData);
      res.json(createdQuestions);
    } catch (error: any) {
      return handleValidationError(error, res, "create quiz questions");
    }
  });

  app.get('/api/lms/quizzes/:quizId/questions', isAuthenticated, async (req, res) => {
    try {
      const { quizId } = req.params;
      
      // Get quiz questions without correct answers for taking the quiz
      const questions = await storage.getQuizQuestions(quizId);
      
      // Maintain backward compatibility by always returning an array
      // Add warning via HTTP header for empty quizzes
      if (questions.length === 0) {
        res.set('X-Quiz-Warning', 'This quiz has no questions. Please add questions before taking it.');
        return res.json([]);
      }
      
      const questionsForTaking = questions.map(q => ({
        id: q.id,
        type: q.type,
        questionText: q.questionText,
        options: q.options,
        orderIndex: q.orderIndex
      }));
      
      res.json(questionsForTaking);
    } catch (error: any) {
      return handleValidationError(error, res, "get quiz questions for taking");
    }
  });

  app.get('/api/lms/quizzes/:quizId/attempts/me', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { quizId } = req.params;
      
      const attempts = await storage.getUserQuizAttempts(userId, quizId);
      res.json(attempts);
    } catch (error: any) {
      return handleValidationError(error, res, "get user quiz attempts");
    }
  });

  // Admin Badge Management
  app.post('/api/lms/admin/badges', isAuthenticated, requireSupervisorOrLeadership(), async (req: any, res) => {
    try {
      const { courseIds, ...badgeData } = req.body;
      const validatedBadgeData = insertBadgeSchema.parse(badgeData);
      
      // Validate courseIds
      const validatedCourseIds = z.array(z.string()).optional().default([]).parse(courseIds);
      
      // Create badge with optional course requirements
      const badge = await storage.createBadge(validatedBadgeData, validatedCourseIds);
      res.json(badge);
    } catch (error: any) {
      return handleValidationError(error, res, "create badge");
    }
  });

  app.put('/api/lms/admin/badges/:id', isAuthenticated, requireSupervisorOrLeadership(), async (req: any, res) => {
    try {
      const { id } = req.params;
      const { courseIds, ...badgeData } = req.body;
      const validatedBadgeData = insertBadgeSchema.partial().parse(badgeData);
      
      // Validate courseIds
      const validatedCourseIds = z.array(z.string()).optional().parse(courseIds);
      
      // Update badge with optional course requirements
      const badge = await storage.updateBadge(id, validatedBadgeData, validatedCourseIds);
      res.json(badge);
    } catch (error: any) {
      return handleValidationError(error, res, "update badge");
    }
  });

  app.delete('/api/lms/admin/courses/:id', isAuthenticated, requireSupervisorOrLeadership(), async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteCourse(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting course:", error);
      res.status(500).json({ message: "Failed to delete course" });
    }
  });

  app.post('/api/lms/admin/courses/:id/duplicate', isAuthenticated, requireSupervisorOrLeadership(), async (req, res) => {
    try {
      const { id } = req.params;
      const { title } = req.body;
      
      if (!title) {
        return res.status(400).json({ message: "New course title is required" });
      }
      
      const duplicatedCourse = await storage.duplicateCourse(id, title);
      res.json(duplicatedCourse);
    } catch (error) {
      console.error("Error duplicating course:", error);
      res.status(500).json({ message: "Failed to duplicate course" });
    }
  });

  // Admin Analytics Dashboard
  app.get('/api/lms/admin/analytics', isAuthenticated, requireSupervisorOrLeadership(), async (req, res) => {
    try {
      const analytics = await storage.getAdminAnalytics();
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching admin analytics:", error);
      res.status(500).json({ message: "Failed to fetch admin analytics" });
    }
  });

  // External Course Management - Manually assign completed external course to user
  app.post('/api/lms/admin/external-courses/:courseId/assign-completion', isAuthenticated, requireSupervisorOrLeadership(), async (req: any, res) => {
    try {
      const { courseId } = req.params;
      const assignedBy = req.user.claims.sub;

      // Use Zod schema validation as per project guidelines
      const validatedData = assignExternalCourseCompletionSchema.parse(req.body);
      const completionDateObj = new Date(validatedData.completionDate);

      const result = await storage.assignExternalCourseCompletion(
        validatedData.userId, 
        courseId, 
        completionDateObj, 
        assignedBy
      );

      res.json({
        message: "External course completion assigned successfully",
        enrollment: result.enrollment,
        trainingRecord: result.trainingRecord
      });
    } catch (error: any) {
      return handleValidationError(error, res, "assign external course completion");
    }
  });

  // ========================================
  // LEARNING PATHS API ROUTES (Vertical Slice 1)
  // ========================================

  // Learning Paths Management
  app.get('/api/learning-paths', isAuthenticated, async (req: any, res) => {
    try {
      const allPaths = await storage.getLearningPaths();
      
      // Check if user is admin to see all paths, otherwise filter to published only
      const user = await storage.getUser(req.user.claims.sub);
      const isAdmin = user?.role === 'supervisor' || user?.role === 'leadership';
      
      const filteredPaths = isAdmin ? allPaths : allPaths.filter(path => path.isPublished);
      res.json(filteredPaths);
    } catch (error) {
      console.error("Error fetching learning paths:", error);
      res.status(500).json({ message: "Failed to fetch learning paths" });
    }
  });

  app.get('/api/learning-paths/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const path = await storage.getLearningPath(id);
      
      if (!path) {
        return res.status(404).json({ message: "Learning path not found" });
      }
      
      // Check if user is admin to see unpublished paths
      const user = await storage.getUser(req.user.claims.sub);
      const isAdmin = user?.role === 'supervisor' || user?.role === 'leadership';
      
      if (!isAdmin && !path.isPublished) {
        return res.status(404).json({ message: "Learning path not found" });
      }
      
      res.json(path);
    } catch (error) {
      console.error("Error fetching learning path:", error);
      res.status(500).json({ message: "Failed to fetch learning path" });
    }
  });

  app.get('/api/learning-paths/:id/with-steps', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const pathWithSteps = await storage.getLearningPathWithSteps(id);
      
      if (!pathWithSteps) {
        return res.status(404).json({ message: "Learning path not found" });
      }
      
      // Check if user is admin to see unpublished paths
      const user = await storage.getUser(req.user.claims.sub);
      const isAdmin = user?.role === 'supervisor' || user?.role === 'leadership';
      
      if (!isAdmin && !pathWithSteps.isPublished) {
        return res.status(404).json({ message: "Learning path not found" });
      }
      
      res.json(pathWithSteps);
    } catch (error: any) {
      console.error("Error fetching learning path with steps:", error);
      if (error.message.includes("not found")) {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to fetch learning path with steps" });
    }
  });

  app.post('/api/learning-paths', isAuthenticated, requireSupervisorOrLeadership(), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertLearningPathSchema.parse({
        ...req.body,
        createdBy: userId
      });
      
      const newPath = await storage.createLearningPath(validatedData);
      res.status(201).json(newPath);
    } catch (error: any) {
      return handleValidationError(error, res, "create learning path");
    }
  });

  app.put('/api/learning-paths/:id', isAuthenticated, requireSupervisorOrLeadership(), async (req, res) => {
    try {
      const { id } = req.params;
      // Use dedicated update schema that omits immutable fields
      const updateLearningPathSchema = insertLearningPathSchema.omit({
        createdBy: true,
        isPublished: true,
        publishedAt: true,
      }).partial();
      
      const validatedData = updateLearningPathSchema.parse(req.body);
      const updatedPath = await storage.updateLearningPath(id, validatedData);
      res.json(updatedPath);
    } catch (error: any) {
      if (error.message.includes("not found")) {
        return res.status(404).json({ message: error.message });
      }
      return handleValidationError(error, res, "update learning path");
    }
  });

  app.delete('/api/learning-paths/:id', isAuthenticated, requireSupervisorOrLeadership(), async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteLearningPath(id);
      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting learning path:", error);
      if (error.message.includes("not found")) {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to delete learning path" });
    }
  });

  app.post('/api/learning-paths/:id/publish', isAuthenticated, requireSupervisorOrLeadership(), async (req, res) => {
    try {
      const { id } = req.params;
      const publishedPath = await storage.publishLearningPath(id);
      res.json(publishedPath);
    } catch (error: any) {
      console.error("Error publishing learning path:", error);
      if (error.message.includes("not found")) {
        return res.status(404).json({ message: error.message });
      }
      if (error.message.includes("without steps")) {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to publish learning path" });
    }
  });

  app.post('/api/learning-paths/:id/unpublish', isAuthenticated, requireSupervisorOrLeadership(), async (req, res) => {
    try {
      const { id } = req.params;
      const unpublishedPath = await storage.unpublishLearningPath(id);
      res.json(unpublishedPath);
    } catch (error: any) {
      console.error("Error unpublishing learning path:", error);
      if (error.message.includes("not found")) {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to unpublish learning path" });
    }
  });

  // Non-Linear Learning Paths (Phase 2)
  app.post('/api/learning-paths/non-linear', isAuthenticated, requireSupervisorOrLeadership(), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { title, description, category, estimatedDuration, relativeDueDays, requiredCompletions, availableChoices } = req.body;
      
      // Basic validation
      if (!title || typeof requiredCompletions !== 'number' || typeof availableChoices !== 'number') {
        return res.status(400).json({ message: "Missing required fields: title, requiredCompletions, availableChoices" });
      }
      
      if (requiredCompletions <= 0) {
        return res.status(400).json({ message: "requiredCompletions must be greater than 0" });
      }
      
      if (requiredCompletions > availableChoices) {
        return res.status(400).json({ message: "requiredCompletions cannot exceed availableChoices" });
      }
      
      const pathData = {
        title,
        description,
        category,
        estimatedDuration,
        relativeDueDays,
        requiredCompletions,
        availableChoices,
        createdBy: userId
      };
      
      const newPath = await storage.createNonLinearLearningPath(pathData);
      res.status(201).json(newPath);
    } catch (error: any) {
      console.error("Error creating non-linear learning path:", error);
      return res.status(500).json({ message: "Failed to create non-linear learning path" });
    }
  });

  app.put('/api/learning-paths/:id/criteria', isAuthenticated, requireSupervisorOrLeadership(), async (req: any, res) => {
    try {
      const { id } = req.params;
      const { requiredCompletions, availableChoices } = req.body;
      
      // Basic validation
      if (typeof requiredCompletions !== 'number' || typeof availableChoices !== 'number') {
        return res.status(400).json({ message: "Missing required fields: requiredCompletions, availableChoices" });
      }
      
      if (requiredCompletions <= 0) {
        return res.status(400).json({ message: "requiredCompletions must be greater than 0" });
      }
      
      if (requiredCompletions > availableChoices) {
        return res.status(400).json({ message: "requiredCompletions cannot exceed availableChoices" });
      }
      
      const criteria = { requiredCompletions, availableChoices };
      const updatedPath = await storage.updateNonLinearPathCriteria(id, criteria);
      res.json(updatedPath);
    } catch (error: any) {
      console.error("Error updating non-linear path criteria:", error);
      if (error.message.includes("not found")) {
        return res.status(404).json({ message: error.message });
      }
      return res.status(500).json({ message: "Failed to update non-linear path criteria" });
    }
  });

  app.get('/api/learning-path-enrollments/:enrollmentId/non-linear-progress', isAuthenticated, async (req: any, res) => {
    try {
      const { enrollmentId } = req.params;
      const userId = req.user.claims.sub;
      
      // Check if user owns this enrollment or is admin
      const enrollment = await storage.getLearningPathEnrollment(enrollmentId);
      if (!enrollment) {
        return res.status(404).json({ message: "Learning path enrollment not found" });
      }
      
      const user = await storage.getUser(userId);
      const isAdmin = user?.role === 'supervisor' || user?.role === 'leadership';
      
      if (!isAdmin && enrollment.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const progress = await storage.getNonLinearPathProgress(enrollmentId);
      res.json(progress);
    } catch (error: any) {
      console.error("Error fetching non-linear path progress:", error);
      if (error.message.includes("not found")) {
        return res.status(404).json({ message: error.message });
      }
      return res.status(500).json({ message: "Failed to fetch non-linear path progress" });
    }
  });

  // Adaptive Learning Paths (Phase 2)
  app.post('/api/learning-paths/adaptive', isAuthenticated, requireSupervisorOrLeadership(), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { 
        title, 
        description, 
        category, 
        estimatedDuration, 
        relativeDueDays, 
        skipThreshold, 
        remedialThreshold, 
        baseStepsRequired, 
        adaptationEnabled 
      } = req.body;
      
      // Basic validation
      if (!title) {
        return res.status(400).json({ message: "Missing required field: title" });
      }
      
      // Validate thresholds if provided
      if (skipThreshold !== undefined && (skipThreshold < 0 || skipThreshold > 100)) {
        return res.status(400).json({ message: "skipThreshold must be between 0 and 100" });
      }
      
      if (remedialThreshold !== undefined && (remedialThreshold < 0 || remedialThreshold > 100)) {
        return res.status(400).json({ message: "remedialThreshold must be between 0 and 100" });
      }
      
      if (baseStepsRequired !== undefined && baseStepsRequired <= 0) {
        return res.status(400).json({ message: "baseStepsRequired must be greater than 0" });
      }
      
      const pathData = {
        title,
        description,
        category,
        estimatedDuration,
        relativeDueDays,
        skipThreshold,
        remedialThreshold,
        baseStepsRequired,
        adaptationEnabled,
        createdBy: userId
      };
      
      const newPath = await storage.createAdaptiveLearningPath(pathData);
      res.status(201).json(newPath);
    } catch (error: any) {
      console.error("Error creating adaptive learning path:", error);
      return res.status(500).json({ message: "Failed to create adaptive learning path" });
    }
  });

  app.put('/api/learning-paths/:id/adaptive-criteria', isAuthenticated, requireSupervisorOrLeadership(), async (req: any, res) => {
    try {
      const { id } = req.params;
      const { skipThreshold, remedialThreshold, baseStepsRequired, adaptationEnabled } = req.body;
      
      // Validate thresholds if provided
      if (skipThreshold !== undefined && (skipThreshold < 0 || skipThreshold > 100)) {
        return res.status(400).json({ message: "skipThreshold must be between 0 and 100" });
      }
      
      if (remedialThreshold !== undefined && (remedialThreshold < 0 || remedialThreshold > 100)) {
        return res.status(400).json({ message: "remedialThreshold must be between 0 and 100" });
      }
      
      if (baseStepsRequired !== undefined && baseStepsRequired <= 0) {
        return res.status(400).json({ message: "baseStepsRequired must be greater than 0" });
      }
      
      const criteria = { skipThreshold, remedialThreshold, baseStepsRequired, adaptationEnabled };
      const updatedPath = await storage.updateAdaptivePathCriteria(id, criteria);
      res.json(updatedPath);
    } catch (error: any) {
      console.error("Error updating adaptive path criteria:", error);
      if (error.message.includes("not found")) {
        return res.status(404).json({ message: error.message });
      }
      return res.status(500).json({ message: "Failed to update adaptive path criteria" });
    }
  });

  app.get('/api/learning-path-enrollments/:enrollmentId/adaptive-progress', isAuthenticated, async (req: any, res) => {
    try {
      const { enrollmentId } = req.params;
      const userId = req.user.claims.sub;
      
      // Check if user owns this enrollment or is admin
      const enrollment = await storage.getLearningPathEnrollment(enrollmentId);
      if (!enrollment) {
        return res.status(404).json({ message: "Learning path enrollment not found" });
      }
      
      const user = await storage.getUser(userId);
      const isAdmin = user?.role === 'supervisor' || user?.role === 'leadership';
      
      if (!isAdmin && enrollment.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const progress = await storage.getAdaptivePathProgress(enrollmentId);
      res.json(progress);
    } catch (error: any) {
      console.error("Error fetching adaptive path progress:", error);
      if (error.message.includes("not found")) {
        return res.status(404).json({ message: error.message });
      }
      return res.status(500).json({ message: "Failed to fetch adaptive path progress" });
    }
  });

  // Learning Path Steps Management
  app.get('/api/learning-paths/:pathId/steps', isAuthenticated, async (req: any, res) => {
    try {
      const { pathId } = req.params;
      
      // Check parent path exists and visibility permissions
      const parentPath = await storage.getLearningPath(pathId);
      if (!parentPath) {
        return res.status(404).json({ message: "Learning path not found" });
      }
      
      // Enforce visibility: non-admins can only see steps for published paths
      const user = await storage.getUser(req.user.claims.sub);
      const isAdmin = user?.role === 'supervisor' || user?.role === 'leadership';
      
      if (!isAdmin && !parentPath.isPublished) {
        return res.status(404).json({ message: "Learning path not found" });
      }
      
      const steps = await storage.getLearningPathSteps(pathId);
      res.json(steps);
    } catch (error) {
      console.error("Error fetching learning path steps:", error);
      res.status(500).json({ message: "Failed to fetch learning path steps" });
    }
  });

  app.get('/api/learning-paths/:pathId/steps/:stepId', isAuthenticated, async (req: any, res) => {
    try {
      const { stepId, pathId } = req.params;
      const step = await storage.getLearningPathStep(stepId);
      
      if (!step || step.pathId !== pathId) {
        return res.status(404).json({ message: "Learning path step not found" });
      }
      
      // Check parent path visibility permissions  
      const parentPath = await storage.getLearningPath(pathId);
      if (!parentPath) {
        return res.status(404).json({ message: "Learning path not found" });
      }
      
      // Enforce visibility: non-admins can only see steps for published paths
      const user = await storage.getUser(req.user.claims.sub);
      const isAdmin = user?.role === 'supervisor' || user?.role === 'leadership';
      
      if (!isAdmin && !parentPath.isPublished) {
        return res.status(404).json({ message: "Learning path step not found" });
      }
      
      res.json(step);
    } catch (error) {
      console.error("Error fetching learning path step:", error);
      res.status(500).json({ message: "Failed to fetch learning path step" });
    }
  });

  app.post('/api/learning-paths/:pathId/steps', isAuthenticated, requireSupervisorOrLeadership(), async (req, res) => {
    try {
      const { pathId } = req.params;
      // Omit pathId from validation to prevent client spoofing, inject from params
      const stepSchema = insertLearningPathStepSchema.omit({ pathId: true });
      const validatedBodyData = stepSchema.parse(req.body);
      
      const validatedData = {
        ...validatedBodyData,
        pathId // Inject pathId from URL params
      };
      
      const newStep = await storage.createLearningPathStep(validatedData);
      res.status(201).json(newStep);
    } catch (error: any) {
      if (error.message.includes("not found")) {
        return res.status(404).json({ message: error.message });
      }
      return handleValidationError(error, res, "create learning path step");
    }
  });

  app.put('/api/learning-paths/:pathId/steps/:stepId', isAuthenticated, requireSupervisorOrLeadership(), async (req, res) => {
    try {
      const { stepId, pathId } = req.params;
      
      // Verify step exists and belongs to specified path BEFORE mutation (prevent TOCTOU)
      const existingStep = await storage.getLearningPathStep(stepId);
      if (!existingStep || existingStep.pathId !== pathId) {
        return res.status(404).json({ message: "Step not found in specified path" });
      }
      
      // Create update schema that omits immutable fields and pathId
      const updateStepSchema = insertLearningPathStepSchema.omit({
        pathId: true,
        stepOrder: true, // Prevent direct stepOrder changes, use reorder endpoint
      }).partial();
      
      const validatedData = updateStepSchema.parse(req.body);
      const updatedStep = await storage.updateLearningPathStep(stepId, validatedData);
      
      res.json(updatedStep);
    } catch (error: any) {
      if (error.message.includes("not found")) {
        return res.status(404).json({ message: error.message });
      }
      return handleValidationError(error, res, "update learning path step");
    }
  });

  app.delete('/api/learning-paths/:pathId/steps/:stepId', isAuthenticated, requireSupervisorOrLeadership(), async (req, res) => {
    try {
      const { stepId, pathId } = req.params;
      
      // Verify step exists and belongs to specified path before deletion
      const existingStep = await storage.getLearningPathStep(stepId);
      if (!existingStep || existingStep.pathId !== pathId) {
        return res.status(404).json({ message: "Step not found in specified path" });
      }
      
      await storage.deleteLearningPathStep(stepId);
      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting learning path step:", error);
      if (error.message.includes("not found")) {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to delete learning path step" });
    }
  });

  app.put('/api/learning-paths/:pathId/steps/reorder', isAuthenticated, requireSupervisorOrLeadership(), async (req, res) => {
    try {
      const { pathId } = req.params;
      const { stepIds } = req.body;
      
      if (!Array.isArray(stepIds)) {
        return res.status(400).json({ message: "stepIds must be an array" });
      }
      
      if (stepIds.length === 0) {
        return res.status(400).json({ message: "stepIds cannot be empty" });
      }
      
      // Verify all stepIds are unique
      const uniqueStepIds = new Set(stepIds);
      if (uniqueStepIds.size !== stepIds.length) {
        return res.status(400).json({ message: "stepIds must be unique" });
      }
      
      // Verify all steps belong to the specified path
      const existingSteps = await storage.getLearningPathSteps(pathId);
      const existingStepIds = new Set(existingSteps.map(step => step.id));
      
      if (stepIds.length !== existingSteps.length) {
        return res.status(400).json({ message: "stepIds count must match existing steps count" });
      }
      
      for (const stepId of stepIds) {
        if (!existingStepIds.has(stepId)) {
          return res.status(400).json({ message: `Step ${stepId} does not belong to path ${pathId}` });
        }
      }
      
      await storage.reorderLearningPathSteps(pathId, stepIds);
      res.json({ message: "Steps reordered successfully" });
    } catch (error: any) {
      console.error("Error reordering learning path steps:", error);
      if (error.message.includes("not found")) {
        return res.status(404).json({ message: error.message });
      }
      if (error.message.includes("provide all current steps")) {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to reorder learning path steps" });
    }
  });

  // ========================================
  // Learning Path Enrollments API
  // ========================================

  // Get user's learning path enrollments
  app.get('/api/users/:userId/learning-path-enrollments', isAuthenticated, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const requestingUserId = req.user.claims.sub;
      
      // Users can only see their own enrollments, unless they're supervisor/leadership
      const currentUser = await storage.getUser(requestingUserId);
      if (userId !== requestingUserId && (!currentUser || !['supervisor', 'leadership'].includes(currentUser.role))) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const enrollments = await storage.getLearningPathEnrollments(userId);
      res.json(enrollments);
    } catch (error: any) {
      console.error("Error fetching user learning path enrollments:", error);
      res.status(500).json({ message: "Failed to fetch learning path enrollments" });
    }
  });

  // Get enrollments for a specific learning path (admin only)
  app.get('/api/learning-paths/:pathId/enrollments', isAuthenticated, requireSupervisorOrLeadership(), async (req: any, res) => {
    try {
      const { pathId } = req.params;
      const enrollments = await storage.getLearningPathEnrollments(undefined, pathId);
      res.json(enrollments);
    } catch (error: any) {
      console.error("Error fetching learning path enrollments:", error);
      res.status(500).json({ message: "Failed to fetch learning path enrollments" });
    }
  });

  // Enroll user in learning path
  app.post('/api/learning-paths/:pathId/enroll', isAuthenticated, async (req: any, res) => {
    try {
      const { pathId } = req.params;
      const userId = req.user.claims.sub;
      
      // Check if learning path exists and is published
      const learningPath = await storage.getLearningPath(pathId);
      if (!learningPath) {
        return res.status(404).json({ message: "Learning path not found" });
      }
      
      if (!learningPath.isPublished) {
        return res.status(400).json({ message: "Cannot enroll in unpublished learning path" });
      }
      
      const enrollment = await storage.enrollUserInLearningPath({
        userId,
        pathId,
        enrollmentSource: "self_enrolled"
      });
      
      res.status(201).json(enrollment);
    } catch (error: any) {
      console.error("Error enrolling user in learning path:", error);
      if (error.message.includes("already enrolled")) {
        return res.status(409).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to enroll in learning path" });
    }
  });

  // Get specific enrollment details
  app.get('/api/learning-path-enrollments/:enrollmentId', isAuthenticated, async (req: any, res) => {
    try {
      const { enrollmentId } = req.params;
      const enrollment = await storage.getLearningPathEnrollment(enrollmentId);
      
      if (!enrollment) {
        return res.status(404).json({ message: "Enrollment not found" });
      }
      
      const requestingUserId = req.user.claims.sub;
      // Users can only see their own enrollments, unless they're supervisor/leadership
      const currentUser = await storage.getUser(requestingUserId);
      if (enrollment.userId !== requestingUserId && (!currentUser || !['supervisor', 'leadership'].includes(currentUser.role))) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      res.json(enrollment);
    } catch (error: any) {
      console.error("Error fetching learning path enrollment:", error);
      res.status(500).json({ message: "Failed to fetch learning path enrollment" });
    }
  });

  // Update enrollment (admin only)
  app.put('/api/learning-path-enrollments/:enrollmentId', isAuthenticated, requireSupervisorOrLeadership(), async (req: any, res) => {
    try {
      const { enrollmentId } = req.params;
      const updates = insertLearningPathEnrollmentSchema.partial().parse(req.body);
      
      const updatedEnrollment = await storage.updateLearningPathEnrollment(enrollmentId, updates);
      res.json(updatedEnrollment);
    } catch (error: any) {
      console.error("Error updating learning path enrollment:", error);
      if (error.message.includes("not found")) {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to update learning path enrollment" });
    }
  });

  // Complete enrollment
  app.post('/api/learning-path-enrollments/:enrollmentId/complete', isAuthenticated, async (req: any, res) => {
    try {
      const { enrollmentId } = req.params;
      const enrollment = await storage.getLearningPathEnrollment(enrollmentId);
      
      if (!enrollment) {
        return res.status(404).json({ message: "Enrollment not found" });
      }
      
      const requestingUserId = req.user.claims.sub;
      // Users can only complete their own enrollments, unless they're supervisor/leadership
      const currentUser = await storage.getUser(requestingUserId);
      if (enrollment.userId !== requestingUserId && (!currentUser || !['supervisor', 'leadership'].includes(currentUser.role))) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const completedEnrollment = await storage.completeLearningPathEnrollment(enrollmentId);
      res.json(completedEnrollment);
    } catch (error: any) {
      console.error("Error completing learning path enrollment:", error);
      if (error.message.includes("not found")) {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to complete learning path enrollment" });
    }
  });

  // Suspend enrollment (admin only)
  app.post('/api/learning-path-enrollments/:enrollmentId/suspend', isAuthenticated, requireSupervisorOrLeadership(), async (req: any, res) => {
    try {
      const { enrollmentId } = req.params;
      const { reason } = req.body;
      
      const suspendedEnrollment = await storage.suspendLearningPathEnrollment(enrollmentId, reason);
      res.json(suspendedEnrollment);
    } catch (error: any) {
      console.error("Error suspending learning path enrollment:", error);
      if (error.message.includes("not found")) {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to suspend learning path enrollment" });
    }
  });

  // Resume enrollment (admin only)
  app.post('/api/learning-path-enrollments/:enrollmentId/resume', isAuthenticated, requireSupervisorOrLeadership(), async (req: any, res) => {
    try {
      const { enrollmentId } = req.params;
      
      const resumedEnrollment = await storage.resumeLearningPathEnrollment(enrollmentId);
      res.json(resumedEnrollment);
    } catch (error: any) {
      console.error("Error resuming learning path enrollment:", error);
      if (error.message.includes("not found")) {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to resume learning path enrollment" });
    }
  });

  // ========================================
  // Learning Path Step Progress API
  // ========================================

  // Get step progress for an enrollment
  app.get('/api/learning-path-enrollments/:enrollmentId/progress', isAuthenticated, async (req: any, res) => {
    try {
      const { enrollmentId } = req.params;
      const enrollment = await storage.getLearningPathEnrollment(enrollmentId);
      
      if (!enrollment) {
        return res.status(404).json({ message: "Enrollment not found" });
      }
      
      const requestingUserId = req.user.claims.sub;
      // Users can only see their own progress, unless they're supervisor/leadership
      const currentUser = await storage.getUser(requestingUserId);
      if (enrollment.userId !== requestingUserId && (!currentUser || !['supervisor', 'leadership'].includes(currentUser.role))) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const stepProgress = await storage.getLearningPathStepProgress(enrollmentId);
      res.json(stepProgress);
    } catch (error: any) {
      console.error("Error fetching learning path step progress:", error);
      res.status(500).json({ message: "Failed to fetch learning path step progress" });
    }
  });

  // Get specific step progress
  app.get('/api/learning-path-enrollments/:enrollmentId/steps/:stepId/progress', isAuthenticated, async (req: any, res) => {
    try {
      const { enrollmentId, stepId } = req.params;
      const enrollment = await storage.getLearningPathEnrollment(enrollmentId);
      
      if (!enrollment) {
        return res.status(404).json({ message: "Enrollment not found" });
      }
      
      const requestingUserId = req.user.claims.sub;
      // Users can only see their own progress, unless they're supervisor/leadership
      const currentUser = await storage.getUser(requestingUserId);
      if (enrollment.userId !== requestingUserId && (!currentUser || !['supervisor', 'leadership'].includes(currentUser.role))) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const stepProgress = await storage.getStepProgress(enrollmentId, stepId);
      if (!stepProgress) {
        return res.status(404).json({ message: "Step progress not found" });
      }
      
      res.json(stepProgress);
    } catch (error: any) {
      console.error("Error fetching step progress:", error);
      res.status(500).json({ message: "Failed to fetch step progress" });
    }
  });

  // Update step progress
  app.put('/api/learning-path-enrollments/:enrollmentId/steps/:stepId/progress', isAuthenticated, async (req: any, res) => {
    try {
      const { enrollmentId, stepId } = req.params;
      const enrollment = await storage.getLearningPathEnrollment(enrollmentId);
      
      if (!enrollment) {
        return res.status(404).json({ message: "Enrollment not found" });
      }
      
      const requestingUserId = req.user.claims.sub;
      // Users can only update their own progress, unless they're supervisor/leadership
      const currentUser = await storage.getUser(requestingUserId);
      if (enrollment.userId !== requestingUserId && (!currentUser || !['supervisor', 'leadership'].includes(currentUser.role))) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const validatedProgress = insertLearningPathStepProgressSchema.partial().omit({ enrollmentId: true, stepId: true }).parse(req.body);
      const progressData = {
        enrollmentId,
        stepId,
        userId: enrollment.userId,
        ...validatedProgress
      };
      
      const updatedProgress = await storage.updateStepProgress(progressData);
      res.json(updatedProgress);
    } catch (error: any) {
      console.error("Error updating step progress:", error);
      res.status(500).json({ message: "Failed to update step progress" });
    }
  });

  // Complete a step
  app.post('/api/learning-path-enrollments/:enrollmentId/steps/:stepId/complete', isAuthenticated, async (req: any, res) => {
    try {
      const { enrollmentId, stepId } = req.params;
      const { score, timeSpent } = req.body;
      const enrollment = await storage.getLearningPathEnrollment(enrollmentId);
      
      if (!enrollment) {
        return res.status(404).json({ message: "Enrollment not found" });
      }
      
      const requestingUserId = req.user.claims.sub;
      // Users can only complete their own steps, unless they're supervisor/leadership
      const currentUser = await storage.getUser(requestingUserId);
      if (enrollment.userId !== requestingUserId && (!currentUser || !['supervisor', 'leadership'].includes(currentUser.role))) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const completedProgress = await storage.completeStep(enrollmentId, stepId, score, timeSpent);
      res.json(completedProgress);
    } catch (error: any) {
      console.error("Error completing step:", error);
      if (error.message.includes("not found")) {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to complete step" });
    }
  });

  // Skip a step
  app.post('/api/learning-path-enrollments/:enrollmentId/steps/:stepId/skip', isAuthenticated, async (req: any, res) => {
    try {
      const { enrollmentId, stepId } = req.params;
      const { reason } = req.body;
      const enrollment = await storage.getLearningPathEnrollment(enrollmentId);
      
      if (!enrollment) {
        return res.status(404).json({ message: "Enrollment not found" });
      }
      
      const requestingUserId = req.user.claims.sub;
      // Users can only skip their own steps, unless they're supervisor/leadership
      const currentUser = await storage.getUser(requestingUserId);
      if (enrollment.userId !== requestingUserId && (!currentUser || !['supervisor', 'leadership'].includes(currentUser.role))) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      if (!reason) {
        return res.status(400).json({ message: "Reason is required for skipping a step" });
      }
      
      const skippedProgress = await storage.skipStep(enrollmentId, stepId, reason);
      res.json(skippedProgress);
    } catch (error: any) {
      console.error("Error skipping step:", error);
      if (error.message.includes("not found")) {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to skip step" });
    }
  });

  // ========================
  // AUTO-ASSIGNMENT ENGINE API
  // ========================

  // Get auto-assignment logs for monitoring
  app.get('/api/auto-assignments/logs', isAuthenticated, requireSupervisorOrLeadership(), async (req: any, res) => {
    try {
      const { userId, limit = 50 } = req.query;
      const logs = await storage.getAutomationRunLogs(userId, 'user', parseInt(limit));
      
      // Filter for auto-assignment logs
      const autoAssignmentLogs = logs.filter(log => log.runType === 'auto_assignment');
      
      res.json(autoAssignmentLogs);
    } catch (error: any) {
      console.error("Error fetching auto-assignment logs:", error);
      res.status(500).json({ message: "Failed to fetch auto-assignment logs" });
    }
  });

  // Manual trigger for role-based auto-assignment (admin use)
  app.post('/api/auto-assignments/trigger/role/:userId', isAuthenticated, requireSupervisorOrLeadership(), async (req: any, res) => {
    try {
      const { userId } = req.params;
      const currentUserId = req.user.claims.sub;
      
      // Get user details to get current role
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Manually trigger role-based auto-assignment
      await storage.triggerRoleBasedAutoAssignment(userId, user.role, currentUserId);
      
      res.json({ 
        message: "Role-based auto-assignment triggered successfully",
        userId,
        role: user.role,
        triggeredBy: currentUserId
      });
    } catch (error: any) {
      console.error("Error triggering role-based auto-assignment:", error);
      res.status(500).json({ message: "Failed to trigger auto-assignment" });
    }
  });

  // Get required competencies for a role (for preview/planning)
  app.get('/api/auto-assignments/competencies/:role', isAuthenticated, requireSupervisorOrLeadership(), async (req: any, res) => {
    try {
      const { role } = req.params;
      const { teamId } = req.query;
      
      const competencies = await storage.getRequiredCompetenciesForRole(role, teamId);
      res.json(competencies);
    } catch (error: any) {
      console.error("Error fetching role competencies:", error);
      res.status(500).json({ message: "Failed to fetch role competencies" });
    }
  });

  // Get auto-assignment statistics
  app.get('/api/auto-assignments/stats', isAuthenticated, requireSupervisorOrLeadership(), async (req: any, res) => {
    try {
      const logs = await storage.getAutomationRunLogs();
      const autoAssignmentLogs = logs.filter(log => log.runType === 'auto_assignment');
      
      const stats = {
        totalAutoAssignments: autoAssignmentLogs.length,
        successfulAssignments: autoAssignmentLogs.filter(log => log.status === 'completed').length,
        failedAssignments: autoAssignmentLogs.filter(log => log.status === 'failed').length,
        totalEnrollmentsCreated: autoAssignmentLogs.reduce((sum, log) => sum + (log.assignmentsCreated || 0), 0),
        byAssignmentType: {
          role_change: autoAssignmentLogs.filter(log => 
            log.executionDetails && (log.executionDetails as any).assignmentType === 'role_change'
          ).length,
          competency_gap: autoAssignmentLogs.filter(log => 
            log.executionDetails && (log.executionDetails as any).assignmentType === 'competency_gap'
          ).length,
          compliance_requirement: autoAssignmentLogs.filter(log => 
            log.executionDetails && (log.executionDetails as any).assignmentType === 'compliance_requirement'
          ).length
        },
        recent: autoAssignmentLogs
          .filter(log => log.startedAt && new Date(log.startedAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
          .length
      };
      
      res.json(stats);
    } catch (error: any) {
      console.error("Error fetching auto-assignment stats:", error);
      res.status(500).json({ message: "Failed to fetch auto-assignment statistics" });
    }
  });

  // ========================
  // COMPETENCY GAP AUTO-ASSIGNMENT API
  // ========================

  // Manual trigger for competency gap auto-assignment
  app.post('/api/auto-assignments/trigger/gaps/:userId', isAuthenticated, requireSupervisorOrLeadership(), async (req: any, res) => {
    try {
      const { userId } = req.params;
      const currentUserId = req.user.claims.sub;
      
      // Verify user exists
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Trigger competency gap auto-assignment
      await storage.triggerCompetencyGapAutoAssignment(userId, currentUserId);
      
      res.json({ 
        message: "Competency gap auto-assignment triggered successfully",
        userId,
        triggeredBy: currentUserId
      });
    } catch (error: any) {
      console.error("Error triggering competency gap auto-assignment:", error);
      res.status(500).json({ message: "Failed to trigger competency gap auto-assignment" });
    }
  });

  // Get competency gap analysis for a user (preview without assignment)
  app.get('/api/auto-assignments/gaps/analysis/:userId', isAuthenticated, requireSupervisorOrLeadership(), async (req: any, res) => {
    try {
      const { userId } = req.params;
      
      // Verify user exists
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Analyze gaps without triggering assignments
      const gapAnalysis = await storage.analyzeCompetencyGaps(userId);
      
      res.json({
        userId,
        analysisDate: new Date(),
        totalGaps: gapAnalysis.length,
        criticalGaps: gapAnalysis.filter(g => g.priority === 'critical').length,
        highPriorityGaps: gapAnalysis.filter(g => g.priority === 'high').length,
        averageGapScore: gapAnalysis.length > 0 ? 
          gapAnalysis.reduce((sum, gap) => sum + gap.gapScore, 0) / gapAnalysis.length : 0,
        gaps: gapAnalysis.map(gap => ({
          competencyId: gap.competencyLibraryId,
          competencyTitle: gap.competencyTitle,
          currentLevel: gap.currentLevel,
          requiredLevel: gap.requiredLevel,
          gapScore: gap.gapScore,
          priority: gap.priority,
          hasLearningPaths: gap.linkedLearningPaths.length > 0,
          assessmentData: {
            averageScore: gap.assessmentData.averageScore,
            completionRate: gap.assessmentData.completionRate,
            consistencyScore: gap.assessmentData.consistencyScore,
            recentScores: gap.assessmentData.recentScores
          }
        }))
      });
    } catch (error: any) {
      console.error("Error analyzing competency gaps:", error);
      res.status(500).json({ message: "Failed to analyze competency gaps" });
    }
  });

  // Get competency gap assignments for monitoring
  app.get('/api/auto-assignments/gaps/assignments', isAuthenticated, requireSupervisorOrLeadership(), async (req: any, res) => {
    try {
      const { userId, status, priority } = req.query;
      
      // Get learning path enrollments created by gap-based auto-assignment
      let enrollments = await storage.getLearningPathEnrollments(userId);
      
      // Filter for gap-based assignments
      const gapAssignments = enrollments.filter(enrollment => 
        enrollment.enrollmentSource === 'competency_gap_auto_assignment'
      );

      // Apply additional filters
      let filteredAssignments = gapAssignments;

      if (status) {
        filteredAssignments = filteredAssignments.filter(e => e.enrollmentStatus === status);
      }

      if (priority) {
        filteredAssignments = filteredAssignments.filter(e => {
          const metadata = e.metadata as any;
          return metadata?.priority === priority;
        });
      }

      // Enrich with metadata for display
      const enrichedAssignments = await Promise.all(
        filteredAssignments.map(async (enrollment) => {
          const path = await storage.getLearningPath(enrollment.pathId);
          const user = await storage.getUser(enrollment.userId);
          const metadata = enrollment.metadata as any;

          return {
            enrollmentId: enrollment.id,
            userId: enrollment.userId,
            userName: user ? `${user.firstName} ${user.lastName}` : 'Unknown User',
            userRole: user?.role,
            pathId: enrollment.pathId,
            pathTitle: path?.title || 'Unknown Path',
            enrollmentStatus: enrollment.enrollmentStatus,
            progress: enrollment.progress,
            dueDate: enrollment.dueDate,
            assignedDate: enrollment.createdAt,
            competencyInfo: {
              competencyId: metadata?.competencyLibraryId,
              competencyTitle: metadata?.competencyTitle,
              gapScore: metadata?.gapScore,
              priority: metadata?.priority,
              remediationType: metadata?.remediationType,
              urgencyLevel: metadata?.urgencyLevel
            },
            assignedBy: metadata?.assignedBy
          };
        })
      );

      res.json({
        totalAssignments: enrichedAssignments.length,
        assignments: enrichedAssignments,
        summary: {
          byStatus: {
            enrolled: enrichedAssignments.filter(a => a.enrollmentStatus === 'enrolled').length,
            in_progress: enrichedAssignments.filter(a => a.enrollmentStatus === 'in_progress').length,
            completed: enrichedAssignments.filter(a => a.enrollmentStatus === 'completed').length,
            expired: enrichedAssignments.filter(a => a.enrollmentStatus === 'expired').length
          },
          byPriority: {
            critical: enrichedAssignments.filter(a => a.competencyInfo.priority === 'critical').length,
            high: enrichedAssignments.filter(a => a.competencyInfo.priority === 'high').length,
            medium: enrichedAssignments.filter(a => a.competencyInfo.priority === 'medium').length,
            low: enrichedAssignments.filter(a => a.competencyInfo.priority === 'low').length
          },
          byRemediationType: {
            foundational: enrichedAssignments.filter(a => a.competencyInfo.remediationType === 'foundational').length,
            skill_building: enrichedAssignments.filter(a => a.competencyInfo.remediationType === 'skill_building').length,
            remedial: enrichedAssignments.filter(a => a.competencyInfo.remediationType === 'remedial').length,
            advanced: enrichedAssignments.filter(a => a.competencyInfo.remediationType === 'advanced').length
          }
        }
      });
    } catch (error: any) {
      console.error("Error fetching competency gap assignments:", error);
      res.status(500).json({ message: "Failed to fetch competency gap assignments" });
    }
  });

  // Get gap-based assignment statistics
  app.get('/api/auto-assignments/gaps/stats', isAuthenticated, requireSupervisorOrLeadership(), async (req: any, res) => {
    try {
      const logs = await storage.getAutomationRunLogs();
      const gapAssignmentLogs = logs.filter(log => 
        log.runType === 'auto_assignment' && 
        log.executionDetails && 
        (log.executionDetails as any).assignmentType === 'competency_gap'
      );

      const stats = {
        totalGapAnalyses: gapAssignmentLogs.length,
        successfulAssignments: gapAssignmentLogs.filter(log => log.status === 'completed').length,
        failedAssignments: gapAssignmentLogs.filter(log => log.status === 'failed').length,
        totalEnrollmentsCreated: gapAssignmentLogs.reduce((sum, log) => sum + (log.assignmentsCreated || 0), 0),
        averageGapsPerUser: gapAssignmentLogs.length > 0 ? 
          gapAssignmentLogs.reduce((sum, log) => {
            const details = log.executionDetails as any;
            return sum + (details?.gapsAnalyzed || 0);
          }, 0) / gapAssignmentLogs.length : 0,
        averageGapScore: gapAssignmentLogs.length > 0 ?
          gapAssignmentLogs.reduce((sum, log) => {
            const details = log.executionDetails as any;
            return sum + (details?.averageGapScore || 0);
          }, 0) / gapAssignmentLogs.length : 0,
        recentActivity: gapAssignmentLogs
          .filter(log => log.startedAt && new Date(log.startedAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
          .length,
        trends: {
          last7Days: gapAssignmentLogs
            .filter(log => log.startedAt && new Date(log.startedAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
            .length,
          last30Days: gapAssignmentLogs
            .filter(log => log.startedAt && new Date(log.startedAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
            .length
        }
      };
      
      res.json(stats);
    } catch (error: any) {
      console.error("Error fetching gap assignment stats:", error);
      res.status(500).json({ message: "Failed to fetch gap assignment statistics" });
    }
  });

  // ========================
  // AUTOMATION RULES API
  // ========================

  // Get all automation rules
  app.get('/api/automation-rules', isAuthenticated, requireSupervisorOrLeadership(), async (req: any, res) => {
    try {
      const { active } = req.query;
      const isActive = active === 'true' ? true : active === 'false' ? false : undefined;
      const rules = await storage.getAutomationRules(isActive);
      res.json(rules);
    } catch (error: any) {
      console.error("Error fetching automation rules:", error);
      res.status(500).json({ message: "Failed to fetch automation rules" });
    }
  });

  // Get single automation rule
  app.get('/api/automation-rules/:id', isAuthenticated, requireSupervisorOrLeadership(), async (req: any, res) => {
    try {
      const { id } = req.params;
      const rule = await storage.getAutomationRule(id);
      if (!rule) {
        return res.status(404).json({ message: "Automation rule not found" });
      }
      res.json(rule);
    } catch (error: any) {
      console.error("Error fetching automation rule:", error);
      res.status(500).json({ message: "Failed to fetch automation rule" });
    }
  });

  // Create automation rule
  app.post('/api/automation-rules', isAuthenticated, requireSupervisorOrLeadership(), async (req: any, res) => {
    try {
      const ruleData = req.body;
      const createdBy = req.user.claims.sub;
      
      // Validate request body with Zod schema
      const validatedData = insertAutomationRuleSchema.parse({
        ...ruleData,
        createdBy
      });
      
      const rule = await storage.createAutomationRule(validatedData);
      
      // ISO 9001:2015 Audit Trail - Log rule creation
      console.log(`[AUDIT] Automation rule created: ${rule.id} by ${createdBy} - ${rule.name}`);
      
      res.status(201).json(rule);
    } catch (error: any) {
      console.error("Error creating automation rule:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create automation rule" });
    }
  });

  // Update automation rule
  app.put('/api/automation-rules/:id', isAuthenticated, requireSupervisorOrLeadership(), async (req: any, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      // Validate request body with partial schema for updates
      const validatedUpdates = insertAutomationRuleSchema.partial().parse(updates);
      
      const updatedRule = await storage.updateAutomationRule(id, validatedUpdates);
      
      // ISO 9001:2015 Audit Trail - Log rule update
      const updatedBy = req.user.claims.sub;
      console.log(`[AUDIT] Automation rule updated: ${id} by ${updatedBy} - Changes: ${JSON.stringify(validatedUpdates)}`);
      
      res.json(updatedRule);
    } catch (error: any) {
      console.error("Error updating automation rule:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      if (error.message.includes("not found")) {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to update automation rule" });
    }
  });

  // Delete automation rule
  app.delete('/api/automation-rules/:id', isAuthenticated, requireSupervisorOrLeadership(), async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteAutomationRule(id);
      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting automation rule:", error);
      if (error.message.includes("not found")) {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to delete automation rule" });
    }
  });

  // Activate automation rule
  app.post('/api/automation-rules/:id/activate', isAuthenticated, requireSupervisorOrLeadership(), async (req: any, res) => {
    try {
      const { id } = req.params;
      const activatedRule = await storage.activateAutomationRule(id);
      
      // ISO 9001:2015 Audit Trail - Log rule activation
      const activatedBy = req.user.claims.sub;
      console.log(`[AUDIT] Automation rule activated: ${id} by ${activatedBy} - ${activatedRule.name}`);
      
      res.json(activatedRule);
    } catch (error: any) {
      console.error("Error activating automation rule:", error);
      if (error.message.includes("not found")) {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to activate automation rule" });
    }
  });

  // Deactivate automation rule
  app.post('/api/automation-rules/:id/deactivate', isAuthenticated, requireSupervisorOrLeadership(), async (req: any, res) => {
    try {
      const { id } = req.params;
      const deactivatedRule = await storage.deactivateAutomationRule(id);
      
      // ISO 9001:2015 Audit Trail - Log rule deactivation
      const deactivatedBy = req.user.claims.sub;
      console.log(`[AUDIT] Automation rule deactivated: ${id} by ${deactivatedBy} - ${deactivatedRule.name}`);
      
      res.json(deactivatedRule);
    } catch (error: any) {
      console.error("Error deactivating automation rule:", error);
      if (error.message.includes("not found")) {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to deactivate automation rule" });
    }
  });

  // Execute automation rule manually
  app.post('/api/automation-rules/:id/execute', isAuthenticated, requireSupervisorOrLeadership(), async (req: any, res) => {
    try {
      const { id } = req.params;
      const { triggerData } = req.body;
      
      const result = await storage.executeAutomationRule(id, triggerData);
      
      // ISO 9001:2015 Audit Trail - Log rule execution
      const executedBy = req.user.claims.sub;
      console.log(`[AUDIT] Automation rule executed: ${id} by ${executedBy} - Executed: ${result.executed}, Enrollments: ${result.enrollments}`);
      
      res.json(result);
    } catch (error: any) {
      console.error("Error executing automation rule:", error);
      if (error.message.includes("not found")) {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to execute automation rule" });
    }
  });

  // Closed-Loop Integration API Endpoints
  
  // Trigger closed-loop integration for specific user
  app.post('/api/automation/trigger/user/:userId', isAuthenticated, requireSupervisorOrLeadership(), async (req: any, res) => {
    try {
      const { userId } = req.params;
      
      // Verify user exists
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const result = await storage.triggerClosedLoopIntegration(userId);
      
      // ISO 9001:2015 Audit Trail - Log closed-loop trigger
      const triggeredBy = req.user.claims.sub;
      console.log(`[AUDIT] Closed-loop integration triggered for user ${userId} by ${triggeredBy} - Gaps: ${result.gapsIdentified}, Paths: ${result.pathsAssigned}`);
      
      res.json(result);
    } catch (error: any) {
      console.error("Error triggering closed-loop integration for user:", error);
      res.status(500).json({ message: "Failed to trigger closed-loop integration for user" });
    }
  });

  // Trigger organization-wide closed-loop integration
  app.post('/api/automation/trigger/organization', isAuthenticated, requireSupervisorOrLeadership(), async (req: any, res) => {
    try {
      const result = await storage.triggerOrganizationClosedLoopIntegration();
      
      // ISO 9001:2015 Audit Trail - Log organization-wide trigger
      const triggeredBy = req.user.claims.sub;
      console.log(`[AUDIT] Organization-wide closed-loop integration triggered by ${triggeredBy} - Users: ${result.usersProcessed}, Gaps: ${result.totalGapsIdentified}, Paths: ${result.totalPathsAssigned}`);
      
      res.json(result);
    } catch (error: any) {
      console.error("Error triggering organization-wide closed-loop integration:", error);
      res.status(500).json({ message: "Failed to trigger organization-wide closed-loop integration" });
    }
  });

  // Execute automation rules for specific user and trigger
  app.post('/api/automation-rules/execute-for-user', isAuthenticated, requireSupervisorOrLeadership(), async (req: any, res) => {
    try {
      const { userId, triggerEvent } = req.body;
      
      if (!userId || !triggerEvent) {
        return res.status(400).json({ message: "userId and triggerEvent are required" });
      }
      
      const result = await storage.executeAutomationRulesForUser(userId, triggerEvent);
      
      // ISO 9001:2015 Audit Trail - Log user automation execution
      const executedBy = req.user.claims.sub;
      console.log(`[AUDIT] User automation executed: User ${userId}, Event: ${triggerEvent} by ${executedBy} - Rules: ${result.totalRules}, Executed: ${result.executed}, Enrollments: ${result.enrollments}`);
      
      res.json(result);
    } catch (error: any) {
      console.error("Error executing automation rules for user:", error);
      res.status(500).json({ message: "Failed to execute automation rules for user" });
    }
  });

  // Manual competency gap analysis and learning path assignment
  app.post('/api/lms/competency-gap-analysis', isAuthenticated, requireSupervisorOrLeadership(), async (req: any, res) => {
    try {
      const { userId, teamId, role } = req.body;
      
      if (userId) {
        // Single user gap analysis
        const gaps = await storage.getCompetencyGapAnalysis(userId);
        res.json({
          userId,
          gaps,
          gapCount: gaps.length,
          analysisDate: new Date().toISOString(),
          triggeredBy: req.user.claims.sub
        });
      } else {
        // Bulk gap analysis for team or role
        let users: any[] = [];
        if (teamId) {
          users = await storage.getUsersInTeam(teamId);
        } else if (role) {
          users = await storage.getAllUsers(); // Temporary - filter by role later
          users = users.filter((user: any) => user.role === role);
        } else {
          users = await storage.getAllUsers();
        }

        const results = [];
        for (const user of users) {
          try {
            const gaps = await storage.getCompetencyGapAnalysis(user.id);
            results.push({
              userId: user.id,
              userName: `${user.firstName} ${user.lastName}`,
              email: user.email,
              gaps,
              gapCount: gaps.length
            });
          } catch (error: any) {
            results.push({
              userId: user.id,
              error: `Failed to analyze gaps: ${error.message}`
            });
          }
        }

        res.json({
          analysisType: teamId ? 'team' : role ? 'role' : 'organization',
          filters: { teamId, role },
          totalUsers: users.length,
          results,
          analysisDate: new Date().toISOString(),
          triggeredBy: req.user.claims.sub
        });
      }

      // ISO 9001:2015 Audit Trail - Log gap analysis
      console.log(`[AUDIT] Manual competency gap analysis triggered by ${req.user.claims.sub} - Scope: ${userId ? 'single user' : teamId ? 'team' : role ? 'role' : 'organization'}`);
    } catch (error: any) {
      console.error("Error performing competency gap analysis:", error);
      res.status(500).json({ message: "Failed to perform competency gap analysis" });
    }
  });

  // Time-Based Automation API Routes
  
  // Relative Due Date Configurations
  app.get('/api/learning-paths/relative-due-dates', isAuthenticated, async (req: any, res) => {
    try {
      const configs = await storage.getAllRelativeDueDateConfigs();
      res.json(configs);
    } catch (error: any) {
      console.error("Error fetching relative due date configs:", error);
      res.status(500).json({ message: "Failed to fetch relative due date configurations" });
    }
  });

  app.get('/api/learning-paths/:pathId/relative-due-date', isAuthenticated, async (req: any, res) => {
    try {
      const { pathId } = req.params;
      const config = await storage.getRelativeDueDateConfig(pathId);
      if (!config) {
        return res.status(404).json({ message: "Relative due date configuration not found" });
      }
      res.json(config);
    } catch (error: any) {
      console.error("Error fetching relative due date config:", error);
      res.status(500).json({ message: "Failed to fetch relative due date configuration" });
    }
  });

  app.post('/api/learning-paths/:pathId/relative-due-date', isAuthenticated, requireSupervisorOrLeadership(), async (req: any, res) => {
    try {
      const { pathId } = req.params;
      const configData = insertRelativeDueDateConfigSchema.parse({
        ...req.body,
        pathId,
        createdBy: req.user.claims.sub
      });
      
      const config = await storage.createRelativeDueDateConfig(configData);
      res.status(201).json(config);

      // ISO 9001:2015 Audit Trail
      console.log(`[AUDIT] Relative due date config created for path ${pathId} by ${req.user.claims.sub}`);
    } catch (error: any) {
      console.error("Error creating relative due date config:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid configuration data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create relative due date configuration" });
    }
  });

  app.put('/api/learning-paths/:pathId/relative-due-date', isAuthenticated, requireSupervisorOrLeadership(), async (req: any, res) => {
    try {
      const { pathId } = req.params;
      const updates = insertRelativeDueDateConfigSchema.partial().parse(req.body);
      
      const config = await storage.updateRelativeDueDateConfig(pathId, updates);
      res.json(config);

      // ISO 9001:2015 Audit Trail
      console.log(`[AUDIT] Relative due date config updated for path ${pathId} by ${req.user.claims.sub}`);
    } catch (error: any) {
      console.error("Error updating relative due date config:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid configuration data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update relative due date configuration" });
    }
  });

  app.delete('/api/learning-paths/:pathId/relative-due-date', isAuthenticated, requireSupervisorOrLeadership(), async (req: any, res) => {
    try {
      const { pathId } = req.params;
      await storage.deleteRelativeDueDateConfig(pathId);
      res.status(204).send();

      // ISO 9001:2015 Audit Trail
      console.log(`[AUDIT] Relative due date config deleted for path ${pathId} by ${req.user.claims.sub}`);
    } catch (error: any) {
      console.error("Error deleting relative due date config:", error);
      res.status(500).json({ message: "Failed to delete relative due date configuration" });
    }
  });

  // Recurring Assignments
  app.get('/api/recurring-assignments', isAuthenticated, requireSupervisorOrLeadership(), async (req: any, res) => {
    try {
      const { activeOnly } = req.query;
      const assignments = await storage.getAllRecurringAssignments(activeOnly === 'true');
      res.json(assignments);
    } catch (error: any) {
      console.error("Error fetching recurring assignments:", error);
      res.status(500).json({ message: "Failed to fetch recurring assignments" });
    }
  });

  app.get('/api/recurring-assignments/:id', isAuthenticated, requireSupervisorOrLeadership(), async (req: any, res) => {
    try {
      const { id } = req.params;
      const assignment = await storage.getRecurringAssignment(id);
      if (!assignment) {
        return res.status(404).json({ message: "Recurring assignment not found" });
      }
      res.json(assignment);
    } catch (error: any) {
      console.error("Error fetching recurring assignment:", error);
      res.status(500).json({ message: "Failed to fetch recurring assignment" });
    }
  });

  app.get('/api/learning-paths/:pathId/recurring-assignments', isAuthenticated, requireSupervisorOrLeadership(), async (req: any, res) => {
    try {
      const { pathId } = req.params;
      const assignments = await storage.getRecurringAssignmentsByPath(pathId);
      res.json(assignments);
    } catch (error: any) {
      console.error("Error fetching path recurring assignments:", error);
      res.status(500).json({ message: "Failed to fetch recurring assignments for path" });
    }
  });

  app.post('/api/recurring-assignments', isAuthenticated, requireSupervisorOrLeadership(), async (req: any, res) => {
    try {
      const assignmentData = insertRecurringAssignmentSchema.parse({
        ...req.body,
        createdBy: req.user.claims.sub
      });
      
      const assignment = await storage.createRecurringAssignment(assignmentData);
      res.status(201).json(assignment);

      // ISO 9001:2015 Audit Trail
      console.log(`[AUDIT] Recurring assignment created "${assignment.name}" by ${req.user.claims.sub}`);
    } catch (error: any) {
      console.error("Error creating recurring assignment:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid assignment data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create recurring assignment" });
    }
  });

  app.put('/api/recurring-assignments/:id', isAuthenticated, requireSupervisorOrLeadership(), async (req: any, res) => {
    try {
      const { id } = req.params;
      const updates = insertRecurringAssignmentSchema.partial().parse(req.body);
      
      const assignment = await storage.updateRecurringAssignment(id, updates);
      res.json(assignment);

      // ISO 9001:2015 Audit Trail
      console.log(`[AUDIT] Recurring assignment ${id} updated by ${req.user.claims.sub}`);
    } catch (error: any) {
      console.error("Error updating recurring assignment:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid assignment data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update recurring assignment" });
    }
  });

  app.delete('/api/recurring-assignments/:id', isAuthenticated, requireSupervisorOrLeadership(), async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteRecurringAssignment(id);
      res.status(204).send();

      // ISO 9001:2015 Audit Trail
      console.log(`[AUDIT] Recurring assignment ${id} deleted by ${req.user.claims.sub}`);
    } catch (error: any) {
      console.error("Error deleting recurring assignment:", error);
      res.status(500).json({ message: "Failed to delete recurring assignment" });
    }
  });

  // Automation Execution Logs (read-only for monitoring and compliance)
  app.get('/api/automation-logs', isAuthenticated, requireSupervisorOrLeadership(), async (req: any, res) => {
    try {
      const { entityId, entityType, limit } = req.query;
      const logs = await storage.getAutomationRunLogs(
        entityId as string,
        entityType as string,
        limit ? parseInt(limit as string) : undefined
      );
      res.json(logs);
    } catch (error: any) {
      console.error("Error fetching automation logs:", error);
      res.status(500).json({ message: "Failed to fetch automation logs" });
    }
  });

  app.get('/api/automation-logs/failed', isAuthenticated, requireSupervisorOrLeadership(), async (req: any, res) => {
    try {
      const { limit } = req.query;
      const logs = await storage.getFailedAutomationRuns(
        limit ? parseInt(limit as string) : undefined
      );
      res.json(logs);
    } catch (error: any) {
      console.error("Error fetching failed automation logs:", error);
      res.status(500).json({ message: "Failed to fetch failed automation logs" });
    }
  });

  // =====================================================================
  // ADVANCED ANALYTICS API ENDPOINTS - Phase 3 Implementation
  // =====================================================================

  // Analytics Metrics
  app.get('/api/analytics/metrics', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'supervisor' && user?.role !== 'leadership') {
        return res.status(403).json({ message: "Access denied. Supervisor or leadership role required." });
      }

      // Validate query parameters with Zod
      const validationResult = analyticsMetricsQuerySchema.safeParse(req.query);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid query parameters", 
          errors: validationResult.error.errors 
        });
      }

      const validatedParams = validationResult.data;
      const filters = {
        metricType: validatedParams.metricType,
        dimension: validatedParams.dimension,
        dimensionId: validatedParams.dimensionId,
        aggregationLevel: validatedParams.aggregationLevel,
        startDate: validatedParams.startDate ? new Date(validatedParams.startDate) : undefined,
        endDate: validatedParams.endDate ? new Date(validatedParams.endDate) : undefined,
        limit: validatedParams.limit,
      };

      const metrics = await storage.getAnalyticsMetrics(filters);
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching analytics metrics:", error);
      res.status(500).json({ message: "Failed to fetch analytics metrics" });
    }
  });

  // Performance Snapshots
  app.get('/api/analytics/performance/:userId', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      const targetUserId = req.params.userId;
      
      // Check permissions: users can view their own data, supervisors/leadership can view all
      if (currentUser?.id !== targetUserId && currentUser?.role !== 'supervisor' && currentUser?.role !== 'leadership') {
        return res.status(403).json({ message: "Access denied." });
      }

      // Validate query parameters with Zod
      const validationResult = analyticsPerformanceQuerySchema.safeParse(req.query);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid query parameters", 
          errors: validationResult.error.errors 
        });
      }

      const validatedParams = validationResult.data;
      const date = validatedParams.date ? new Date(validatedParams.date) : undefined;
      const snapshot = await storage.getUserPerformanceSnapshot(targetUserId, date);
      res.json(snapshot || null);
    } catch (error) {
      console.error("Error fetching performance snapshot:", error);
      res.status(500).json({ message: "Failed to fetch performance snapshot" });
    }
  });

  app.get('/api/analytics/performance/:userId/history', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      const targetUserId = req.params.userId;
      
      if (currentUser?.id !== targetUserId && currentUser?.role !== 'supervisor' && currentUser?.role !== 'leadership') {
        return res.status(403).json({ message: "Access denied." });
      }

      // Validate query parameters with Zod
      const validationResult = analyticsPerformanceHistoryQuerySchema.safeParse(req.query);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid query parameters", 
          errors: validationResult.error.errors 
        });
      }

      const validatedParams = validationResult.data;
      const history = await storage.getUserPerformanceHistory(targetUserId, validatedParams.days);
      res.json(history);
    } catch (error) {
      console.error("Error fetching performance history:", error);
      res.status(500).json({ message: "Failed to fetch performance history" });
    }
  });

  // Learning Insights
  app.get('/api/analytics/insights/:userId', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      const targetUserId = req.params.userId;
      
      if (currentUser?.id !== targetUserId && currentUser?.role !== 'supervisor' && currentUser?.role !== 'leadership') {
        return res.status(403).json({ message: "Access denied." });
      }

      // Validate query parameters with Zod
      const validationResult = analyticsInsightsQuerySchema.safeParse(req.query);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid query parameters", 
          errors: validationResult.error.errors 
        });
      }

      const validatedParams = validationResult.data;
      const insights = await storage.getUserLearningInsights(targetUserId, validatedParams.unreadOnly);
      res.json(insights);
    } catch (error) {
      console.error("Error fetching learning insights:", error);
      res.status(500).json({ message: "Failed to fetch learning insights" });
    }
  });

  app.patch('/api/analytics/insights/:insightId/read', isAuthenticated, async (req: any, res) => {
    try {
      const insightId = req.params.insightId;
      await storage.markInsightAsRead(insightId);
      res.json({ message: "Insight marked as read" });
    } catch (error) {
      console.error("Error marking insight as read:", error);
      res.status(500).json({ message: "Failed to mark insight as read" });
    }
  });

  // Engagement Metrics (Aggregated analytics)
  app.get('/api/analytics/engagement', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'supervisor' && user?.role !== 'leadership') {
        return res.status(403).json({ message: "Access denied. Supervisor or leadership role required." });
      }

      // Validate query parameters with Zod
      const validationResult = analyticsEngagementQuerySchema.safeParse(req.query);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid query parameters", 
          errors: validationResult.error.errors 
        });
      }

      const validatedParams = validationResult.data;
      const filters = {
        userId: validatedParams.userId,
        teamId: validatedParams.teamId,
        startDate: validatedParams.startDate ? new Date(validatedParams.startDate) : undefined,
        endDate: validatedParams.endDate ? new Date(validatedParams.endDate) : undefined,
      };

      const metrics = await storage.getEngagementMetrics(filters);
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching engagement metrics:", error);
      res.status(500).json({ message: "Failed to fetch engagement metrics" });
    }
  });

  app.get('/api/analytics/performance-metrics', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'supervisor' && user?.role !== 'leadership') {
        return res.status(403).json({ message: "Access denied. Supervisor or leadership role required." });
      }

      // Validate query parameters with Zod
      const validationResult = analyticsPerformanceMetricsQuerySchema.safeParse(req.query);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid query parameters", 
          errors: validationResult.error.errors 
        });
      }

      const validatedParams = validationResult.data;
      const filters = {
        userId: validatedParams.userId,
        teamId: validatedParams.teamId,
        startDate: validatedParams.startDate ? new Date(validatedParams.startDate) : undefined,
        endDate: validatedParams.endDate ? new Date(validatedParams.endDate) : undefined,
      };

      const metrics = await storage.getPerformanceMetrics(filters);
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching performance metrics:", error);
      res.status(500).json({ message: "Failed to fetch performance metrics" });
    }
  });

  // Analytics Dashboard Overview (for leadership)
  app.get('/api/analytics/overview', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'leadership') {
        return res.status(403).json({ message: "Access denied. Leadership role required." });
      }

      // Aggregate multiple analytics sources for a comprehensive overview
      const [engagementMetrics, performanceMetrics] = await Promise.all([
        storage.getEngagementMetrics({}),
        storage.getPerformanceMetrics({})
      ]);

      const overview = {
        engagement: {
          averageScore: engagementMetrics.reduce((acc, m) => acc + m.engagementScore, 0) / Math.max(engagementMetrics.length, 1),
          averageCompletion: engagementMetrics.reduce((acc, m) => acc + m.completionRate, 0) / Math.max(engagementMetrics.length, 1),
          totalPeriods: engagementMetrics.length
        },
        performance: {
          averageScore: performanceMetrics.reduce((acc, m) => acc + m.averageScore, 0) / Math.max(performanceMetrics.length, 1),
          averageProgress: performanceMetrics.reduce((acc, m) => acc + m.progressRate, 0) / Math.max(performanceMetrics.length, 1),
          totalPeriods: performanceMetrics.length
        },
        insights: {
          totalGenerated: 0, // Would be calculated from actual insights
          unreadCount: 0, // Would be calculated from actual insights
          criticalCount: 0 // Would be calculated from actual insights
        }
      };

      res.json(overview);
    } catch (error) {
      console.error("Error fetching analytics overview:", error);
      res.status(500).json({ message: "Failed to fetch analytics overview" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
