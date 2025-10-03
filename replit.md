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