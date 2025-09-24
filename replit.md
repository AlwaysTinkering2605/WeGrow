# Overview

Apex is a Performance & Development Platform designed for cleaning companies to integrate Personal Development Plans (PDPs) with Objectives and Key Results (OKR) in a simple, mobile-first application. The platform targets three user types: cleaning operatives, area supervisors, and senior leadership, with a focus on goal alignment from company level down to individual objectives.

**Recent LMS Implementation (Sept 24, 2025)**: Successfully completed Phase 1 ApexLMS with comprehensive Learning Management System featuring advanced learning paths, training matrix integration, auto-certification system, real-time data sync, and closed-loop integration. All deliverables architect-approved and meet ISO 9001:2015 Clause 7.2 compliance requirements for competence management.

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
- **Users**: Role-based (operative, supervisor, leadership) with hierarchical relationships
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