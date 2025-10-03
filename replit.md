# Overview

Apex is a Performance & Development Platform designed for cleaning companies to integrate Personal Development Plans (PDPs) with Objectives and Key Results (OKR) in a simple, mobile-first application. The platform targets cleaning operatives, area supervisors, and senior leadership, focusing on goal alignment from the company level down to individual objectives. Key capabilities include a Learning Management System (LMS), robust Job Role Normalization, comprehensive Organizational Charts, and a full suite of people management tools.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **React + TypeScript**: Single-page application using functional components and hooks.
- **Vite**: Build tool and development server.
- **Tailwind CSS + shadcn/ui**: Utility-first CSS framework with a pre-built component library for a mobile-first, responsive design.
- **React Query**: Client-side state management and server synchronization.
- **Wouter**: Lightweight client-side routing.

## Backend Architecture
- **Express.js**: Node.js web framework handling API routes and middleware.
- **TypeScript**: Type-safe server-side development.
- **Session-based Authentication**: Utilizes Replit's OIDC authentication system.
- **RESTful API**: Standard HTTP methods for CRUD operations.
- **Middleware Pattern**: For request logging, error handling, and authentication checks.

## Database Design
- **PostgreSQL**: Primary database using Neon serverless PostgreSQL.
- **Drizzle ORM**: Type-safe database access with a schema-first approach.
- **Shared Schema**: Common type definitions between client and server.
- **Session Storage**: Database-backed session management.
- **LMS Schema**: Comprehensive tables for courses, modules, lessons, enrollments, progress tracking, quizzes, certificates, badges, training records, and PDP integration.

## Core Data Models
- **Users**: Role-based (operative, supervisor, leadership) with hierarchical relationships and job role assignments.
- **Job Roles**: Normalized table with hierarchical structure (level 1-5), department categorization, and reporting relationships.
- **Team Membership**: Many-to-many relationship via `team_members` junction table. Users can belong to multiple teams with different roles (Lead/Member/Viewer) and one designated primary team. System enforces: minimum 1 team per user, exactly 1 primary team, no duplicates. All operations are transactional to maintain invariants.
- **Team Objectives**: Fully normalized with `teamId` foreign key to teams table. Forms use dropdown selection instead of free-text entry. Team names displayed via lookup/join. Deprecated `teamName` column removed (Oct 2025).
- **Company Objectives**: Top-level strategic goals with key results.
- **Goals**: Individual and team goals linked to company objectives.
- **Development Plans**: Personal development tracking with competencies.
- **LMS System**: Covers courses, modules, lessons, enrollments, progress, quizzes, assessments, certificates, badges, and compliance.

## Authentication & Authorization
- **Replit Auth Integration**: OIDC-based authentication.
- **Role-based Access**: Three-tier system (operative, supervisor, leadership).
- **Session Management**: PostgreSQL-backed sessions.
- **Route Protection**: Middleware-based authentication on API endpoints.

## Key Features
- **Goal Cascading**: Visual hierarchy showing alignment from company to individual goals.
- **Weekly Progress Tracking**: Regular check-ins.
- **Development Planning**: Competency-based skill tracking.
- **Recognition System**: Peer recognition aligned with company values.
- **Meeting Management**: Structured 1-on-1 meetings.
- **Dashboard Analytics**: Progress visualization and performance metrics.
- **Dual Org Charts**: View organization structure from both job role hierarchy (structural) and manager chain (actual reporting) perspectives.
- **Enhanced Key Results System**: ISO 9001:2015-compliant OKR tracking with metric types (percentage, numeric, currency, boolean), confidence scoring, and immutable progress audit trails.

## ISO 9001:2015 Compliance Features (Phase 1 - October 2025)

### Enhanced Key Results Tracking
The platform now includes comprehensive key results management aligned with ISO 9001:2015 requirements for quality objectives and performance monitoring:

**Metric Types**: Support for four measurement types:
- **Percentage**: Progress tracked as percentages (e.g., market share growth from 15% to 25%)
- **Numeric**: Count-based metrics (e.g., customer acquisitions, project completions)
- **Currency**: Financial targets (e.g., revenue goals, cost reductions)
- **Boolean**: Binary completion status (e.g., certification achieved, system deployed)

**Confidence Scoring**: Three-tier confidence assessment updated during weekly check-ins:
- **Low (0-39%)**: At-risk objectives requiring immediate attention
- **Medium (40-79%)**: On-track with some concerns
- **High (80-100%)**: Strong confidence in achieving target

**Immutable Progress Audit Trail**: The `krProgressUpdates` table provides complete historical tracking:
- Time-stamped progress entries (previousValue, newValue, updatedAt, updatedBy)
- Confidence level changes with timestamps
- Contextual notes for each update
- Permanent record supporting ISO 9001 Clause 7.5 (documented information) and 9.1 (monitoring requirements)

**Technical Implementation**:
- **Database Schema**: Enhanced `keyResults` and `teamKeyResults` tables with metricType enum, startValue, targetValue, confidenceScore, lastConfidenceUpdate fields
- **Storage Layer**: Six new storage methods for KR CRUD operations and progress tracking
- **REST API**: Comprehensive endpoints for key results management, progress updates, and history retrieval
- **Frontend Components**: 
  - `KeyResultCard`: Visual progress display with metric type badges, progress bars, and confidence indicators
  - `KeyResultProgressDialog`: Weekly check-in interface with progress history timeline
  - Integrated into `CompanyObjectives` and `TeamObjectives` with expand/collapse functionality
- **Cache Strategy**: React Query invalidation across multiple query keys ensures immediate UI refresh after progress updates

**Compliance Alignment**:
- ISO 9001 Clause 6.2: Quality objectives planning and tracking
- ISO 9001 Clause 9.1: Performance monitoring and measurement
- ISO 9001 Clause 9.3: Management review data requirements
- ISO 9001 Clause 7.5: Documented information retention

### Strategic Classification & Risk Management (Phase 3 - October 2025)

Phase 3 enhances objectives with strategic planning and risk-based thinking capabilities aligned with ISO 9001:2015 requirements:

**Strategic Themes**: Five-category classification system for strategic alignment:
- **Quality Excellence**: Quality improvement and customer satisfaction initiatives
- **Operational Excellence**: Process efficiency and operational improvement
- **Customer Satisfaction**: Customer-focused objectives and service delivery
- **Innovation & Growth**: Innovation, new capabilities, and market expansion
- **Financial Performance**: Revenue growth, cost optimization, and financial targets

**Risk Management**: Four-tier risk assessment with visual indicators:
- **🟢 Low Risk**: Minimal obstacles, high probability of success
- **🟡 Medium Risk**: Some obstacles likely, standard monitoring needed
- **🟠 High Risk**: Significant barriers present, mitigation required
- **🔴 Critical Risk**: Severe impediments, intensive management needed

**Risk Mitigation Planning**: Free-text field for documenting risk mitigation strategies and contingency plans.

**Dependencies Tracking**: Array field for recording objective dependencies (visualization deferred to future phase).

**Technical Implementation**:
- **Database Schema**: Added `strategicTheme` and `riskLevel` enum columns to `companyObjectives` and `teamObjectives` tables with optional (nullable) constraints
- **Form Components**: Integrated Select dropdowns with proper undefined/null handling using `?? undefined` pattern to prevent controlled component warnings
- **Visual Indicators**: Color-coded badges display strategic themes and risk levels on objective cards
- **Edit Workflows**: Fixed form reset logic to preserve null/undefined enum values and server-side date conversion for ISO string compatibility
- **Data Persistence**: Server PUT routes properly convert ISO date strings to Date objects before Drizzle persistence

**Compliance Alignment**:
- ISO 9001 Clause 6.1: Risk-based thinking and opportunity identification
- ISO 9001 Clause 6.2.1: Strategic direction and context of organization
- ISO 9001 Clause 4.1: Understanding organizational context
- ISO 9001 Clause 10.2: Nonconformity and corrective action planning

**Known Considerations**:
- Optional enum fields properly handle undefined/null states throughout create/edit workflows
- Dependencies array field exists in schema but visualization component deferred to future enhancement
- Stale form state under rapid edits identified as non-blocking edge case for monitoring

## Organizational Structure
The platform implements a normalized job role architecture with a `job_roles` table for hierarchical structure (levels 1-5), department categorization, and reporting relationships.
- **Job Role Hierarchy (Structural View)**: Shows the ideal organizational structure based on job roles, grouped by hierarchical level.
- **Manager Chain (Operational View)**: Shows actual reporting relationships between people based on the `users.managerId` field.
- **UI Components**: `Organization.tsx` provides a tabbed interface for both org charts with recursive tree components. `JobRoleManagement.tsx` offers full CRUD for job roles with validation and safety checks.

# External Dependencies

## Database Services
- **Neon Database**: Serverless PostgreSQL hosting.
- **connect-pg-simple**: PostgreSQL session store for Express sessions.

## Authentication
- **Replit OIDC**: Authentication provider.
- **Passport.js**: Authentication middleware.

## Frontend Libraries
- **@tanstack/react-query**: Server state management and caching.
- **@radix-ui**: Accessible component primitives.
- **Lucide React**: Icon library.
- **React Hook Form**: Form handling with validation.
- **date-fns**: Date manipulation and formatting.

## Development Tools
- **Vite**: Build tool.
- **ESBuild**: Fast JavaScript bundler.
- **TypeScript**: Type checking and compilation.
- **Tailwind CSS**: Utility-first styling framework.
- **PostCSS**: CSS processing.

## Database & ORM
- **Drizzle Kit**: Database migrations and schema management.
- **@neondatabase/serverless**: Neon database driver.
- **drizzle-zod**: Type-safe schema validation.

## Integrations
- **Vimeo**: Comprehensive video integration with support for privacy-enabled videos.