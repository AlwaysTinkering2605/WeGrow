import { sql, relations } from "drizzle-orm";
import {
  index,
  uniqueIndex,
  foreignKey,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  boolean,
  pgEnum,
  unique,
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

// Job roles enum for HR integration
export const jobRoleEnum = pgEnum("job_role", [
  "cleaner_contract", 
  "cleaner_specialised", 
  "team_leader_contract", 
  "team_leader_specialised", 
  "mobile_cleaner", 
  "supervisor", 
  "manager", 
  "director"
]);

// Confidence levels enum
export const confidenceLevelEnum = pgEnum("confidence_level", ["green", "amber", "red"]);

// Company values enum
export const companyValueEnum = pgEnum("company_value", ["excellence", "teamwork", "innovation", "reliability"]);

// OKR metric type enum for key results
export const metricTypeEnum = pgEnum("metric_type", ["percentage", "numeric", "currency", "boolean"]);

// Objective type enum for strategic classification
export const objectiveTypeEnum = pgEnum("objective_type", ["committed", "aspirational"]);

// LMS-specific enums
export const lessonTypeEnum = pgEnum("lesson_type", ["video", "quiz", "document", "link"]);
export const contentTypeEnum = pgEnum("content_type", [
  "rich_text", 
  "video", 
  "pdf_document", 
  "scorm_package",
  "external_video", 
  "external_link", 
  "document_file",
  "instructor_led"
]);
export const courseTypeEnum = pgEnum("course_type", ["internal", "external"]);
export const trainingFormatEnum = pgEnum("training_format", ["online", "in_person", "hybrid"]);
export const enrollmentStatusEnum = pgEnum("enrollment_status", ["enrolled", "in_progress", "completed", "expired"]);
export const lessonStatusEnum = pgEnum("lesson_status", ["not_started", "in_progress", "completed"]);
export const completionMethodEnum = pgEnum("completion_method", ["manual", "quiz", "auto"]);
export const questionTypeEnum = pgEnum("question_type", ["multiple_choice", "true_false", "multi_select"]);
export const trainingStatusEnum = pgEnum("training_status", ["in_progress", "completed", "on_hold"]);

// Phase 2: Gamification enums
export const badgeTypeEnum = pgEnum("badge_type", ["completion", "streak", "performance", "participation", "milestone"]);
export const achievementTypeEnum = pgEnum("achievement_type", ["course_completion", "learning_path_completion", "quiz_mastery", "streak", "engagement", "leadership"]);
export const pointTransactionTypeEnum = pgEnum("point_transaction_type", ["earned", "bonus", "deducted", "reset"]);

// Advanced Analytics enums
export const analyticsMetricTypeEnum = pgEnum("analytics_metric_type", [
  "completion_rate", "engagement_score", "performance_score", "learning_velocity",
  "competency_progress", "assessment_score", "time_spent", "streak_count",
  "retention_rate", "skill_mastery", "course_effectiveness", "path_optimization"
]);
export const analyticsAggregationEnum = pgEnum("analytics_aggregation", ["hourly", "daily", "weekly", "monthly", "quarterly", "yearly"]);
export const analyticsDimensionEnum = pgEnum("analytics_dimension", [
  "user", "team", "department", "role", "course", "learning_path", "competency",
  "assessment", "badge", "training_record", "certification"
]);

// Notification System enums
export const notificationTypeEnum = pgEnum("notification_type", [
  "course_completion", "learning_path_completion", "quiz_passed", "quiz_failed",
  "certification_issued", "certificate_expiring", "training_due", "training_overdue",
  "competency_achieved", "badge_awarded", "enrollment_reminder", "meeting_reminder",
  "goal_deadline", "development_plan_update", "recognition_received", "system_alert"
]);

// Skill Category Type enum
export const skillCategoryTypeEnum = pgEnum("skill_category_type", [
  "technical", "behavioral", "safety", "compliance", "leadership", "operational"
]);
export const notificationPriorityEnum = pgEnum("notification_priority", ["low", "medium", "high", "urgent"]);
export const notificationChannelEnum = pgEnum("notification_channel", ["in_app", "n8n_webhook", "system"]);
export const webhookEventTypeEnum = pgEnum("webhook_event_type", [
  "training_completed", "deadline_approaching", "compliance_alert", "user_milestone", 
  "course_enrollment", "system_notification", "custom_event"
]);

// Departments table - normalized organizational departments
export const departments = pgTable("departments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull().unique(),
  code: varchar("code").notNull().unique(),
  description: text("description"),
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("departments_sort_order_idx").on(table.sortOrder),
]);

// Team member role enum - defines roles within a team
export const teamMemberRoleEnum = pgEnum("team_member_role", ["Lead", "Member", "Viewer"]);

// Teams table - formal team structure
export const teams = pgTable("teams", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  description: text("description"),
  parentTeamId: varchar("parent_team_id"), // For team hierarchies
  teamLeadId: varchar("team_lead_id").notNull(),
  department: varchar("department"), // DEPRECATED: Keep for migration, use departmentId instead
  departmentId: varchar("department_id"), // FK to departments.id - normalized department reference
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  foreignKey({
    columns: [table.departmentId],
    foreignColumns: [departments.id],
    name: "teams_department_fk"
  }).onDelete("set null"),
  index("teams_department_idx").on(table.departmentId),
]);

// Team Members junction table - many-to-many relationship between users and teams
export const teamMembers = pgTable("team_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  teamId: varchar("team_id").notNull(),
  role: teamMemberRoleEnum("role").default("Member").notNull(),
  isPrimary: boolean("is_primary").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: "team_members_user_fk"
  }).onDelete("cascade"),
  foreignKey({
    columns: [table.teamId],
    foreignColumns: [teams.id],
    name: "team_members_team_fk"
  }).onDelete("cascade"),
  index("team_members_user_idx").on(table.userId),
  index("team_members_team_idx").on(table.teamId),
  index("team_members_is_primary_idx").on(table.isPrimary),
  // Unique constraint: user can only be in a team once
  unique("team_members_user_team_unique").on(table.userId, table.teamId),
]);

// Skill Categories table - normalized taxonomy for competencies, courses, and learning paths
export const skillCategories = pgTable("skill_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull().unique(),
  description: text("description"),
  type: skillCategoryTypeEnum("type").default("technical").notNull(),
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("skill_categories_type_idx").on(table.type),
  index("skill_categories_sort_order_idx").on(table.sortOrder),
]);

// Job Roles table - normalized job role master data with hierarchy
export const jobRoles = pgTable("job_roles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull().unique(), // "Cleaner (Contract)", "Supervisor", etc.
  code: varchar("code").notNull().unique(), // "cleaner_contract", "supervisor", etc.
  reportsToJobRoleId: varchar("reports_to_job_role_id"), // FK to job_roles.id for org chart
  level: integer("level").notNull(), // Hierarchy level: 1=entry, 5=director
  department: varchar("department"), // DEPRECATED: Keep for migration, use departmentId instead
  departmentId: varchar("department_id"), // FK to departments.id - normalized department reference
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  foreignKey({
    columns: [table.reportsToJobRoleId],
    foreignColumns: [table.id],
    name: "job_roles_reports_to_fk"
  }).onDelete("set null"),
  foreignKey({
    columns: [table.departmentId],
    foreignColumns: [departments.id],
    name: "job_roles_department_fk"
  }).onDelete("set null"),
  index("job_roles_reports_to_idx").on(table.reportsToJobRoleId),
  index("job_roles_level_idx").on(table.level),
  index("job_roles_department_idx").on(table.departmentId),
]);

// Users table - required for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  mobilePhone: varchar("mobile_phone"),
  role: userRoleEnum("role").default("operative").notNull(),
  jobRole: jobRoleEnum("job_role"), // DEPRECATED: Keep for migration, use jobRoleId instead
  jobRoleId: varchar("job_role_id"), // FK to job_roles.id - normalized job role reference
  employeeId: varchar("employee_id").unique(), // New field for external HR software integration
  managerId: varchar("manager_id"), // FK to users.id - for real manager org chart
  teamId: varchar("team_id"), // Reference to teams table
  teamName: varchar("team_name"), // Keep for backward compatibility during transition
  jobTitle: varchar("job_title"),
  startDate: timestamp("start_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  foreignKey({
    columns: [table.jobRoleId],
    foreignColumns: [jobRoles.id],
    name: "users_job_role_fk"
  }).onDelete("set null"),
  foreignKey({
    columns: [table.managerId],
    foreignColumns: [table.id],
    name: "users_manager_fk"
  }).onDelete("set null"),
  foreignKey({
    columns: [table.teamId],
    foreignColumns: [teams.id],
    name: "users_team_fk"
  }).onDelete("set null"),
  index("users_job_role_idx").on(table.jobRoleId),
  index("users_manager_idx").on(table.managerId),
  index("users_team_idx").on(table.teamId),
]);

// Company objectives
export const companyObjectives = pgTable("company_objectives", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  createdBy: varchar("created_by").notNull(),
  ownerId: varchar("owner_id"), // Individual accountable leader (ISO 9001:2015 requirement)
  objectiveType: objectiveTypeEnum("objective_type").default("committed"), // Committed vs Aspirational
  qualityPolicyLinks: text("quality_policy_links").array(), // Array of quality policy references
  resourceRequirements: jsonb("resource_requirements"), // Structured resource planning (ISO 6.2)
  evaluationMethod: text("evaluation_method"), // How results will be measured (ISO 6.2)
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Key results for company objectives
export const keyResults = pgTable("key_results", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  objectiveId: varchar("objective_id").notNull(),
  title: text("title").notNull(),
  ownerId: varchar("owner_id"), // Individual accountable for this KR
  metricType: metricTypeEnum("metric_type").default("numeric"), // Standardized metric type
  startValue: integer("start_value").default(0), // Baseline measurement
  targetValue: integer("target_value").notNull(),
  currentValue: integer("current_value").default(0),
  unit: varchar("unit").notNull(), // %, count, score, etc.
  confidenceScore: integer("confidence_score"), // 1-10 confidence in achieving target
  lastConfidenceUpdate: timestamp("last_confidence_update"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Team objectives (middle tier in 3-tier OKR hierarchy)
export const teamObjectives = pgTable("team_objectives", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  parentCompanyObjectiveId: varchar("parent_company_objective_id").notNull(),
  teamId: varchar("team_id").notNull(), // FK to teams.id - normalized team reference
  supervisorId: varchar("supervisor_id").notNull(),
  ownerId: varchar("owner_id"), // Individual owner in addition to team assignment (ISO 9001:2015)
  title: text("title").notNull(),
  description: text("description"),
  objectiveType: objectiveTypeEnum("objective_type").default("committed"), // Committed vs Aspirational
  qualityPolicyLinks: text("quality_policy_links").array(), // Array of quality policy references
  resourceRequirements: jsonb("resource_requirements"), // Structured resource planning (ISO 6.2)
  evaluationMethod: text("evaluation_method"), // How results will be measured (ISO 6.2)
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  foreignKey({
    columns: [table.teamId],
    foreignColumns: [teams.id],
    name: "team_objectives_team_fk"
  }).onDelete("cascade"),
  index("team_objectives_team_idx").on(table.teamId),
]);

// Key results for team objectives
export const teamKeyResults = pgTable("team_key_results", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teamObjectiveId: varchar("team_objective_id").notNull(),
  title: text("title").notNull(),
  assignedToUserId: varchar("assigned_to_user_id"), // Individual owner for this KR
  metricType: metricTypeEnum("metric_type").default("numeric"), // Standardized metric type
  startValue: integer("start_value").default(0), // Baseline measurement
  targetValue: integer("target_value").notNull(),
  currentValue: integer("current_value").default(0),
  unit: varchar("unit").notNull(), // %, count, score, etc.
  confidenceScore: integer("confidence_score"), // 1-10 confidence in achieving target
  lastConfidenceUpdate: timestamp("last_confidence_update"),
  isSharedGoal: boolean("is_shared_goal").default(false), // True if whole team contributes
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Key result progress updates - time-series history of all KR progress changes
export const krProgressUpdates = pgTable("kr_progress_updates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  keyResultId: varchar("key_result_id").notNull(),
  keyResultType: varchar("key_result_type").notNull(), // 'company' or 'team'
  updatedBy: varchar("updated_by").notNull(),
  previousValue: integer("previous_value").notNull(),
  newValue: integer("new_value").notNull(),
  confidenceScore: integer("confidence_score"), // 1-10 confidence score at time of update
  updateNote: text("update_note"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
}, (table) => [
  index("kr_progress_key_result_idx").on(table.keyResultId, table.timestamp),
  index("kr_progress_updated_by_idx").on(table.updatedBy),
]);

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
  category: varchar("category"), // DEPRECATED: Keep for migration, use categoryId instead
  categoryId: varchar("category_id"), // FK to skill_categories.id - normalized category reference
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  foreignKey({
    columns: [table.categoryId],
    foreignColumns: [skillCategories.id],
    name: "competencies_category_fk"
  }).onDelete("set null"),
  index("competencies_category_idx").on(table.categoryId),
]);

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

// LMS Tables

// Courses - main course definitions
export const courses = pgTable("courses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  description: text("description"),
  category: varchar("category"), // DEPRECATED: Keep for migration, use categoryId instead
  categoryId: varchar("category_id"), // FK to skill_categories.id - normalized category reference
  level: varchar("level"), // Beginner, Intermediate, Advanced
  estimatedDuration: integer("estimated_duration"), // minutes
  tags: text("tags").array(),
  thumbnailUrl: varchar("thumbnail_url"),
  vimeoVideoId: varchar("vimeo_video_id"), // Optional intro/overview video for the course
  currentVersionId: varchar("current_version_id"),
  isPublished: boolean("is_published").default(false),
  createdBy: varchar("created_by").notNull(),
  
  // Course type fields
  courseType: courseTypeEnum("course_type").default("internal").notNull(),
  
  // External training fields (only used when courseType = 'external')
  trainingProvider: varchar("training_provider"), // Company/institution providing training
  trainingFormat: trainingFormatEnum("training_format"), // classroom, virtual, etc.
  accreditation: varchar("accreditation"), // CPD Certified, etc.
  accreditationUnits: integer("accreditation_units"), // Number of CPD hours/points
  startDate: timestamp("start_date"), // Training start date
  completionDate: timestamp("completion_date"), // Training completion date
  durationHours: integer("duration_hours"), // Duration in hours
  cost: integer("cost"), // Cost in cents to avoid decimal issues
  currency: varchar("currency").default("GBP"), // Currency code
  proofOfCompletionUrl: varchar("proof_of_completion_url"), // URL to uploaded certificate/proof
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  foreignKey({
    columns: [table.categoryId],
    foreignColumns: [skillCategories.id],
    name: "courses_category_fk"
  }).onDelete("set null"),
  index("courses_category_idx").on(table.categoryId),
]);

// Course versions - for ISO compliance
export const courseVersions = pgTable("course_versions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  courseId: varchar("course_id").notNull(),
  version: varchar("version").notNull(), // e.g., "1.0", "1.1", "2.0"
  changelog: text("changelog"),
  publishedAt: timestamp("published_at"),
  publishedBy: varchar("published_by").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Course modules - chapters/sections within a course
export const courseModules = pgTable("course_modules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  courseVersionId: varchar("course_version_id").notNull(),
  title: varchar("title").notNull(),
  description: text("description"),
  orderIndex: integer("order_index").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Lessons - individual learning units
export const lessons = pgTable("lessons", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  moduleId: varchar("module_id").notNull(),
  title: varchar("title").notNull(),
  description: text("description"),
  type: lessonTypeEnum("type").notNull(),
  orderIndex: integer("order_index").notNull(),
  
  // Enhanced content type fields
  contentType: contentTypeEnum("content_type").default("video"), // All content types supported
  richTextContent: text("rich_text_content"), // HTML content for rich text lessons
  vimeoVideoId: varchar("vimeo_video_id"), // For Vimeo video lessons
  pdfContentUrl: varchar("pdf_content_url"), // URL to uploaded PDF document
  
  // Phase 2: Extended content type fields
  scormPackageUrl: varchar("scorm_package_url"), // URL to SCORM package
  scormManifestUrl: varchar("scorm_manifest_url"), // SCORM manifest file URL
  externalVideoUrl: varchar("external_video_url"), // YouTube, direct video links
  externalVideoType: varchar("external_video_type"), // "youtube", "direct", "vimeo_public"
  externalLinkUrl: varchar("external_link_url"), // External links to resources
  externalLinkDescription: text("external_link_description"), // Description for links
  documentFileUrl: varchar("document_file_url"), // Word docs, PowerPoint, etc.
  documentFileType: varchar("document_file_type"), // "doc", "docx", "ppt", "pptx", "xls", "xlsx"
  instructorDetails: jsonb("instructor_details"), // { name, email, location, duration, maxParticipants }
  sessionSchedule: jsonb("session_schedule"), // { dates, times, location, isRecurring }
  
  estimatedDuration: integer("estimated_duration"), // seconds
  resourceUrl: varchar("resource_url"), // For documents/links (legacy)
  isRequired: boolean("is_required").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Quizzes for lessons
export const quizzes = pgTable("quizzes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  lessonId: varchar("lesson_id").notNull(),
  title: varchar("title").notNull(),
  description: text("description"),
  passingScore: integer("passing_score").default(70), // percentage
  timeLimit: integer("time_limit"), // minutes
  maxAttempts: integer("max_attempts").default(3),
  randomizeQuestions: boolean("randomize_questions").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Quiz questions
export const quizQuestions = pgTable("quiz_questions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  quizId: varchar("quiz_id").notNull(),
  type: questionTypeEnum("type").notNull(),
  questionText: text("question_text").notNull(),
  options: jsonb("options"), // Array of answer options
  correctAnswers: jsonb("correct_answers"), // Array of correct option indices
  explanation: text("explanation"),
  orderIndex: integer("order_index"),
  createdAt: timestamp("created_at").defaultNow(),
});

// User enrollments in courses
export const enrollments = pgTable("enrollments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  courseVersionId: varchar("course_version_id").notNull(),
  status: enrollmentStatusEnum("status").default("enrolled"),
  enrolledAt: timestamp("enrolled_at").defaultNow(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  dueDate: timestamp("due_date"),
  progress: integer("progress").default(0), // 0-100 percentage
  currentModuleId: varchar("current_module_id"),
  currentLessonId: varchar("current_lesson_id"),
}, (table) => ({
  // Prevent duplicate enrollments for the same user and course version
  uniqueUserCourseVersion: unique().on(table.userId, table.courseVersionId),
}));

// Lesson progress tracking
export const lessonProgress = pgTable("lesson_progress", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  enrollmentId: varchar("enrollment_id").notNull(),
  lessonId: varchar("lesson_id").notNull(),
  status: lessonStatusEnum("status").default("not_started"),
  progressPercentage: integer("progress_percentage").default(0),
  lastPosition: integer("last_position").default(0), // Video position in seconds
  durationSeconds: integer("duration_seconds"), // Total video duration
  timeSpent: integer("time_spent").default(0), // Total time in seconds
  completionMethod: completionMethodEnum("completion_method"), // How the lesson was completed
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Quiz attempts
export const quizAttempts = pgTable("quiz_attempts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  quizId: varchar("quiz_id").notNull(),
  userId: varchar("user_id").notNull(),
  enrollmentId: varchar("enrollment_id").notNull(),
  attemptNumber: integer("attempt_number").notNull(),
  score: integer("score").default(0), // percentage
  passed: boolean("passed").default(false),
  answers: jsonb("answers"), // User's answers
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  timeSpent: integer("time_spent"), // seconds
});

// Training records - immutable records for ISO compliance
export const trainingRecords = pgTable("training_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  courseVersionId: varchar("course_version_id").notNull(),
  enrollmentId: varchar("enrollment_id").notNull(),
  completedAt: timestamp("completed_at").notNull(),
  finalScore: integer("final_score"), // percentage
  certificateId: varchar("certificate_id"),
  signedOffBy: varchar("signed_off_by"), // Manager who verified
  effectivenessCheck: text("effectiveness_check"), // Post-training assessment
  lockedAt: timestamp("locked_at").defaultNow(), // Record lock for immutability
  createdAt: timestamp("created_at").defaultNow(),
});

// Certificates
export const certificates = pgTable("certificates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  courseVersionId: varchar("course_version_id"), // Optional - for course certificates
  trainingRecordId: varchar("training_record_id"), // Optional - for course certificates
  learningPathId: varchar("learning_path_id"), // Optional - for learning path certificates
  learningPathEnrollmentId: varchar("learning_path_enrollment_id"), // Optional - for learning path certificates
  certificateNumber: varchar("certificate_number").notNull(),
  certificateType: varchar("certificate_type"), // "course" or "learning_path" - nullable for backward compatibility
  title: varchar("title"), // Certificate title (course name or learning path name) - nullable for backward compatibility
  issuedAt: timestamp("issued_at").defaultNow(),
  expiresAt: timestamp("expires_at"),
  verificationHash: varchar("verification_hash"),
  metadata: jsonb("metadata"), // Additional certificate data
}, (table) => ({
  // Unique constraint for learning path certificates to prevent duplicates
  uniqueLearningPathEnrollment: uniqueIndex("ux_cert_lp_enrollment").on(table.learningPathEnrollmentId).where(sql`${table.learningPathEnrollmentId} IS NOT NULL`),
  // Unique constraint for certificate numbers to ensure global uniqueness
  uniqueCertificateNumber: uniqueIndex("ux_cert_number").on(table.certificateNumber),
}));


// Training requirements - maps roles to required courses
export const trainingRequirements = pgTable("training_requirements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(), // Requirement name
  description: text("description"),
  courseId: varchar("course_id").notNull(),
  minimumVersion: varchar("minimum_version"), // Minimum course version required
  targetRole: userRoleEnum("target_role"), // operative, supervisor, leadership
  targetTeamId: varchar("target_team_id"), // Specific team requirement
  renewalDays: integer("renewal_days"), // Days until renewal required
  isActive: boolean("is_active").default(true),
  createdBy: varchar("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// PDP course links - connect development plans to courses
export const pdpCourseLinks = pgTable("pdp_course_links", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  developmentPlanId: varchar("development_plan_id").notNull(),
  courseId: varchar("course_id").notNull(),
  courseVersionId: varchar("course_version_id"), // Specific version if locked
  createdAt: timestamp("created_at").defaultNow(),
});

// Learning Paths - structured learning sequences
export const learningPaths = pgTable("learning_paths", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  description: text("description"),
  pathType: varchar("path_type").notNull(), // "linear", "non_linear", "adaptive"
  category: varchar("category"), // DEPRECATED: Keep for migration, use categoryId instead
  categoryId: varchar("category_id"), // FK to skill_categories.id - normalized category reference
  estimatedDuration: integer("estimated_duration"), // Minutes
  relativeDueDays: integer("relative_due_days"), // Days from enrollment to completion (e.g., 30 = due 30 days after enrollment)
  isActive: boolean("is_active").default(true),
  isPublished: boolean("is_published").default(false),
  publishedAt: timestamp("published_at"), // When path was published
  completionCriteria: jsonb("completion_criteria"), // Requirements for path completion
  createdBy: varchar("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"), // Soft delete support
}, (table) => [
  foreignKey({
    columns: [table.categoryId],
    foreignColumns: [skillCategories.id],
    name: "learning_paths_category_fk"
  }).onDelete("set null"),
  index("learning_paths_title_idx").on(table.title),
  index("learning_paths_category_idx").on(table.categoryId),
  index("learning_paths_published_idx").on(table.isPublished),
  index("learning_paths_created_by_idx").on(table.createdBy),
]);

// Learning Path Job Roles - many-to-many relationship between learning paths and job roles
export const learningPathJobRoles = pgTable("learning_path_job_roles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  learningPathId: varchar("learning_path_id").notNull(),
  jobRoleId: varchar("job_role_id").notNull(),
  isMandatory: boolean("is_mandatory").default(true), // Required for this job role
  relativeDueDays: integer("relative_due_days"), // Days to complete after role assignment
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  foreignKey({
    columns: [table.learningPathId],
    foreignColumns: [learningPaths.id],
    name: "learning_path_job_roles_path_fk"
  }),
  foreignKey({
    columns: [table.jobRoleId],
    foreignColumns: [jobRoles.id],
    name: "learning_path_job_roles_job_role_fk"
  }),
  uniqueIndex("learning_path_job_roles_unique").on(table.learningPathId, table.jobRoleId),
  index("learning_path_job_roles_path_idx").on(table.learningPathId),
  index("learning_path_job_roles_job_role_idx").on(table.jobRoleId),
]);

// Learning Path Steps - individual activities within a path
export const learningPathSteps = pgTable("learning_path_steps", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  pathId: varchar("path_id").notNull(),
  stepOrder: integer("step_order").notNull(), // For sequenced paths
  title: varchar("title").notNull(),
  description: text("description"),
  stepType: varchar("step_type").notNull(), // "course", "quiz", "video", "document", "external", "assessment"
  resourceId: varchar("resource_id"), // ID of course, quiz, etc.
  resourceType: varchar("resource_type"), // "course", "quiz", "external_url", "document"
  resourceUrl: text("resource_url"), // For external resources
  resourceData: jsonb("resource_data"), // Additional resource metadata
  prerequisites: text("prerequisites").array(), // Array of step IDs that must be completed first
  isOptional: boolean("is_optional").default(false),
  isRequired: boolean("is_required").default(true),
  passingScore: integer("passing_score"), // Minimum score required
  estimatedDuration: integer("estimated_duration"), // Minutes
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"), // Soft delete support
}, (table) => ({
  // Critical: Unique constraint with soft delete awareness - prevent duplicate orders in active steps only  
  uniquePathStepOrder: uniqueIndex("learning_path_steps_path_order_unique").on(table.pathId, table.stepOrder).where(sql`${table.deletedAt} IS NULL`),
  // Foreign key for data integrity
  pathFk: foreignKey({
    columns: [table.pathId],
    foreignColumns: [learningPaths.id],
    name: "learning_path_steps_path_fk"
  }),
  // Performance indices - keeping only necessary ones
  stepTypeIdx: index("learning_path_steps_step_type_idx").on(table.stepType),
  resourceIdIdx: index("learning_path_steps_resource_id_idx").on(table.resourceId),
}));

// Learning Path Enrollments - user progress through paths
export const learningPathEnrollments = pgTable("learning_path_enrollments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  pathId: varchar("path_id").notNull(),
  userId: varchar("user_id").notNull(),
  enrollmentStatus: varchar("enrollment_status").default("active"), // "active", "completed", "failed", "suspended"
  progress: integer("progress").default(0), // Percentage complete
  currentStepId: varchar("current_step_id"), // Current active step
  startDate: timestamp("start_date").defaultNow(),
  dueDate: timestamp("due_date"), // Dynamic deadline
  completionDate: timestamp("completion_date"),
  totalScore: integer("total_score"), // Aggregate score across all assessments
  metadata: jsonb("metadata"), // Additional tracking data
  assignedBy: varchar("assigned_by"), // User or system that assigned this path
  enrollmentSource: varchar("enrollment_source").default("manual"), // "manual", "automation_rule", "self_enrolled"
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Learning Path Step Progress - detailed step completion tracking
export const learningPathStepProgress = pgTable("learning_path_step_progress", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  enrollmentId: varchar("enrollment_id").notNull(),
  stepId: varchar("step_id").notNull(),
  userId: varchar("user_id").notNull(),
  status: varchar("status").default("not_started"), // "not_started", "in_progress", "completed", "failed", "skipped"
  score: integer("score"), // Score achieved on this step
  attempts: integer("attempts").default(0),
  timeSpent: integer("time_spent").default(0), // Minutes
  startDate: timestamp("start_date"),
  completionDate: timestamp("completion_date"),
  metadata: jsonb("metadata"), // Step-specific tracking data
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Adaptive Learning Profile - user learning preferences and metrics
export const adaptiveLearningProfiles = pgTable("adaptive_learning_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique(),
  learningStyle: varchar("learning_style").default("visual"), // "visual", "auditory", "kinesthetic", "reading"
  preferredPace: varchar("preferred_pace").default("medium"), // "fast", "medium", "slow"
  difficultyPreference: varchar("difficulty_preference").default("moderate"), // "challenging", "moderate", "gentle"
  availableTime: integer("available_time").default(300), // minutes per week
  strongCompetencies: text("strong_competencies").array().default([]),
  developmentAreas: text("development_areas").array().default([]),
  careerGoals: text("career_goals").array().default([]),
  performanceMetrics: jsonb("performance_metrics"), // JSON object with various metrics
  preferences: jsonb("preferences"), // Additional learning preferences
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Adaptive Recommendations - AI-generated learning recommendations
export const adaptiveRecommendations = pgTable("adaptive_recommendations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  type: varchar("type").notNull(), // "learning_path", "course", "resource", "break", "review"
  title: varchar("title").notNull(),
  description: text("description"),
  reasoning: text("reasoning"), // Why this recommendation was made
  confidence: integer("confidence").default(75), // Confidence percentage
  priority: varchar("priority").default("medium"), // "high", "medium", "low"
  estimatedTime: integer("estimated_time").default(60), // minutes
  pathId: varchar("path_id"),
  courseId: varchar("course_id"),
  resourceId: varchar("resource_id"),
  adaptations: jsonb("adaptations"), // Personalized adaptations
  metadata: jsonb("metadata"), // Additional recommendation data
  status: varchar("status").default("pending"), // "pending", "accepted", "declined", "expired"
  createdAt: timestamp("created_at").defaultNow(),
  acceptedAt: timestamp("accepted_at"),
  expiresAt: timestamp("expires_at"),
});

// Enhanced Competency Library - extends existing competencies for training matrix
export const competencyLibrary = pgTable("competency_library", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  competencyId: varchar("competency_id").notNull(), // Links to existing competencies table
  parentCompetencyLibraryId: varchar("parent_competency_library_id"), // Self-referential FK for hierarchy
  hierarchyLevel: integer("hierarchy_level").default(0), // 0=root, 1=child, 2=grandchild, etc.
  sortOrder: integer("sort_order").default(0), // Order within same level
  proficiencyLevels: jsonb("proficiency_levels"), // Define skill levels (basic, intermediate, advanced)
  assessmentCriteria: text("assessment_criteria"), // How competency is measured
  renewalPeriodDays: integer("renewal_period_days"), // Days until renewal required
  isComplianceRequired: boolean("is_compliance_required").default(false),
  evidenceRequirements: jsonb("evidence_requirements"), // Types of evidence needed
  linkedLearningPaths: text("linked_learning_paths").array(), // Paths that build this competency
  createdBy: varchar("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  foreignKey({
    columns: [table.competencyId],
    foreignColumns: [competencies.id],
    name: "competency_library_competency_fk"
  }),
  foreignKey({
    columns: [table.parentCompetencyLibraryId],
    foreignColumns: [table.id],
    name: "competency_library_parent_fk"
  }),
  foreignKey({
    columns: [table.createdBy],
    foreignColumns: [users.id],
    name: "competency_library_created_by_fk"
  }),
  index("competency_library_hierarchy_idx").on(table.parentCompetencyLibraryId, table.hierarchyLevel, table.sortOrder),
  index("competency_library_competency_idx").on(table.competencyId),
]);

// Role Competency Mappings - define which competencies are required for which roles
export const roleCompetencyMappings = pgTable("role_competency_mappings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  role: userRoleEnum("role"), // DEPRECATED: Keep for migration
  jobRoleId: varchar("job_role_id"), // FK to job_roles.id - normalized job role reference
  competencyLibraryId: varchar("competency_library_id").notNull(),
  teamId: varchar("team_id"), // Team-specific requirements
  requiredProficiencyLevel: varchar("required_proficiency_level").default("basic"), // "basic", "intermediate", "advanced"
  isMandatory: boolean("is_mandatory").default(true),
  priority: varchar("priority").default("medium"), // "low", "medium", "high", "critical"
  gracePeriodDays: integer("grace_period_days"), // Days after hiring/role change to achieve competency
  createdBy: varchar("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  foreignKey({
    columns: [table.competencyLibraryId],
    foreignColumns: [competencyLibrary.id],
    name: "role_competency_mappings_competency_fk"
  }),
  foreignKey({
    columns: [table.jobRoleId],
    foreignColumns: [jobRoles.id],
    name: "role_competency_mappings_job_role_fk"
  }),
  foreignKey({
    columns: [table.teamId],
    foreignColumns: [teams.id],
    name: "role_competency_mappings_team_fk"
  }),
  foreignKey({
    columns: [table.createdBy],
    foreignColumns: [users.id],
    name: "role_competency_mappings_created_by_fk"
  }),
  index("role_competency_mappings_job_role_idx").on(table.jobRoleId, table.teamId),
  unique("role_competency_mappings_unique").on(table.jobRoleId, table.competencyLibraryId, table.teamId),
]);

// Competency Status History - immutable audit trail for ISO 9001:2015 compliance
export const competencyStatusHistory = pgTable("competency_status_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  competencyLibraryId: varchar("competency_library_id").notNull(),
  previousStatus: varchar("previous_status"), // Previous status before change
  newStatus: varchar("new_status").notNull(), // "not_started", "in_progress", "competent", "expired", "non_compliant"
  statusChangeReason: text("status_change_reason"), // Why status changed
  assessmentScore: integer("assessment_score"), // Score achieved if applicable
  assessmentMethod: varchar("assessment_method"), // "quiz", "practical", "observation", "documentation"
  assessorId: varchar("assessor_id"), // Who validated the competency
  evidenceIds: text("evidence_ids").array(), // Links to evidence records
  complianceNotes: text("compliance_notes"), // Auditor notes
  externalReference: varchar("external_reference"), // External training reference
  changedBy: varchar("changed_by").notNull(), // User who made the change
  changedAt: timestamp("changed_at").defaultNow().notNull(),
}, (table) => [
  foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: "competency_status_history_user_fk"
  }),
  foreignKey({
    columns: [table.competencyLibraryId],
    foreignColumns: [competencyLibrary.id],
    name: "competency_status_history_competency_fk"
  }),
  foreignKey({
    columns: [table.assessorId],
    foreignColumns: [users.id],
    name: "competency_status_history_assessor_fk"
  }),
  foreignKey({
    columns: [table.changedBy],
    foreignColumns: [users.id],
    name: "competency_status_history_changed_by_fk"
  }),
  index("competency_status_history_user_idx").on(table.userId, table.competencyLibraryId),
  index("competency_status_history_changed_at_idx").on(table.changedAt),
]);

// Competency Evidence Records - immutable evidence storage for audit compliance
export const competencyEvidenceRecords = pgTable("competency_evidence_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  competencyLibraryId: varchar("competency_library_id").notNull(),
  evidenceType: varchar("evidence_type").notNull(), // "certificate", "assessment", "practical_observation", "training_record", "external_course"
  evidenceTitle: varchar("evidence_title").notNull(),
  evidenceDescription: text("evidence_description"),
  evidenceUrl: varchar("evidence_url"), // Link to stored evidence file
  evidenceMetadata: jsonb("evidence_metadata"), // File info, scores, etc.
  issuedBy: varchar("issued_by"), // Organization/person who issued evidence
  issuedDate: timestamp("issued_date"),
  expiryDate: timestamp("expiry_date"),
  verifiedBy: varchar("verified_by"), // User who verified this evidence
  verifiedAt: timestamp("verified_at"),
  verificationNotes: text("verification_notes"),
  isValid: boolean("is_valid").default(true),
  uploadedBy: varchar("uploaded_by").notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
}, (table) => [
  foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: "competency_evidence_user_fk"
  }),
  foreignKey({
    columns: [table.competencyLibraryId],
    foreignColumns: [competencyLibrary.id],
    name: "competency_evidence_competency_fk"
  }),
  foreignKey({
    columns: [table.verifiedBy],
    foreignColumns: [users.id],
    name: "competency_evidence_verified_by_fk"
  }),
  foreignKey({
    columns: [table.uploadedBy],
    foreignColumns: [users.id],
    name: "competency_evidence_uploaded_by_fk"
  }),
  index("competency_evidence_user_idx").on(table.userId, table.competencyLibraryId),
  index("competency_evidence_type_idx").on(table.evidenceType),
  index("competency_evidence_expiry_idx").on(table.expiryDate),
]);

// Automation Rules - rules engine for path assignment
export const automationRules = pgTable("automation_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  triggerEvent: varchar("trigger_event").notNull(), // "user_created", "user_updated", "role_changed", "team_changed", "scheduled"
  conditions: jsonb("conditions").notNull(), // Array of condition objects
  actions: jsonb("actions").notNull(), // Array of action objects (assign path, etc.)
  priority: integer("priority").default(100), // Lower numbers = higher priority
  scheduleConfig: jsonb("schedule_config"), // For time-based triggers
  lastRun: timestamp("last_run"),
  totalExecutions: integer("total_executions").default(0),
  successfulExecutions: integer("successful_executions").default(0),
  createdBy: varchar("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Training Matrix Records - aggregated competency status for compliance
export const trainingMatrixRecords = pgTable("training_matrix_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  competencyLibraryId: varchar("competency_library_id").notNull(),
  currentStatus: varchar("current_status").notNull(), // "not_started", "in_progress", "competent", "expired", "non_compliant"
  proficiencyLevel: varchar("proficiency_level"), // "basic", "intermediate", "advanced"
  lastAssessmentDate: timestamp("last_assessment_date"),
  lastAssessmentScore: integer("last_assessment_score"),
  expiryDate: timestamp("expiry_date"), // When competency expires
  evidenceRecords: jsonb("evidence_records"), // Array of evidence objects
  trainingHistory: jsonb("training_history"), // Array of completed training records
  complianceNotes: text("compliance_notes"), // Auditor notes
  riskLevel: varchar("risk_level").default("low"), // "low", "medium", "high" - compliance risk
  nextActionRequired: varchar("next_action_required"), // What needs to be done next
  nextActionDueDate: timestamp("next_action_due_date"),
  updatedBy: varchar("updated_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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

// Learning Paths Relations
export const learningPathsRelations = relations(learningPaths, ({ one, many }) => ({
  creator: one(users, {
    fields: [learningPaths.createdBy],
    references: [users.id],
  }),
  steps: many(learningPathSteps),
  enrollments: many(learningPathEnrollments),
}));

export const learningPathStepsRelations = relations(learningPathSteps, ({ one, many }) => ({
  path: one(learningPaths, {
    fields: [learningPathSteps.pathId],
    references: [learningPaths.id],
  }),
  course: one(courses, {
    fields: [learningPathSteps.resourceId],
    references: [courses.id],
  }),
  quiz: one(quizzes, {
    fields: [learningPathSteps.resourceId],
    references: [quizzes.id],
  }),
  stepProgress: many(learningPathStepProgress),
}));

export const learningPathEnrollmentsRelations = relations(learningPathEnrollments, ({ one, many }) => ({
  path: one(learningPaths, {
    fields: [learningPathEnrollments.pathId],
    references: [learningPaths.id],
  }),
  user: one(users, {
    fields: [learningPathEnrollments.userId],
    references: [users.id],
  }),
  assignedByUser: one(users, {
    fields: [learningPathEnrollments.assignedBy],
    references: [users.id],
    relationName: "assignedEnrollments",
  }),
  currentStep: one(learningPathSteps, {
    fields: [learningPathEnrollments.currentStepId],
    references: [learningPathSteps.id],
  }),
  stepProgress: many(learningPathStepProgress),
}));

export const learningPathStepProgressRelations = relations(learningPathStepProgress, ({ one }) => ({
  enrollment: one(learningPathEnrollments, {
    fields: [learningPathStepProgress.enrollmentId],
    references: [learningPathEnrollments.id],
  }),
  step: one(learningPathSteps, {
    fields: [learningPathStepProgress.stepId],
    references: [learningPathSteps.id],
  }),
  user: one(users, {
    fields: [learningPathStepProgress.userId],
    references: [users.id],
  }),
}));

export const competencyLibraryRelations = relations(competencyLibrary, ({ one, many }) => ({
  competency: one(competencies, {
    fields: [competencyLibrary.competencyId],
    references: [competencies.id],
  }),
  parentCompetency: one(competencyLibrary, {
    fields: [competencyLibrary.parentCompetencyLibraryId],
    references: [competencyLibrary.id],
    relationName: "parentChild",
  }),
  childCompetencies: many(competencyLibrary, { relationName: "parentChild" }),
  creator: one(users, {
    fields: [competencyLibrary.createdBy],
    references: [users.id],
  }),
  roleMappings: many(roleCompetencyMappings),
  trainingMatrixRecords: many(trainingMatrixRecords),
  statusHistory: many(competencyStatusHistory),
  evidenceRecords: many(competencyEvidenceRecords),
}));

export const roleCompetencyMappingsRelations = relations(roleCompetencyMappings, ({ one }) => ({
  competencyLibraryItem: one(competencyLibrary, {
    fields: [roleCompetencyMappings.competencyLibraryId],
    references: [competencyLibrary.id],
  }),
  team: one(teams, {
    fields: [roleCompetencyMappings.teamId],
    references: [teams.id],
  }),
  creator: one(users, {
    fields: [roleCompetencyMappings.createdBy],
    references: [users.id],
  }),
}));

export const automationRulesRelations = relations(automationRules, ({ one }) => ({
  creator: one(users, {
    fields: [automationRules.createdBy],
    references: [users.id],
  }),
}));

export const trainingMatrixRecordsRelations = relations(trainingMatrixRecords, ({ one }) => ({
  user: one(users, {
    fields: [trainingMatrixRecords.userId],
    references: [users.id],
  }),
  competencyLibraryItem: one(competencyLibrary, {
    fields: [trainingMatrixRecords.competencyLibraryId],
    references: [competencyLibrary.id],
  }),
  updatedByUser: one(users, {
    fields: [trainingMatrixRecords.updatedBy],
    references: [users.id],
    relationName: "updatedMatrixRecords",
  }),
}));

export const competencyStatusHistoryRelations = relations(competencyStatusHistory, ({ one }) => ({
  user: one(users, {
    fields: [competencyStatusHistory.userId],
    references: [users.id],
  }),
  competencyLibraryItem: one(competencyLibrary, {
    fields: [competencyStatusHistory.competencyLibraryId],
    references: [competencyLibrary.id],
  }),
  assessor: one(users, {
    fields: [competencyStatusHistory.assessorId],
    references: [users.id],
    relationName: "assessedCompetencies",
  }),
  changedByUser: one(users, {
    fields: [competencyStatusHistory.changedBy],
    references: [users.id],
    relationName: "competencyStatusChanges",
  }),
}));

export const competencyEvidenceRecordsRelations = relations(competencyEvidenceRecords, ({ one }) => ({
  user: one(users, {
    fields: [competencyEvidenceRecords.userId],
    references: [users.id],
  }),
  competencyLibraryItem: one(competencyLibrary, {
    fields: [competencyEvidenceRecords.competencyLibraryId],
    references: [competencyLibrary.id],
  }),
  verifiedByUser: one(users, {
    fields: [competencyEvidenceRecords.verifiedBy],
    references: [users.id],
    relationName: "verifiedEvidenceRecords",
  }),
  uploadedByUser: one(users, {
    fields: [competencyEvidenceRecords.uploadedBy],
    references: [users.id],
    relationName: "uploadedEvidenceRecords",
  }),
}));

// Time-Based Automation Tables

// Relative due date configurations for learning paths
export const relativeDueDateConfigs = pgTable("relative_due_date_configs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  pathId: varchar("path_id").notNull().unique(),
  relativeDueDays: integer("relative_due_days").notNull(),
  enableGracePeriod: boolean("enable_grace_period").default(false),
  gracePeriodDays: integer("grace_period_days").default(0),
  enableReminders: boolean("enable_reminders").default(true),
  reminderDaysBefore: jsonb("reminder_days_before").default([7, 3, 1]),
  autoExtensionDays: integer("auto_extension_days").default(0),
  isActive: boolean("is_active").default(true),
  createdBy: varchar("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  foreignKey({
    columns: [table.pathId],
    foreignColumns: [learningPaths.id],
    name: "relative_due_date_configs_path_fk"
  }),
  foreignKey({
    columns: [table.createdBy],
    foreignColumns: [users.id],
    name: "relative_due_date_configs_creator_fk"
  }),
  index("relative_due_date_configs_path_idx").on(table.pathId),
  index("relative_due_date_configs_active_idx").on(table.isActive),
]);

// Recurring assignment configurations
export const recurringAssignments = pgTable("recurring_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  pathId: varchar("path_id").notNull(),
  targetAudience: varchar("target_audience").notNull(), // "all_users", "by_role", "by_team", "specific_users"
  targetRoles: jsonb("target_roles"), // Array of role names
  targetTeams: jsonb("target_teams"), // Array of team IDs
  targetUsers: jsonb("target_users"), // Array of user IDs
  recurrenceType: varchar("recurrence_type").notNull(), // "daily", "weekly", "monthly", "quarterly", "yearly"
  recurrenceInterval: integer("recurrence_interval").default(1),
  recurrenceWeekdays: jsonb("recurrence_weekdays"), // Array of weekday numbers (0=Sunday)
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  nextRun: timestamp("next_run").notNull(),
  relativeDueDays: integer("relative_due_days").default(30),
  isActive: boolean("is_active").default(true),
  description: text("description"),
  totalExecutions: integer("total_executions").default(0),
  successfulExecutions: integer("successful_executions").default(0),
  lastRun: timestamp("last_run"),
  lastError: text("last_error"),
  createdBy: varchar("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  foreignKey({
    columns: [table.pathId],
    foreignColumns: [learningPaths.id],
    name: "recurring_assignments_path_fk"
  }),
  foreignKey({
    columns: [table.createdBy],
    foreignColumns: [users.id],
    name: "recurring_assignments_creator_fk"
  }),
  index("recurring_assignments_path_idx").on(table.pathId),
  index("recurring_assignments_active_idx").on(table.isActive),
  index("recurring_assignments_next_run_idx").on(table.nextRun),
]);

// Automation execution logs for audit trail
export const automationRunLogs = pgTable("automation_run_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  runType: varchar("run_type").notNull(), // "recurring_assignment", "due_date_reminder", "overdue_notification"
  entityId: varchar("entity_id").notNull(), // ID of the recurring assignment or config
  entityType: varchar("entity_type").notNull(), // "recurring_assignment", "due_date_config"
  status: varchar("status").notNull(), // "started", "completed", "failed", "skipped"
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  affectedUsers: jsonb("affected_users"), // Array of user IDs processed
  assignmentsCreated: integer("assignments_created").default(0),
  notificationsSent: integer("notifications_sent").default(0),
  errors: jsonb("errors"), // Array of error objects
  executionDetails: jsonb("execution_details"), // Additional run metadata
  duration: integer("duration"), // Execution time in milliseconds
}, (table) => [
  index("automation_run_logs_run_type_idx").on(table.runType),
  index("automation_run_logs_entity_idx").on(table.entityId, table.entityType),
  index("automation_run_logs_started_at_idx").on(table.startedAt),
  index("automation_run_logs_status_idx").on(table.status),
]);

// Phase 2: Gamification Tables

// Badges available in the system
export const badges = pgTable("badges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  description: text("description").notNull(),
  imageUrl: varchar("image_url"),
  badgeType: badgeTypeEnum("badge_type").notNull(),
  criteria: jsonb("criteria"), // JSON describing earning criteria
  pointsRequired: integer("points_required"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("badges_type_idx").on(table.badgeType),
  index("badges_active_idx").on(table.isActive),
]);

// Badges earned by users
export const userBadges = pgTable("user_badges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  badgeId: varchar("badge_id").notNull(),
  awardedAt: timestamp("awarded_at").defaultNow(),
  awardedBy: varchar("awarded_by"), // System or user who awarded
  description: text("description"), // Why this was awarded
  metadata: jsonb("metadata"), // Additional data about earning
}, (table) => [
  foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: "user_badges_user_fk"
  }),
  foreignKey({
    columns: [table.badgeId],
    foreignColumns: [badges.id],
    name: "user_badges_badge_fk"
  }),
  unique("user_badge_unique").on(table.userId, table.badgeId),
  index("user_badges_user_idx").on(table.userId),
  index("user_badges_awarded_idx").on(table.awardedAt),
]);

// User points tracking
export const userPoints = pgTable("user_points", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique(),
  totalPoints: integer("total_points").default(0).notNull(),
  currentLevel: integer("current_level").default(1).notNull(),
  pointsToNextLevel: integer("points_to_next_level").default(100).notNull(),
  lastUpdated: timestamp("last_updated").defaultNow(),
}, (table) => [
  foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: "user_points_user_fk"
  }),
  index("user_points_total_idx").on(table.totalPoints),
  index("user_points_level_idx").on(table.currentLevel),
  index("user_points_leaderboard_idx").on(sql`total_points DESC`),
]);

// Point transaction history
export const pointTransactions = pgTable("point_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  points: integer("points").notNull(),
  transactionType: pointTransactionTypeEnum("transaction_type").notNull(),
  reason: varchar("reason").notNull(),
  description: text("description"),
  relatedEntityType: varchar("related_entity_type"), // "course", "quiz", "path", etc.
  relatedEntityId: varchar("related_entity_id"),
  awardedBy: varchar("awarded_by"), // System or user
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: "point_transactions_user_fk"
  }),
  index("point_transactions_user_idx").on(table.userId),
  index("point_transactions_type_idx").on(table.transactionType),
  index("point_transactions_date_idx").on(table.createdAt),
]);

// System achievements available
export const achievements = pgTable("achievements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  description: text("description").notNull(),
  imageUrl: varchar("image_url"),
  achievementType: achievementTypeEnum("achievement_type").notNull(),
  criteria: jsonb("criteria"), // JSON describing earning criteria
  pointsAwarded: integer("points_awarded").default(0),
  badgeId: varchar("badge_id"), // Optional badge awarded with achievement
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  foreignKey({
    columns: [table.badgeId],
    foreignColumns: [badges.id],
    name: "achievements_badge_fk"
  }),
  index("achievements_type_idx").on(table.achievementType),
  index("achievements_active_idx").on(table.isActive),
]);

// Achievements earned by users
export const userAchievements = pgTable("user_achievements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  achievementId: varchar("achievement_id").notNull(),
  progress: integer("progress").default(0), // For achievements with progress tracking
  maxProgress: integer("max_progress").default(1), // Total needed for completion
  isCompleted: boolean("is_completed").default(false),
  completedAt: timestamp("completed_at"),
  metadata: jsonb("metadata"), // Achievement-specific data
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: "user_achievements_user_fk"
  }),
  foreignKey({
    columns: [table.achievementId],
    foreignColumns: [achievements.id],
    name: "user_achievements_achievement_fk"
  }),
  unique("user_achievement_unique").on(table.userId, table.achievementId),
  index("user_achievements_user_idx").on(table.userId),
  index("user_achievements_completed_idx").on(table.isCompleted),
]);

// Gamification Relations
export const badgesRelations = relations(badges, ({ many }) => ({
  userBadges: many(userBadges),
  achievements: many(achievements),
}));

export const userBadgesRelations = relations(userBadges, ({ one }) => ({
  user: one(users, {
    fields: [userBadges.userId],
    references: [users.id],
  }),
  badge: one(badges, {
    fields: [userBadges.badgeId],
    references: [badges.id],
  }),
}));

export const userPointsRelations = relations(userPoints, ({ one, many }) => ({
  user: one(users, {
    fields: [userPoints.userId],
    references: [users.id],
  }),
  transactions: many(pointTransactions),
}));

export const pointTransactionsRelations = relations(pointTransactions, ({ one }) => ({
  user: one(users, {
    fields: [pointTransactions.userId],
    references: [users.id],
  }),
}));

export const achievementsRelations = relations(achievements, ({ one, many }) => ({
  badge: one(badges, {
    fields: [achievements.badgeId],
    references: [badges.id],
  }),
  userAchievements: many(userAchievements),
}));

export const userAchievementsRelations = relations(userAchievements, ({ one }) => ({
  user: one(users, {
    fields: [userAchievements.userId],
    references: [users.id],
  }),
  achievement: one(achievements, {
    fields: [userAchievements.achievementId],
    references: [achievements.id],
  }),
}));

// Insert schemas
export const insertTeamSchema = createInsertSchema(teams).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTeamMemberSchema = createInsertSchema(teamMembers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDepartmentSchema = createInsertSchema(departments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertJobRoleSchema = createInsertSchema(jobRoles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSkillCategorySchema = createInsertSchema(skillCategories).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLearningPathJobRoleSchema = createInsertSchema(learningPathJobRoles).omit({
  id: true,
  createdAt: true,
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
  lastConfidenceUpdate: true,
}).extend({
  confidenceScore: z.number().min(1).max(10).optional(),
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
  lastConfidenceUpdate: true,
}).extend({
  confidenceScore: z.number().min(1).max(10).optional(),
});

export const insertKrProgressUpdateSchema = createInsertSchema(krProgressUpdates).omit({
  id: true,
  timestamp: true,
}).extend({
  confidenceScore: z.number().min(1).max(10).optional(),
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
}).extend({
  targetDate: z.string().optional()
    .refine((str) => {
      if (!str) return true; // Optional field
      const date = new Date(str);
      return !isNaN(date.getTime());
    }, "Invalid date format")
    .transform((str) => str ? new Date(str) : undefined),
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

// LMS Insert Schemas
export const insertCourseSchema = createInsertSchema(courses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCourseVersionSchema = createInsertSchema(courseVersions).omit({
  id: true,
  createdAt: true,
});

export const insertCourseModuleSchema = createInsertSchema(courseModules).omit({
  id: true,
  createdAt: true,
});

export const insertLessonSchema = createInsertSchema(lessons).omit({
  id: true,
  createdAt: true,
});

export const insertQuizSchema = createInsertSchema(quizzes).omit({
  id: true,
  createdAt: true,
});

export const insertQuizQuestionSchema = createInsertSchema(quizQuestions).omit({
  id: true,
  createdAt: true,
});

export const insertEnrollmentSchema = createInsertSchema(enrollments).omit({
  id: true,
  enrolledAt: true,
});

export const insertLessonProgressSchema = createInsertSchema(lessonProgress).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertQuizAttemptSchema = createInsertSchema(quizAttempts).omit({
  id: true,
  startedAt: true,
});

export const insertTrainingRecordSchema = createInsertSchema(trainingRecords).omit({
  id: true,
  lockedAt: true,
  createdAt: true,
});

export const insertCertificateSchema = createInsertSchema(certificates).omit({
  id: true,
  issuedAt: true,
});


export const insertTrainingRequirementSchema = createInsertSchema(trainingRequirements).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPdpCourseLinkSchema = createInsertSchema(pdpCourseLinks).omit({
  id: true,
  createdAt: true,
});

// Learning Paths Insert Schemas
export const insertLearningPathSchema = createInsertSchema(learningPaths).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLearningPathStepSchema = createInsertSchema(learningPathSteps).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLearningPathEnrollmentSchema = createInsertSchema(learningPathEnrollments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLearningPathStepProgressSchema = createInsertSchema(learningPathStepProgress).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCompetencyLibrarySchema = createInsertSchema(competencyLibrary).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRoleCompetencyMappingSchema = createInsertSchema(roleCompetencyMappings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Enhanced automation trigger events for Phase 2
export const automationTriggerEventEnum = z.enum([
  // User lifecycle events
  "user_created",
  "user_updated", 
  "role_changed",
  "team_changed",
  // Learning & Performance events
  "course_completed",
  "learning_path_completed",
  "quiz_passed",
  "quiz_failed",
  "competency_gap_identified",
  "assessment_score_threshold",
  "badge_earned",
  "achievement_unlocked",
  // Time-based events
  "scheduled",
  "due_date_approaching",
  "compliance_renewal_due",
  // Engagement events
  "login_streak_reached",
  "inactive_user_detected",
  "high_performer_identified"
]);

// Condition operators for smart segmentation
export const conditionOperatorEnum = z.enum([
  "equals", "not_equals", "contains", "not_contains", 
  "greater_than", "less_than", "greater_than_equal", "less_than_equal",
  "is_empty", "is_not_empty", "in_list", "not_in_list",
  "date_before", "date_after", "date_between"
]);

// Condition schema for complex multi-part queries
export const conditionSchema = z.object({
  id: z.string(),
  field: z.enum([
    "role", "team", "department", "hire_date", "last_login",
    "completion_rate", "quiz_average", "points_total", "badges_count",
    "competency_status", "learning_path_progress", "user_tag"
  ]),
  operator: conditionOperatorEnum,
  value: z.union([z.string(), z.number(), z.array(z.string()), z.object({
    from: z.string(),
    to: z.string()
  })]),
  logicalOperator: z.enum(["AND", "OR"]).optional()
});

// Condition group for nested logic (smart segmentation)
export const conditionGroupSchema: z.ZodType<any> = z.object({
  id: z.string(),
  logicalOperator: z.enum(["AND", "OR"]),
  conditions: z.array(conditionSchema),
  groups: z.array(z.lazy(() => conditionGroupSchema)).optional()
});

// Action types for automation
export const actionTypeEnum = z.enum([
  "assign_learning_path",
  "enroll_in_course", 
  "send_notification",
  "update_user_role",
  "add_user_tag",
  "create_development_plan",
  "schedule_meeting",
  "assign_badge",
  "award_points",
  "trigger_assessment"
]);

// Action schema for various action types
export const actionSchema = z.object({
  id: z.string(),
  type: actionTypeEnum,
  config: z.record(z.string(), z.any()), // Type-specific configuration
  delayMinutes: z.number().optional(), // Delay before execution
  conditions: z.array(conditionSchema).optional() // Additional conditions for this action
});

export const insertAutomationRuleSchema = createInsertSchema(automationRules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastRun: true,
  totalExecutions: true,
  successfulExecutions: true,
}).extend({
  triggerEvent: automationTriggerEventEnum,
  conditions: z.object({
    logicalOperator: z.enum(["AND", "OR"]).default("AND"),
    groups: z.array(conditionGroupSchema).optional(),
    conditions: z.array(conditionSchema).optional()
  }).optional(),
  actions: z.array(actionSchema),
  scheduleConfig: z.object({
    frequency: z.enum(["once", "daily", "weekly", "monthly"]).optional(),
    time: z.string().optional(), // Time of day for scheduled triggers
    daysOfWeek: z.array(z.number().min(0).max(6)).optional(), // 0-6 for Sun-Sat
    timezone: z.string().default("UTC")
  }).optional(),
});

export const insertTrainingMatrixRecordSchema = createInsertSchema(trainingMatrixRecords).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCompetencyStatusHistorySchema = createInsertSchema(competencyStatusHistory).omit({
  id: true,
  changedAt: true,
});

export const insertCompetencyEvidenceRecordSchema = createInsertSchema(competencyEvidenceRecords).omit({
  id: true,
  uploadedAt: true,
});

// Phase 2: Gamification Insert Schemas
export const insertBadgeSchema = createInsertSchema(badges).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserBadgeSchema = createInsertSchema(userBadges).omit({
  id: true,
  awardedAt: true,
});

export const insertUserPointsSchema = createInsertSchema(userPoints).omit({
  id: true,
  lastUpdated: true,
});

export const insertPointTransactionSchema = createInsertSchema(pointTransactions).omit({
  id: true,
  createdAt: true,
});

export const insertAchievementSchema = createInsertSchema(achievements).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserAchievementSchema = createInsertSchema(userAchievements).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type UpsertUser = z.infer<typeof upsertUserSchema>;
export type Team = typeof teams.$inferSelect;
export type Department = typeof departments.$inferSelect;
export type SkillCategory = typeof skillCategories.$inferSelect;
export type JobRole = typeof jobRoles.$inferSelect;
export type LearningPathJobRole = typeof learningPathJobRoles.$inferSelect;
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

// LMS Types
export type Course = typeof courses.$inferSelect;
export type CourseVersion = typeof courseVersions.$inferSelect;
export type CourseModule = typeof courseModules.$inferSelect;
export type Lesson = typeof lessons.$inferSelect;
export type Quiz = typeof quizzes.$inferSelect;
export type QuizQuestion = typeof quizQuestions.$inferSelect;
export type Enrollment = typeof enrollments.$inferSelect;
export type LessonProgress = typeof lessonProgress.$inferSelect;
export type QuizAttempt = typeof quizAttempts.$inferSelect;
export type TrainingRecord = typeof trainingRecords.$inferSelect;
export type Certificate = typeof certificates.$inferSelect;
export type Badge = typeof badges.$inferSelect;
export type UserBadge = typeof userBadges.$inferSelect;
export type TrainingRequirement = typeof trainingRequirements.$inferSelect;
export type PdpCourseLink = typeof pdpCourseLinks.$inferSelect;

export type TeamMember = typeof teamMembers.$inferSelect;

export type InsertTeam = z.infer<typeof insertTeamSchema>;
export type InsertTeamMember = z.infer<typeof insertTeamMemberSchema>;
export type InsertDepartment = z.infer<typeof insertDepartmentSchema>;
export type InsertSkillCategory = z.infer<typeof insertSkillCategorySchema>;
export type InsertJobRole = z.infer<typeof insertJobRoleSchema>;
export type InsertLearningPathJobRole = z.infer<typeof insertLearningPathJobRoleSchema>;
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

// LMS Insert Types
export type InsertCourse = z.infer<typeof insertCourseSchema>;
export type InsertCourseVersion = z.infer<typeof insertCourseVersionSchema>;
export type InsertCourseModule = z.infer<typeof insertCourseModuleSchema>;
export type InsertLesson = z.infer<typeof insertLessonSchema>;
export type InsertQuiz = z.infer<typeof insertQuizSchema>;
export type InsertQuizQuestion = z.infer<typeof insertQuizQuestionSchema>;
export type InsertEnrollment = z.infer<typeof insertEnrollmentSchema>;
export type InsertLessonProgress = z.infer<typeof insertLessonProgressSchema>;
export type InsertQuizAttempt = z.infer<typeof insertQuizAttemptSchema>;
export type InsertTrainingRecord = z.infer<typeof insertTrainingRecordSchema>;
export type InsertCertificate = z.infer<typeof insertCertificateSchema>;
export type InsertBadge = z.infer<typeof insertBadgeSchema>;
export type InsertUserBadge = z.infer<typeof insertUserBadgeSchema>;
export type InsertTrainingRequirement = z.infer<typeof insertTrainingRequirementSchema>;
export type InsertPdpCourseLink = z.infer<typeof insertPdpCourseLinkSchema>;

// Learning Paths and Training Matrix Types
export type LearningPath = typeof learningPaths.$inferSelect;
export type LearningPathStep = typeof learningPathSteps.$inferSelect;
export type LearningPathEnrollment = typeof learningPathEnrollments.$inferSelect;
export type LearningPathStepProgress = typeof learningPathStepProgress.$inferSelect;
export type CompetencyLibraryItem = typeof competencyLibrary.$inferSelect;
export type RoleCompetencyMapping = typeof roleCompetencyMappings.$inferSelect;
export type AutomationRule = typeof automationRules.$inferSelect;
export type TrainingMatrixRecord = typeof trainingMatrixRecords.$inferSelect;
export type CompetencyStatusHistory = typeof competencyStatusHistory.$inferSelect;
export type CompetencyEvidenceRecord = typeof competencyEvidenceRecords.$inferSelect;

export type InsertLearningPath = z.infer<typeof insertLearningPathSchema>;
export type InsertLearningPathStep = z.infer<typeof insertLearningPathStepSchema>;
export type InsertLearningPathEnrollment = z.infer<typeof insertLearningPathEnrollmentSchema>;
export type InsertLearningPathStepProgress = z.infer<typeof insertLearningPathStepProgressSchema>;
export type InsertCompetencyLibraryItem = z.infer<typeof insertCompetencyLibrarySchema>;
export type InsertRoleCompetencyMapping = z.infer<typeof insertRoleCompetencyMappingSchema>;
export type InsertAutomationRule = z.infer<typeof insertAutomationRuleSchema>;
export type InsertTrainingMatrixRecord = z.infer<typeof insertTrainingMatrixRecordSchema>;
export type InsertCompetencyStatusHistory = z.infer<typeof insertCompetencyStatusHistorySchema>;
export type InsertCompetencyEvidenceRecord = z.infer<typeof insertCompetencyEvidenceRecordSchema>;

// Enhanced Competency Management DTOs and Types
export const auditTrailFilterSchema = z.object({
  search: z.string().optional(),
  action: z.string().optional(),
  user: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  limit: z.number().min(1).max(1000).default(100),
  offset: z.number().min(0).default(0)
});

export const complianceReportConfigSchema = z.object({
  type: z.enum(['full_audit', 'compliance_summary', 'gap_analysis']).default('full_audit'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  format: z.enum(['json', 'csv', 'pdf']).default('json'),
  includeAuditTrail: z.boolean().default(true),
  includeRiskAssessment: z.boolean().default(true),
  includeRecommendations: z.boolean().default(true),
  roleFilter: z.array(z.string()).optional(),
  teamFilter: z.array(z.string()).optional()
});

export const competencyProfileFilterSchema = z.object({
  includeEvidence: z.boolean().default(true),
  includeGoals: z.boolean().default(true),
  includeDeadlines: z.boolean().default(true)
});

export const userCompetencyProfileSchema = z.object({
  userId: z.string(),
  user: z.object({
    id: z.string(),
    firstName: z.string().nullable(),
    lastName: z.string().nullable(),
    email: z.string().nullable(),
    role: z.string(),
    teamId: z.string().nullable()
  }),
  competencies: z.array(z.object({
    id: z.string(),
    competencyId: z.string(),
    currentLevel: z.number(),
    targetLevel: z.number(),
    status: z.string(),
    lastAssessed: z.string().nullable(),
    nextReview: z.string().nullable(),
    priority: z.string(),
    evidenceCount: z.number(),
    competency: z.object({
      id: z.string(),
      title: z.string(),
      description: z.string().nullable(),
      category: z.string(),
      skillType: z.string(),
      assessmentCriteria: z.string().nullable()
    })
  })),
  totalCompetencies: z.number(),
  achievedCompetencies: z.number(),
  inProgressCompetencies: z.number(),
  overallCompletionRate: z.number(),
  nextDevelopmentGoals: z.array(z.any()),
  recentEvidence: z.array(z.any()),
  upcomingDeadlines: z.array(z.object({
    id: z.string(),
    competencyId: z.string(),
    deadline: z.string(),
    daysRemaining: z.number(),
    isOverdue: z.boolean(),
    priority: z.string(),
    competency: z.object({
      title: z.string(),
      category: z.string()
    })
  }))
});

export const teamCompetencyOverviewSchema = z.object({
  teamId: z.string(),
  teamName: z.string(),
  totalCompetencies: z.number(),
  achievedCompetencies: z.number(),
  inProgressCompetencies: z.number(),
  overdueCompetencies: z.number(),
  completionRate: z.number(),
  members: z.array(z.object({
    userId: z.string(),
    name: z.string(),
    role: z.string(),
    completionRate: z.number()
  }))
});

export const auditTrailRecordSchema = z.object({
  id: z.string(),
  timestamp: z.string(),
  userId: z.string(),
  action: z.string(),
  entity: z.string(),
  entityId: z.string(),
  oldValue: z.any(),
  newValue: z.any(),
  user: z.object({
    firstName: z.string().nullable(),
    lastName: z.string().nullable(),
    email: z.string().nullable(),
    role: z.string()
  })
});

export const complianceMetricsSchema = z.object({
  overallComplianceRate: z.number(),
  complianceByRole: z.array(z.object({
    role: z.string(),
    complianceRate: z.number(),
    totalUsers: z.number(),
    compliantUsers: z.number()
  })),
  complianceByCategory: z.array(z.object({
    category: z.string(),
    complianceRate: z.number(),
    totalCompetencies: z.number(),
    compliantCompetencies: z.number()
  })),
  monthlyTrends: z.array(z.object({
    month: z.string(),
    complianceRate: z.number(),
    newlyAchieved: z.number(),
    expired: z.number()
  })),
  auditReadiness: z.object({
    score: z.number(),
    lastAudit: z.string(),
    nextAudit: z.string(),
    criticalIssues: z.number(),
    recommendations: z.number()
  })
});

// Additional schemas for complete type safety
export const complianceMetricsFilterSchema = z.object({
  roleFilter: z.array(z.string()).optional(),
  teamFilter: z.array(z.string()).optional(),
  categoryFilter: z.array(z.string()).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional()
});

export const complianceReportSchema = z.object({
  id: z.string(),
  reportType: z.string(),
  generatedAt: z.string(),
  generatedBy: z.string(),
  reportPeriod: z.object({
    startDate: z.string(),
    endDate: z.string()
  }),
  summary: z.object({
    totalUsers: z.number(),
    totalCompetencies: z.number(),
    achievedCompetencies: z.number(),
    inProgressCompetencies: z.number(),
    overdueCompetencies: z.number(),
    complianceRate: z.number()
  }),
  metrics: complianceMetricsSchema,
  auditTrail: z.array(auditTrailRecordSchema),
  riskAssessment: z.array(z.object({
    id: z.string(),
    category: z.string(),
    severity: z.string(),
    description: z.string(),
    affectedUsers: z.number(),
    affectedCompetencies: z.array(z.string()),
    mitigationActions: z.array(z.string()),
    dueDate: z.string()
  })),
  recommendations: z.array(z.object({
    id: z.string(),
    priority: z.string(),
    category: z.string(),
    title: z.string(),
    description: z.string(),
    expectedOutcome: z.string(),
    estimatedEffort: z.string(),
    deadline: z.string()
  }))
});

// Export types for the new DTOs
export type AuditTrailFilter = z.infer<typeof auditTrailFilterSchema>;
export type ComplianceReportConfig = z.infer<typeof complianceReportConfigSchema>;
export type CompetencyProfileFilter = z.infer<typeof competencyProfileFilterSchema>;
export type UserCompetencyProfile = z.infer<typeof userCompetencyProfileSchema>;
export type TeamCompetencyOverview = z.infer<typeof teamCompetencyOverviewSchema>;
export type AuditTrailRecord = z.infer<typeof auditTrailRecordSchema>;
export type ComplianceMetrics = z.infer<typeof complianceMetricsSchema>;
export type ComplianceMetricsFilter = z.infer<typeof complianceMetricsFilterSchema>;
export type ComplianceReport = z.infer<typeof complianceReportSchema>;

// Additional types for legacy methods to achieve complete type safety
export const userCompetencySchema = z.object({
  id: z.string(),
  userId: z.string(),
  competencyId: z.string(),
  currentLevel: z.number(),
  targetLevel: z.number(),
  competency: z.object({
    id: z.string(),
    title: z.string(),
    description: z.string().nullable()
  })
});

export const courseDetailsWithProgressSchema = z.object({
  course: z.object({
    id: z.string(),
    title: z.string(),
    description: z.string().nullable(),
    type: z.string(),
    isPublished: z.boolean(),
    createdAt: z.string()
  }),
  currentVersion: z.object({
    id: z.string(),
    version: z.string(),
    isActive: z.boolean()
  }).nullable(),
  modules: z.array(z.object({
    id: z.string(),
    title: z.string(),
    sortOrder: z.number()
  })),
  userProgress: z.object({
    enrollmentId: z.string().nullable(),
    completionPercentage: z.number(),
    status: z.string()
  }).nullable()
});

export const recognitionFeedItemSchema = z.object({
  id: z.string(),
  fromUserId: z.string(),
  toUserId: z.string(),
  value: z.string(),
  message: z.string(),
  createdAt: z.string(),
  fromUser: z.object({
    firstName: z.string().nullable(),
    lastName: z.string().nullable(),
    teamName: z.string().nullable()
  }),
  toUser: z.object({
    firstName: z.string().nullable(),
    lastName: z.string().nullable(),
    teamName: z.string().nullable()
  })
});

export const teamHierarchyNodeSchema: z.ZodType<{
  id: string;
  name: string;
  description: string | null;
  parentTeamId: string | null;
  teamLeadId: string;
  department: string | null;
  isActive: boolean;
  children?: Array<{
    id: string;
    name: string;
    description: string | null;
    parentTeamId: string | null;
    teamLeadId: string;
    department: string | null;
    isActive: boolean;
    children?: any[];
  }>;
}> = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  parentTeamId: z.string().nullable(),
  teamLeadId: z.string(),
  department: z.string().nullable(),
  isActive: z.boolean(),
  children: z.array(z.lazy(() => teamHierarchyNodeSchema)).optional()
});

export const trainingMatrixViewSchema = z.object({
  userId: z.string(),
  userName: z.string(),
  role: z.string(),
  team: z.string().nullable(),
  competencyId: z.string(),
  competencyTitle: z.string(),
  category: z.string(),
  currentLevel: z.number(),
  targetLevel: z.number(),
  status: z.string(),
  lastAssessed: z.string().nullable(),
  nextReview: z.string().nullable(),
  priority: z.string()
});

export const userProfileUpdateSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().optional(),
  mobilePhone: z.string().optional(),
  jobTitle: z.string().optional(),
  managerId: z.string().optional(),
  teamId: z.string().optional()
});

export const trainingMatrixFilterSchema = z.object({
  role: z.string().optional(),
  teamId: z.string().optional(),
  competencyId: z.string().optional(),
  status: z.string().optional()
});

// Enhanced audit trail with proper pagination
export const enhancedAuditTrailFilterSchema = auditTrailFilterSchema.extend({
  page: z.number().min(1).default(1),
  pageSize: z.number().min(1).max(1000).default(50),
  sortBy: z.enum(['timestamp', 'user', 'action']).default('timestamp'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});

// Quiz answer types for complete type safety
export const quizAnswerSchema = z.record(z.string(), z.union([
  z.string(),
  z.array(z.string())
]));

// Export the new types
export type UserCompetencyView = z.infer<typeof userCompetencySchema>;
export type CourseDetailsWithProgress = z.infer<typeof courseDetailsWithProgressSchema>;
export type RecognitionFeedItem = z.infer<typeof recognitionFeedItemSchema>;
export type TeamHierarchyNode = z.infer<typeof teamHierarchyNodeSchema>;
export type TrainingMatrixView = z.infer<typeof trainingMatrixViewSchema>;
export type UserProfileUpdate = z.infer<typeof userProfileUpdateSchema>;
export type TrainingMatrixFilter = z.infer<typeof trainingMatrixFilterSchema>;
export type EnhancedAuditTrailFilter = z.infer<typeof enhancedAuditTrailFilterSchema>;
export type QuizAnswers = z.infer<typeof quizAnswerSchema>;

// Additional types for remaining any types
export const competencyEvidenceDataSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  evidenceType: z.string(),
  fileUrl: z.string().optional(),
  notes: z.string().optional()
});

export const automationTriggerDataSchema = z.object({
  event: z.string(),
  userId: z.string().optional(),
  competencyId: z.string().optional(),
  context: z.record(z.string(), z.any()).optional()
});

// Time-Based Automation Zod Schemas
export const insertRelativeDueDateConfigSchema = createInsertSchema(relativeDueDateConfigs).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertRecurringAssignmentSchema = createInsertSchema(recurringAssignments).omit({
  id: true,
  totalExecutions: true,
  successfulExecutions: true,
  lastRun: true,
  lastError: true,
  createdAt: true,
  updatedAt: true
});

export const insertAutomationRunLogSchema = createInsertSchema(automationRunLogs).omit({
  id: true
});

// Time-Based Automation Types
export type RelativeDueDateConfig = typeof relativeDueDateConfigs.$inferSelect;
export type InsertRelativeDueDateConfig = z.infer<typeof insertRelativeDueDateConfigSchema>;
export type RecurringAssignment = typeof recurringAssignments.$inferSelect;
export type InsertRecurringAssignment = z.infer<typeof insertRecurringAssignmentSchema>;
export type AutomationRunLog = typeof automationRunLogs.$inferSelect;
export type InsertAutomationRunLog = z.infer<typeof insertAutomationRunLogSchema>;

// =====================================================================
// ADVANCED ANALYTICS TABLES - Phase 3 Implementation
// =====================================================================

// Analytics Metrics - Time-series data for all performance metrics
export const analyticsMetrics = pgTable("analytics_metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  metricType: analyticsMetricTypeEnum("metric_type").notNull(),
  dimension: analyticsDimensionEnum("dimension").notNull(),
  dimensionId: varchar("dimension_id").notNull(), // ID of the entity being measured
  aggregationLevel: analyticsAggregationEnum("aggregation_level").notNull(),
  value: integer("value").notNull(), // Metric value (scaled by 100 for percentages)
  additionalData: jsonb("additional_data"), // Extra context/breakdown data
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_analytics_metrics_type_dimension").on(table.metricType, table.dimension),
  index("idx_analytics_metrics_dimension_id").on(table.dimensionId),
  index("idx_analytics_metrics_period").on(table.periodStart, table.periodEnd),
  index("idx_analytics_metrics_composite_query").on(table.metricType, table.dimension, table.aggregationLevel, table.periodStart),
  index("idx_analytics_metrics_dimension_period").on(table.dimensionId, table.periodStart),
]);

// Analytics Dashboards - Configurable dashboard definitions
export const analyticsDashboards = pgTable("analytics_dashboards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  description: text("description"),
  userId: varchar("user_id"), // User who created the dashboard
  isPublic: boolean("is_public").default(false),
  configuration: jsonb("configuration").notNull(), // Dashboard layout and widgets
  filters: jsonb("filters"), // Default filters
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_analytics_dashboards_user").on(table.userId),
  index("idx_analytics_dashboards_public").on(table.isPublic),
  index("idx_analytics_dashboards_created").on(table.createdAt),
]);

// Analytics Reports - Generated reports and insights
export const analyticsReports = pgTable("analytics_reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  description: text("description"),
  reportType: varchar("report_type").notNull(), // e.g., "performance", "compliance", "engagement"
  generatedBy: varchar("generated_by").notNull(), // User ID
  filters: jsonb("filters"), // Filters used to generate the report
  data: jsonb("data").notNull(), // Report data and visualizations
  insights: jsonb("insights"), // AI-generated insights and recommendations
  isScheduled: boolean("is_scheduled").default(false),
  schedule: jsonb("schedule"), // Cron-like schedule configuration
  generatedAt: timestamp("generated_at").defaultNow(),
  validUntil: timestamp("valid_until"), // Report expiry
}, (table) => [
  index("idx_analytics_reports_generated_by").on(table.generatedBy),
  index("idx_analytics_reports_type").on(table.reportType),
  index("idx_analytics_reports_generated_at").on(table.generatedAt),
  index("idx_analytics_reports_scheduled").on(table.isScheduled),
]);

// Performance Snapshots - Point-in-time performance captures
export const performanceSnapshots = pgTable("performance_snapshots", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  snapshotDate: timestamp("snapshot_date").notNull(),
  overallScore: integer("overall_score"), // 0-100 overall performance score
  competencyScores: jsonb("competency_scores"), // Breakdown by competency
  learningVelocity: integer("learning_velocity"), // Learning pace metric
  engagementLevel: integer("engagement_level"), // 0-100 engagement score
  streakCount: integer("streak_count").default(0),
  completionRate: integer("completion_rate"), // 0-100 percentage
  assessmentAverage: integer("assessment_average"), // 0-100 average score
  skillMastery: jsonb("skill_mastery"), // Skills and mastery levels
  predictiveInsights: jsonb("predictive_insights"), // ML-generated predictions
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_performance_snapshots_user_date").on(table.userId, table.snapshotDate),
  index("idx_performance_snapshots_date").on(table.snapshotDate),
]);

// Learning Insights - AI-powered learning insights and recommendations
export const learningInsights = pgTable("learning_insights", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id"),
  teamId: varchar("team_id"),
  departmentId: varchar("department_id"),
  insightType: varchar("insight_type").notNull(), // e.g., "recommendation", "warning", "achievement"
  title: varchar("title").notNull(),
  description: text("description").notNull(),
  priority: varchar("priority").notNull(), // high, medium, low
  confidence: integer("confidence"), // 0-100 confidence score
  dataPoints: jsonb("data_points"), // Supporting data for the insight
  actionItems: jsonb("action_items"), // Recommended actions
  isRead: boolean("is_read").default(false),
  isActionTaken: boolean("is_action_taken").default(false),
  validUntil: timestamp("valid_until"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  foreignKey({
    columns: [table.departmentId],
    foreignColumns: [departments.id],
    name: "learning_insights_department_fk"
  }).onDelete("set null"),
  index("idx_learning_insights_user").on(table.userId),
  index("idx_learning_insights_team").on(table.teamId),
  index("idx_learning_insights_department").on(table.departmentId),
  index("idx_learning_insights_type").on(table.insightType),
  index("idx_learning_insights_user_created").on(table.userId, table.createdAt),
  index("idx_learning_insights_team_created").on(table.teamId, table.createdAt),
]);

// Analytics tables will have indexes defined inline
// Individual indexes are defined within table declarations for proper syntax

// Analytics Relations
export const analyticsMetricsRelations = relations(analyticsMetrics, ({ one }) => ({
  // Relations will be added based on dimension type
}));

export const analyticsDashboardsRelations = relations(analyticsDashboards, ({ one }) => ({
  creator: one(users, {
    fields: [analyticsDashboards.userId],
    references: [users.id],
  }),
}));

export const analyticsReportsRelations = relations(analyticsReports, ({ one }) => ({
  generator: one(users, {
    fields: [analyticsReports.generatedBy],
    references: [users.id],
  }),
}));

export const performanceSnapshotsRelations = relations(performanceSnapshots, ({ one }) => ({
  user: one(users, {
    fields: [performanceSnapshots.userId],
    references: [users.id],
  }),
}));

export const learningInsightsRelations = relations(learningInsights, ({ one, many }) => ({
  user: one(users, {
    fields: [learningInsights.userId],
    references: [users.id],
  }),
  team: one(teams, {
    fields: [learningInsights.teamId],
    references: [teams.id],
  }),
}));

// =====================================================================
// ANALYTICS ZOD SCHEMAS
// =====================================================================

export const insertAnalyticsMetricSchema = createInsertSchema(analyticsMetrics).omit({
  id: true,
  createdAt: true
});

export const insertAnalyticsDashboardSchema = createInsertSchema(analyticsDashboards).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertAnalyticsReportSchema = createInsertSchema(analyticsReports).omit({
  id: true,
  generatedAt: true
});

export const insertPerformanceSnapshotSchema = createInsertSchema(performanceSnapshots).omit({
  id: true,
  createdAt: true
});

export const insertLearningInsightSchema = createInsertSchema(learningInsights).omit({
  id: true,
  createdAt: true
});

// =====================================================================
// ANALYTICS TYPES
// =====================================================================

export type AnalyticsMetric = typeof analyticsMetrics.$inferSelect;
export type InsertAnalyticsMetric = z.infer<typeof insertAnalyticsMetricSchema>;
export type AnalyticsDashboard = typeof analyticsDashboards.$inferSelect;
export type InsertAnalyticsDashboard = z.infer<typeof insertAnalyticsDashboardSchema>;
export type AnalyticsReport = typeof analyticsReports.$inferSelect;
export type InsertAnalyticsReport = z.infer<typeof insertAnalyticsReportSchema>;
export type PerformanceSnapshot = typeof performanceSnapshots.$inferSelect;
export type InsertPerformanceSnapshot = z.infer<typeof insertPerformanceSnapshotSchema>;
export type LearningInsight = typeof learningInsights.$inferSelect;
export type InsertLearningInsight = z.infer<typeof insertLearningInsightSchema>;

// Re-export types for storage interface to avoid z import
export type CompetencyEvidenceData = z.infer<typeof competencyEvidenceDataSchema>;
export type AutomationTriggerData = z.infer<typeof automationTriggerDataSchema>;

// =====================================================================
// ANALYTICS API VALIDATION SCHEMAS
// =====================================================================

export const analyticsMetricsQuerySchema = z.object({
  metricType: z.enum(analyticsMetricTypeEnum.enumValues).optional(),
  dimension: z.enum(analyticsDimensionEnum.enumValues).optional(),
  dimensionId: z.string().optional(),
  aggregationLevel: z.enum(analyticsAggregationEnum.enumValues).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional()
});

export const analyticsPerformanceQuerySchema = z.object({
  date: z.string().datetime().optional()
});

export const analyticsPerformanceHistoryQuerySchema = z.object({
  days: z.string().regex(/^\d+$/).transform(Number).default('30')
});

export const analyticsInsightsQuerySchema = z.object({
  unreadOnly: z.enum(['true', 'false']).transform(val => val === 'true').optional()
});

export const analyticsEngagementQuerySchema = z.object({
  userId: z.string().optional(),
  teamId: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional()
});

export const analyticsPerformanceMetricsQuerySchema = z.object({
  userId: z.string().optional(),
  teamId: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional()
});

// Analytics validation types
export type AnalyticsMetricsQuery = z.infer<typeof analyticsMetricsQuerySchema>;
export type AnalyticsPerformanceQuery = z.infer<typeof analyticsPerformanceQuerySchema>;
export type AnalyticsPerformanceHistoryQuery = z.infer<typeof analyticsPerformanceHistoryQuerySchema>;
export type AnalyticsInsightsQuery = z.infer<typeof analyticsInsightsQuerySchema>;
export type AnalyticsEngagementQuery = z.infer<typeof analyticsEngagementQuerySchema>;
export type AnalyticsPerformanceMetricsQuery = z.infer<typeof analyticsPerformanceMetricsQuerySchema>;

// Department/Team Analytics Types
export type DepartmentAnalytics = {
  department: string;
  teamCount: number;
  memberCount: number;
  completionRate: number;
  activeEnrollments: number;
  averageProgress: number;
  totalCompetencies: number;
  achievedCompetencies: number;
  overdueTraining: number;
  topPerformingTeams: Array<{
    teamId: string;
    teamName: string;
    completionRate: number;
    memberCount: number;
  }>;
  recentActivity: Array<{
    activityType: string;
    count: number;
    period: string;
  }>;
};

export type TeamAnalytics = {
  teamId: string;
  teamName: string;
  department: string;
  memberCount: number;
  completionRate: number;
  averageProgress: number;
  activeEnrollments: number;
  totalCompetencies: number;
  achievedCompetencies: number;
  overdueTraining: number;
  learningVelocity: number;
  engagementScore: number;
  members: Array<{
    userId: string;
    name: string;
    role: string;
    completionRate: number;
    activeEnrollments: number;
    lastActivity: Date | null;
  }>;
  recentCompletions: Array<{
    userId: string;
    userName: string;
    itemType: string;
    itemTitle: string;
    completedAt: Date;
  }>;
};

export type DepartmentHierarchyAnalytics = {
  department: string;
  teamStructure: Array<{
    teamId: string;
    teamName: string;
    parentTeamId: string | null;
    level: number;
    memberCount: number;
    completionRate: number;
    children: Array<{
      teamId: string;
      teamName: string;
      memberCount: number;
      completionRate: number;
    }>;
  }>;
  departmentMetrics: {
    totalMembers: number;
    averageCompletionRate: number;
    totalActiveEnrollments: number;
    complianceRate: number;
  };
};

export type TeamLearningTrends = {
  teamId: string;
  teamName: string;
  trends: Array<{
    date: string;
    enrollments: number;
    completions: number;
    averageProgress: number;
    activeUsers: number;
  }>;
  insights: Array<{
    type: 'improvement' | 'concern' | 'strength';
    title: string;
    description: string;
    metric: number;
    trend: 'up' | 'down' | 'stable';
  }>;
};

// Notification System Tables

// Notifications table - in-app notifications
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  type: notificationTypeEnum("type").notNull(),
  priority: notificationPriorityEnum("priority").default("medium"),
  title: varchar("title").notNull(),
  message: text("message").notNull(),
  actionUrl: varchar("action_url"), // Deep link to relevant page
  actionLabel: varchar("action_label"), // Label for action button
  relatedEntityId: varchar("related_entity_id"), // ID of course, goal, etc.
  relatedEntityType: varchar("related_entity_type"), // "course", "goal", "meeting", etc.
  metadata: jsonb("metadata"), // Additional data for the notification
  isRead: boolean("is_read").default(false),
  readAt: timestamp("read_at"),
  isArchived: boolean("is_archived").default(false),
  archivedAt: timestamp("archived_at"),
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at"), // Optional expiry date for notifications
});

// N8N Webhook Configuration table - stores webhook URLs for different event types
export const n8nWebhookConfigs = pgTable("n8n_webhook_configs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(), // Human-readable name for the webhook
  eventType: webhookEventTypeEnum("event_type").notNull(),
  webhookUrl: varchar("webhook_url").notNull(),
  isActive: boolean("is_active").default(true),
  description: text("description"), // What this webhook does
  triggerConditions: jsonb("trigger_conditions"), // Conditions that trigger this webhook
  headers: jsonb("headers"), // Custom headers to send with webhook
  retryCount: integer("retry_count").default(3),
  timeoutSeconds: integer("timeout_seconds").default(30),
  createdBy: varchar("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  lastTriggeredAt: timestamp("last_triggered_at"),
}, (table) => ({
  // Unique constraint on event type to prevent duplicate webhooks for same event
  uniqueEventType: unique().on(table.eventType),
}));

// Webhook execution logs - track webhook calls for debugging
export const webhookExecutionLogs = pgTable("webhook_execution_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  webhookConfigId: varchar("webhook_config_id").notNull(),
  eventType: webhookEventTypeEnum("event_type").notNull(),
  eventData: jsonb("event_data").notNull(), // The payload sent to webhook
  httpStatusCode: integer("http_status_code"),
  responseBody: text("response_body"),
  responseHeaders: jsonb("response_headers"),
  errorMessage: text("error_message"),
  executionTimeMs: integer("execution_time_ms"),
  isSuccess: boolean("is_success").default(false),
  retryAttempt: integer("retry_attempt").default(0),
  triggeredBy: varchar("triggered_by"), // System or user ID that triggered the event
  createdAt: timestamp("created_at").defaultNow(),
});

// Notification preferences - user preferences for notifications
export const notificationPreferences = pgTable("notification_preferences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  notificationType: notificationTypeEnum("notification_type").notNull(),
  inAppEnabled: boolean("in_app_enabled").default(true),
  webhookEnabled: boolean("webhook_enabled").default(false), // Whether user wants webhook notifications for this type
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  // Prevent duplicate preferences for same user and notification type
  uniqueUserNotificationType: unique().on(table.userId, table.notificationType),
}));

// Notification templates - reusable templates for consistent messaging
export const notificationTemplates = pgTable("notification_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: notificationTypeEnum("type").notNull(),
  name: varchar("name").notNull(),
  titleTemplate: varchar("title_template").notNull(), // Can include {{variables}}
  messageTemplate: text("message_template").notNull(), // Can include {{variables}}
  actionLabel: varchar("action_label"), // Default action button label
  priority: notificationPriorityEnum("priority").default("medium"),
  isActive: boolean("is_active").default(true),
  variables: text("variables").array(), // List of available variables
  createdBy: varchar("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  // Unique constraint on type and name to prevent duplicate templates
  uniqueTypeName: unique().on(table.type, table.name),
}));

// Notification Insert Schemas
export const insertNotificationSchema = createInsertSchema(notifications).omit({ 
  id: true, 
  createdAt: true, 
  readAt: true, 
  archivedAt: true 
});
export const insertN8nWebhookConfigSchema = createInsertSchema(n8nWebhookConfigs).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true, 
  lastTriggeredAt: true 
});
export const insertWebhookExecutionLogSchema = createInsertSchema(webhookExecutionLogs).omit({ 
  id: true, 
  createdAt: true 
});
export const insertNotificationPreferenceSchema = createInsertSchema(notificationPreferences).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});
export const insertNotificationTemplateSchema = createInsertSchema(notificationTemplates).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

// Notification Types
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type N8nWebhookConfig = typeof n8nWebhookConfigs.$inferSelect;
export type InsertN8nWebhookConfig = z.infer<typeof insertN8nWebhookConfigSchema>;
export type WebhookExecutionLog = typeof webhookExecutionLogs.$inferSelect;
export type InsertWebhookExecutionLog = z.infer<typeof insertWebhookExecutionLogSchema>;
export type NotificationPreference = typeof notificationPreferences.$inferSelect;
export type InsertNotificationPreference = z.infer<typeof insertNotificationPreferenceSchema>;
export type NotificationTemplate = typeof notificationTemplates.$inferSelect;
export type InsertNotificationTemplate = z.infer<typeof insertNotificationTemplateSchema>;
