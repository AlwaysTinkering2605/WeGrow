# Overview

Apex is a Performance & Development Platform designed for cleaning companies to integrate Personal Development Plans (PDPs) with Objectives and Key Results (OKR) in a simple, mobile-first application. The platform targets three user types: cleaning operatives, area supervisors, and senior leadership, with a focus on goal alignment from company level down to individual objectives.

**Recent LMS Implementation (Sept 24, 2025)**: Successfully completed Phase 1 ApexLMS with comprehensive Learning Management System featuring advanced learning paths, training matrix integration, auto-certification system, real-time data sync, and closed-loop integration. All deliverables architect-approved and meet ISO 9001:2015 Clause 7.2 compliance requirements for competence management.

**Job Role Normalization & Org Charts (Oct 1, 2025)**: Implemented normalized job role architecture with proper referential integrity, foreign key constraints, and dual organizational chart views. Completed full-stack implementation including backend validation, deletion safety checks, and comprehensive UI with both structural (job role hierarchy) and operational (manager chain) org chart views. Added nested tree view components for hierarchical org chart visualization with expand/collapse functionality.

**Profile Edit Security Fix (Oct 1, 2025)**: Fixed critical bug where Profile edit dialog included "User Role" field that was clearing user's system role on save. Profile edit now only contains personal information fields (name, phone, title, image). Role assignment is exclusively in User Management for leadership users.

**Job Role Management UI (Oct 2, 2025)**: Implemented comprehensive Job Role Management interface for leadership users with full CRUD functionality. Features include searchable table view, create/edit dialogs with type-safe form validation, delete confirmation with safety checks, and seamless integration with User Management filters. Supports hierarchical role structure with parent role selection and proper validation of organizational reporting relationships.

**Org Chart Visual Enhancement (Oct 2, 2025)**: Updated job role hierarchy visualization to use level-based indentation instead of tree-depth indentation. All roles with the same organizational level (1-5) now align vertically regardless of parent-child relationships, making the hierarchy clearer and more consistent.

**Vimeo Integration & Privacy Video Support (Oct 2-3, 2025)**: Implemented comprehensive Vimeo URL extraction utility with support for 10+ URL patterns including privacy-enabled sharing links. The `extractVimeoVideoId()` function normalizes all Vimeo URL formats and preserves privacy hashes in "ID/hash" format for privacy-enabled videos (e.g., "1119689619/3217accce7"). Supports path-based privacy (`vimeo.com/ID/hash?share=copy`), query-based privacy (`vimeo.com/ID?h=hash`), player embeds, channels, groups, albums, showcases, and direct video links. VimeoPlayer component now detects privacy format and loads videos correctly: privacy videos load via full URL (`https://vimeo.com/ID/hash`), public videos load via numeric ID. Applied to all course/lesson form submission handlers with end-to-end testing confirming successful privacy video playback. Fixed critical bug in `apiRequest()` function where incorrect calling pattern caused HTML error pages. Added vimeo_video_id column to courses and lessons tables with full backend persistence support.

**Department Normalization (Oct 3, 2025)**: Completed comprehensive database normalization of department taxonomy into single source of truth. Created normalized `departments` table with proper UUID primary keys, sort ordering, and active status tracking. Migrated all existing data from varchar department fields to departmentId foreign keys across job_roles, teams, competencies, and learningInsights tables. Implemented full backend CRUD API at `/api/departments` with leadership authorization, usage validation before deletion, and proper 404 handling. Updated JobRoleManagement and TeamManagement frontend components with department Select dropdowns consuming departments API, proper sentinel value handling ("none" → undefined/null normalization), and department name display via lookup. Created comprehensive Department Management UI at `/departments` for leadership users with full CRUD functionality: searchable table view, create/edit dialogs with form validation, delete confirmation with usage checks, sort order management, and active/inactive status toggling. Seeded 7 departments: Operations, Quality & Operations, Administration, Human Resources, Sales & Business Development, Finance, Quality Ops. End-to-end testing verified job roles, teams, and departments can be created/edited with proper data persistence and referential integrity.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **React + TypeScript**: Single-page application using functional components and hooks
- **Vite**: Build tool and development server for fast development experience
- **Tailwind CSS + shadcn/ui**: Utility-first CSS framework with pre-built component library
- **Mobile-First Design**: Responsive design prioritizing mobile experience with touch-friendly interfaces
- **React Query**: Client-side state management and server synchronization
- **Wouter**: Lightweight client-side routing

## Backend Architecture
- **Express.js**: Node.js web framework handling API routes and middleware
- **TypeScript**: Type-safe server-side development
- **Session-based Authentication**: Using Replit's OIDC authentication system
- **RESTful API**: Standard HTTP methods for CRUD operations on goals, check-ins, development plans, etc.
- **Middleware Pattern**: Request logging, error handling, and authentication checks

## Database Design
- **PostgreSQL**: Primary database using Neon serverless PostgreSQL
- **Drizzle ORM**: Type-safe database access with schema-first approach
- **Shared Schema**: Common type definitions between client and server in `/shared/schema.ts`
- **Session Storage**: Database-backed session management for authentication
- **LMS Schema**: 14 comprehensive tables for courses, modules, lessons, enrollments, progress tracking, quizzes, certificates, badges, training records, and PDP integration

## Core Data Models
- **Users**: Role-based (operative, supervisor, leadership) with hierarchical relationships and job role assignments
- **Job Roles**: Normalized table with hierarchical structure (level 1-5), department categorization, and reporting relationships
- **Learning Path Job Roles**: Many-to-many junction table linking learning paths to job roles for targeted training
- **Company Objectives**: Top-level strategic goals with key results
- **Goals**: Individual and team goals linked to company objectives
- **Weekly Check-ins**: Progress tracking with confidence levels and achievements
- **Development Plans**: Personal development tracking with competencies
- **Recognition System**: Peer recognition tied to company values
- **Meeting Management**: 1-on-1 meeting scheduling and notes
- **LMS System**: Courses, modules, lessons, enrollments, progress tracking, quizzes, assessments, certificates, badges, training records, and compliance tracking

## Authentication & Authorization
- **Replit Auth Integration**: OIDC-based authentication using Replit's identity provider
- **Role-based Access**: Three-tier system (operative, supervisor, leadership)
- **Session Management**: PostgreSQL-backed sessions with connect-pg-simple
- **Route Protection**: Middleware-based authentication checks on API endpoints

## Key Features
- **Goal Cascading**: Visual hierarchy showing alignment from company to individual goals
- **Weekly Progress Tracking**: Regular check-ins with confidence indicators
- **Development Planning**: Competency-based skill tracking and resource recommendations
- **Recognition System**: Peer recognition aligned with company values
- **Meeting Management**: Structured 1-on-1 meetings with agenda and action items
- **Dashboard Analytics**: Progress visualization and performance metrics
- **Dual Org Charts**: View organization structure from both job role hierarchy (structural/ideal) and manager chain (actual reporting) perspectives

## Organizational Structure

### Job Role Hierarchy
The platform implements a normalized job role architecture with proper relational database design:

**Database Schema:**
- `job_roles` table: Master data for organizational job roles with hierarchical structure
  - Unique ID, name, and code for each role
  - Hierarchical level (1-5): Entry level to Director
  - Optional department categorization
  - Self-referencing FK `reportsToJobRoleId` for structural hierarchy
  - Foreign key constraints with ON DELETE SET NULL for data safety
  - Performance indexes on FK columns and level field

- `users.jobRoleId`: Foreign key to job_roles table
  - Links each user to their assigned job role
  - Replaces deprecated enum-based `job_role` field
  - FK constraint ensures referential integrity

- `learning_path_job_roles`: Many-to-many junction table
  - Links learning paths to specific job roles
  - Enables role-based training requirements
  - Supports targeted competency development

**Current Job Roles (8 roles across 5 levels):**
- Level 5: Director (1 user)
- Level 4: Manager (4 users)
- Level 3: Supervisor (10 users)
- Level 2: Team Leader (Contract), Team Leader (Specialised) (25 users total)
- Level 1: Cleaner (Contract), Cleaner (Specialised), Mobile Cleaner (140 users total)

**API Endpoints:**
- `GET /api/job-roles` - List all active job roles
- `GET /api/job-roles/:id` - Get specific job role details
- `POST /api/job-roles` - Create new job role (leadership only, with Zod validation)
- `PUT /api/job-roles/:id` - Update job role (leadership only, with self-reference prevention)
- `DELETE /api/job-roles/:id` - Soft delete with safety checks (prevents deletion if role is in use or has child roles)
- `GET /api/org-chart/job-roles` - Get job role organizational chart (supervisor/leadership)
- `GET /api/org-chart/managers` - Get manager chain organizational chart (supervisor/leadership)

**Safety Features:**
- Zod validation on all create/update operations
- Self-reference prevention (role cannot report to itself)
- Deletion safety checks (prevents orphaned users and broken hierarchies)
- Foreign key constraints with proper ON DELETE behavior
- Performance indexes for efficient queries

### Dual Organizational Charts

**1. Job Role Hierarchy (Structural View)**
- Shows the ideal organizational structure based on job roles
- Groups roles by hierarchical level (5 to 1)
- Displays employee counts and individual employees per role
- Shows reporting relationships between job roles
- Accessed via `/organization` page under People Management

**2. Manager Chain (Operational View)**
- Shows actual reporting relationships between people
- Based on users.managerId field
- Displays direct reports for each manager
- Shows real manager names and contact information
- Useful for understanding actual operational reporting structure

**UI Components:**
- `Organization.tsx`: Tabbed interface for viewing both org charts with hierarchical tree views
- `TreeNode.tsx`: Reusable recursive tree component with expand/collapse (default: first 2 levels)
  - Supports unlimited nesting, badges, subtitles, counts, and click handlers
  - Level-based indentation and styling
- `JobRoleManagement.tsx`: Leadership interface for managing job roles (create, edit, delete)
  - Type-safe form handling with extended schema supporting 'none' sentinel for optional parent roles
  - Search/filter functionality across name, code, and department
  - Deletion safety checks prevent removing roles with assigned users or child roles
  - All interactive elements include data-testid attributes for testing
- `UserManagement.tsx`: Leadership interface for assigning job roles and managers to users
- Integrated into People Management dropdown in main navigation
- Role-based access control (supervisor and leadership only)
- Responsive layout with employee details
- Real-time data fetching via React Query

# External Dependencies

## Database Services
- **Neon Database**: Serverless PostgreSQL hosting
- **connect-pg-simple**: PostgreSQL session store for Express sessions

## Authentication
- **Replit OIDC**: Authentication provider for user login and session management
- **Passport.js**: Authentication middleware for session handling

## Frontend Libraries
- **@tanstack/react-query**: Server state management and caching
- **@radix-ui**: Accessible component primitives for shadcn/ui
- **Lucide React**: Icon library for consistent UI elements
- **React Hook Form**: Form handling with validation
- **date-fns**: Date manipulation and formatting

## Development Tools
- **Vite**: Build tool with hot module replacement
- **ESBuild**: Fast JavaScript bundler for production builds
- **TypeScript**: Type checking and compilation
- **Tailwind CSS**: Utility-first styling framework
- **PostCSS**: CSS processing with autoprefixer

## Database & ORM
- **Drizzle Kit**: Database migrations and schema management
- **@neondatabase/serverless**: Neon database driver with WebSocket support
- **drizzle-zod**: Type-safe schema validation