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
} from "@shared/schema";

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

  const httpServer = createServer(app);
  return httpServer;
}
