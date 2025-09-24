# Replit.md

## Overview

RentalHome (렌탈홈) is a Korean appliance rental platform that allows users to browse, search, and rent household appliances. The application features AI-powered product recommendations using Google Gemini, user authentication via Replit Auth, and a modern React frontend built with TypeScript and Tailwind CSS. Users can explore product categories, view detailed product information, manage rental agreements, and interact with an AI chatbot for personalized recommendations.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The client is built as a React Single Page Application (SPA) using:
- **TypeScript** for type safety and better development experience
- **Wouter** for lightweight client-side routing instead of React Router
- **TanStack React Query** for server state management and caching
- **Tailwind CSS** with shadcn/ui components for consistent, accessible UI design
- **Vite** as the build tool and development server

The frontend follows a component-based architecture with:
- Pages for different routes (home, products, chat, etc.)
- Reusable UI components built on Radix UI primitives
- Custom hooks for authentication and mobile detection
- Centralized API request handling with error management

### Backend Architecture
The server is built with:
- **Express.js** as the web framework
- **TypeScript** for consistency with the frontend
- **Drizzle ORM** for database operations with PostgreSQL
- **Neon Database** as the PostgreSQL provider
- **Express Session** with PostgreSQL store for session management

The backend uses a layered architecture:
- **Routes layer** handles HTTP requests and responses
- **Storage layer** abstracts database operations
- **Service layer** contains business logic for AI interactions

### Authentication & Authorization
- **Replit Auth** integrated via OpenID Connect for user authentication
- **Passport.js** middleware for authentication strategy
- **Express Session** for maintaining user sessions
- Session data stored in PostgreSQL for persistence

### Database Design
PostgreSQL database with Drizzle ORM using these core entities:
- **Users** - stores user profile information from Replit Auth
- **Categories** - product categories with Korean/English names and icons
- **Products** - appliance details including pricing, descriptions, and images
- **Rentals** - tracks rental agreements between users and products
- **Wishlist** - user's saved products for future consideration
- **ChatMessages** - stores AI conversation history
- **Sessions** - authentication session storage

### AI Integration
- **Google Gemini API** for generating product recommendations and chat responses
- **Structured prompts** in Korean for localized AI interactions
- **JSON schema validation** for consistent AI response format
- **Contextual recommendations** based on user preferences and rental history

### State Management
- **React Query** handles server state, caching, and background updates
- **React hooks** manage local component state
- **Session storage** maintains authentication state
- **Optimistic updates** for improved user experience

### Mobile-First Design
- **Responsive design** with mobile and desktop navigation patterns
- **Touch-friendly interfaces** with appropriate sizing
- **Progressive enhancement** ensuring functionality across devices
- **Mobile-specific components** like bottom navigation bar

## External Dependencies

### Database & Storage
- **Neon Database** - Serverless PostgreSQL hosting
- **Drizzle ORM** - Type-safe database toolkit
- **connect-pg-simple** - PostgreSQL session store

### Authentication
- **Replit Auth** - OAuth 2.0 / OpenID Connect provider
- **Passport.js** - Authentication middleware
- **openid-client** - OpenID Connect client library

### AI Services
- **Google Gemini API** - Large language model for recommendations and chat
- **@google/genai** - Official Google AI SDK

### Frontend Libraries
- **React** - UI library with TypeScript support
- **Wouter** - Lightweight routing library
- **TanStack React Query** - Server state management
- **Tailwind CSS** - Utility-first CSS framework
- **Radix UI** - Headless UI component primitives
- **shadcn/ui** - Pre-built component library

### Development Tools
- **Vite** - Fast build tool and development server
- **TypeScript** - Static type checking
- **ESBuild** - JavaScript bundler for production
- **PostCSS** - CSS processing with Autoprefixer

### Third-Party Integrations
- **Lucide Icons** - Icon library for consistent iconography
- **React Hook Form** - Form state management and validation
- **Zod** - Schema validation for type safety
- **date-fns** - Date manipulation utilities