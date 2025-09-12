import {
  users,
  companyObjectives,
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
  type Goal,
  type WeeklyCheckIn,
  type Competency,
  type UserCompetency,
  type DevelopmentPlan,
  type LearningResource,
  type Meeting,
  type Recognition,
  type InsertCompanyObjective,
  type InsertGoal,
  type InsertWeeklyCheckIn,
  type InsertUserCompetency,
  type InsertDevelopmentPlan,
  type InsertMeeting,
  type InsertRecognition,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql } from "drizzle-orm";

export interface IStorage {
  // User operations - required for Replit Auth
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Company objectives
  getActiveCompanyObjectives(): Promise<CompanyObjective[]>;
  createCompanyObjective(objective: InsertCompanyObjective): Promise<CompanyObjective>;
  
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
  
  // Recognition
  getRecentRecognitions(limit?: number): Promise<Recognition[]>;
  createRecognition(recognition: InsertRecognition): Promise<Recognition>;
  getUserRecognitionStats(userId: string): Promise<{ sent: number; received: number }>;
}

export class DatabaseStorage implements IStorage {
  // User operations - required for Replit Auth
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
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

  // Recognition
  async getRecentRecognitions(limit: number = 20): Promise<Recognition[]> {
    return await db
      .select()
      .from(recognitions)
      .where(eq(recognitions.isPublic, true))
      .orderBy(desc(recognitions.createdAt))
      .limit(limit);
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
}

export const storage = new DatabaseStorage();
