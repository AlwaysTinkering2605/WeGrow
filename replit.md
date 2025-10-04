# Overview

Apex is a mobile-first Performance & Development Platform for cleaning companies, integrating Personal Development Plans (PDPs) with Objectives and Key Results (OKR). It targets cleaning operatives, area supervisors, and senior leadership, ensuring goal alignment from company to individual levels. Key features include an LMS, Job Role Normalization, Organizational Charts, and comprehensive people management tools, all designed to meet ISO 9001:2015 compliance for quality objectives and performance monitoring.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## UI/UX Decisions
- **Mobile-first, Responsive Design**: Utilizes Tailwind CSS and shadcn/ui for a utility-first approach and pre-built components.
- **Visual Goal Cascading**: Hierarchy from company to individual goals.
- **Dual Organizational Charts**: Structural (job role hierarchy) and operational (manager chain) views.
- **Enhanced Key Results UI**: Visual progress display with metric type badges, progress bars, and confidence indicators.
- **Strategic Classification & Risk Management Visuals**: Color-coded badges for strategic themes and risk levels.

## Technical Implementations
- **Frontend**: React with TypeScript, Vite, React Query for state management, and Wouter for routing.
- **Backend**: Express.js with TypeScript, RESTful API, and middleware for logging, error handling, and authentication.
- **Database**: PostgreSQL (Neon serverless) with Drizzle ORM for type-safe access. Uses a shared schema between client and server.
- **Authentication**: Session-based, integrated with Replit's OIDC, and role-based access control (operative, supervisor, leadership).

## Feature Specifications
- **Goal Management**: Company, team, and individual objectives with ISO 9001:2015 compliant Key Results (percentage, numeric, currency, boolean metrics), confidence scoring, and immutable progress audit trails.
- **Development & Performance**: Weekly progress tracking, competency-based development planning, recognition system, 1-on-1 meeting management, and dashboard analytics.
- **Organizational Structure**: Normalized `job_roles` for hierarchical structure (levels 1-5) and `users.managerId` for direct reporting lines.
- **Skill Taxonomy**: Fully normalized skill category types system with `skill_category_types` table (FK reference) replacing enum-based types. Provides dynamic CRUD management for category type taxonomy (Technical Skills, Soft Skills, Safety & Compliance, Leadership, Customer Service, Equipment Operations). Ensures referential integrity across competencies, courses, and learning paths.
- **Proficiency Levels**: Fully normalized proficiency levels system with `proficiency_levels` table providing standardized skill mastery levels (Foundation, Developing, Competent, Proficient, Expert). Each level includes name, code, description, numeric value (1-10 scale), and sort order. Leadership-only CRUD management UI located under Talent Development menu. Enables consistent competency assessment across all users and roles. Optional color field available in schema for future UI enhancements.
- **Granular Skills System**: Comprehensive skills management with `skills`, `lesson_skills`, and `competency_skills` tables supporting fine-grained skill tracking (e.g., vacuuming, mopping, toilet cleaning). Skills automatically generate code identifiers from names (e.g., "Window Cleaning" → "window_cleaning"). Supports optional target proficiency levels, category-based organization, and soft-delete via isActive flag. Junction tables enable many-to-many relationships between lessons/competencies and skills. Leadership-only CRUD management UI with category filtering located under Talent Development menu. Architecture: Learning Path → Competency → Course → Lesson → Skills.
  - **Lesson-Skills Management**: Dedicated UI for assigning/removing skills from lessons via "Manage Skills" button with dialog interface. Full E2E tested workflow for skill assignment.
  - **Competency Skills Aggregation**: Backend API (`/api/competencies/:competencyId/skills/aggregated`) that aggregates both directly assigned skills and lesson-derived skills. Uses category-based join (competency.categoryId = course.categoryId) to link competencies with relevant courses, then aggregates all skills taught in those courses' lessons. Provides deduplication, source tracking ("direct" | "lesson"), and metadata for course/lesson provenance. Enables comprehensive skill visibility across the learning hierarchy.
- **LMS**: Comprehensive system for courses, modules, lessons, enrollments, progress tracking, quizzes, certificates, badges, and compliance training.
- **Strategic Planning**: Objectives classified by strategic themes (Quality Excellence, Operational Excellence, Customer Satisfaction, Innovation & Growth, Financial Performance) and a four-tier risk management system with mitigation planning.
- **Audit & Evidence Management**: Immutable audit logs for objective and key result changes, and a centralized evidence repository (documents, images, reports) with verification workflow and object storage integration for ISO 9001 Clause 7.5 compliance.

# External Dependencies

## Database Services
- **Neon Database**: Serverless PostgreSQL.
- **connect-pg-simple**: PostgreSQL session store.

## Authentication
- **Replit OIDC**: Authentication provider.
- **Passport.js**: Authentication middleware.

## Frontend Libraries
- **@tanstack/react-query**: Server state management.
- **@radix-ui**: Accessible component primitives.
- **Lucide React**: Icon library.
- **React Hook Form**: Form handling.
- **date-fns**: Date manipulation.

## Development Tools
- **Vite**: Build tool.
- **ESBuild**: JavaScript bundler.
- **TypeScript**: Type checking.
- **Tailwind CSS**: Styling framework.
- **PostCSS**: CSS processing.

## Database & ORM
- **Drizzle Kit**: Database migrations.
- **@neondatabase/serverless**: Neon database driver.
- **drizzle-zod**: Type-safe schema validation.

## Integrations
- **Vimeo**: Video integration.