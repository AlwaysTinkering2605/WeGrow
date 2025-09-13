import {
  users,
  teams,
  companyObjectives,
  teamObjectives,
  teamKeyResults,
  keyResults,
  goals,
  weeklyCheckIns,
  competencies,
  userCompetencies,
  developmentPlans,
  learningResources,
  meetings,
  recognitions,
  type User,
  type UpsertUser,
  type CompanyObjective,
  type TeamObjective,
  type TeamKeyResult,
  type Goal,
  type WeeklyCheckIn,
  type Competency,
  type UserCompetency,
  type DevelopmentPlan,
  type LearningResource,
  type Meeting,
  type Recognition,
  type InsertCompanyObjective,
  type InsertTeamObjective,
  type InsertTeamKeyResult,
  type InsertGoal,
  type InsertWeeklyCheckIn,
  type InsertUserCompetency,
  type InsertDevelopmentPlan,
  type InsertMeeting,
  type InsertRecognition,
  insertTeamSchema,
  updateUserProfileSchema,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql } from "drizzle-orm";

export interface IStorage {
  // User operations - required for Replit Auth
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  
  // Company objectives
  getActiveCompanyObjectives(): Promise<CompanyObjective[]>;
  createCompanyObjective(objective: InsertCompanyObjective): Promise<CompanyObjective>;
  updateCompanyObjective(id: string, objective: Partial<InsertCompanyObjective>): Promise<CompanyObjective>;
  deleteCompanyObjective(id: string): Promise<void>;
  
  // Team objectives
  getTeamObjectives(teamName?: string, supervisorId?: string): Promise<TeamObjective[]>;
  createTeamObjective(objective: InsertTeamObjective): Promise<TeamObjective>;
  updateTeamObjective(id: string, objective: Partial<InsertTeamObjective>): Promise<TeamObjective>;
  deleteTeamObjective(id: string): Promise<void>;
  
  // Team key results
  getTeamKeyResults(teamObjectiveId: string): Promise<TeamKeyResult[]>;
  createTeamKeyResult(keyResult: InsertTeamKeyResult): Promise<TeamKeyResult>;
  
  // Goals
  getUserGoals(userId: string): Promise<Goal[]>;
  createGoal(goal: InsertGoal): Promise<Goal>;
  updateGoalProgress(goalId: string, currentValue: number): Promise<Goal>;
  getGoal(goalId: string): Promise<Goal | undefined>;
  verifyGoalOwnership(goalId: string, userId: string): Promise<boolean>;
  
  // Weekly check-ins
  getUserCheckIns(userId: string): Promise<WeeklyCheckIn[]>;
  getLatestCheckIn(goalId: string): Promise<WeeklyCheckIn | undefined>;
  createCheckIn(checkIn: InsertWeeklyCheckIn): Promise<WeeklyCheckIn>;
  createCheckInWithGoalUpdate(checkIn: InsertWeeklyCheckIn, absoluteProgress: number): Promise<WeeklyCheckIn>;
  
  // Competencies
  getCompetencies(): Promise<Competency[]>;
  getUserCompetencies(userId: string): Promise<any[]>;
  createUserCompetency(userCompetency: InsertUserCompetency): Promise<UserCompetency>;
  
  // Development plans
  getUserDevelopmentPlans(userId: string): Promise<DevelopmentPlan[]>;
  createDevelopmentPlan(plan: InsertDevelopmentPlan): Promise<DevelopmentPlan>;
  
  // Learning resources
  getLearningResources(): Promise<LearningResource[]>;
  
  // Meetings
  getUserMeetings(userId: string): Promise<Meeting[]>;
  createMeeting(meeting: InsertMeeting): Promise<Meeting>;
  updateMeeting(meetingId: string, updates: Partial<Meeting>): Promise<Meeting>;
  verifyMeetingAccess(meetingId: string, userId: string): Promise<boolean>;
  
  // Recognition
  getRecentRecognitions(limit?: number): Promise<Recognition[]>;
  getUserRelevantRecognitions(userId: string, limit?: number): Promise<any[]>;
  createRecognition(recognition: InsertRecognition): Promise<Recognition>;
  getUserRecognitionStats(userId: string): Promise<{ sent: number; received: number }>;

  // Team Management
  getTeamMembers(userId: string): Promise<User[]>;
  getTeamGoals(userId: string): Promise<Goal[]>;

  // Formal Teams Management
  getAllTeams(): Promise<any[]>;
  getTeam(teamId: string): Promise<any | undefined>;
  createTeam(team: any): Promise<any>;
  updateTeam(teamId: string, updates: any): Promise<any>;
  deleteTeam(teamId: string): Promise<void>;
  getTeamHierarchy(): Promise<any[]>;
  assignUserToTeam(userId: string, teamId: string): Promise<User>;

  // Enhanced User Profile Management
  updateUserProfile(userId: string, updates: any, updatedByUserId: string): Promise<User>;
  updateUserRole(userId: string, newRole: string, updatedByUserId: string): Promise<User>;
  getUsersByManager(managerId: string): Promise<User[]>;
  getUsersInTeam(teamId: string): Promise<User[]>;

  // Company Reports
  getCompanyMetrics(): Promise<{
    totalEmployees: number;
    avgGoalCompletion: number;
    totalGoalsCompleted: number;
    totalGoalsActive: number;
    avgDevelopmentProgress: number;
    recognitionsSent: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  // User operations - required for Replit Auth
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    // First check if user already exists
    const existingUser = await this.getUser(userData.id!);
    
    if (existingUser) {
      // User exists - only update basic profile info, preserve role and other fields
      const [user] = await db
        .update(users)
        .set({
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          profileImageUrl: userData.profileImageUrl,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userData.id!))
        .returning();
      return user;
    } else {
      // New user - create with all provided data
      const [user] = await db
        .insert(users)
        .values({
          ...userData,
        })
        .returning();
      return user;
    }
  }

  async getAllUsers(): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .orderBy(users.firstName, users.lastName);
  }

  // Company objectives
  async getActiveCompanyObjectives(): Promise<CompanyObjective[]> {
    return await db
      .select()
      .from(companyObjectives)
      .where(eq(companyObjectives.isActive, true))
      .orderBy(desc(companyObjectives.startDate));
  }

  async createCompanyObjective(objective: InsertCompanyObjective): Promise<CompanyObjective> {
    const [created] = await db
      .insert(companyObjectives)
      .values(objective)
      .returning();
    return created;
  }

  async updateCompanyObjective(id: string, objective: Partial<InsertCompanyObjective>): Promise<CompanyObjective> {
    const [updated] = await db
      .update(companyObjectives)
      .set({ ...objective, updatedAt: new Date() })
      .where(eq(companyObjectives.id, id))
      .returning();
    return updated;
  }

  async deleteCompanyObjective(id: string): Promise<void> {
    await db
      .update(companyObjectives)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(companyObjectives.id, id));
  }

  // Team objectives
  async getTeamObjectives(teamName?: string, supervisorId?: string): Promise<TeamObjective[]> {
    const conditions = [];
    if (teamName) conditions.push(eq(teamObjectives.teamName, teamName));
    if (supervisorId) conditions.push(eq(teamObjectives.supervisorId, supervisorId));
    
    return await db
      .select()
      .from(teamObjectives)
      .where(and(eq(teamObjectives.isActive, true), ...conditions))
      .orderBy(desc(teamObjectives.startDate));
  }

  async createTeamObjective(objective: InsertTeamObjective): Promise<TeamObjective> {
    const [created] = await db
      .insert(teamObjectives)
      .values(objective)
      .returning();
    return created;
  }

  async updateTeamObjective(id: string, objective: Partial<InsertTeamObjective>): Promise<TeamObjective> {
    const [updated] = await db
      .update(teamObjectives)
      .set({ ...objective, updatedAt: new Date() })
      .where(eq(teamObjectives.id, id))
      .returning();
    return updated;
  }

  async deleteTeamObjective(id: string): Promise<void> {
    await db
      .update(teamObjectives)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(teamObjectives.id, id));
  }

  // Team key results
  async getTeamKeyResults(teamObjectiveId: string): Promise<TeamKeyResult[]> {
    return await db
      .select()
      .from(teamKeyResults)
      .where(eq(teamKeyResults.teamObjectiveId, teamObjectiveId))
      .orderBy(teamKeyResults.createdAt);
  }

  async createTeamKeyResult(keyResult: InsertTeamKeyResult): Promise<TeamKeyResult> {
    const [created] = await db
      .insert(teamKeyResults)
      .values(keyResult)
      .returning();
    return created;
  }

  // Goals
  async getUserGoals(userId: string): Promise<Goal[]> {
    return await db
      .select()
      .from(goals)
      .where(and(eq(goals.userId, userId), eq(goals.isActive, true)))
      .orderBy(desc(goals.startDate));
  }

  async createGoal(goal: InsertGoal): Promise<Goal> {
    const [created] = await db
      .insert(goals)
      .values(goal)
      .returning();
    return created;
  }

  async updateGoalProgress(goalId: string, currentValue: number): Promise<Goal> {
    const [updated] = await db
      .update(goals)
      .set({ currentValue, updatedAt: new Date() })
      .where(eq(goals.id, goalId))
      .returning();
    return updated;
  }

  async getGoal(goalId: string): Promise<Goal | undefined> {
    const [goal] = await db.select().from(goals).where(eq(goals.id, goalId));
    return goal;
  }

  async verifyGoalOwnership(goalId: string, userId: string): Promise<boolean> {
    const [goal] = await db
      .select({ userId: goals.userId })
      .from(goals)
      .where(eq(goals.id, goalId));
    return goal?.userId === userId;
  }

  // Weekly check-ins
  async getUserCheckIns(userId: string): Promise<WeeklyCheckIn[]> {
    return await db
      .select()
      .from(weeklyCheckIns)
      .where(eq(weeklyCheckIns.userId, userId))
      .orderBy(desc(weeklyCheckIns.submittedAt));
  }

  async getLatestCheckIn(goalId: string): Promise<WeeklyCheckIn | undefined> {
    const [checkIn] = await db
      .select()
      .from(weeklyCheckIns)
      .where(eq(weeklyCheckIns.goalId, goalId))
      .orderBy(desc(weeklyCheckIns.submittedAt))
      .limit(1);
    return checkIn;
  }

  async createCheckIn(checkIn: InsertWeeklyCheckIn): Promise<WeeklyCheckIn> {
    const [created] = await db
      .insert(weeklyCheckIns)
      .values(checkIn)
      .returning();
    return created;
  }

  async createCheckInWithGoalUpdate(checkIn: InsertWeeklyCheckIn, absoluteProgress: number): Promise<WeeklyCheckIn> {
    return await db.transaction(async (tx) => {
      // Create the check-in
      const [createdCheckIn] = await tx
        .insert(weeklyCheckIns)
        .values(checkIn)
        .returning();

      // Update the goal's progress
      await tx
        .update(goals)
        .set({ currentValue: absoluteProgress, updatedAt: new Date() })
        .where(eq(goals.id, checkIn.goalId));

      return createdCheckIn;
    });
  }

  // Competencies
  async getCompetencies(): Promise<Competency[]> {
    return await db
      .select()
      .from(competencies)
      .where(eq(competencies.isActive, true))
      .orderBy(competencies.name);
  }

  async getUserCompetencies(userId: string): Promise<any[]> {
    return await db
      .select({
        id: userCompetencies.id,
        userId: userCompetencies.userId,
        competencyId: userCompetencies.competencyId,
        currentLevel: userCompetencies.currentLevel,
        targetLevel: userCompetencies.targetLevel,
        lastAssessedAt: userCompetencies.lastAssessedAt,
        updatedAt: userCompetencies.updatedAt,
        competency: {
          id: competencies.id,
          name: competencies.name,
          description: competencies.description,
          category: competencies.category,
        }
      })
      .from(userCompetencies)
      .leftJoin(competencies, eq(userCompetencies.competencyId, competencies.id))
      .where(eq(userCompetencies.userId, userId))
      .orderBy(desc(userCompetencies.updatedAt));
  }

  async createUserCompetency(userCompetencyData: InsertUserCompetency): Promise<UserCompetency> {
    const [userCompetency] = await db
      .insert(userCompetencies)
      .values({
        ...userCompetencyData,
        lastAssessedAt: new Date(),
      })
      .returning();
    return userCompetency;
  }

  // Development plans
  async getUserDevelopmentPlans(userId: string): Promise<DevelopmentPlan[]> {
    return await db
      .select()
      .from(developmentPlans)
      .where(eq(developmentPlans.userId, userId))
      .orderBy(desc(developmentPlans.createdAt));
  }

  async createDevelopmentPlan(plan: InsertDevelopmentPlan): Promise<DevelopmentPlan> {
    const [created] = await db
      .insert(developmentPlans)
      .values(plan)
      .returning();
    return created;
  }

  // Learning resources
  async getLearningResources(): Promise<LearningResource[]> {
    return await db
      .select()
      .from(learningResources)
      .where(eq(learningResources.isActive, true))
      .orderBy(learningResources.title);
  }

  // Meetings
  async getUserMeetings(userId: string): Promise<Meeting[]> {
    return await db
      .select()
      .from(meetings)
      .where(eq(meetings.employeeId, userId))
      .orderBy(desc(meetings.scheduledAt));
  }

  async createMeeting(meeting: InsertMeeting): Promise<Meeting> {
    const [created] = await db
      .insert(meetings)
      .values(meeting)
      .returning();
    return created;
  }

  async updateMeeting(meetingId: string, updates: Partial<Meeting>): Promise<Meeting> {
    const [updated] = await db
      .update(meetings)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(meetings.id, meetingId))
      .returning();
    return updated;
  }

  async verifyMeetingAccess(meetingId: string, userId: string): Promise<boolean> {
    const [meeting] = await db
      .select({ employeeId: meetings.employeeId, managerId: meetings.managerId })
      .from(meetings)
      .where(eq(meetings.id, meetingId));
    return meeting ? (meeting.employeeId === userId || meeting.managerId === userId) : false;
  }

  // Recognition
  async getRecentRecognitions(limit: number = 20): Promise<Recognition[]> {
    return await db
      .select()
      .from(recognitions)
      .where(eq(recognitions.isPublic, true))
      .orderBy(desc(recognitions.createdAt))
      .limit(limit);
  }

  async getUserRelevantRecognitions(userId: string, limit: number = 20): Promise<any[]> {
    // Get recognitions that are either public OR involve the current user
    const recognitionRecords = await db
      .select()
      .from(recognitions)
      .where(
        sql`(${recognitions.isPublic} = true) OR (${recognitions.fromUserId} = ${userId}) OR (${recognitions.toUserId} = ${userId})`
      )
      .orderBy(desc(recognitions.createdAt))
      .limit(limit);

    // Fetch associated user data for each recognition
    const enrichedRecognitions = await Promise.all(
      recognitionRecords.map(async (recognition) => {
        const [fromUser] = await db
          .select({
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email,
          })
          .from(users)
          .where(eq(users.id, recognition.fromUserId));

        const [toUser] = await db
          .select({
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email,
          })
          .from(users)
          .where(eq(users.id, recognition.toUserId));

        return {
          ...recognition,
          fromUser,
          toUser,
        };
      })
    );

    return enrichedRecognitions;
  }

  async createRecognition(recognition: InsertRecognition): Promise<Recognition> {
    const [created] = await db
      .insert(recognitions)
      .values(recognition)
      .returning();
    return created;
  }

  async getUserRecognitionStats(userId: string): Promise<{ sent: number; received: number }> {
    const [sentCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(recognitions)
      .where(eq(recognitions.fromUserId, userId));

    const [receivedCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(recognitions)
      .where(eq(recognitions.toUserId, userId));

    return {
      sent: sentCount?.count || 0,
      received: receivedCount?.count || 0,
    };
  }

  // Team Management
  async getTeamMembers(userId: string): Promise<User[]> {
    // Get users who report to this user (managerId = userId)
    return await db
      .select()
      .from(users)
      .where(eq(users.managerId, userId))
      .orderBy(users.firstName, users.lastName);
  }

  async getTeamGoals(userId: string): Promise<Goal[]> {
    // Get all goals for team members who report to this user
    const teamMemberIds = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.managerId, userId));

    if (teamMemberIds.length === 0) {
      return [];
    }

    return await db
      .select()
      .from(goals)
      .where(
        and(
          sql`${goals.userId} IN (${teamMemberIds.map(m => `'${m.id}'`).join(',')})`,
          eq(goals.isActive, true)
        )
      )
      .orderBy(desc(goals.startDate));
  }

  // Company Reports
  async getCompanyMetrics(): Promise<{
    totalEmployees: number;
    avgGoalCompletion: number;
    totalGoalsCompleted: number;
    totalGoalsActive: number;
    avgDevelopmentProgress: number;
    recognitionsSent: number;
  }> {
    // Get total employee count
    const [employeeCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users);

    // Get all active goals
    const allGoals = await db
      .select()
      .from(goals)
      .where(eq(goals.isActive, true));

    // Calculate goal completion metrics
    const totalGoalsActive = allGoals.length;
    const completedGoals = allGoals.filter(goal => 
      goal.targetValue !== null && goal.currentValue !== null && goal.currentValue >= goal.targetValue
    );
    const totalGoalsCompleted = completedGoals.length;
    const avgGoalCompletion = totalGoalsActive > 0 ? Math.round((totalGoalsCompleted / totalGoalsActive) * 100) : 0;

    // Get development plans progress
    const allDevelopmentPlans = await db
      .select()
      .from(developmentPlans);

    const completedPlans = allDevelopmentPlans.filter(plan => plan.status === 'completed');
    const avgDevelopmentProgress = allDevelopmentPlans.length > 0 
      ? Math.round((completedPlans.length / allDevelopmentPlans.length) * 100) 
      : 0;

    // Get total recognitions sent
    const [recognitionCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(recognitions);

    return {
      totalEmployees: employeeCount?.count || 0,
      avgGoalCompletion,
      totalGoalsCompleted,
      totalGoalsActive,
      avgDevelopmentProgress,
      recognitionsSent: recognitionCount?.count || 0,
    };
  }

  // Formal Teams Management
  async getAllTeams(): Promise<any[]> {
    return await db
      .select()
      .from(teams)
      .where(eq(teams.isActive, true))
      .orderBy(teams.name);
  }

  async getTeam(teamId: string): Promise<any | undefined> {
    const [team] = await db.select().from(teams).where(eq(teams.id, teamId));
    return team;
  }

  async createTeam(teamData: any): Promise<any> {
    const [team] = await db
      .insert(teams)
      .values(teamData)
      .returning();
    return team;
  }

  async updateTeam(teamId: string, updates: any): Promise<any> {
    const [team] = await db
      .update(teams)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(teams.id, teamId))
      .returning();
    return team;
  }

  async deleteTeam(teamId: string): Promise<void> {
    await db
      .update(teams)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(teams.id, teamId));
  }

  async getTeamHierarchy(): Promise<any[]> {
    // Get all teams with their parent relationships
    const allTeams = await db
      .select()
      .from(teams)
      .where(eq(teams.isActive, true))
      .orderBy(teams.name);

    // Build hierarchy structure
    const teamMap = new Map<string, any>();
    const rootTeams: any[] = [];

    // First pass: create map of all teams
    allTeams.forEach(team => {
      teamMap.set(team.id, { ...team, children: [] });
    });

    // Second pass: build hierarchy
    allTeams.forEach(team => {
      if (team.parentTeamId && teamMap.has(team.parentTeamId)) {
        teamMap.get(team.parentTeamId).children.push(teamMap.get(team.id));
      } else {
        rootTeams.push(teamMap.get(team.id));
      }
    });

    return rootTeams;
  }

  async assignUserToTeam(userId: string, teamId: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ teamId, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // Enhanced User Profile Management
  async updateUserProfile(userId: string, updates: any, updatedByUserId: string): Promise<User> {
    // Remove role from updates - should be handled separately
    const { role, ...profileUpdates } = updates;
    
    const [user] = await db
      .update(users)
      .set({ ...profileUpdates, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async updateUserRole(userId: string, newRole: string, updatedByUserId: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ role: newRole as any, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async getUsersByManager(managerId: string): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(eq(users.managerId, managerId))
      .orderBy(users.firstName, users.lastName);
  }

  async getUsersInTeam(teamId: string): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(eq(users.teamId, teamId))
      .orderBy(users.firstName, users.lastName);
  }
}

export const storage = new DatabaseStorage();
