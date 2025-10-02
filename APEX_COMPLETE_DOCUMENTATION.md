# Apex Performance & Development Platform
## Complete System Documentation

---

## Table of Contents
1. [Overview & Purpose](#overview--purpose)
2. [User Roles & Access Control](#user-roles--access-control)
3. [System Architecture](#system-architecture)
4. [Core Modules & Features](#core-modules--features)
5. [Data Model & Dependencies](#data-model--dependencies)
6. [Setup Flow - What to Create First](#setup-flow---what-to-create-first)
7. [Key Workflows & User Journeys](#key-workflows--user-journeys)
8. [Integration Points](#integration-points)

---

## Overview & Purpose

**Apex** is a comprehensive Performance & Development Platform designed specifically for cleaning companies to integrate Personal Development Plans (PDPs) with Objectives and Key Results (OKR) in a mobile-first application.

### Target Users
- **Cleaning Operatives**: Front-line employees tracking their development and goals
- **Area Supervisors**: Team leaders managing team objectives and employee development  
- **Senior Leadership**: Executives setting company strategy and monitoring organization-wide performance

### Core Purpose
- Align individual goals with company objectives (cascading OKRs)
- Track competency development and ISO 9001:2015 compliance
- Provide structured learning paths and training management
- Enable peer recognition and 1-on-1 performance conversations
- Automate competency gap analysis and learning assignments

---

## User Roles & Access Control

### 1. Operative (Base User)
**Can Access:**
- Personal dashboard with goals and progress
- My Goals (view and create personal goals)
- Weekly Check-ins (track progress)
- Development Plans (view assigned training)
- Learning & Courses (enroll and complete courses)
- Recognition (send and receive peer recognition)
- 1-on-1 Meetings (schedule with manager)
- Profile (edit personal information)

**Cannot Access:**
- Team management features
- Company objectives creation
- User administration
- Analytics and reporting

### 2. Supervisor (Mid-level Manager)
**Inherits all Operative permissions, plus:**
- Team Objectives (create and manage team-level OKRs)
- Team Management (view team members and structure)
- Organization Chart (view reporting structures)
- Training Matrix (view team training status)
- Advanced Learning Paths (assign to team members)
- Automation Engine (basic access to assigned automations)
- Competency Evidence Verification (approve team member competencies)

**Cannot Access:**
- Company-wide objectives creation
- User role management
- System-wide settings
- Job role creation/deletion

### 3. Leadership (Executive Level)
**Has Full System Access, including:**
- Company Objectives (create strategic OKRs)
- User Management (assign roles, job roles, teams)
- Job Role Management (CRUD organizational job roles)
- Company Settings (configure system-wide policies)
- Advanced Analytics & Reports (organization insights)
- Compliance Reporting (ISO audit trails)
- Automation Rules Engine (create org-wide automation)
- Competency Library Management (define organizational competencies)
- Webhook & Integration Configuration (n8n, external systems)
- Certificate Template Management
- Notification System Configuration

---

## System Architecture

### Frontend Stack
- **React 18** with TypeScript - Component-based UI
- **Vite** - Fast development and build tool
- **Tailwind CSS** + **shadcn/ui** - Utility-first styling with accessible components
- **Wouter** - Lightweight client-side routing
- **TanStack Query (React Query v5)** - Server state management and caching
- **React Hook Form** + **Zod** - Type-safe form validation
- **Lucide React** - Icon library

### Backend Stack
- **Express.js** - Node.js web framework
- **TypeScript** - Type-safe server development
- **Drizzle ORM** - Type-safe database queries
- **Replit OIDC Auth** - Authentication via Replit identity provider
- **PostgreSQL (Neon)** - Serverless database
- **Session Store** - PostgreSQL-backed session management (connect-pg-simple)

### Key Integrations
- **Vimeo Player** - Video lesson playback
- **Google Cloud Storage** - Object storage for files, certificates, PDFs
- **n8n Webhooks** - External automation workflows
- **ReactQuill** - Rich text editing for lesson content
- **SCORM Support** - Standard learning package integration

---

## Core Modules & Features

### 1. Performance Management

#### Company Objectives (Leadership Only)
- Create strategic top-level objectives
- Define key results with target values
- Set quarterly/annual timeframes
- Track organization-wide progress

#### Team Objectives (Supervisor/Leadership)
- Link team goals to company objectives
- Assign key results to team members
- Monitor team-level achievement
- Create department/area-specific targets

#### Individual Goals (All Users)
- Personal OKRs aligned to company/team objectives
- Progress tracking (0-100%)
- Weekly check-ins with confidence levels (Green/Amber/Red)
- Achievement and challenge logging
- Goal status: Open, In Progress, Completed, Archived

#### Weekly Check-ins
- Log progress updates on active goals
- Record achievements and challenges
- Set confidence levels (Green/Amber/Red)
- Track time spent on activities
- Historical check-in view

### 2. Learning Management System (LMS)

#### Course Catalog
- **Course Types**: Internal (company-created) and External (third-party)
- **Training Formats**: Online, In-Person, Hybrid
- **Course Versions**: Version control for course content updates
- Browse published courses with filtering
- Enrollment system with status tracking

#### Course Structure
- **Modules**: Organizational containers within courses
- **Lessons**: Individual learning units with multiple content types
  - Rich Text (formatted content)
  - Video (Vimeo embedded)
  - PDF Documents (downloadable/viewable)
  - SCORM Packages (interactive learning)
  - External Links/Videos
  - Instructor-Led Sessions (scheduled live training)

#### Progress Tracking
- Real-time lesson completion tracking
- Module-level progress aggregation
- Course-level completion percentage
- Enrollment status: Enrolled → In Progress → Completed → Expired
- Lesson status: Not Started → In Progress → Completed
- Automatic progress updates via beacon API

#### Assessments & Quizzes
- Quiz creation with multiple question types
- Scoring and passing thresholds
- Retake options with attempt limits
- Adaptive logic (quiz results influence path)
- Quiz attempts tracking with timestamps

#### Certificates & Badges
- **Auto-Certification**: Certificates issued upon course/path completion
- **Certificate Templates**: Customizable designs with dynamic fields
- **Badges**: Achievement recognition for milestones
  - Badge Types: Completion, Streak, Performance, Participation, Milestone
- **Training Records**: Immutable ISO-compliant training history
- PDF certificate generation and download

### 3. Learning Paths

#### Path Types
- **Linear Paths**: Step-by-step sequential learning
- **Non-Linear Paths**: Choice-based learning (user selects order)
- **Adaptive Paths**: AI-driven, adjusts based on performance

#### Learning Path Steps
- Link courses, assessments, or content
- Define prerequisites and unlock conditions
- Set completion criteria
- Configure adaptive progression rules
- Reorder steps with drag-and-drop

#### Job Role Mapping
- Assign learning paths to specific job roles
- Auto-enrollment when user assigned to role
- Required vs. Optional path designation
- Role-based training requirements tracking

#### Path Enrollments
- User enrollment tracking
- Step-by-step progress monitoring
- Completion certificates
- Suspend/Resume capability
- Due date and deadline tracking

### 4. Competency Management

#### Competency Library (Leadership)
- **Hierarchical Structure**: Parent-child competency relationships
- **Competency Levels**: Define proficiency scales (1-5, Beginner-Expert, etc.)
- **Skill Types**: Technical, Behavioral, Leadership, etc.
- **Assessment Criteria**: Clear definitions for each level
- **Version Control**: Track competency definition changes

#### Role-Competency Mapping
- Define required competencies per job role
- Set target proficiency levels
- Assign priority levels (Critical, Important, Nice-to-have)
- Team-specific competency requirements
- Minimum competency requirements for compliance

#### Competency Evidence
- **Evidence Portfolio**: Users upload proof of competency
  - Documents (certificates, reports)
  - Assessments (test results)
  - Work samples (project deliverables)
  - Observations (supervisor notes)
- **Verification Process**: Supervisor/Leadership approval workflow
- **Status Tracking**: Pending, Verified, Rejected
- **Audit Trail**: ISO 9001:2015 compliant logging

#### Competency Status History
- Immutable audit log of all competency changes
- Tracks: Who changed, What changed, When, Why
- Assessor and evidence linkage
- Compliance reporting for ISO audits
- Risk assessment flagging

#### Training Matrix
- **Grid View**: Users × Competencies matrix
- **Status Indicators**: Not Started, In Progress, Achieved, Expired
- **Filtering**: By department, team, job role, competency
- **Compliance Dashboard**: Red/Amber/Green status overview
- **Gap Identification**: Auto-highlight skill gaps

### 5. Adaptive Learning Engine

#### User Learning Profiles
- Track learning style preferences
- Performance history analysis
- Skill level assessments
- Learning velocity metrics
- Engagement patterns

#### AI-Powered Recommendations
- Personalized course suggestions
- Learning path recommendations
- Resource recommendations based on:
  - User goals and competency gaps
  - Peer learning patterns
  - Performance trends
  - Career progression paths

#### Dynamic Path Adjustment
- Real-time difficulty adjustment
- Skip redundant content based on mastery
- Add remedial modules for struggling learners
- Optimize learning sequence based on performance
- Achievement milestone tracking

#### Performance Insights
- Engagement score calculation
- Learning velocity trends
- Competency progress tracking
- Performance predictions
- Risk identification (struggling learners)

### 6. Automation & Closed-Loop Integration

#### Automation Rules Engine (Leadership)
- **Trigger Events**: Course completion, competency gap, role change, date-based
- **Conditions**: IF/THEN logic with multiple criteria
- **Actions**: Assign learning path, send notification, update competency, create task
- **Rule Types**:
  - Role-based auto-assignment (assign paths when job role assigned)
  - Gap-based auto-assignment (assign remedial training for gaps)
  - Time-based reminders (deadline approaching notifications)
  - Compliance auto-assignment (mandatory training triggers)

#### Time-Based Automation
- **Relative Due Dates**: Calculate due dates from enrollment (e.g., "30 days after hire")
- **Recurring Assignments**: Schedule repeated training (annual refreshers)
- **Automated Reminders**: Configurable notification timing
- **Grace Periods**: Allow overdue completion windows

#### Closed-Loop Integration
- **Competency Gap Analysis**: System identifies skill gaps automatically
- **Auto-Assignment Trigger**: Gaps trigger learning path enrollment
- **Progress Monitoring**: Track gap remediation progress
- **Completion Verification**: Update competency status upon completion
- **Continuous Improvement**: Re-analyze gaps after training completion

#### Execution Logs
- Track all automation runs (success/failure)
- Error logging and troubleshooting
- Performance metrics
- Audit trail for compliance

### 7. Reporting & Analytics

#### Company Reports (Leadership)
- Organization-wide metrics dashboard
- Goal completion rates
- Training completion statistics
- Competency coverage analysis
- Employee development overview

#### Individual Profiles
- Personal competency matrix
- Learning progress summary
- Goal achievement history
- Evidence portfolio
- Certificate collection

#### Team Analytics (Supervisor/Leadership)
- Team completion rates
- Active enrollments overview
- Member progress tracking
- Team competency heatmap
- Performance trends

#### Compliance Dashboard (ISO 9001:2015)
- Audit trail reports
- Training records export
- Competency verification status
- Risk assessment matrix
- Non-compliance alerts
- Evidence documentation status

#### Advanced Analytics
- Performance trend analysis
- Engagement metrics
- Competency distribution charts
- Predictive analytics (at-risk learners)
- Learning effectiveness metrics
- ROI on training investments

### 8. Communication & Recognition

#### Peer Recognition System
- Send recognition to colleagues
- Company values alignment:
  - Excellence
  - Teamwork
  - Innovation
  - Reliability
- Public vs. Private recognition
- Recognition wall/feed
- Statistics: Sent/Received counts

#### 1-on-1 Meetings
- Schedule meetings with manager/direct reports
- Set duration and agenda
- Manager notes section
- Employee notes section
- Action items tracking
- Meeting history log
- Completion status

#### Notification System
- **In-App Notifications**: Real-time alerts within platform
- **Notification Types**:
  - Course completion
  - Quiz results (passed/failed)
  - Certificate issued
  - Training due/overdue
  - Competency achieved
  - Badge awarded
  - Meeting reminder
  - Goal deadline approaching
  - Recognition received
- **Preferences**: User-configurable per notification type
- **Unread count badge**: Visual indicator

#### Webhook Integration (n8n)
- **Event Types**:
  - Training completed
  - Deadline approaching
  - Compliance alert
  - User milestone
  - Custom events
- **Configuration**: Leadership can setup webhook URLs
- **Execution Logs**: Track webhook calls and responses
- **Test Mode**: Validate webhook before activation
- **Statistics**: Success/failure rates per webhook

### 9. Administration & Settings

#### User Management (Leadership/Supervisor)
- View all users with filtering
- Assign user roles (Operative, Supervisor, Leadership)
- Assign job roles (organizational position)
- Assign managers (reporting structure)
- Assign teams (department/group)
- Filter by role, job role, team, status
- User profile editing

#### Job Role Management (Leadership)
- **CRUD Operations**: Create, Read, Update, Delete job roles
- **Hierarchical Structure**: 5-level organizational hierarchy
  - Level 5: Director
  - Level 4: Manager
  - Level 3: Supervisor
  - Level 2: Team Leader
  - Level 1: Cleaner/Operative
- **Job Role Fields**:
  - Name (unique)
  - Code (unique identifier)
  - Level (1-5)
  - Department (optional categorization)
  - Reports To (parent job role for hierarchy)
  - Description (role responsibilities)
  - Active status
- **Safety Features**:
  - Cannot delete role assigned to users
  - Cannot delete role with child roles
  - Self-reference prevention
  - Foreign key constraints

#### Team Management (Supervisor/Leadership)
- Create hierarchical team structure
- Assign team leads
- Set team department
- Parent-child team relationships
- Team member assignments
- Team objective alignment

#### Organization Charts
- **Job Role Hierarchy View**: Structural organizational chart based on job roles
  - Shows ideal reporting structure
  - Groups by organizational level
  - Displays employee counts per role
  - Level-based visual indentation (all same-level roles align)
- **Manager Chain View**: Operational chart based on actual managers
  - Shows real reporting relationships
  - Manager-direct report connections
  - Useful for understanding actual management structure
- Tree visualization with expand/collapse
- Employee details on click

#### Company Settings (Leadership)
- Goal review cycle configuration
- Notification defaults
- Security policies
- System-wide preferences

---

## Data Model & Dependencies

### Critical Dependency Order

#### PHASE 1: Foundation (Must Create First)
1. **Job Roles** (`job_roles` table)
   - Base organizational structure
   - Required before assigning users
   - Creates hierarchy (Level 1-5)
   - No dependencies

2. **Users** (`users` table)
   - Requires: Job Roles (optional but recommended)
   - Creates via Replit Auth (automatic on first login)
   - Leadership must assign roles and job roles

3. **Teams** (`teams` table)
   - Requires: Users (for teamLeadId)
   - Can have parent teams (hierarchical)
   - Department categorization

#### PHASE 2: Strategic Objectives
4. **Company Objectives** (`company_objectives` table)
   - Requires: Users (createdBy - Leadership)
   - No other dependencies
   - Top-level strategic goals

5. **Team Objectives** (`team_objectives` table)
   - Requires: Company Objectives (optional parent link)
   - Requires: Users (supervisorId)
   - Requires: Teams (optional teamId)

6. **Individual Goals** (`goals` table)
   - Requires: Users (userId)
   - Requires: Company Objectives or Team Objectives (optional parent)
   - Personal OKRs

#### PHASE 3: Competency Framework
7. **Competency Library** (`competency_library` table)
   - Requires: Users (createdBy - Leadership)
   - Can have parent competencies (hierarchical)
   - Defines organizational competencies

8. **Role-Competency Mappings** (`role_competency_mappings` table)
   - Requires: Competency Library
   - Requires: Job Roles
   - Optional: Teams
   - Maps required competencies to roles

9. **User Competencies** (`user_competencies` table)
   - Requires: Users
   - Requires: Competency Library
   - Tracks individual competency levels

#### PHASE 4: Learning Content (Can be parallel with Phase 3)
10. **Courses** (`courses` table)
    - Requires: None (can create independently)
    - Base course definitions

11. **Course Versions** (`course_versions` table)
    - Requires: Courses
    - Version control for courses

12. **Course Modules** (`course_modules` table)
    - Requires: Course Versions
    - Organizational containers

13. **Lessons** (`lessons` table)
    - Requires: Course Modules
    - Individual learning content

14. **Quizzes** (`quizzes` table)
    - Requires: Lessons
    - Assessment tools

15. **Quiz Questions** (`quiz_questions` table)
    - Requires: Quizzes
    - Actual question content

#### PHASE 5: Learning Paths
16. **Learning Paths** (`learning_paths` table)
    - Requires: None initially
    - Container for learning sequences

17. **Learning Path Steps** (`learning_path_steps` table)
    - Requires: Learning Paths
    - Requires: Courses (references course content)
    - Sequential learning structure

18. **Learning Path Job Roles** (`learning_path_job_roles` table)
    - Requires: Learning Paths
    - Requires: Job Roles
    - Auto-assignment mapping

#### PHASE 6: User Interactions
19. **Enrollments** (`enrollments` table)
    - Requires: Users
    - Requires: Course Versions
    - Course participation

20. **Learning Path Enrollments** (`learning_path_enrollments` table)
    - Requires: Users
    - Requires: Learning Paths
    - Path participation

21. **Lesson Progress** (`lesson_progress` table)
    - Requires: Enrollments
    - Requires: Lessons
    - Completion tracking

22. **Quiz Attempts** (`quiz_attempts` table)
    - Requires: Quizzes
    - Requires: Users
    - Assessment results

#### PHASE 7: Certification & Recognition
23. **Certificates** (`certificates` table)
    - Requires: Users
    - Requires: Course Versions or Learning Path Enrollments
    - Auto-issued on completion

24. **Badges** (`badges` table)
    - Requires: None (system-wide definitions)
    - Achievement types

25. **User Badges** (`user_badges` table)
    - Requires: Users
    - Requires: Badges
    - Achievement awards

26. **Training Records** (`training_records` table)
    - Requires: Users
    - Requires: Enrollments
    - Immutable compliance records

#### PHASE 8: Automation
27. **Automation Rules** (`automation_rules` table)
    - Requires: Leadership user
    - Trigger-based automation

28. **Relative Due Date Configs** (`relative_due_date_configs` table)
    - Requires: Learning Paths
    - Time-based automation

29. **Recurring Assignments** (`recurring_assignments` table)
    - Requires: Learning Paths
    - Periodic automation

### Key Relationships Summary

**Job Roles → Users → Everything Else**
- Job Roles define organizational structure
- Users are assigned to Job Roles
- User actions create all other data

**Learning Content Hierarchy:**
```
Courses
  └── Course Versions
       └── Modules
            └── Lessons
                 └── Quizzes
                      └── Quiz Questions
```

**Learning Paths Hierarchy:**
```
Learning Paths
  ├── Learning Path Steps → (reference Courses)
  ├── Learning Path Job Roles → (reference Job Roles)
  └── Learning Path Enrollments → (reference Users)
```

**Competency Chain:**
```
Competency Library
  ├── Role-Competency Mappings → (reference Job Roles)
  └── User Competencies → (reference Users)
       └── Competency Evidence → (uploaded by Users)
            └── Status History → (audit trail)
```

**Objectives Cascade:**
```
Company Objectives (Leadership)
  ├── Team Objectives (Supervisor)
  │    └── Individual Goals (Operative)
  └── Individual Goals (All users)
```

---

## Setup Flow - What to Create First

### Step 1: Define Organizational Structure (Leadership)

**1.1 Create Job Roles**
- Navigate to: People Management → Job Role Management
- Create roles in order (top to bottom):
  - Level 5: Director
  - Level 4: Manager
  - Level 3: Supervisor
  - Level 2: Team Leader
  - Level 1: Cleaner/Operative
- Set reporting relationships (Reports To field)
- Define departments if applicable

**1.2 Assign Job Roles to Users**
- Navigate to: People Management → User Management
- For each user, assign:
  - User Role (operative/supervisor/leadership)
  - Job Role (organizational position)
  - Manager (direct supervisor)

**1.3 Create Teams**
- Navigate to: People Management → Team Management
- Create hierarchical team structure
- Assign team leads
- Add team members

### Step 2: Build Competency Framework (Leadership)

**2.1 Create Competency Library**
- Navigate to: Talent Development → Competency Management
- Define organizational competencies:
  - Technical skills (equipment operation, cleaning techniques)
  - Behavioral skills (communication, teamwork)
  - Leadership skills (decision-making, conflict resolution)
  - Safety & Compliance (health & safety, ISO procedures)
- Create hierarchical structure (parent-child relationships)
- Define proficiency levels for each competency

**2.2 Map Competencies to Job Roles**
- Still in Competency Management
- For each job role, define:
  - Required competencies
  - Target proficiency levels
  - Priority (Critical/Important/Nice-to-have)
  - Minimum levels for compliance

### Step 3: Create Learning Content (Leadership/Supervisor)

**3.1 Create Courses**
- Navigate to: Learning → Learning Paths (Admin view)
- Create courses:
  - Internal (company-created)
  - External (third-party providers)
- For each course:
  - Add course version
  - Create modules
  - Add lessons with content
  - Create quizzes (optional)
  - Publish course

**3.2 Build Learning Paths**
- Still in Learning Paths
- Create paths:
  - Linear (sequential training)
  - Non-linear (learner choice)
  - Adaptive (AI-driven)
- Add steps to each path
- Set completion criteria
- Assign to job roles for auto-enrollment

### Step 4: Define Strategic Direction (Leadership)

**4.1 Set Company Objectives**
- Navigate to: Company → Company Objectives
- Create top-level strategic goals
- Define key results
- Set timeframes (quarterly/annual)
- Assign target values

**4.2 Cascade to Team Objectives** (Supervisor)
- Navigate to: People Management → Team Objectives
- Link to company objectives
- Define team-specific goals
- Assign key results to team members

### Step 5: Configure Automation (Leadership)

**5.1 Setup Automation Rules**
- Navigate to: Talent Development → Automation Engine
- Create rules:
  - Role-based auto-assignment (new hire training)
  - Gap-based auto-assignment (remedial training)
  - Compliance reminders (certification renewal)
  - Deadline notifications

**5.2 Configure Time-Based Automation**
- Still in Automation Engine
- Set relative due dates for learning paths
- Configure recurring assignments (annual refreshers)
- Define grace periods

**5.3 Setup Webhooks** (Optional)
- Navigate to: Company → Settings → Webhooks
- Configure n8n webhook URLs
- Map event types to webhooks
- Test webhook connections

### Step 6: Enable User Self-Service (All Users)

**6.1 Operatives Can Now:**
- Create personal goals (aligned to team/company objectives)
- Enroll in available courses
- Complete learning paths
- Submit competency evidence
- Log weekly check-ins
- Send peer recognition
- Schedule 1-on-1 meetings

**6.2 Supervisors Can Now:**
- Create team objectives
- Assign learning paths to team
- Verify competency evidence
- Review team progress
- Monitor training compliance

**6.3 Leadership Can Now:**
- Monitor organization-wide metrics
- View compliance dashboards
- Generate ISO audit reports
- Analyze competency gaps across organization
- Adjust strategic objectives based on data

---

## Key Workflows & User Journeys

### Workflow 1: New Employee Onboarding

**Automatic Steps (System):**
1. User logs in via Replit Auth (first time)
2. User record created in database
3. Leadership assigns:
   - User Role (operative)
   - Job Role (e.g., "Cleaner - Contract")
   - Manager (direct supervisor)
   - Team (operational team)
4. **Automation triggers:**
   - Role-based learning paths auto-assigned
   - Required competency list generated
   - Welcome notification sent
   - Relative due dates calculated (e.g., "Complete by Day 30")

**User Steps (New Employee):**
5. Review assigned learning paths
6. Complete mandatory training courses
7. Take quizzes and assessments
8. Upload competency evidence (certifications, completed tasks)
9. Manager verifies evidence
10. Certificates auto-issued upon completion
11. Training records created for compliance

### Workflow 2: Competency Gap Analysis & Remediation

**Step 1: Gap Identification**
1. System compares:
   - User's current competencies vs.
   - Job role required competencies
2. Identifies gaps (competencies below target level)
3. Triggers gap analysis automation

**Step 2: Automatic Remediation**
4. Automation rule activates:
   - Finds learning paths that address gap
   - Auto-enrolls user in remedial training
   - Sets due dates with grace periods
   - Sends notification to user and manager

**Step 3: Progress Monitoring**
5. User completes assigned learning path
6. Takes assessments to demonstrate competency
7. Uploads evidence of new skills
8. Supervisor verifies evidence
9. Competency status updated to "Achieved"
10. Gap closed, status history logged for audit

**Step 4: Continuous Improvement**
11. System re-runs gap analysis
12. If gaps persist, escalate to manager
13. If gaps closed, user progresses to next level

### Workflow 3: Quarterly OKR Cascade

**Q1: Leadership Sets Direction**
1. Leadership creates Company Objectives (Jan 1)
   - Example: "Increase customer satisfaction by 20%"
2. Defines Key Results:
   - "Achieve 95% cleaning quality scores"
   - "Reduce customer complaints by 30%"
   - "Implement new training program"

**Q2: Supervisors Translate to Teams**
3. Supervisors create Team Objectives
   - Links to Company Objective
   - Example: "Area A achieves 95%+ quality scores"
4. Assigns team-specific key results:
   - "100% team completion of quality training"
   - "Zero quality incidents in Q1"

**Q3: Individuals Align Personal Goals**
5. Operatives create personal goals
   - Links to Team Objective
   - Example: "Master advanced cleaning techniques"
6. Sets measurable targets:
   - "Complete Advanced Cleaning course"
   - "Achieve 95%+ on quality assessments"
   - "Zero customer complaints on my sites"

**Q4: Weekly Progress Tracking**
7. Each week, employees:
   - Log check-ins on active goals
   - Update progress percentage
   - Set confidence level (Green/Amber/Red)
   - Note achievements and challenges
8. Supervisors monitor team progress
9. Leadership views org-wide dashboard

**Q5: End of Quarter Review**
10. Goals marked as Completed/Archived
11. Performance data aggregated
12. Competency status updated based on achievements
13. Recognition sent to high performers
14. Next quarter objectives created based on results

### Workflow 4: Learning Path Completion Journey

**Step 1: Enrollment**
1. User browses learning path catalog
2. Selects path (or auto-assigned via automation)
3. Enrollment created with status "Enrolled"
4. Due date calculated (relative or fixed)

**Step 2: Linear Path Progression**
5. User starts Step 1 (must complete in order)
6. Completes lesson/course in step
7. Takes quiz if required (must pass to proceed)
8. Step marked "Completed"
9. Next step unlocks automatically

**Step 3: Non-Linear Path (Choice-Based)**
5. User sees all available steps
6. Chooses learning order based on preference/need
7. Completes steps in any sequence
8. All steps must be completed eventually

**Step 4: Adaptive Path (AI-Driven)**
5. User completes diagnostic assessment
6. System analyzes performance
7. Path adjusts:
   - Skips mastered content
   - Adds remedial modules for weak areas
   - Optimizes difficulty based on learning speed
8. User follows personalized sequence

**Step 5: Completion & Certification**
9. All steps completed (progress = 100%)
10. Final assessment taken (if configured)
11. Certificate auto-generated with:
    - User name
    - Path title
    - Completion date
    - PDF download available
12. Badge awarded (if milestone achieved)
13. Training record created (immutable)
14. Competency status updated
15. User receives completion notification
16. Manager receives team progress update

### Workflow 5: ISO 9001:2015 Compliance Audit

**Preparation Phase:**
1. Navigate to: Analytics & Reports → Compliance Dashboard
2. Review compliance metrics:
   - Training completion rates
   - Competency verification status
   - Evidence documentation coverage
   - Risk assessment matrix (Red/Amber/Green)

**Audit Trail Generation:**
3. Generate audit reports:
   - Competency Status History (who changed what, when, why)
   - Training Records (immutable proof of training)
   - Evidence Records (verified competency proof)
   - Certification History (certificates issued)
4. Export reports as PDF/Excel

**Evidence Retrieval:**
5. For each employee:
   - View competency matrix (current status)
   - Access evidence portfolio (documents, assessments)
   - Review verification history (supervisor approvals)
   - Check training records (course completions)

**Non-Compliance Remediation:**
6. Identify gaps in compliance dashboard
7. System highlights:
   - Missing competencies (red flags)
   - Expired certifications (amber warnings)
   - Overdue training (alerts)
8. Trigger automation to assign remedial training
9. Monitor remediation progress
10. Re-verify compliance status

**Audit Presentation:**
11. Present dashboard to auditor
12. Provide drill-down into specific records
13. Show immutable audit trail
14. Demonstrate closed-loop system (gap → training → verification)

---

## Integration Points

### 1. Replit Authentication (OIDC)
- **What**: User login and session management
- **How**: Replit's built-in OIDC provider
- **User Data**: Email, first name, last name, unique sub ID
- **Session Storage**: PostgreSQL-backed sessions
- **Auto-User Creation**: First login creates user record

### 2. Object Storage (Google Cloud Storage)
- **What**: File uploads and downloads
- **Used For**:
  - Profile images
  - Certificate PDFs
  - Lesson PDFs and documents
  - Badge icons
  - Competency evidence files
- **Upload Flow**: Signed URL generation → Client upload → URL stored in DB
- **Download Flow**: Signed URL retrieval → Client download

### 3. Vimeo Player API
- **What**: Video lesson playback
- **Features**:
  - Embedded video player
  - Progress tracking (watch time)
  - Auto-complete on 90% watched
  - Playback controls

### 4. n8n Webhook Integration
- **What**: External workflow automation
- **Event Types**:
  - Training completed
  - Deadline approaching
  - Compliance alerts
  - User milestones
- **Configuration**: Leadership sets webhook URL per event type
- **Payload**: JSON with event data and user context
- **Use Cases**:
  - Send Slack/Teams notifications
  - Update external HR systems
  - Trigger payroll bonuses
  - Create Jira tickets for non-compliance

### 5. SCORM Package Support
- **What**: Standard e-learning package integration
- **Features**:
  - Upload SCORM zip files
  - Extract and host content
  - Track completion via SCORM API
  - Record scores and attempts

### 6. Rich Text Editor (ReactQuill)
- **What**: Lesson content creation
- **Features**:
  - Formatted text (bold, italic, lists)
  - Embedded images
  - Links and media
  - Code blocks
  - Tables

### 7. Database (Neon PostgreSQL)
- **What**: Serverless PostgreSQL database
- **Features**:
  - Auto-scaling
  - Backup and restore
  - Connection pooling
  - SSL encryption

---

## Dependencies Quick Reference

### "Cannot Create Without First Having..."

| Want to Create | Must First Have |
|---|---|
| Job Roles | Nothing (start here) |
| Users | Job Roles (optional but recommended) |
| Teams | Users (for team lead) |
| Company Objectives | Users (Leadership) |
| Team Objectives | Company Objectives (optional), Users (Supervisor) |
| Individual Goals | Users, Objectives (optional parent) |
| Competency Library | Users (Leadership) |
| Role-Competency Mappings | Competency Library, Job Roles |
| User Competencies | Users, Competency Library |
| Courses | Nothing (independent) |
| Course Versions | Courses |
| Modules | Course Versions |
| Lessons | Modules |
| Quizzes | Lessons |
| Quiz Questions | Quizzes |
| Learning Paths | Nothing (independent) |
| Learning Path Steps | Learning Paths, Courses |
| Learning Path Job Roles | Learning Paths, Job Roles |
| Enrollments | Users, Course Versions |
| Learning Path Enrollments | Users, Learning Paths |
| Lesson Progress | Enrollments, Lessons |
| Quiz Attempts | Quizzes, Users |
| Certificates | Users, Enrollments or Path Enrollments |
| Badges | Nothing (system-wide) |
| User Badges | Users, Badges |
| Training Records | Users, Enrollments |
| Automation Rules | Users (Leadership) |
| Relative Due Dates | Learning Paths |
| Recurring Assignments | Learning Paths |
| Competency Evidence | Users, Competency Library |
| Status History | User Competencies |

---

## Summary: The Complete Flow

### 1. Foundation Setup (Leadership - Day 1)
- Create job roles (organizational structure)
- Assign users to roles
- Create teams and assign members

### 2. Strategic Planning (Leadership - Day 2-3)
- Define company objectives (strategic goals)
- Build competency library (skills framework)
- Map competencies to job roles

### 3. Content Creation (Leadership/Supervisor - Week 1)
- Create courses and lessons
- Build learning paths
- Assign paths to job roles

### 4. Automation Configuration (Leadership - Week 2)
- Setup automation rules
- Configure time-based automation
- Connect webhooks (optional)

### 5. User Onboarding (Ongoing)
- New users auto-enrolled in required training
- Competency gaps identified automatically
- Remedial training assigned via automation

### 6. Continuous Operation (Daily/Weekly)
- Users complete learning paths
- Weekly check-ins on goals
- Competency evidence submitted and verified
- Certificates auto-issued
- Reports generated for compliance

### 7. Quarterly Reviews (Every 3 Months)
- Review OKR achievement
- Update company objectives
- Cascade new goals to teams and individuals
- Analyze competency progress
- Adjust automation rules based on insights

---

**This documentation covers the complete Apex platform. Every feature, connection, dependency, and workflow is included. Use this as your comprehensive reference guide for understanding and operating the system.**
