import { sql, relations } from "drizzle-orm";
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  boolean,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table - required for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User roles enum
export const userRoleEnum = pgEnum("user_role", ["operative", "supervisor", "leadership"]);

// Confidence levels enum
export const confidenceLevelEnum = pgEnum("confidence_level", ["green", "amber", "red"]);

// Company values enum
export const companyValueEnum = pgEnum("company_value", ["excellence", "teamwork", "innovation", "reliability"]);

// Teams table - formal team structure
export const teams = pgTable("teams", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  description: text("description"),
  parentTeamId: varchar("parent_team_id"), // For team hierarchies
  teamLeadId: varchar("team_lead_id").notNull(),
  department: varchar("department"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Users table - required for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  mobilePhone: varchar("mobile_phone"),
  role: userRoleEnum("role").default("operative").notNull(),
  managerId: varchar("manager_id"),
  teamId: varchar("team_id"), // Reference to teams table
  teamName: varchar("team_name"), // Keep for backward compatibility during transition
  jobTitle: varchar("job_title"),
  startDate: timestamp("start_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Company objectives
export const companyObjectives = pgTable("company_objectives", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  createdBy: varchar("created_by").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Key results for company objectives
export const keyResults = pgTable("key_results", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  objectiveId: varchar("objective_id").notNull(),
  title: text("title").notNull(),
  targetValue: integer("target_value").notNull(),
  currentValue: integer("current_value").default(0),
  unit: varchar("unit").notNull(), // %, count, score, etc.
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Team objectives (middle tier in 3-tier OKR hierarchy)
export const teamObjectives = pgTable("team_objectives", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  parentCompanyObjectiveId: varchar("parent_company_objective_id").notNull(),
  teamName: varchar("team_name").notNull(),
  supervisorId: varchar("supervisor_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Key results for team objectives
export const teamKeyResults = pgTable("team_key_results", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teamObjectiveId: varchar("team_objective_id").notNull(),
  title: text("title").notNull(),
  targetValue: integer("target_value").notNull(),
  currentValue: integer("current_value").default(0),
  unit: varchar("unit").notNull(), // %, count, score, etc.
  isSharedGoal: boolean("is_shared_goal").default(false), // True if whole team contributes
  assignedToUserId: varchar("assigned_to_user_id"), // For individually owned KRs
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Individual goals (OKRs)
export const goals = pgTable("goals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  parentObjectiveId: varchar("parent_objective_id"), // Links to company objective
  parentTeamObjectiveId: varchar("parent_team_objective_id"), // Links to team objective
  targetValue: integer("target_value").notNull(),
  currentValue: integer("current_value").default(0),
  unit: varchar("unit").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  confidenceLevel: confidenceLevelEnum("confidence_level").default("green"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Weekly check-ins
export const weeklyCheckIns = pgTable("weekly_check_ins", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  goalId: varchar("goal_id").notNull(),
  userId: varchar("user_id").notNull(),
  progress: integer("progress").notNull(), // 0-100%
  confidenceLevel: confidenceLevelEnum("confidence_level").notNull(),
  achievements: text("achievements"),
  challenges: text("challenges"),
  weekOf: timestamp("week_of").notNull(),
  submittedAt: timestamp("submitted_at").defaultNow(),
});

// Competencies
export const competencies = pgTable("competencies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  description: text("description"),
  category: varchar("category"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// User competency assessments
export const userCompetencies = pgTable("user_competencies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  competencyId: varchar("competency_id").notNull(),
  currentLevel: integer("current_level").default(0), // 0-100%
  targetLevel: integer("target_level").default(100),
  lastAssessedAt: timestamp("last_assessed_at"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Development plans
export const developmentPlans = pgTable("development_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  competencyId: varchar("competency_id"),
  targetDate: timestamp("target_date"),
  status: varchar("status").default("in_progress"), // in_progress, completed, on_hold
  progress: integer("progress").default(0), // 0-100%
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Learning resources
export const learningResources = pgTable("learning_resources", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  description: text("description"),
  type: varchar("type").notNull(), // video, document, external_link, course
  url: varchar("url"),
  duration: integer("duration"), // in minutes
  competencyId: varchar("competency_id"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// One-on-one meetings
export const meetings = pgTable("meetings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  managerId: varchar("manager_id").notNull(),
  employeeId: varchar("employee_id").notNull(),
  scheduledAt: timestamp("scheduled_at").notNull(),
  duration: integer("duration").default(30), // in minutes
  agenda: text("agenda"),
  employeeNotes: text("employee_notes"),
  managerNotes: text("manager_notes"),
  actionItems: jsonb("action_items"), // Array of action items
  status: varchar("status").default("scheduled"), // scheduled, completed, cancelled
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Recognition/kudos
export const recognitions = pgTable("recognitions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fromUserId: varchar("from_user_id").notNull(),
  toUserId: varchar("to_user_id").notNull(),
  value: companyValueEnum("value").notNull(),
  message: text("message").notNull(),
  isPublic: boolean("is_public").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const teamsRelations = relations(teams, ({ one, many }) => ({
  parentTeam: one(teams, {
    fields: [teams.parentTeamId],
    references: [teams.id],
    relationName: "parentTeam",
  }),
  subTeams: many(teams, { relationName: "parentTeam" }),
  teamLead: one(users, {
    fields: [teams.teamLeadId],
    references: [users.id],
  }),
  members: many(users),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  manager: one(users, {
    fields: [users.managerId],
    references: [users.id],
    relationName: "manager",
  }),
  directReports: many(users, { relationName: "manager" }),
  team: one(teams, {
    fields: [users.teamId],
    references: [teams.id],
  }),
  ledTeams: many(teams), // Teams this user leads
  goals: many(goals),
  checkIns: many(weeklyCheckIns),
  competencies: many(userCompetencies),
  developmentPlans: many(developmentPlans),
  managedMeetings: many(meetings, { relationName: "managedMeetings" }),
  employeeMeetings: many(meetings, { relationName: "employeeMeetings" }),
  sentRecognitions: many(recognitions, { relationName: "sentRecognitions" }),
  receivedRecognitions: many(recognitions, { relationName: "receivedRecognitions" }),
}));

export const companyObjectivesRelations = relations(companyObjectives, ({ one, many }) => ({
  creator: one(users, {
    fields: [companyObjectives.createdBy],
    references: [users.id],
  }),
  keyResults: many(keyResults),
  teamObjectives: many(teamObjectives),
  goals: many(goals),
}));

export const teamObjectivesRelations = relations(teamObjectives, ({ one, many }) => ({
  parentCompanyObjective: one(companyObjectives, {
    fields: [teamObjectives.parentCompanyObjectiveId],
    references: [companyObjectives.id],
  }),
  supervisor: one(users, {
    fields: [teamObjectives.supervisorId],
    references: [users.id],
  }),
  keyResults: many(teamKeyResults),
  goals: many(goals),
}));

export const keyResultsRelations = relations(keyResults, ({ one }) => ({
  objective: one(companyObjectives, {
    fields: [keyResults.objectiveId],
    references: [companyObjectives.id],
  }),
}));

export const teamKeyResultsRelations = relations(teamKeyResults, ({ one }) => ({
  teamObjective: one(teamObjectives, {
    fields: [teamKeyResults.teamObjectiveId],
    references: [teamObjectives.id],
  }),
  assignedToUser: one(users, {
    fields: [teamKeyResults.assignedToUserId],
    references: [users.id],
  }),
}));

export const goalsRelations = relations(goals, ({ one, many }) => ({
  user: one(users, {
    fields: [goals.userId],
    references: [users.id],
  }),
  parentObjective: one(companyObjectives, {
    fields: [goals.parentObjectiveId],
    references: [companyObjectives.id],
  }),
  parentTeamObjective: one(teamObjectives, {
    fields: [goals.parentTeamObjectiveId],
    references: [teamObjectives.id],
  }),
  checkIns: many(weeklyCheckIns),
}));

export const weeklyCheckInsRelations = relations(weeklyCheckIns, ({ one }) => ({
  goal: one(goals, {
    fields: [weeklyCheckIns.goalId],
    references: [goals.id],
  }),
  user: one(users, {
    fields: [weeklyCheckIns.userId],
    references: [users.id],
  }),
}));

export const competenciesRelations = relations(competencies, ({ many }) => ({
  userCompetencies: many(userCompetencies),
  developmentPlans: many(developmentPlans),
  learningResources: many(learningResources),
}));

export const userCompetenciesRelations = relations(userCompetencies, ({ one }) => ({
  user: one(users, {
    fields: [userCompetencies.userId],
    references: [users.id],
  }),
  competency: one(competencies, {
    fields: [userCompetencies.competencyId],
    references: [competencies.id],
  }),
}));

export const developmentPlansRelations = relations(developmentPlans, ({ one }) => ({
  user: one(users, {
    fields: [developmentPlans.userId],
    references: [users.id],
  }),
  competency: one(competencies, {
    fields: [developmentPlans.competencyId],
    references: [competencies.id],
  }),
}));

export const learningResourcesRelations = relations(learningResources, ({ one }) => ({
  competency: one(competencies, {
    fields: [learningResources.competencyId],
    references: [competencies.id],
  }),
}));

export const meetingsRelations = relations(meetings, ({ one }) => ({
  manager: one(users, {
    fields: [meetings.managerId],
    references: [users.id],
    relationName: "managedMeetings",
  }),
  employee: one(users, {
    fields: [meetings.employeeId],
    references: [users.id],
    relationName: "employeeMeetings",
  }),
}));

export const recognitionsRelations = relations(recognitions, ({ one }) => ({
  fromUser: one(users, {
    fields: [recognitions.fromUserId],
    references: [users.id],
    relationName: "sentRecognitions",
  }),
  toUser: one(users, {
    fields: [recognitions.toUserId],
    references: [users.id],
    relationName: "receivedRecognitions",
  }),
}));

// Insert schemas
export const insertTeamSchema = createInsertSchema(teams).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const upsertUserSchema = createInsertSchema(users).omit({
  createdAt: true,
  updatedAt: true,
});

export const updateUserProfileSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).partial();

export const insertCompanyObjectiveSchema = createInsertSchema(companyObjectives).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  startDate: z.string()
    .min(1, "Start date is required")
    .refine((str) => {
      const date = new Date(str);
      return !isNaN(date.getTime());
    }, "Invalid date format")
    .transform((str) => new Date(str)),
  endDate: z.string()
    .min(1, "End date is required")
    .refine((str) => {
      const date = new Date(str);
      return !isNaN(date.getTime());
    }, "Invalid date format")
    .transform((str) => new Date(str)),
});

export const insertKeyResultSchema = createInsertSchema(keyResults).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTeamObjectiveSchema = createInsertSchema(teamObjectives).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  startDate: z.string()
    .min(1, "Start date is required")
    .refine((str) => {
      const date = new Date(str);
      return !isNaN(date.getTime());
    }, "Invalid date format")
    .transform((str) => new Date(str)),
  endDate: z.string()
    .min(1, "End date is required")
    .refine((str) => {
      const date = new Date(str);
      return !isNaN(date.getTime());
    }, "Invalid date format")
    .transform((str) => new Date(str)),
});

export const insertTeamKeyResultSchema = createInsertSchema(teamKeyResults).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertGoalSchema = createInsertSchema(goals).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  startDate: z.string()
    .min(1, "Start date is required")
    .refine((str) => {
      const date = new Date(str);
      return !isNaN(date.getTime());
    }, "Invalid date format")
    .transform((str) => new Date(str)),
  endDate: z.string()
    .min(1, "End date is required")
    .refine((str) => {
      const date = new Date(str);
      return !isNaN(date.getTime());
    }, "Invalid date format")
    .transform((str) => new Date(str)),
});

export const insertWeeklyCheckInSchema = createInsertSchema(weeklyCheckIns).omit({
  id: true,
  submittedAt: true,
}).extend({
  weekOf: z.string()
    .min(1, "Week date is required")
    .refine((str) => {
      const date = new Date(str);
      return !isNaN(date.getTime());
    }, "Invalid date format")
    .transform((str) => new Date(str)),
  progress: z.number()
    .min(0, "Progress must be at least 0")
    .max(100, "Progress cannot exceed 100"),
});

export const insertUserCompetencySchema = createInsertSchema(userCompetencies).omit({
  id: true,
  lastAssessedAt: true,
  updatedAt: true,
});

export const insertDevelopmentPlanSchema = createInsertSchema(developmentPlans).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMeetingSchema = createInsertSchema(meetings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRecognitionSchema = createInsertSchema(recognitions).omit({
  id: true,
  createdAt: true,
});

// Types
export type UpsertUser = z.infer<typeof upsertUserSchema>;
export type User = typeof users.$inferSelect;
export type CompanyObjective = typeof companyObjectives.$inferSelect;
export type TeamObjective = typeof teamObjectives.$inferSelect;
export type KeyResult = typeof keyResults.$inferSelect;
export type TeamKeyResult = typeof teamKeyResults.$inferSelect;
export type Goal = typeof goals.$inferSelect;
export type WeeklyCheckIn = typeof weeklyCheckIns.$inferSelect;
export type Competency = typeof competencies.$inferSelect;
export type UserCompetency = typeof userCompetencies.$inferSelect;
export type DevelopmentPlan = typeof developmentPlans.$inferSelect;
export type LearningResource = typeof learningResources.$inferSelect;
export type Meeting = typeof meetings.$inferSelect;
export type Recognition = typeof recognitions.$inferSelect;

export type InsertCompanyObjective = z.infer<typeof insertCompanyObjectiveSchema>;
export type InsertTeamObjective = z.infer<typeof insertTeamObjectiveSchema>;
export type InsertKeyResult = z.infer<typeof insertKeyResultSchema>;
export type InsertTeamKeyResult = z.infer<typeof insertTeamKeyResultSchema>;
export type InsertGoal = z.infer<typeof insertGoalSchema>;
export type InsertWeeklyCheckIn = z.infer<typeof insertWeeklyCheckInSchema>;
export type InsertUserCompetency = z.infer<typeof insertUserCompetencySchema>;
export type InsertDevelopmentPlan = z.infer<typeof insertDevelopmentPlanSchema>;
export type InsertMeeting = z.infer<typeof insertMeetingSchema>;
export type InsertRecognition = z.infer<typeof insertRecognitionSchema>;
