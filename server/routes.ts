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
} from "@shared/schema";

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
      const user = await storage.getUser(userId);
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
      const enrollmentData = insertEnrollmentSchema.parse({ ...req.body, userId });
      const enrollment = await storage.enrollUser(enrollmentData);
      res.json(enrollment);
    } catch (error: any) {
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

  app.post('/api/lms/quizzes/:quizId/attempts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { quizId } = req.params;
      const { enrollmentId, attemptNumber } = req.body;
      
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

  // Get quizzes for a specific lesson (admin endpoint)
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

  // Admin Lesson Management
  app.post('/api/lms/admin/courses/:courseId/lessons', isAuthenticated, requireSupervisorOrLeadership(), async (req: any, res) => {
    try {
      const { courseId } = req.params;
      
      // First get or create a default module for this course
      let defaultModule = await storage.getDefaultCourseModule(courseId);
      if (!defaultModule) {
        defaultModule = await storage.createCourseModule({
          courseVersionId: courseId, // For simplicity, using courseId as course version
          title: "Main Content",
          description: "Main course content and lessons",
          orderIndex: 1
        });
      }
      
      // Transform frontend lesson data to match database schema
      const lessonData = {
        moduleId: defaultModule.id,
        title: req.body.title,
        description: req.body.description || "",
        type: "video" as const, // Default to video type
        orderIndex: req.body.order || 1,
        vimeoVideoId: req.body.vimeoVideoId,
        estimatedDuration: req.body.estimatedMinutes ? req.body.estimatedMinutes * 60 : 1800, // Convert minutes to seconds
        isRequired: true
      };
      
      const lesson = await storage.createLesson(lessonData);
      res.json(lesson);
    } catch (error: any) {
      console.error("Error creating lesson:", error);
      return handleValidationError(error, res, "create lesson");
    }
  });

  // Admin Quiz Management
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
      const badgeData = insertBadgeSchema.parse(req.body);
      const badge = await storage.createBadge(badgeData);
      res.json(badge);
    } catch (error: any) {
      return handleValidationError(error, res, "create badge");
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

  const httpServer = createServer(app);
  return httpServer;
}
