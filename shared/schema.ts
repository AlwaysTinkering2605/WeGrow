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

// Confidence levels enum
export const confidenceLevelEnum = pgEnum("confidence_level", ["green", "amber", "red"]);

// Company values enum
export const companyValueEnum = pgEnum("company_value", ["excellence", "teamwork", "innovation", "reliability"]);

// LMS-specific enums
export const lessonTypeEnum = pgEnum("lesson_type", ["video", "quiz", "document", "link"]);
export const contentTypeEnum = pgEnum("content_type", ["rich_text", "video", "pdf_document"]);
export const courseTypeEnum = pgEnum("course_type", ["internal", "external"]);
export const trainingFormatEnum = pgEnum("training_format", ["online", "in_person", "hybrid"]);
export const enrollmentStatusEnum = pgEnum("enrollment_status", ["enrolled", "in_progress", "completed", "expired"]);
export const lessonStatusEnum = pgEnum("lesson_status", ["not_started", "in_progress", "completed"]);
export const completionMethodEnum = pgEnum("completion_method", ["manual", "quiz", "auto"]);
export const questionTypeEnum = pgEnum("question_type", ["multiple_choice", "true_false", "multi_select"]);
export const trainingStatusEnum = pgEnum("training_status", ["in_progress", "completed", "on_hold"]);

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

// LMS Tables

// Courses - main course definitions
export const courses = pgTable("courses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  description: text("description"),
  category: varchar("category"),
  level: varchar("level"), // Beginner, Intermediate, Advanced
  estimatedDuration: integer("estimated_duration"), // minutes
  tags: text("tags").array(),
  thumbnailUrl: varchar("thumbnail_url"),
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
});

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
  contentType: contentTypeEnum("content_type").default("video"), // rich_text, video, pdf_document
  richTextContent: text("rich_text_content"), // HTML content for rich text lessons
  vimeoVideoId: varchar("vimeo_video_id"), // For video lessons
  pdfContentUrl: varchar("pdf_content_url"), // URL to uploaded PDF document
  
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
  courseVersionId: varchar("course_version_id").notNull(),
  trainingRecordId: varchar("training_record_id").notNull(),
  certificateNumber: varchar("certificate_number").notNull(),
  issuedAt: timestamp("issued_at").defaultNow(),
  expiresAt: timestamp("expires_at"),
  verificationHash: varchar("verification_hash"),
  metadata: jsonb("metadata"), // Additional certificate data
});

// Badges
export const badges = pgTable("badges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  description: text("description"),
  iconKey: varchar("icon_key"), // Object storage key for the badge icon
  iconUrl: varchar("icon_url"), // Public URL for the badge icon
  criteria: text("criteria"), // How to earn this badge
  color: varchar("color").default('#3b82f6'), // Badge color for display
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// User badges
export const userBadges = pgTable("user_badges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  badgeId: varchar("badge_id").notNull(),
  awardedAt: timestamp("awarded_at").defaultNow(),
  awardedBy: varchar("awarded_by"), // System or user ID
  reason: text("reason"),
  courseVersionId: varchar("course_version_id"), // If earned from course completion
});

// Badge course requirements - defines which courses are needed to earn a badge
export const badgeCourseRequirements = pgTable("badge_course_requirements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  badgeId: varchar("badge_id").notNull(),
  courseId: varchar("course_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

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
  category: varchar("category"), // e.g., "onboarding", "compliance", "professional_development"
  estimatedDuration: integer("estimated_duration"), // Minutes
  isActive: boolean("is_active").default(true),
  isPublished: boolean("is_published").default(false),
  publishedAt: timestamp("published_at"), // When path was published
  completionCriteria: jsonb("completion_criteria"), // Requirements for path completion
  createdBy: varchar("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"), // Soft delete support
}, (table) => ({
  // Indices for performance
  titleIdx: index("learning_paths_title_idx").on(table.title),
  categoryIdx: index("learning_paths_category_idx").on(table.category),
  isPublishedIdx: index("learning_paths_published_idx").on(table.isPublished),
  createdByIdx: index("learning_paths_created_by_idx").on(table.createdBy),
}));

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

// Enhanced Competency Library - extends existing competencies for training matrix
export const competencyLibrary = pgTable("competency_library", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  competencyId: varchar("competency_id").notNull(), // Links to existing competencies table
  requiredForRoles: text("required_for_roles").array(), // Array of role names
  requiredForTeams: text("required_for_teams").array(), // Array of team IDs
  proficiencyLevels: jsonb("proficiency_levels"), // Define skill levels (basic, intermediate, advanced)
  assessmentCriteria: text("assessment_criteria"), // How competency is measured
  renewalPeriodDays: integer("renewal_period_days"), // Days until renewal required
  isComplianceRequired: boolean("is_compliance_required").default(false),
  evidenceRequirements: jsonb("evidence_requirements"), // Types of evidence needed
  linkedLearningPaths: text("linked_learning_paths").array(), // Paths that build this competency
  createdBy: varchar("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Role Competency Mappings - define which competencies are required for which roles
export const roleCompetencyMappings = pgTable("role_competency_mappings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  role: userRoleEnum("role").notNull(),
  competencyLibraryId: varchar("competency_library_id").notNull(),
  teamId: varchar("team_id"), // Team-specific requirements
  requiredProficiencyLevel: varchar("required_proficiency_level").default("basic"), // "basic", "intermediate", "advanced"
  isMandatory: boolean("is_mandatory").default(true),
  priority: varchar("priority").default("medium"), // "low", "medium", "high", "critical"
  gracePeriodDays: integer("grace_period_days"), // Days after hiring/role change to achieve competency
  createdBy: varchar("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

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
  creator: one(users, {
    fields: [competencyLibrary.createdBy],
    references: [users.id],
  }),
  roleMappings: many(roleCompetencyMappings),
  trainingMatrixRecords: many(trainingMatrixRecords),
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

export const insertBadgeSchema = createInsertSchema(badges).omit({
  id: true,
  createdAt: true,
});

export const insertBadgeCourseRequirementSchema = createInsertSchema(badgeCourseRequirements).omit({
  id: true,
  createdAt: true,
});

export const insertUserBadgeSchema = createInsertSchema(userBadges).omit({
  id: true,
  awardedAt: true,
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

export const insertAutomationRuleSchema = createInsertSchema(automationRules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastRun: true,
  totalExecutions: true,
  successfulExecutions: true,
});

export const insertTrainingMatrixRecordSchema = createInsertSchema(trainingMatrixRecords).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
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
export type InsertBadgeCourseRequirement = z.infer<typeof insertBadgeCourseRequirementSchema>;
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

export type InsertLearningPath = z.infer<typeof insertLearningPathSchema>;
export type InsertLearningPathStep = z.infer<typeof insertLearningPathStepSchema>;
export type InsertLearningPathEnrollment = z.infer<typeof insertLearningPathEnrollmentSchema>;
export type InsertLearningPathStepProgress = z.infer<typeof insertLearningPathStepProgressSchema>;
export type InsertCompetencyLibraryItem = z.infer<typeof insertCompetencyLibrarySchema>;
export type InsertRoleCompetencyMapping = z.infer<typeof insertRoleCompetencyMappingSchema>;
export type InsertAutomationRule = z.infer<typeof insertAutomationRuleSchema>;
export type InsertTrainingMatrixRecord = z.infer<typeof insertTrainingMatrixRecordSchema>;
