import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import {
  insertGoalSchema,
  insertWeeklyCheckInSchema,
  insertUserCompetencySchema,
  insertDevelopmentPlanSchema,
  insertMeetingSchema,
  insertRecognitionSchema,
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
