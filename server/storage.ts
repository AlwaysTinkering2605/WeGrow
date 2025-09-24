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
  // LMS tables
  courses,
  courseVersions,
  courseModules,
  lessons,
  quizzes,
  quizQuestions,
  enrollments,
  lessonProgress,
  quizAttempts,
  trainingRecords,
  certificates,
  badges,
  userBadges,
  badgeCourseRequirements,
  trainingRequirements,
  pdpCourseLinks,
  // Learning path tables
  learningPaths,
  learningPathSteps,
  learningPathEnrollments,
  learningPathStepProgress,
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
  // LMS types
  type Course,
  type CourseVersion,
  type CourseModule,
  type Lesson,
  type Quiz,
  type QuizQuestion,
  type Enrollment,
  type LessonProgress,
  type QuizAttempt,
  type TrainingRecord,
  type Certificate,
  type Badge,
  type UserBadge,
  type TrainingRequirement,
  type PdpCourseLink,
  // Learning path types
  type LearningPath,
  type LearningPathStep,
  type LearningPathEnrollment,
  type LearningPathStepProgress,
  type InsertCompanyObjective,
  type InsertTeamObjective,
  type InsertTeamKeyResult,
  type InsertGoal,
  type InsertWeeklyCheckIn,
  type InsertUserCompetency,
  type InsertDevelopmentPlan,
  type InsertMeeting,
  type InsertRecognition,
  // LMS insert types
  type InsertCourse,
  type InsertCourseVersion,
  type InsertCourseModule,
  type InsertLesson,
  type InsertQuiz,
  type InsertQuizQuestion,
  type InsertEnrollment,
  type InsertLessonProgress,
  type InsertQuizAttempt,
  type InsertTrainingRecord,
  type InsertCertificate,
  type InsertBadge,
  type InsertUserBadge,
  type InsertTrainingRequirement,
  type InsertPdpCourseLink,
  // Learning path insert types
  type InsertLearningPath,
  type InsertLearningPathStep,
  type InsertLearningPathEnrollment,
  type InsertLearningPathStepProgress,
  insertTeamSchema,
  updateUserProfileSchema,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc, ne, sql, inArray, isNull, max } from "drizzle-orm";

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
  getTeamObjectiveById(id: string): Promise<TeamObjective | null>;
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
  getDevelopmentPlan(planId: string): Promise<DevelopmentPlan | undefined>;
  
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

  // LMS - Course Management
  getCourses(): Promise<Course[]>;
  getCourse(courseId: string): Promise<Course | undefined>;
  getCourseDetailsWithProgress(courseId: string, userId?: string): Promise<any>;
  createCourse(course: InsertCourse): Promise<Course>;
  updateCourse(courseId: string, updates: Partial<InsertCourse>): Promise<Course>;
  publishCourseVersion(courseId: string, version: string, changelog: string, publishedBy: string): Promise<CourseVersion>;
  getCourseVersions(courseId: string): Promise<CourseVersion[]>;
  getCurrentCourseVersion(courseId: string): Promise<CourseVersion | undefined>;

  // LMS - Course Content
  getCourseModules(courseVersionId: string): Promise<CourseModule[]>;
  getDefaultCourseModule(courseVersionId: string): Promise<CourseModule | undefined>;
  createCourseModule(module: InsertCourseModule): Promise<CourseModule>;
  updateCourseModule(moduleId: string, updates: Partial<InsertCourseModule>): Promise<CourseModule>;
  deleteCourseModule(moduleId: string): Promise<void>;
  
  getLessons(moduleId: string): Promise<Lesson[]>;
  getLesson(lessonId: string): Promise<Lesson | undefined>;
  getDefaultLesson(moduleId: string): Promise<Lesson | undefined>;
  createLesson(lesson: InsertLesson): Promise<Lesson>;
  updateLesson(lessonId: string, updates: Partial<InsertLesson>): Promise<Lesson>;
  deleteLesson(lessonId: string): Promise<void>;

  // LMS - Quizzes and Assessments
  getQuiz(lessonId: string): Promise<Quiz | undefined>;
  getQuizById(quizId: string): Promise<Quiz | undefined>;
  getQuizzesByLesson(lessonId: string): Promise<Quiz[]>;
  getQuizzesByCourse(courseId: string): Promise<Quiz[]>;
  getAllQuizzes(): Promise<Quiz[]>;
  createQuiz(quiz: InsertQuiz): Promise<Quiz>;
  updateQuiz(quizId: string, updates: Partial<InsertQuiz>): Promise<Quiz>;
  deleteQuiz(quizId: string): Promise<void>;
  getQuizQuestions(quizId: string): Promise<QuizQuestion[]>;
  createQuizQuestion(question: InsertQuizQuestion): Promise<QuizQuestion>;
  createQuizQuestions(questions: InsertQuizQuestion[]): Promise<QuizQuestion[]>;
  updateQuizQuestion(questionId: string, updates: Partial<InsertQuizQuestion>): Promise<QuizQuestion>;
  deleteQuizQuestion(questionId: string): Promise<void>;
  startQuizAttempt(attempt: InsertQuizAttempt): Promise<QuizAttempt>;
  submitQuizAttempt(attemptId: string, answers: any, timeSpent: number): Promise<QuizAttempt>;
  getQuizAttempt(attemptId: string): Promise<QuizAttempt | undefined>;
  getUserQuizAttempts(userId: string, quizId: string): Promise<QuizAttempt[]>;
  getLatestQuizAttempt(userId: string, quizId: string): Promise<QuizAttempt | undefined>;

  // LMS - Enrollments and Progress
  enrollUser(enrollment: InsertEnrollment): Promise<Enrollment>;
  getUserEnrollments(userId: string): Promise<Enrollment[]>;
  getEnrollment(enrollmentId: string): Promise<Enrollment | undefined>;
  updateEnrollmentProgress(enrollmentId: string, progress: number): Promise<Enrollment>;
  completeEnrollment(enrollmentId: string): Promise<Enrollment>;
  
  updateLessonProgress(progress: InsertLessonProgress): Promise<LessonProgress>;
  getLessonProgress(enrollmentId: string, lessonId: string): Promise<LessonProgress | undefined>;
  getUserLessonProgress(enrollmentId: string): Promise<LessonProgress[]>;
  updateLessonProgressFromQuiz(enrollmentId: string, quizId: string, userId: string): Promise<void>;
  completeLessonManually(enrollmentId: string, lessonId: string): Promise<{ success: boolean; message: string }>;

  // LMS - Certificates and Badges
  issueCertificate(certificate: InsertCertificate): Promise<Certificate>;
  getUserCertificates(userId: string): Promise<Certificate[]>;
  getCertificate(certificateId: string): Promise<Certificate | undefined>;
  
  createBadge(badge: InsertBadge, courseIds?: string[]): Promise<Badge>;
  updateBadge(badgeId: string, badge: Partial<InsertBadge>, courseIds?: string[]): Promise<Badge>;
  getBadges(): Promise<Badge[]>;
  getBadgeCourseRequirements(badgeId: string): Promise<string[]>;
  checkBadgeEligibility(userId: string, badgeId: string): Promise<boolean>;
  awardBadgeIfEligible(userId: string, badgeId: string, courseVersionId?: string): Promise<UserBadge | null>;
  awardUserBadge(userBadge: InsertUserBadge): Promise<UserBadge>;
  getUserBadges(userId: string): Promise<UserBadge[]>;

  // LMS - Training Records (ISO Compliance)
  createTrainingRecord(record: InsertTrainingRecord): Promise<TrainingRecord>;
  getUserTrainingRecords(userId: string): Promise<TrainingRecord[]>;
  getTrainingRecords(filters?: { 
    userId?: string; 
    courseId?: string; 
    completedAfter?: Date; 
    completedBefore?: Date; 
  }): Promise<TrainingRecord[]>;
  
  // LMS - Training Requirements & Matrix
  getTrainingRequirements(): Promise<TrainingRequirement[]>;
  createTrainingRequirement(requirement: InsertTrainingRequirement): Promise<TrainingRequirement>;
  updateTrainingRequirement(requirementId: string, updates: Partial<InsertTrainingRequirement>): Promise<TrainingRequirement>;
  deleteTrainingRequirement(requirementId: string): Promise<void>;
  getTrainingMatrix(filters?: { role?: string; teamId?: string; }): Promise<any[]>;

  // LMS - PDP Integration
  linkCourseToPDP(link: InsertPdpCourseLink): Promise<PdpCourseLink>;
  getPDPCourseLinks(developmentPlanId: string): Promise<PdpCourseLink[]>;
  unlinkCourseFromPDP(linkId: string): Promise<void>;

  // LMS - Admin Management
  getAdminCourses(): Promise<Course[]>;
  getLessonsByCourse(courseId: string): Promise<Lesson[]>;
  getQuizzesByLesson(lessonId: string): Promise<Quiz[]>;
  deleteCourse(courseId: string): Promise<void>;
  getAdminAnalytics(): Promise<{
    activeLearners: number;
    avgCompletion: number;
    certificatesIssued: number;
    learnerProgress: number;
    engagementRate: number;
    trainingHours: number;
  }>;
  duplicateCourse(courseId: string, newTitle: string): Promise<Course>;
  
  // LMS - Data Migration
  migrateLegacyCourses(): Promise<{ fixed: number; total: number }>;
  
  // LMS - External Course Management
  assignExternalCourseCompletion(
    userId: string, 
    courseId: string, 
    completionDate: Date, 
    assignedBy: string
  ): Promise<{ enrollment: Enrollment; trainingRecord: TrainingRecord }>;

  // Learning Paths Management
  getLearningPaths(): Promise<LearningPath[]>;
  getLearningPath(pathId: string): Promise<LearningPath | undefined>;
  getLearningPathWithSteps(pathId: string): Promise<LearningPath & { steps: LearningPathStep[] }>;
  createLearningPath(path: InsertLearningPath): Promise<LearningPath>;
  updateLearningPath(pathId: string, updates: Partial<InsertLearningPath>): Promise<LearningPath>;
  deleteLearningPath(pathId: string): Promise<void>;
  publishLearningPath(pathId: string): Promise<LearningPath>;
  unpublishLearningPath(pathId: string): Promise<LearningPath>;

  // Learning Path Steps Management
  getLearningPathSteps(pathId: string): Promise<LearningPathStep[]>;
  getLearningPathStep(stepId: string): Promise<LearningPathStep | undefined>;
  createLearningPathStep(step: InsertLearningPathStep): Promise<LearningPathStep>;
  updateLearningPathStep(stepId: string, updates: Partial<InsertLearningPathStep>): Promise<LearningPathStep>;
  deleteLearningPathStep(stepId: string): Promise<void>;
  reorderLearningPathSteps(pathId: string, stepIds: string[]): Promise<void>;

  // Learning Path Enrollments and Progress
  getLearningPathEnrollments(userId?: string, pathId?: string): Promise<LearningPathEnrollment[]>;
  getLearningPathEnrollment(enrollmentId: string): Promise<LearningPathEnrollment | undefined>;
  enrollUserInLearningPath(enrollment: InsertLearningPathEnrollment): Promise<LearningPathEnrollment>;
  updateLearningPathEnrollment(enrollmentId: string, updates: Partial<InsertLearningPathEnrollment>): Promise<LearningPathEnrollment>;
  completeLearningPathEnrollment(enrollmentId: string): Promise<LearningPathEnrollment>;
  suspendLearningPathEnrollment(enrollmentId: string, reason?: string): Promise<LearningPathEnrollment>;
  resumeLearningPathEnrollment(enrollmentId: string): Promise<LearningPathEnrollment>;

  // Learning Path Step Progress
  getLearningPathStepProgress(enrollmentId: string): Promise<LearningPathStepProgress[]>;
  getStepProgress(enrollmentId: string, stepId: string): Promise<LearningPathStepProgress | undefined>;
  updateStepProgress(progress: InsertLearningPathStepProgress): Promise<LearningPathStepProgress>;
  completeStep(enrollmentId: string, stepId: string, score?: number, timeSpent?: number): Promise<LearningPathStepProgress>;
  skipStep(enrollmentId: string, stepId: string, reason: string): Promise<LearningPathStepProgress>;
  
  // Competency Library Management
  getCompetencyLibrary(): Promise<CompetencyLibraryItem[]>;
  getCompetencyLibraryItem(itemId: string): Promise<CompetencyLibraryItem | undefined>;
  createCompetencyLibraryItem(item: InsertCompetencyLibraryItem): Promise<CompetencyLibraryItem>;
  updateCompetencyLibraryItem(itemId: string, updates: Partial<InsertCompetencyLibraryItem>): Promise<CompetencyLibraryItem>;
  deleteCompetencyLibraryItem(itemId: string): Promise<void>;
  linkLearningPathToCompetency(competencyLibraryId: string, learningPathId: string): Promise<void>;
  unlinkLearningPathFromCompetency(competencyLibraryId: string, learningPathId: string): Promise<void>;

  // Role Competency Mappings
  getRoleCompetencyMappings(role?: string, teamId?: string): Promise<RoleCompetencyMapping[]>;
  getRoleCompetencyMapping(mappingId: string): Promise<RoleCompetencyMapping | undefined>;
  createRoleCompetencyMapping(mapping: InsertRoleCompetencyMapping): Promise<RoleCompetencyMapping>;
  updateRoleCompetencyMapping(mappingId: string, updates: Partial<InsertRoleCompetencyMapping>): Promise<RoleCompetencyMapping>;
  deleteRoleCompetencyMapping(mappingId: string): Promise<void>;
  getRequiredCompetenciesForUser(userId: string): Promise<CompetencyLibraryItem[]>;

  // Training Matrix and Compliance
  getTrainingMatrixRecords(userId?: string, competencyLibraryId?: string): Promise<TrainingMatrixRecord[]>;
  getTrainingMatrixRecord(recordId: string): Promise<TrainingMatrixRecord | undefined>;
  createTrainingMatrixRecord(record: InsertTrainingMatrixRecord): Promise<TrainingMatrixRecord>;
  updateTrainingMatrixRecord(recordId: string, updates: Partial<InsertTrainingMatrixRecord>): Promise<TrainingMatrixRecord>;
  getComplianceReport(filters?: { role?: string; teamId?: string; competencyId?: string; status?: string; }): Promise<any>;
  getCompetencyGapAnalysis(userId?: string): Promise<any>;
  updateCompetencyStatus(userId: string, competencyLibraryId: string, status: string, evidenceData?: any): Promise<TrainingMatrixRecord>;

  // Automation Rules Engine
  getAutomationRules(isActive?: boolean): Promise<AutomationRule[]>;
  getAutomationRule(ruleId: string): Promise<AutomationRule | undefined>;
  createAutomationRule(rule: InsertAutomationRule): Promise<AutomationRule>;
  updateAutomationRule(ruleId: string, updates: Partial<InsertAutomationRule>): Promise<AutomationRule>;
  deleteAutomationRule(ruleId: string): Promise<void>;
  activateAutomationRule(ruleId: string): Promise<AutomationRule>;
  deactivateAutomationRule(ruleId: string): Promise<AutomationRule>;
  executeAutomationRule(ruleId: string, triggerData?: any): Promise<{ executed: boolean; enrollments: number; errors?: string[] }>;
  executeAutomationRulesForUser(userId: string, triggerEvent: string): Promise<{ totalRules: number; executed: number; enrollments: number }>;
}

export class DatabaseStorage implements IStorage {
  // User operations - required for Replit Auth
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    try {
      // Check if user already exists by ID or email
      const existingUserById = userData.id ? await this.getUser(userData.id) : undefined;
      const [existingUserByEmail] = userData.email 
        ? await db.select().from(users).where(eq(users.email, userData.email))
        : [undefined];
      
      const existingUser = existingUserById || existingUserByEmail;
      
      if (existingUser) {
        // User exists - update profile info including role from OIDC claims
        const [user] = await db
          .update(users)
          .set({
            email: userData.email,
            firstName: userData.firstName,
            lastName: userData.lastName,
            profileImageUrl: userData.profileImageUrl,
            role: userData.role, // Update role from OIDC claims
            updatedAt: new Date(),
          })
          .where(eq(users.id, existingUser.id))
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
    } catch (error: any) {
      // Handle unique constraint violations gracefully
      if (error.code === '23505') { // PostgreSQL unique violation
        console.warn('Unique constraint violation in upsertUser, attempting to find existing user:', error.message);
        
        // Try to find the existing user and update it
        if (userData.email) {
          const [existingUser] = await db.select().from(users).where(eq(users.email, userData.email));
          if (existingUser) {
            const [user] = await db
              .update(users)
              .set({
                firstName: userData.firstName,
                lastName: userData.lastName,
                profileImageUrl: userData.profileImageUrl,
                updatedAt: new Date(),
              })
              .where(eq(users.id, existingUser.id))
              .returning();
            return user;
          }
        }
      }
      
      // Re-throw if we can't handle it
      throw error;
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

  async getTeamObjectiveById(id: string): Promise<TeamObjective | null> {
    const result = await db
      .select()
      .from(teamObjectives)
      .where(and(eq(teamObjectives.id, id), eq(teamObjectives.isActive, true)))
      .limit(1);
    
    return result.length > 0 ? result[0] : null;
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

  async getDevelopmentPlan(planId: string): Promise<DevelopmentPlan | undefined> {
    const [plan] = await db.select().from(developmentPlans).where(eq(developmentPlans.id, planId));
    return plan;
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

  // LMS - Course Management (stub implementations)
  async getCourses(): Promise<Course[]> {
    return await db.select().from(courses).orderBy(courses.title);
  }

  async getCourse(courseId: string): Promise<Course | undefined> {
    const [course] = await db.select().from(courses).where(eq(courses.id, courseId));
    return course;
  }

  async getCourseDetailsWithProgress(courseId: string, userId?: string): Promise<any> {
    // Get basic course information
    const course = await this.getCourse(courseId);
    if (!course) {
      return null;
    }

    // Get the current course version from the course record
    let courseVersionId = course.currentVersionId;
    if (!courseVersionId) {
      console.warn(`Course ${courseId} has no currentVersionId set`);
      return { ...course, lessons: [], modules: [], totalLessons: 0, completedLessons: 0, progressPercentage: 0 };
    }
    
    // Get course modules
    const modules = await db.select()
      .from(courseModules)
      .where(eq(courseModules.courseVersionId, courseVersionId))
      .orderBy(courseModules.orderIndex);

    // Get all lessons for this course across modules
    const allLessons = [];
    let totalLessons = 0;
    let completedLessons = 0;
    
    for (const module of modules) {
      const moduleLessons = await db.select()
        .from(lessons)
        .where(eq(lessons.moduleId, module.id))
        .orderBy(lessons.orderIndex);
      
      totalLessons += moduleLessons.length;
      
      // Add lesson progress if user provided
      for (const lesson of moduleLessons) {
        let progressData = null;
        let quizData = null;
        
        if (userId) {
          // Get user enrollment first
          const enrollment = await db.select()
            .from(enrollments)
            .where(and(
              eq(enrollments.courseVersionId, courseVersionId),
              eq(enrollments.userId, userId)
            ))
            .limit(1);
          
          if (enrollment.length > 0) {
            // Get lesson progress
            const progress = await db.select()
              .from(lessonProgress)
              .where(and(
                eq(lessonProgress.enrollmentId, enrollment[0].id),
                eq(lessonProgress.lessonId, lesson.id)
              ))
              .limit(1);
            
            progressData = progress.length > 0 ? progress[0] : null;
            if (progressData?.status === 'completed') {
              completedLessons++;
            }
          }
          
          // Get quiz for this lesson
          const quiz = await db.select()
            .from(quizzes)
            .where(eq(quizzes.lessonId, lesson.id))
            .limit(1);
          
          if (quiz.length > 0 && userId && enrollment.length > 0) {
            // Get latest quiz attempt
            const attempt = await db.select()
              .from(quizAttempts)
              .where(and(
                eq(quizAttempts.quizId, quiz[0].id),
                eq(quizAttempts.userId, userId)
              ))
              .orderBy(desc(quizAttempts.startedAt))
              .limit(1);
              
            quizData = {
              quiz: quiz[0],
              latestAttempt: attempt.length > 0 ? attempt[0] : null
            };
          }
        }
        
        allLessons.push({
          ...lesson,
          moduleTitle: module.title,
          progress: progressData,
          quiz: quizData
        });
      }
    }

    // Get user enrollment info
    let enrollmentData = null;
    if (userId) {
      const enrollment = await db.select()
        .from(enrollments)
        .where(and(
          eq(enrollments.courseVersionId, courseVersionId),
          eq(enrollments.userId, userId)
        ))
        .limit(1);
      
      enrollmentData = enrollment.length > 0 ? enrollment[0] : null;
    }

    // Calculate overall progress
    const overallProgress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
    
    // Get enrollment count  
    const enrollmentCount = await db.select({ count: sql<number>`count(*)` })
      .from(enrollments)
      .where(eq(enrollments.courseVersionId, courseVersionId));

    return {
      ...course,
      modules,
      lessons: allLessons,
      enrollment: enrollmentData,
      progress: {
        overall: overallProgress,
        completed: completedLessons,
        total: totalLessons
      },
      enrolledCount: enrollmentCount[0]?.count || 0
    };
  }

  async createCourse(course: InsertCourse): Promise<Course> {
    // Create the course record first
    const [created] = await db.insert(courses).values(course).returning();
    
    // Create initial course version (1.0)
    const [courseVersion] = await db.insert(courseVersions).values({
      courseId: created.id,
      version: "1.0",
      changelog: "Initial course version",
      publishedBy: course.createdBy,
      publishedAt: new Date(),
      isActive: true
    }).returning();
    
    // Create default course module
    await db.insert(courseModules).values({
      courseVersionId: courseVersion.id,
      title: "Main Content",
      description: "Main course content and lessons",
      orderIndex: 1
    });
    
    // Update course to point to the current version
    const [updatedCourse] = await db
      .update(courses)
      .set({ currentVersionId: courseVersion.id })
      .where(eq(courses.id, created.id))
      .returning();
    
    return updatedCourse;
  }

  async updateCourse(courseId: string, updates: Partial<InsertCourse>): Promise<Course> {
    const [updated] = await db
      .update(courses)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(courses.id, courseId))
      .returning();
    return updated;
  }

  async publishCourseVersion(courseId: string, version: string, changelog: string, publishedBy: string): Promise<CourseVersion> {
    throw new Error("Not implemented yet");
  }

  async getCourseVersions(courseId: string): Promise<CourseVersion[]> {
    return await db.select().from(courseVersions).where(eq(courseVersions.courseId, courseId));
  }

  async getCurrentCourseVersion(courseId: string): Promise<CourseVersion | undefined> {
    throw new Error("Not implemented yet");
  }

  // LMS - Course Content (stub implementations)
  async getCourseModules(courseVersionId: string): Promise<CourseModule[]> {
    return await db.select().from(courseModules).where(eq(courseModules.courseVersionId, courseVersionId));
  }

  async getDefaultCourseModule(courseVersionId: string): Promise<CourseModule | undefined> {
    const [module] = await db.select().from(courseModules)
      .where(eq(courseModules.courseVersionId, courseVersionId))
      .orderBy(courseModules.orderIndex)
      .limit(1);
    return module;
  }

  async createCourseModule(module: InsertCourseModule): Promise<CourseModule> {
    const [created] = await db.insert(courseModules).values(module).returning();
    return created;
  }

  async updateCourseModule(moduleId: string, updates: Partial<InsertCourseModule>): Promise<CourseModule> {
    const [updated] = await db
      .update(courseModules)
      .set(updates)
      .where(eq(courseModules.id, moduleId))
      .returning();
    return updated;
  }

  async deleteCourseModule(moduleId: string): Promise<void> {
    await db.delete(courseModules).where(eq(courseModules.id, moduleId));
  }

  async getLessons(moduleId: string): Promise<Lesson[]> {
    return await db.select().from(lessons).where(eq(lessons.moduleId, moduleId)).orderBy(lessons.orderIndex);
  }

  async getLesson(lessonId: string): Promise<Lesson | undefined> {
    const [lesson] = await db.select().from(lessons).where(eq(lessons.id, lessonId));
    return lesson;
  }

  async getDefaultLesson(moduleId: string): Promise<Lesson | undefined> {
    const [lesson] = await db.select().from(lessons)
      .where(eq(lessons.moduleId, moduleId))
      .orderBy(lessons.orderIndex)
      .limit(1);
    return lesson;
  }

  async createLesson(lesson: InsertLesson): Promise<Lesson> {
    const [created] = await db.insert(lessons).values(lesson).returning();
    return created;
  }

  async updateLesson(lessonId: string, updates: Partial<InsertLesson>): Promise<Lesson> {
    const [updated] = await db
      .update(lessons)
      .set(updates)
      .where(eq(lessons.id, lessonId))
      .returning();
    return updated;
  }

  async deleteLesson(lessonId: string): Promise<void> {
    await db.delete(lessons).where(eq(lessons.id, lessonId));
  }

  // LMS - Quizzes and Assessments (stub implementations)
  async getQuiz(lessonId: string): Promise<Quiz | undefined> {
    const [quiz] = await db.select().from(quizzes).where(eq(quizzes.lessonId, lessonId));
    return quiz;
  }

  async createQuiz(quiz: InsertQuiz): Promise<Quiz> {
    const [created] = await db.insert(quizzes).values(quiz).returning();
    return created;
  }

  async updateQuiz(quizId: string, updates: Partial<InsertQuiz>): Promise<Quiz> {
    const [updated] = await db
      .update(quizzes)
      .set(updates)
      .where(eq(quizzes.id, quizId))
      .returning();
    return updated;
  }

  async getQuizQuestions(quizId: string): Promise<QuizQuestion[]> {
    return await db.select().from(quizQuestions).where(eq(quizQuestions.quizId, quizId));
  }

  async createQuizQuestion(question: InsertQuizQuestion): Promise<QuizQuestion> {
    const [created] = await db.insert(quizQuestions).values(question).returning();
    return created;
  }

  async startQuizAttempt(attempt: InsertQuizAttempt): Promise<QuizAttempt> {
    const [created] = await db.insert(quizAttempts).values(attempt).returning();
    return created;
  }

  async submitQuizAttempt(attemptId: string, answers: any, timeSpent: number): Promise<QuizAttempt> {
    // Get the quiz attempt and related quiz
    const attempt = await this.getQuizAttempt(attemptId);
    if (!attempt) {
      throw new Error("Quiz attempt not found");
    }

    // Get quiz details to calculate score
    const [quiz] = await db
      .select()
      .from(quizzes)
      .where(eq(quizzes.id, attempt.quizId));
    
    if (!quiz) {
      throw new Error("Quiz not found");
    }

    // Get quiz questions to validate answers
    const questions = await db
      .select()
      .from(quizQuestions)
      .where(eq(quizQuestions.quizId, quiz.id));

    // Calculate score
    let correctAnswers = 0;
    const totalQuestions = questions.length;
    
    console.log('Quiz scoring debug:', {
      totalQuestions,
      answers: JSON.stringify(answers),
      questionsData: questions.map(q => ({
        id: q.id,
        correctAnswers: q.correctAnswers,
        type: q.type
      }))
    });
    
    questions.forEach((question, index) => {
      const userAnswer = answers[question.id];
      const correctAnswer = question.correctAnswers;
      
      console.log(`Question ${question.id} comparison:`, {
        userAnswer: JSON.stringify(userAnswer),
        correctAnswer: JSON.stringify(correctAnswer),
        userAnswerType: typeof userAnswer,
        correctAnswerType: typeof correctAnswer,
        matches: JSON.stringify(userAnswer) === JSON.stringify(correctAnswer),
        answersObject: Object.keys(answers)
      });
      
      // Only count if user provided an answer for this question
      if (userAnswer !== undefined && JSON.stringify(userAnswer) === JSON.stringify(correctAnswer)) {
        correctAnswers++;
      }
    });

    const score = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
    const passed = score >= (quiz.passingScore || 70);

    // Update the attempt
    const [updated] = await db
      .update(quizAttempts)
      .set({
        answers,
        score,
        passed,
        timeSpent,
        completedAt: new Date()
      })
      .where(eq(quizAttempts.id, attemptId))
      .returning();

    return updated;
  }

  async getQuizAttempt(attemptId: string): Promise<QuizAttempt | undefined> {
    const [attempt] = await db.select().from(quizAttempts).where(eq(quizAttempts.id, attemptId));
    return attempt;
  }

  async getQuizById(quizId: string): Promise<Quiz | undefined> {
    const [quiz] = await db.select().from(quizzes).where(eq(quizzes.id, quizId));
    return quiz;
  }

  async deleteQuiz(quizId: string): Promise<void> {
    // First delete all questions for this quiz
    await db.delete(quizQuestions).where(eq(quizQuestions.quizId, quizId));
    // Then delete the quiz itself
    await db.delete(quizzes).where(eq(quizzes.id, quizId));
  }

  async createQuizQuestions(questions: InsertQuizQuestion[]): Promise<QuizQuestion[]> {
    if (questions.length === 0) return [];
    const created = await db.insert(quizQuestions).values(questions).returning();
    return created;
  }

  async updateQuizQuestion(questionId: string, updates: Partial<InsertQuizQuestion>): Promise<QuizQuestion> {
    const [updated] = await db
      .update(quizQuestions)
      .set(updates)
      .where(eq(quizQuestions.id, questionId))
      .returning();
    return updated;
  }

  async deleteQuizQuestion(questionId: string): Promise<void> {
    await db.delete(quizQuestions).where(eq(quizQuestions.id, questionId));
  }

  async getQuizzesByLesson(lessonId: string): Promise<Quiz[]> {
    return await db.select().from(quizzes).where(eq(quizzes.lessonId, lessonId));
  }

  async getQuizzesByCourse(courseId: string): Promise<Quiz[]> {
    // Get all lessons for the course by finding course modules first
    const modules = await this.getCourseModules(courseId);
    const allLessons = [];
    
    for (const module of modules) {
      const moduleLessons = await this.getLessons(module.id);
      allLessons.push(...moduleLessons);
    }
    
    if (allLessons.length === 0) {
      return [];
    }

    const lessonIds = allLessons.map(lesson => lesson.id);

    // Get all quizzes for these lessons with lesson info
    const result = await db
      .select({
        id: quizzes.id,
        lessonId: quizzes.lessonId,
        title: quizzes.title,
        description: quizzes.description,
        passingScore: quizzes.passingScore,
        timeLimit: quizzes.timeLimit,
        maxAttempts: quizzes.maxAttempts,
        randomizeQuestions: quizzes.randomizeQuestions,
        createdAt: quizzes.createdAt,
        lessonTitle: lessons.title
      })
      .from(quizzes)
      .innerJoin(lessons, eq(quizzes.lessonId, lessons.id))
      .where(inArray(quizzes.lessonId, lessonIds));
    
    return result as any[];
  }

  async getAllQuizzes(): Promise<Quiz[]> {
    // Get all quizzes with lesson, module, and course information
    const result = await db
      .select({
        id: quizzes.id,
        lessonId: quizzes.lessonId,
        title: quizzes.title,
        description: quizzes.description,
        passingScore: quizzes.passingScore,
        timeLimit: quizzes.timeLimit,
        maxAttempts: quizzes.maxAttempts,
        randomizeQuestions: quizzes.randomizeQuestions,
        createdAt: quizzes.createdAt,
        lessonTitle: lessons.title,
        moduleTitle: courseModules.title,
        courseTitle: courses.title
      })
      .from(quizzes)
      .innerJoin(lessons, eq(quizzes.lessonId, lessons.id))
      .innerJoin(courseModules, eq(lessons.moduleId, courseModules.id))
      .innerJoin(courseVersions, eq(courseModules.courseVersionId, courseVersions.id))
      .innerJoin(courses, eq(courseVersions.courseId, courses.id))
      .orderBy(courses.title, courseModules.title, lessons.title, quizzes.title);
    
    return result as any[];
  }

  async getUserQuizAttempts(userId: string, quizId: string): Promise<QuizAttempt[]> {
    return await db
      .select()
      .from(quizAttempts)
      .where(and(eq(quizAttempts.userId, userId), eq(quizAttempts.quizId, quizId)))
      .orderBy(desc(quizAttempts.startedAt));
  }

  async getLatestQuizAttempt(userId: string, quizId: string): Promise<QuizAttempt | undefined> {
    const [attempt] = await db
      .select()
      .from(quizAttempts)
      .where(and(eq(quizAttempts.userId, userId), eq(quizAttempts.quizId, quizId)))
      .orderBy(desc(quizAttempts.startedAt))
      .limit(1);
    return attempt;
  }

  // LMS - Enrollments and Progress (stub implementations)
  async enrollUser(enrollment: InsertEnrollment): Promise<Enrollment> {
    const [created] = await db.insert(enrollments).values(enrollment).returning();
    return created;
  }

  async getUserEnrollments(userId: string): Promise<Enrollment[]> {
    // Get enrollments with full course details
    const result = await db
      .select({
        id: enrollments.id,
        userId: enrollments.userId,
        courseVersionId: enrollments.courseVersionId,
        status: enrollments.status,
        enrolledAt: enrollments.enrolledAt,
        startedAt: enrollments.startedAt,
        completedAt: enrollments.completedAt,
        dueDate: enrollments.dueDate,
        progress: enrollments.progress,
        currentModuleId: enrollments.currentModuleId,
        currentLessonId: enrollments.currentLessonId,
        courseId: courses.id,
        courseTitle: courses.title,
        courseDescription: courses.description,
        courseCategory: courses.category,
        courseLevel: courses.level,
        courseThumbnailUrl: courses.thumbnailUrl,
        courseEstimatedDuration: courses.estimatedDuration,
        versionNumber: courseVersions.version,
      })
      .from(enrollments)
      .innerJoin(courseVersions, eq(enrollments.courseVersionId, courseVersions.id))
      .innerJoin(courses, eq(courseVersions.courseId, courses.id))
      .where(eq(enrollments.userId, userId))
      .orderBy(enrollments.enrolledAt);

    return result as any[];
  }

  async getEnrollment(enrollmentId: string): Promise<Enrollment | undefined> {
    const [enrollment] = await db.select().from(enrollments).where(eq(enrollments.id, enrollmentId));
    return enrollment;
  }

  async updateEnrollmentProgress(enrollmentId: string, progress: number): Promise<Enrollment> {
    const [updated] = await db
      .update(enrollments)
      .set({ progress })
      .where(eq(enrollments.id, enrollmentId))
      .returning();
    return updated;
  }

  async completeEnrollment(enrollmentId: string): Promise<Enrollment> {
    const now = new Date();
    const [updated] = await db
      .update(enrollments)
      .set({ 
        status: "completed", 
        completedAt: now, 
        progress: 100 
      })
      .where(eq(enrollments.id, enrollmentId))
      .returning();
    return updated;
  }

  async updateLessonProgress(progress: InsertLessonProgress): Promise<LessonProgress> {
    // Check if progress record exists
    const existing = await this.getLessonProgress(progress.enrollmentId, progress.lessonId);
    
    if (existing) {
      // Update existing progress
      const [updated] = await db
        .update(lessonProgress)
        .set({ 
          ...progress, 
          updatedAt: new Date() 
        })
        .where(and(
          eq(lessonProgress.enrollmentId, progress.enrollmentId),
          eq(lessonProgress.lessonId, progress.lessonId)
        ))
        .returning();
      return updated;
    } else {
      // Create new progress record
      const [created] = await db
        .insert(lessonProgress)
        .values({
          ...progress,
        })
        .returning();
      return created;
    }
  }

  async getLessonProgress(enrollmentId: string, lessonId: string): Promise<LessonProgress | undefined> {
    const [progress] = await db
      .select()
      .from(lessonProgress)
      .where(and(
        eq(lessonProgress.enrollmentId, enrollmentId),
        eq(lessonProgress.lessonId, lessonId)
      ));
    return progress;
  }

  async getUserLessonProgress(enrollmentId: string): Promise<LessonProgress[]> {
    return await db.select().from(lessonProgress).where(eq(lessonProgress.enrollmentId, enrollmentId));
  }

  async updateLessonProgressFromQuiz(enrollmentId: string, quizId: string, userId: string): Promise<void> {
    try {
      // First get the quiz to find the lesson
      const [quiz] = await db.select().from(quizzes).where(eq(quizzes.id, quizId));
      if (!quiz) {
        console.error("Quiz not found for lesson progress update:", quizId);
        return;
      }

      // Update or create lesson progress record
      const existingProgress = await this.getLessonProgress(enrollmentId, quiz.lessonId);
      
      if (existingProgress) {
        // Update existing progress - mark as completed
        await db
          .update(lessonProgress)
          .set({
            status: "completed",
            progressPercentage: 100,
            completionMethod: "quiz",
            completedAt: new Date(),
            updatedAt: new Date()
          })
          .where(and(
            eq(lessonProgress.enrollmentId, enrollmentId),
            eq(lessonProgress.lessonId, quiz.lessonId)
          ));
      } else {
        // Create new progress record
        await db
          .insert(lessonProgress)
          .values({
            enrollmentId,
            lessonId: quiz.lessonId,
            status: "completed",
            progressPercentage: 100,
            completionMethod: "quiz",
            timeSpent: 0, // Quiz time will be tracked separately
            completedAt: new Date(),
          });
      }
    } catch (error) {
      console.error("Error updating lesson progress from quiz:", error);
      throw error;
    }
  }

  async completeLessonManually(enrollmentId: string, lessonId: string): Promise<{ success: boolean; message: string }> {
    try {
      // Get lesson details to check content type
      const lesson = await this.getLesson(lessonId);
      if (!lesson) {
        return { success: false, message: "Lesson not found." };
      }

      // Get current lesson progress
      const progress = await this.getLessonProgress(enrollmentId, lessonId);
      
      // Handle different content types appropriately
      if (lesson.contentType === 'video') {
        // For video lessons, require existing progress and 90% completion
        if (!progress) {
          return { success: false, message: "No progress found for this lesson. Please watch some of the video first." };
        }

        // Use the consistent progressPercentage field that the frontend displays
        const watchedPercent = progress.progressPercentage || 0;

        // Check if watched at least 90%
        if (watchedPercent < 90) {
          return { 
            success: false, 
            message: `You need to watch at least 90% of the video to complete this lesson. Currently watched: ${watchedPercent}%` 
          };
        }

        // Update existing progress to completed
        await db
          .update(lessonProgress)
          .set({
            status: "completed",
            progressPercentage: 100,
            completionMethod: "manual",
            completedAt: new Date(),
            updatedAt: new Date()
          })
          .where(and(
            eq(lessonProgress.enrollmentId, enrollmentId),
            eq(lessonProgress.lessonId, lessonId)
          ));

      } else {
        // For rich text and PDF lessons, allow completion without prior progress
        if (progress) {
          // Update existing progress
          await db
            .update(lessonProgress)
            .set({
              status: "completed",
              progressPercentage: 100,
              completionMethod: "manual",
              completedAt: new Date(),
              updatedAt: new Date()
            })
            .where(and(
              eq(lessonProgress.enrollmentId, enrollmentId),
              eq(lessonProgress.lessonId, lessonId)
            ));
        } else {
          // Create new progress record for rich text/PDF lessons
          await db
            .insert(lessonProgress)
            .values({
              enrollmentId,
              lessonId,
              status: "completed",
              progressPercentage: 100,
              completionMethod: "manual",
              timeSpent: 0,
              completedAt: new Date(),
            });
        }
      }

      return { success: true, message: "Lesson marked as complete!" };
    } catch (error) {
      console.error("Error completing lesson manually:", error);
      return { success: false, message: "Error completing lesson. Please try again." };
    }
  }

  // Enhanced server-side validation for completion eligibility (security critical)
  async validateCompletionEligibility(enrollmentId: string, lessonId: string, clientData: {
    progressPercentage: number;
    timeSpent: number;
    durationSeconds?: number | null;
  }): Promise<{ eligible: boolean; reason?: string }> {
    try {
      // Get stored lesson progress
      const progress = await this.getLessonProgress(enrollmentId, lessonId);
      
      if (!progress) {
        return { eligible: false, reason: "No progress found for this lesson" };
      }

      // Server-side 90% validation using stored progressPercentage (consistent with manual completion)
      const storedProgress = progress.progressPercentage || 0;
      if (storedProgress < 90) {
        return { 
          eligible: false, 
          reason: `Insufficient watched coverage: ${storedProgress}% (need 90%+)` 
        };
      }

      // Additional validation: check time spent vs duration ratio for reasonableness
      if (clientData.durationSeconds && clientData.durationSeconds > 0) {
        const minExpectedTime = Math.floor(clientData.durationSeconds * 0.5); // At least 50% of video duration in time
        if (clientData.timeSpent < minExpectedTime) {
          return { 
            eligible: false, 
            reason: `Insufficient viewing time: ${clientData.timeSpent}s vs expected ${minExpectedTime}s minimum` 
          };
        }
      }

      return { eligible: true };
    } catch (error) {
      console.error("Error validating completion eligibility:", error);
      return { eligible: false, reason: "Server validation error" };
    }
  }

  // LMS - Certificates and Badges (stub implementations)
  async issueCertificate(certificate: InsertCertificate): Promise<Certificate> {
    const [created] = await db.insert(certificates).values(certificate).returning();
    return created;
  }

  async getUserCertificates(userId: string): Promise<Certificate[]> {
    return await db.select().from(certificates).where(eq(certificates.userId, userId));
  }

  async getCertificate(certificateId: string): Promise<Certificate | undefined> {
    const [certificate] = await db.select().from(certificates).where(eq(certificates.id, certificateId));
    return certificate;
  }

  async createBadge(badge: InsertBadge, courseIds?: string[]): Promise<Badge> {
    const [created] = await db.insert(badges).values(badge).returning();
    
    // Add course requirements if provided
    if (courseIds && courseIds.length > 0) {
      const requirements = courseIds.map(courseId => ({
        badgeId: created.id,
        courseId: courseId
      }));
      await db.insert(badgeCourseRequirements).values(requirements);
    }
    
    return created;
  }

  async updateBadge(badgeId: string, badge: Partial<InsertBadge>, courseIds?: string[]): Promise<Badge> {
    const [updated] = await db.update(badges).set(badge).where(eq(badges.id, badgeId)).returning();
    
    if (courseIds !== undefined) {
      // Remove existing course requirements
      await db.delete(badgeCourseRequirements).where(eq(badgeCourseRequirements.badgeId, badgeId));
      
      // Add new course requirements
      if (courseIds.length > 0) {
        const requirements = courseIds.map(courseId => ({
          badgeId: badgeId,
          courseId: courseId
        }));
        await db.insert(badgeCourseRequirements).values(requirements);
      }
    }
    
    return updated;
  }

  async getBadges(): Promise<Badge[]> {
    return await db.select().from(badges);
  }

  async getBadgeCourseRequirements(badgeId: string): Promise<string[]> {
    const requirements = await db
      .select()
      .from(badgeCourseRequirements)
      .where(eq(badgeCourseRequirements.badgeId, badgeId));
    return requirements.map(req => req.courseId);
  }

  async checkBadgeEligibility(userId: string, badgeId: string): Promise<boolean> {
    // Get required courses for this badge
    const requiredCourseIds = await this.getBadgeCourseRequirements(badgeId);
    
    if (requiredCourseIds.length === 0) {
      return false; // No automatic assignment for badges without course requirements
    }
    
    // Check if user has completed all required courses
    for (const courseId of requiredCourseIds) {
      const enrollment = await db
        .select()
        .from(enrollments)
        .where(and(
          eq(enrollments.userId, userId),
          eq(enrollments.courseId, courseId),
          eq(enrollments.status, "completed")
        ))
        .limit(1);
      
      if (enrollment.length === 0) {
        return false; // User hasn't completed this required course
      }
    }
    
    // Check if user already has this badge
    const existingBadge = await db
      .select()
      .from(userBadges)
      .where(and(
        eq(userBadges.userId, userId),
        eq(userBadges.badgeId, badgeId)
      ))
      .limit(1);
    
    return existingBadge.length === 0; // Eligible if they don't already have it
  }

  async awardBadgeIfEligible(userId: string, badgeId: string, courseVersionId?: string): Promise<UserBadge | null> {
    if (await this.checkBadgeEligibility(userId, badgeId)) {
      const userBadge = await this.awardUserBadge({
        userId,
        badgeId,
        awardedBy: "system",
        reason: "Automatic award for course completion",
        courseVersionId
      });
      return userBadge;
    }
    return null;
  }

  async awardUserBadge(userBadge: InsertUserBadge): Promise<UserBadge> {
    const [created] = await db.insert(userBadges).values(userBadge).returning();
    return created;
  }

  async getUserBadges(userId: string): Promise<UserBadge[]> {
    return await db.select().from(userBadges).where(eq(userBadges.userId, userId));
  }

  // LMS - Training Records (ISO Compliance) (stub implementations)
  async createTrainingRecord(record: InsertTrainingRecord): Promise<TrainingRecord> {
    const [created] = await db.insert(trainingRecords).values(record).returning();
    return created;
  }

  async getUserTrainingRecords(userId: string): Promise<TrainingRecord[]> {
    return await db.select().from(trainingRecords).where(eq(trainingRecords.userId, userId));
  }

  async getTrainingRecords(filters?: { 
    userId?: string; 
    courseId?: string; 
    completedAfter?: Date; 
    completedBefore?: Date; 
  }): Promise<TrainingRecord[]> {
    const conditions = [];
    
    if (filters?.userId) {
      conditions.push(eq(trainingRecords.userId, filters.userId));
    }
    if (filters?.courseId) {
      conditions.push(eq(trainingRecords.courseVersionId, filters.courseId));
    }
    if (filters?.completedAfter) {
      conditions.push(sql`${trainingRecords.completedAt} >= ${filters.completedAfter}`);
    }
    if (filters?.completedBefore) {
      conditions.push(sql`${trainingRecords.completedAt} <= ${filters.completedBefore}`);
    }

    if (conditions.length > 0) {
      return await db
        .select()
        .from(trainingRecords)
        .where(and(...conditions))
        .orderBy(desc(trainingRecords.completedAt));
    } else {
      return await db
        .select()
        .from(trainingRecords)
        .orderBy(desc(trainingRecords.completedAt));
    }
  }

  // LMS - Training Requirements & Matrix (stub implementations)
  async getTrainingRequirements(): Promise<TrainingRequirement[]> {
    return await db.select().from(trainingRequirements);
  }

  async createTrainingRequirement(requirement: InsertTrainingRequirement): Promise<TrainingRequirement> {
    const [created] = await db.insert(trainingRequirements).values(requirement).returning();
    return created;
  }

  async updateTrainingRequirement(requirementId: string, updates: Partial<InsertTrainingRequirement>): Promise<TrainingRequirement> {
    const [updated] = await db
      .update(trainingRequirements)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(trainingRequirements.id, requirementId))
      .returning();
    return updated;
  }

  async deleteTrainingRequirement(requirementId: string): Promise<void> {
    await db.delete(trainingRequirements).where(eq(trainingRequirements.id, requirementId));
  }

  async getTrainingMatrix(filters?: { role?: string; teamId?: string; }): Promise<any[]> {
    // Build where conditions
    const conditions = [eq(trainingRequirements.isActive, true)];
    
    if (filters?.role) {
      conditions.push(eq(trainingRequirements.targetRole, filters.role as any));
    }
    if (filters?.teamId) {
      conditions.push(eq(trainingRequirements.targetTeamId, filters.teamId));
    }

    // Get training requirements based on filters
    const requirements = await db
      .select({
        id: trainingRequirements.id,
        name: trainingRequirements.name,
        description: trainingRequirements.description,
        courseId: trainingRequirements.courseId,
        targetRole: trainingRequirements.targetRole,
        targetTeamId: trainingRequirements.targetTeamId,
        renewalDays: trainingRequirements.renewalDays,
        courseTitle: courses.title,
        courseDescription: courses.description
      })
      .from(trainingRequirements)
      .leftJoin(courses, eq(trainingRequirements.courseId, courses.id))
      .where(and(...conditions));

    // Transform to matrix format with status information
    return requirements.map(req => ({
      id: req.id,
      title: req.courseTitle || req.name,
      description: req.courseDescription || req.description,
      courseId: req.courseId,
      dueDate: req.renewalDays ? new Date(Date.now() + req.renewalDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : null,
      priority: req.targetRole === 'leadership' ? 'high' : req.targetRole === 'supervisor' ? 'medium' : 'low',
      status: 'required', // This will be updated with actual completion status in a separate query
      renewalDays: req.renewalDays
    }));
  }

  // LMS - PDP Integration (stub implementations)
  async linkCourseToPDP(link: InsertPdpCourseLink): Promise<PdpCourseLink> {
    const [created] = await db.insert(pdpCourseLinks).values(link).returning();
    return created;
  }

  async getPDPCourseLinks(developmentPlanId: string): Promise<PdpCourseLink[]> {
    return await db.select().from(pdpCourseLinks).where(eq(pdpCourseLinks.developmentPlanId, developmentPlanId));
  }

  async unlinkCourseFromPDP(linkId: string): Promise<void> {
    await db.delete(pdpCourseLinks).where(eq(pdpCourseLinks.id, linkId));
  }

  // LMS - Admin Management Implementation
  async getAdminCourses(): Promise<Course[]> {
    const courseRows = await db.select({
      id: courses.id,
      title: courses.title,
      description: courses.description,
      category: courses.category,
      level: courses.level,
      estimatedDuration: courses.estimatedDuration,
      tags: courses.tags,
      thumbnailUrl: courses.thumbnailUrl,
      currentVersionId: courses.currentVersionId,
      isPublished: courses.isPublished,
      createdBy: courses.createdBy,
      
      // Course type fields
      courseType: courses.courseType,
      
      // External training fields
      trainingProvider: courses.trainingProvider,
      trainingFormat: courses.trainingFormat,
      accreditation: courses.accreditation,
      accreditationUnits: courses.accreditationUnits,
      startDate: courses.startDate,
      completionDate: courses.completionDate,
      durationHours: courses.durationHours,
      cost: courses.cost,
      currency: courses.currency,
      proofOfCompletionUrl: courses.proofOfCompletionUrl,
      
      createdAt: courses.createdAt,
      updatedAt: courses.updatedAt,
      enrollmentCount: sql<number>`(
        SELECT COUNT(*)::int 
        FROM ${enrollments} e
        INNER JOIN ${courseVersions} cv ON e.course_version_id = cv.id
        WHERE cv.course_id = courses.id
      )`.as('enrollmentCount')
    }).from(courses).orderBy(desc(courses.createdAt));
    
    return courseRows as Course[];
  }

  async getLessonsByCourse(courseId: string): Promise<Lesson[]> {
    // Get the current version of the course
    const [currentVersion] = await db.select()
      .from(courseVersions)
      .where(eq(courseVersions.courseId, courseId))
      .orderBy(desc(courseVersions.publishedAt))
      .limit(1);

    if (!currentVersion) {
      return [];
    }

    // Get the default module for this course version
    const [defaultModule] = await db.select()
      .from(courseModules)
      .where(eq(courseModules.courseVersionId, currentVersion.id))
      .limit(1);

    if (!defaultModule) {
      return [];
    }

    // Get all lessons for the default module
    const lessonRows = await db.select()
      .from(lessons)
      .where(eq(lessons.moduleId, defaultModule.id))
      .orderBy(lessons.orderIndex);

    return lessonRows;
  }


  async deleteCourse(courseId: string): Promise<void> {
    return await db.transaction(async (tx) => {
      try {
        // Delete in proper order to maintain referential integrity
        // First get all course version IDs for this course
        const versionIds = await tx.select({ id: courseVersions.id })
          .from(courseVersions)
          .where(eq(courseVersions.courseId, courseId));
        
        const versionIdList = versionIds.map(v => v.id);
        
        if (versionIdList.length > 0) {
          // Delete lesson progress for lessons in course modules of these versions
          await tx.delete(lessonProgress).where(
            sql`${lessonProgress.lessonId} IN (
              SELECT ${lessons.id} 
              FROM ${lessons} 
              INNER JOIN ${courseModules} ON ${lessons.moduleId} = ${courseModules.id}
              WHERE ${courseModules.courseVersionId} IN (${sql.join(versionIdList.map(id => sql`${id}`), sql`, `)})
            )`
          );
          
          // Delete quiz attempts
          await tx.delete(quizAttempts).where(
            sql`${quizAttempts.quizId} IN (
              SELECT ${quizzes.id} 
              FROM ${quizzes} 
              INNER JOIN ${lessons} ON ${quizzes.lessonId} = ${lessons.id}
              INNER JOIN ${courseModules} ON ${lessons.moduleId} = ${courseModules.id}
              WHERE ${courseModules.courseVersionId} IN (${sql.join(versionIdList.map(id => sql`${id}`), sql`, `)})
            )`
          );
          
          // Delete quiz questions
          await tx.delete(quizQuestions).where(
            sql`${quizQuestions.quizId} IN (
              SELECT ${quizzes.id} 
              FROM ${quizzes} 
              INNER JOIN ${lessons} ON ${quizzes.lessonId} = ${lessons.id}
              INNER JOIN ${courseModules} ON ${lessons.moduleId} = ${courseModules.id}
              WHERE ${courseModules.courseVersionId} IN (${sql.join(versionIdList.map(id => sql`${id}`), sql`, `)})
            )`
          );
          
          // Delete quizzes
          await tx.delete(quizzes).where(
            sql`${quizzes.lessonId} IN (
              SELECT ${lessons.id} 
              FROM ${lessons} 
              INNER JOIN ${courseModules} ON ${lessons.moduleId} = ${courseModules.id}
              WHERE ${courseModules.courseVersionId} IN (${sql.join(versionIdList.map(id => sql`${id}`), sql`, `)})
            )`
          );
          
          // Delete lessons
          await tx.delete(lessons).where(
            sql`${lessons.moduleId} IN (
              SELECT ${courseModules.id} 
              FROM ${courseModules} 
              WHERE ${courseModules.courseVersionId} IN (${sql.join(versionIdList.map(id => sql`${id}`), sql`, `)})
            )`
          );
          
          // Delete course modules
          await tx.delete(courseModules).where(
            sql`${courseModules.courseVersionId} IN (${sql.join(versionIdList.map(id => sql`${id}`), sql`, `)})`
          );
          
          // Delete certificates
          await tx.delete(certificates).where(
            sql`${certificates.courseVersionId} IN (${sql.join(versionIdList.map(id => sql`${id}`), sql`, `)})`
          );
          
          // Delete training records
          await tx.delete(trainingRecords).where(
            sql`${trainingRecords.courseVersionId} IN (${sql.join(versionIdList.map(id => sql`${id}`), sql`, `)})`
          );
          
          // Delete enrollments
          await tx.delete(enrollments).where(
            sql`${enrollments.courseVersionId} IN (${sql.join(versionIdList.map(id => sql`${id}`), sql`, `)})`
          );
        }
        
        // Delete course versions
        await tx.delete(courseVersions).where(eq(courseVersions.courseId, courseId));
        // Delete the course itself
        await tx.delete(courses).where(eq(courses.id, courseId));
      } catch (error) {
        // Transaction will automatically rollback on error
        throw new Error(`Failed to delete course: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });
  }

  async getAdminAnalytics(): Promise<{
    activeLearners: number;
    avgCompletion: number;
    certificatesIssued: number;
    learnerProgress: number;
    engagementRate: number;
    trainingHours: number;
  }> {
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Get active learners this month
    const [activeLearnersResult] = await db.select({
      count: sql<number>`COUNT(DISTINCT ${enrollments.userId})::int`
    }).from(enrollments)
    .where(sql`${enrollments.enrolledAt} >= ${thisMonthStart}`);
    
    // Get average completion rate
    const [avgCompletionResult] = await db.select({
      avg: sql<number>`COALESCE(AVG(${enrollments.progress}), 0)::int`
    }).from(enrollments);
    
    // Get certificates issued this month
    const [certificatesIssuedResult] = await db.select({
      count: sql<number>`COUNT(*)::int`
    }).from(certificates)
    .where(sql`${certificates.issuedAt} >= ${thisMonthStart}`);
    
    // Get overall learner progress
    const [learnerProgressResult] = await db.select({
      avg: sql<number>`COALESCE(AVG(${enrollments.progress}), 0)::int`
    }).from(enrollments)
    .where(sql`${enrollments.progress} > 0`);
    
    // Get engagement rate (active users this week vs total enrolled)
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const [activeThisWeekResult] = await db.select({
      count: sql<number>`COUNT(DISTINCT ${enrollments.userId})::int`
    }).from(lessonProgress)
    .innerJoin(enrollments, sql`${lessonProgress.enrollmentId} = ${enrollments.id}`)
    .where(sql`${lessonProgress.completedAt} >= ${weekAgo}`);
    
    const [totalEnrolledResult] = await db.select({
      count: sql<number>`COUNT(DISTINCT ${enrollments.userId})::int`
    }).from(enrollments);
    
    const engagementRate = totalEnrolledResult.count > 0 
      ? Math.round((activeThisWeekResult.count / totalEnrolledResult.count) * 100)
      : 0;
    
    // Get training hours this month - calculate from course duration and completed enrollments
    const [trainingHoursResult] = await db.select({
      total: sql<number>`COALESCE(SUM(${courses.estimatedDuration}), 0)::int`
    }).from(trainingRecords)
    .innerJoin(courseVersions, sql`${trainingRecords.courseVersionId} = ${courseVersions.id}`)
    .innerJoin(courses, sql`${courseVersions.courseId} = ${courses.id}`)
    .where(sql`${trainingRecords.completedAt} >= ${thisMonthStart}`);
    
    // Convert minutes to hours
    const trainingHours = Math.round((trainingHoursResult.total || 0) / 60);
    
    return {
      activeLearners: activeLearnersResult.count || 0,
      avgCompletion: Math.round(avgCompletionResult.avg || 0),
      certificatesIssued: certificatesIssuedResult.count || 0,
      learnerProgress: Math.round(learnerProgressResult.avg || 0),
      engagementRate,
      trainingHours,
    };
  }

  async duplicateCourse(courseId: string, newTitle: string): Promise<Course> {
    return await db.transaction(async (tx) => {
      try {
        const originalCourse = await this.getCourse(courseId);
        if (!originalCourse) {
          throw new Error('Course not found');
        }
        
        // Create new course with correct field names
        const newCourse = await this.createCourse({
          title: newTitle,
          description: originalCourse.description + ' (Copy)',
          category: originalCourse.category,
          level: originalCourse.level,
          estimatedDuration: originalCourse.estimatedDuration,
          tags: originalCourse.tags,
          thumbnailUrl: originalCourse.thumbnailUrl,
          isPublished: false, // Always create as draft
          createdBy: originalCourse.createdBy,
        });
        
        // Get the current version of the original course
        const currentVersion = await this.getCurrentCourseVersion(courseId);
        if (!currentVersion) {
          return newCourse; // No content to copy
        }
        
        // Create a new version for the new course
        const newVersion = await this.publishCourseVersion(newCourse.id, "1.0", "Initial version", originalCourse.createdBy);
        
        // Get original course modules from the current version
        const originalModules = await tx.select().from(courseModules).where(eq(courseModules.courseVersionId, currentVersion.id));
        
        for (const originalModule of originalModules) {
          // Create new module with correct field names
          const newModule = await this.createCourseModule({
            courseVersionId: newVersion.id,
            title: originalModule.title,
            description: originalModule.description,
            orderIndex: originalModule.orderIndex,
          });
          
          // Get original lessons
          const originalLessons = await tx.select().from(lessons).where(eq(lessons.moduleId, originalModule.id));
          
          for (const originalLesson of originalLessons) {
            // Create new lesson with correct field names
            const newLesson = await this.createLesson({
              moduleId: newModule.id,
              title: originalLesson.title,
              description: originalLesson.description,
              type: originalLesson.type,
              orderIndex: originalLesson.orderIndex,
              vimeoVideoId: originalLesson.vimeoVideoId,
              estimatedDuration: originalLesson.estimatedDuration,
              resourceUrl: originalLesson.resourceUrl,
              isRequired: originalLesson.isRequired,
            });
            
            // Copy quiz if exists
            const originalQuiz = await tx.select().from(quizzes).where(eq(quizzes.lessonId, originalLesson.id));
            if (originalQuiz.length > 0) {
              const quiz = originalQuiz[0];
              const newQuiz = await this.createQuiz({
                lessonId: newLesson.id,
                title: quiz.title,
                description: quiz.description,
                passingScore: quiz.passingScore,
                timeLimit: quiz.timeLimit,
                maxAttempts: quiz.maxAttempts,
                randomizeQuestions: quiz.randomizeQuestions,
              });
              
              // Copy quiz questions with correct field names
              const originalQuestions = await tx.select().from(quizQuestions).where(eq(quizQuestions.quizId, quiz.id));
              for (const question of originalQuestions) {
                await this.createQuizQuestion({
                  quizId: newQuiz.id,
                  type: question.type,
                  questionText: question.questionText,
                  options: question.options as any,
                  correctAnswers: question.correctAnswers as any,
                  explanation: question.explanation,
                  orderIndex: question.orderIndex,
                });
              }
            }
          }
        }
        
        return newCourse;
      } catch (error) {
        // Transaction will automatically rollback on error
        throw new Error(`Failed to duplicate course: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });
  }

  // LMS - Data Migration
  async migrateLegacyCourses(): Promise<{ fixed: number; total: number }> {
    // Find all courses that don't have currentVersionId set
    const coursesWithoutVersions = await db
      .select()
      .from(courses)
      .where(sql`current_version_id IS NULL`);
    
    let fixedCount = 0;
    
    for (const course of coursesWithoutVersions) {
      try {
        // Create initial course version (1.0)
        const [courseVersion] = await db.insert(courseVersions).values({
          courseId: course.id,
          version: "1.0",
          changelog: "Migrated legacy course structure",
          publishedBy: course.createdBy,
          publishedAt: new Date(),
          isActive: true
        }).returning();
        
        // Create default course module
        await db.insert(courseModules).values({
          courseVersionId: courseVersion.id,
          title: "Main Content",
          description: "Main course content and lessons",
          orderIndex: 1
        });
        
        // Update course to point to the current version
        await db
          .update(courses)
          .set({ currentVersionId: courseVersion.id })
          .where(eq(courses.id, course.id));
        
        fixedCount++;
        console.log(`Fixed course: ${course.title} (${course.id})`);
      } catch (error) {
        console.error(`Failed to fix course ${course.title} (${course.id}):`, error);
      }
    }
    
    return {
      fixed: fixedCount,
      total: coursesWithoutVersions.length
    };
  }

  // LMS - External Course Management Implementation
  async assignExternalCourseCompletion(
    userId: string, 
    courseId: string, 
    completionDate: Date, 
    assignedBy: string
  ): Promise<{ enrollment: Enrollment; trainingRecord: TrainingRecord }> {
    return await db.transaction(async (tx) => {
      // Verify that the course exists and is external
      const [course] = await tx.select().from(courses).where(eq(courses.id, courseId));
      if (!course) {
        throw new Error("Course not found");
      }
      if (course.courseType !== "external") {
        throw new Error("This method can only be used for external courses");
      }

      // Verify that the user exists
      const [user] = await tx.select().from(users).where(eq(users.id, userId));
      if (!user) {
        throw new Error("User not found");
      }

      // Get course version using currentVersionId for consistency
      let courseVersion: any;
      if (course.currentVersionId) {
        // Use the current version if it exists
        [courseVersion] = await tx.select()
          .from(courseVersions)
          .where(eq(courseVersions.id, course.currentVersionId));
        
        if (!courseVersion) {
          throw new Error("Course currentVersionId references a non-existent version");
        }
      } else {
        // Create a course version for the external course since none exists
        [courseVersion] = await tx.insert(courseVersions).values({
          courseId: courseId,
          version: "1.0",
          changelog: "External course version",
          publishedBy: assignedBy,
          publishedAt: new Date(),
          isActive: true
        }).returning();
        
        // CRITICAL: Update the course to set currentVersionId for consistency
        await tx
          .update(courses)
          .set({ currentVersionId: courseVersion.id })
          .where(eq(courses.id, courseId));
      }

      // Check if enrollment already exists
      let [existingEnrollment] = await tx.select()
        .from(enrollments)
        .where(and(
          eq(enrollments.userId, userId),
          eq(enrollments.courseVersionId, courseVersion.id)
        ));

      let enrollment: Enrollment;
      if (existingEnrollment) {
        // Update existing enrollment to completed
        [enrollment] = await tx
          .update(enrollments)
          .set({
            status: "completed",
            completedAt: completionDate,
            progress: 100,
            startedAt: existingEnrollment.startedAt || completionDate
          })
          .where(eq(enrollments.id, existingEnrollment.id))
          .returning();
      } else {
        // Create new enrollment as completed
        [enrollment] = await tx.insert(enrollments).values({
          userId: userId,
          courseVersionId: courseVersion.id,
          status: "completed",
          enrolledAt: completionDate,
          startedAt: completionDate,
          completedAt: completionDate,
          progress: 100
        }).returning();
      }

      // Check for existing training record at course level to ensure idempotency 
      // Use course-level idempotency (not version-level) to prevent duplicates across versions
      let [existingTrainingRecord] = await tx
        .select({
          id: trainingRecords.id,
          courseVersionId: trainingRecords.courseVersionId,
          enrollmentId: trainingRecords.enrollmentId
        })
        .from(trainingRecords)
        .innerJoin(courseVersions, eq(trainingRecords.courseVersionId, courseVersions.id))
        .where(and(
          eq(trainingRecords.userId, userId),
          eq(courseVersions.courseId, courseId)
        ))
        .limit(1);

      let trainingRecord: TrainingRecord;
      if (existingTrainingRecord) {
        // Update existing training record to current version and date
        [trainingRecord] = await tx
          .update(trainingRecords)
          .set({
            courseVersionId: courseVersion.id, // Update to current version
            enrollmentId: enrollment.id, // Update to current enrollment
            completedAt: completionDate,
            signedOffBy: assignedBy,
            effectivenessCheck: "External course completion manually assigned by administrator (updated)"
          })
          .where(eq(trainingRecords.id, existingTrainingRecord.id))
          .returning();
      } else {
        // Create new immutable training record
        [trainingRecord] = await tx.insert(trainingRecords).values({
          userId: userId,
          courseVersionId: courseVersion.id,
          enrollmentId: enrollment.id,
          completedAt: completionDate,
          finalScore: 100, // External courses are considered 100% completed
          signedOffBy: assignedBy,
          effectivenessCheck: "External course completion manually assigned by administrator"
        }).returning();
      }

      return { enrollment, trainingRecord };
    });
  }

  // ========================================
  // LEARNING PATHS AND TRAINING MATRIX STUB IMPLEMENTATIONS
  // These methods are implemented incrementally in vertical slices
  // ========================================

  // Learning Paths Management (Vertical Slice 1)
  async getLearningPaths(): Promise<LearningPath[]> {
    return await db
      .select()
      .from(learningPaths)
      .where(isNull(learningPaths.deletedAt))
      .orderBy(learningPaths.title);
  }

  async getLearningPath(pathId: string): Promise<LearningPath | undefined> {
    const [path] = await db
      .select()
      .from(learningPaths)
      .where(and(eq(learningPaths.id, pathId), isNull(learningPaths.deletedAt)));
    return path;
  }

  async getLearningPathWithSteps(pathId: string): Promise<LearningPath & { steps: LearningPathStep[] }> {
    const path = await this.getLearningPath(pathId);
    if (!path) {
      throw new Error(`Learning path not found: ${pathId}`);
    }
    
    const steps = await this.getLearningPathSteps(pathId);
    return { ...path, steps };
  }

  async createLearningPath(path: InsertLearningPath): Promise<LearningPath> {
    const [newPath] = await db
      .insert(learningPaths)
      .values({
        ...path,
        isPublished: false,
        publishedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return newPath;
  }

  async updateLearningPath(pathId: string, updates: Partial<InsertLearningPath>): Promise<LearningPath> {
    const [updatedPath] = await db
      .update(learningPaths)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(and(eq(learningPaths.id, pathId), isNull(learningPaths.deletedAt)))
      .returning();
      
    if (!updatedPath) {
      throw new Error(`Learning path not found: ${pathId}`);
    }
    
    return updatedPath;
  }

  async deleteLearningPath(pathId: string): Promise<void> {
    // Soft delete the path and all its steps
    await db.transaction(async (tx) => {
      // Soft delete all steps first
      await tx
        .update(learningPathSteps)
        .set({ deletedAt: new Date() })
        .where(and(eq(learningPathSteps.pathId, pathId), isNull(learningPathSteps.deletedAt)));
        
      // Then soft delete the path
      const [deletedPath] = await tx
        .update(learningPaths)
        .set({ deletedAt: new Date() })
        .where(and(eq(learningPaths.id, pathId), isNull(learningPaths.deletedAt)))
        .returning();
        
      if (!deletedPath) {
        throw new Error(`Learning path not found: ${pathId}`);
      }
    });
  }

  async publishLearningPath(pathId: string): Promise<LearningPath> {
    // First, verify the path exists and is not deleted
    const path = await this.getLearningPath(pathId);
    if (!path) {
      throw new Error(`Learning path not found: ${pathId}`);
    }
    
    // Ensure path has at least one step before publishing
    const steps = await this.getLearningPathSteps(pathId);
    if (steps.length === 0) {
      throw new Error("Cannot publish learning path without steps");
    }
    
    const [publishedPath] = await db
      .update(learningPaths)
      .set({
        isPublished: true,
        publishedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(learningPaths.id, pathId), isNull(learningPaths.deletedAt)))
      .returning();
      
    // This should always succeed since we verified path exists above
    if (!publishedPath) {
      throw new Error(`Unexpected error: learning path disappeared during publish: ${pathId}`);
    }
    
    return publishedPath;
  }

  async unpublishLearningPath(pathId: string): Promise<LearningPath> {
    // First, verify the path exists and is not deleted
    const path = await this.getLearningPath(pathId);
    if (!path) {
      throw new Error(`Learning path not found: ${pathId}`);
    }
    
    const [unpublishedPath] = await db
      .update(learningPaths)
      .set({
        isPublished: false,
        updatedAt: new Date(),
      })
      .where(and(eq(learningPaths.id, pathId), isNull(learningPaths.deletedAt)))
      .returning();
      
    // This should always succeed since we verified path exists above
    if (!unpublishedPath) {
      throw new Error(`Unexpected error: learning path disappeared during unpublish: ${pathId}`);
    }
    
    return unpublishedPath;
  }

  // Learning Path Steps Management (Vertical Slice 1)
  async getLearningPathSteps(pathId: string): Promise<LearningPathStep[]> {
    return await db
      .select()
      .from(learningPathSteps)
      .where(and(eq(learningPathSteps.pathId, pathId), isNull(learningPathSteps.deletedAt)))
      .orderBy(learningPathSteps.stepOrder);
  }

  async getLearningPathStep(stepId: string): Promise<LearningPathStep | undefined> {
    const [step] = await db
      .select()
      .from(learningPathSteps)
      .where(and(eq(learningPathSteps.id, stepId), isNull(learningPathSteps.deletedAt)));
    return step;
  }

  async createLearningPathStep(step: InsertLearningPathStep): Promise<LearningPathStep> {
    return await db.transaction(async (tx) => {
      // If no step order provided, get the next available order
      let stepOrder = step.stepOrder;
      if (!stepOrder) {
        const [maxOrderResult] = await tx
          .select({ maxOrder: max(learningPathSteps.stepOrder) })
          .from(learningPathSteps)
          .where(and(eq(learningPathSteps.pathId, step.pathId), isNull(learningPathSteps.deletedAt)));
        
        stepOrder = (maxOrderResult?.maxOrder ?? 0) + 1;
      }
      
      // Ensure the path exists
      const path = await this.getLearningPath(step.pathId);
      if (!path) {
        throw new Error(`Learning path not found: ${step.pathId}`);
      }
      
      const [newStep] = await tx
        .insert(learningPathSteps)
        .values({
          ...step,
          stepOrder,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();
        
      return newStep;
    });
  }

  async updateLearningPathStep(stepId: string, updates: Partial<InsertLearningPathStep>): Promise<LearningPathStep> {
    const [updatedStep] = await db
      .update(learningPathSteps)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(and(eq(learningPathSteps.id, stepId), isNull(learningPathSteps.deletedAt)))
      .returning();
      
    if (!updatedStep) {
      throw new Error(`Learning path step not found: ${stepId}`);
    }
    
    return updatedStep;
  }

  async deleteLearningPathStep(stepId: string): Promise<void> {
    const [deletedStep] = await db
      .update(learningPathSteps)
      .set({ deletedAt: new Date() })
      .where(and(eq(learningPathSteps.id, stepId), isNull(learningPathSteps.deletedAt)))
      .returning();
      
    if (!deletedStep) {
      throw new Error(`Learning path step not found: ${stepId}`);
    }
  }

  async reorderLearningPathSteps(pathId: string, stepIds: string[]): Promise<void> {
    await db.transaction(async (tx) => {
      // Verify path exists
      const path = await tx
        .select({ id: learningPaths.id })
        .from(learningPaths)
        .where(and(eq(learningPaths.id, pathId), isNull(learningPaths.deletedAt)));
      
      if (path.length === 0) {
        throw new Error(`Learning path not found: ${pathId}`);
      }
      
      // Get all current steps for this path to ensure we're reordering the complete set
      const allCurrentSteps = await tx
        .select({ id: learningPathSteps.id })
        .from(learningPathSteps)
        .where(and(eq(learningPathSteps.pathId, pathId), isNull(learningPathSteps.deletedAt)));
      
      // Verify all steps belong to the path and we're reordering the complete set
      const currentStepIds = allCurrentSteps.map(s => s.id).sort();
      const providedStepIds = [...stepIds].sort();
      
      if (currentStepIds.length !== providedStepIds.length || 
          !currentStepIds.every((id, index) => id === providedStepIds[index])) {
        throw new Error("Must provide all current steps when reordering");
      }
      
      // Two-phase update to avoid unique constraint violations:
      // Phase 1: Add large offset to all affected steps to temporarily clear conflicts
      const tempOffset = 100000;
      for (let i = 0; i < stepIds.length; i++) {
        await tx
          .update(learningPathSteps)
          .set({ 
            stepOrder: tempOffset + i,
            updatedAt: new Date()
          })
          .where(and(
            eq(learningPathSteps.id, stepIds[i]),
            eq(learningPathSteps.pathId, pathId),
            isNull(learningPathSteps.deletedAt)
          ));
      }
      
      // Phase 2: Set final step orders
      for (let i = 0; i < stepIds.length; i++) {
        await tx
          .update(learningPathSteps)
          .set({ 
            stepOrder: i + 1,
            updatedAt: new Date()
          })
          .where(and(
            eq(learningPathSteps.id, stepIds[i]),
            eq(learningPathSteps.pathId, pathId),
            isNull(learningPathSteps.deletedAt)
          ));
      }
    });
  }

  // Learning Path Enrollments and Progress
  async getLearningPathEnrollments(userId?: string, pathId?: string): Promise<LearningPathEnrollment[]> {
    let query = db.select().from(learningPathEnrollments);
    const conditions = [];
    
    if (userId) {
      conditions.push(eq(learningPathEnrollments.userId, userId));
    }
    if (pathId) {
      conditions.push(eq(learningPathEnrollments.pathId, pathId));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    return await query.orderBy(desc(learningPathEnrollments.startDate));
  }

  async getLearningPathEnrollment(enrollmentId: string): Promise<LearningPathEnrollment | undefined> {
    const results = await db.select()
      .from(learningPathEnrollments)
      .where(eq(learningPathEnrollments.id, enrollmentId));
    
    return results[0];
  }

  async enrollUserInLearningPath(enrollment: InsertLearningPathEnrollment): Promise<LearningPathEnrollment> {
    return await db.transaction(async (tx) => {
      // Check if user is already enrolled in this path
      const existingEnrollment = await tx.select()
        .from(learningPathEnrollments)
        .where(and(
          eq(learningPathEnrollments.userId, enrollment.userId),
          eq(learningPathEnrollments.pathId, enrollment.pathId),
          ne(learningPathEnrollments.enrollmentStatus, "completed")
        ));
      
      if (existingEnrollment.length > 0) {
        throw new Error("User is already enrolled in this learning path");
      }
      
      const [newEnrollment] = await tx.insert(learningPathEnrollments)
        .values(enrollment)
        .returning();
      
      // Initialize step progress for all steps in the path
      const steps = await tx.select()
        .from(learningPathSteps)
        .where(and(
          eq(learningPathSteps.pathId, enrollment.pathId),
          isNull(learningPathSteps.deletedAt)
        ))
        .orderBy(learningPathSteps.stepOrder);
      
      if (steps.length > 0) {
        const stepProgressRecords = steps.map(step => ({
          enrollmentId: newEnrollment.id,
          stepId: step.id,
          userId: enrollment.userId,
          status: "not_started" as const,
          attempts: 0,
          timeSpent: 0,
          startDate: null,
          completionDate: null
        }));
        
        await tx.insert(learningPathStepProgress).values(stepProgressRecords);
      }
      
      return newEnrollment;
    });
  }

  async updateLearningPathEnrollment(enrollmentId: string, updates: Partial<InsertLearningPathEnrollment>): Promise<LearningPathEnrollment> {
    const [updatedEnrollment] = await db.update(learningPathEnrollments)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(learningPathEnrollments.id, enrollmentId))
      .returning();
    
    if (!updatedEnrollment) {
      throw new Error("Learning path enrollment not found");
    }
    
    return updatedEnrollment;
  }

  async completeLearningPathEnrollment(enrollmentId: string): Promise<LearningPathEnrollment> {
    const [completedEnrollment] = await db.update(learningPathEnrollments)
      .set({
        enrollmentStatus: "completed",
        progress: 100,
        completionDate: new Date(),
        updatedAt: new Date()
      })
      .where(eq(learningPathEnrollments.id, enrollmentId))
      .returning();
    
    if (!completedEnrollment) {
      throw new Error("Learning path enrollment not found");
    }
    
    return completedEnrollment;
  }

  async suspendLearningPathEnrollment(enrollmentId: string, reason?: string): Promise<LearningPathEnrollment> {
    const [suspendedEnrollment] = await db.update(learningPathEnrollments)
      .set({
        enrollmentStatus: "suspended",
        metadata: reason ? { suspensionReason: reason } : null,
        updatedAt: new Date()
      })
      .where(eq(learningPathEnrollments.id, enrollmentId))
      .returning();
    
    if (!suspendedEnrollment) {
      throw new Error("Learning path enrollment not found");
    }
    
    return suspendedEnrollment;
  }

  async resumeLearningPathEnrollment(enrollmentId: string): Promise<LearningPathEnrollment> {
    const [resumedEnrollment] = await db.update(learningPathEnrollments)
      .set({
        enrollmentStatus: "active",
        metadata: null,
        updatedAt: new Date()
      })
      .where(eq(learningPathEnrollments.id, enrollmentId))
      .returning();
    
    if (!resumedEnrollment) {
      throw new Error("Learning path enrollment not found");
    }
    
    return resumedEnrollment;
  }

  // Learning Path Step Progress
  async getLearningPathStepProgress(enrollmentId: string): Promise<LearningPathStepProgress[]> {
    return await db.select()
      .from(learningPathStepProgress)
      .where(eq(learningPathStepProgress.enrollmentId, enrollmentId))
      .orderBy(asc(learningPathStepProgress.createdAt));
  }

  async getStepProgress(enrollmentId: string, stepId: string): Promise<LearningPathStepProgress | undefined> {
    const results = await db.select()
      .from(learningPathStepProgress)
      .where(and(
        eq(learningPathStepProgress.enrollmentId, enrollmentId),
        eq(learningPathStepProgress.stepId, stepId)
      ));
    
    return results[0];
  }

  async updateStepProgress(progress: InsertLearningPathStepProgress): Promise<LearningPathStepProgress> {
    const existingProgress = await this.getStepProgress(progress.enrollmentId, progress.stepId);
    
    if (!existingProgress) {
      // Create new step progress record
      const [newProgress] = await db.insert(learningPathStepProgress)
        .values(progress)
        .returning();
      
      // Update enrollment progress based on step completion
      await this.updateLearningPathEnrollmentProgress(progress.enrollmentId);
      
      return newProgress;
    } else {
      // Update existing step progress
      const [updatedProgress] = await db.update(learningPathStepProgress)
        .set({ ...progress, updatedAt: new Date() })
        .where(and(
          eq(learningPathStepProgress.enrollmentId, progress.enrollmentId),
          eq(learningPathStepProgress.stepId, progress.stepId)
        ))
        .returning();
      
      // Update enrollment progress based on step completion
      await this.updateLearningPathEnrollmentProgress(progress.enrollmentId);
      
      return updatedProgress;
    }
  }

  async completeStep(enrollmentId: string, stepId: string, score?: number, timeSpent?: number): Promise<LearningPathStepProgress> {
    const [completedProgress] = await db.update(learningPathStepProgress)
      .set({
        status: "completed",
        score: score,
        timeSpent: timeSpent,
        completionDate: new Date(),
        updatedAt: new Date()
      })
      .where(and(
        eq(learningPathStepProgress.enrollmentId, enrollmentId),
        eq(learningPathStepProgress.stepId, stepId)
      ))
      .returning();
    
    if (!completedProgress) {
      throw new Error("Step progress not found");
    }
    
    // Update enrollment progress
    await this.updateLearningPathEnrollmentProgress(enrollmentId);
    
    return completedProgress;
  }

  async skipStep(enrollmentId: string, stepId: string, reason: string): Promise<LearningPathStepProgress> {
    const [skippedProgress] = await db.update(learningPathStepProgress)
      .set({
        status: "skipped",
        metadata: { skipReason: reason },
        updatedAt: new Date()
      })
      .where(and(
        eq(learningPathStepProgress.enrollmentId, enrollmentId),
        eq(learningPathStepProgress.stepId, stepId)
      ))
      .returning();
    
    if (!skippedProgress) {
      throw new Error("Step progress not found");
    }
    
    // Update enrollment progress
    await this.updateLearningPathEnrollmentProgress(enrollmentId);
    
    return skippedProgress;
  }

  // Helper method to update learning path enrollment progress based on step completion
  private async updateLearningPathEnrollmentProgress(enrollmentId: string): Promise<void> {
    // Get all step progress for this enrollment
    const stepProgresses = await this.getLearningPathStepProgress(enrollmentId);
    
    if (stepProgresses.length === 0) return;
    
    // Calculate overall progress
    const completedSteps = stepProgresses.filter(step => step.status === "completed" || step.status === "skipped").length;
    const totalSteps = stepProgresses.length;
    const progressPercentage = Math.round((completedSteps / totalSteps) * 100);
    
    // Determine if all steps are completed
    const allStepsCompleted = completedSteps === totalSteps;
    
    // Update enrollment
    const updates: Partial<InsertLearningPathEnrollment> = {
      progress: progressPercentage
    };
    
    if (allStepsCompleted) {
      updates.enrollmentStatus = "completed";
    }
    
    await db.update(learningPathEnrollments)
      .set(updates)
      .where(eq(learningPathEnrollments.id, enrollmentId));
  }

  // Competency Library Management (Vertical Slice 4)
  async getCompetencyLibrary(): Promise<CompetencyLibraryItem[]> {
    throw new Error("Competency library not yet implemented - will be added in Vertical Slice 4");
  }

  async getCompetencyLibraryItem(itemId: string): Promise<CompetencyLibraryItem | undefined> {
    throw new Error("Competency library not yet implemented - will be added in Vertical Slice 4");
  }

  async createCompetencyLibraryItem(item: InsertCompetencyLibraryItem): Promise<CompetencyLibraryItem> {
    throw new Error("Competency library not yet implemented - will be added in Vertical Slice 4");
  }

  async updateCompetencyLibraryItem(itemId: string, updates: Partial<InsertCompetencyLibraryItem>): Promise<CompetencyLibraryItem> {
    throw new Error("Competency library not yet implemented - will be added in Vertical Slice 4");
  }

  async deleteCompetencyLibraryItem(itemId: string): Promise<void> {
    throw new Error("Competency library not yet implemented - will be added in Vertical Slice 4");
  }

  async linkLearningPathToCompetency(competencyLibraryId: string, learningPathId: string): Promise<void> {
    throw new Error("Competency library not yet implemented - will be added in Vertical Slice 4");
  }

  async unlinkLearningPathFromCompetency(competencyLibraryId: string, learningPathId: string): Promise<void> {
    throw new Error("Competency library not yet implemented - will be added in Vertical Slice 4");
  }

  // Role Competency Mappings (Vertical Slice 3)
  async getRoleCompetencyMappings(role?: string, teamId?: string): Promise<RoleCompetencyMapping[]> {
    throw new Error("Role competency mappings not yet implemented - will be added in Vertical Slice 3");
  }

  async getRoleCompetencyMapping(mappingId: string): Promise<RoleCompetencyMapping | undefined> {
    throw new Error("Role competency mappings not yet implemented - will be added in Vertical Slice 3");
  }

  async createRoleCompetencyMapping(mapping: InsertRoleCompetencyMapping): Promise<RoleCompetencyMapping> {
    throw new Error("Role competency mappings not yet implemented - will be added in Vertical Slice 3");
  }

  async updateRoleCompetencyMapping(mappingId: string, updates: Partial<InsertRoleCompetencyMapping>): Promise<RoleCompetencyMapping> {
    throw new Error("Role competency mappings not yet implemented - will be added in Vertical Slice 3");
  }

  async deleteRoleCompetencyMapping(mappingId: string): Promise<void> {
    throw new Error("Role competency mappings not yet implemented - will be added in Vertical Slice 3");
  }

  async getRequiredCompetenciesForUser(userId: string): Promise<CompetencyLibraryItem[]> {
    throw new Error("Role competency mappings not yet implemented - will be added in Vertical Slice 3");
  }

  // Training Matrix and Compliance (Vertical Slice 3)
  async getTrainingMatrixRecords(userId?: string, competencyLibraryId?: string): Promise<TrainingMatrixRecord[]> {
    throw new Error("Training matrix not yet implemented - will be added in Vertical Slice 3");
  }

  async getTrainingMatrixRecord(recordId: string): Promise<TrainingMatrixRecord | undefined> {
    throw new Error("Training matrix not yet implemented - will be added in Vertical Slice 3");
  }

  async createTrainingMatrixRecord(record: InsertTrainingMatrixRecord): Promise<TrainingMatrixRecord> {
    throw new Error("Training matrix not yet implemented - will be added in Vertical Slice 3");
  }

  async updateTrainingMatrixRecord(recordId: string, updates: Partial<InsertTrainingMatrixRecord>): Promise<TrainingMatrixRecord> {
    throw new Error("Training matrix not yet implemented - will be added in Vertical Slice 3");
  }

  async getComplianceReport(filters?: { role?: string; teamId?: string; competencyId?: string; status?: string; }): Promise<any> {
    throw new Error("Training matrix not yet implemented - will be added in Vertical Slice 3");
  }

  async getCompetencyGapAnalysis(userId?: string): Promise<any> {
    throw new Error("Training matrix not yet implemented - will be added in Vertical Slice 3");
  }

  async updateCompetencyStatus(userId: string, competencyLibraryId: string, status: string, evidenceData?: any): Promise<TrainingMatrixRecord> {
    throw new Error("Training matrix not yet implemented - will be added in Vertical Slice 3");
  }

  // Automation Rules Engine (Vertical Slice 5)
  async getAutomationRules(isActive?: boolean): Promise<AutomationRule[]> {
    throw new Error("Automation rules not yet implemented - will be added in Vertical Slice 5");
  }

  async getAutomationRule(ruleId: string): Promise<AutomationRule | undefined> {
    throw new Error("Automation rules not yet implemented - will be added in Vertical Slice 5");
  }

  async createAutomationRule(rule: InsertAutomationRule): Promise<AutomationRule> {
    throw new Error("Automation rules not yet implemented - will be added in Vertical Slice 5");
  }

  async updateAutomationRule(ruleId: string, updates: Partial<InsertAutomationRule>): Promise<AutomationRule> {
    throw new Error("Automation rules not yet implemented - will be added in Vertical Slice 5");
  }

  async deleteAutomationRule(ruleId: string): Promise<void> {
    throw new Error("Automation rules not yet implemented - will be added in Vertical Slice 5");
  }

  async activateAutomationRule(ruleId: string): Promise<AutomationRule> {
    throw new Error("Automation rules not yet implemented - will be added in Vertical Slice 5");
  }

  async deactivateAutomationRule(ruleId: string): Promise<AutomationRule> {
    throw new Error("Automation rules not yet implemented - will be added in Vertical Slice 5");
  }

  async executeAutomationRule(ruleId: string, triggerData?: any): Promise<{ executed: boolean; enrollments: number; errors?: string[] }> {
    throw new Error("Automation rules not yet implemented - will be added in Vertical Slice 5");
  }

  async executeAutomationRulesForUser(userId: string, triggerEvent: string): Promise<{ totalRules: number; executed: number; enrollments: number }> {
    throw new Error("Automation rules not yet implemented - will be added in Vertical Slice 5");
  }
}

export const storage = new DatabaseStorage();
