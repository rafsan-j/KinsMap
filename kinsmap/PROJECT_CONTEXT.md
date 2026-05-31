---
# KinsMap — Project Master Context
This file must be attached to every Cursor chat session for this project.

## What We Are Building
KinsMap is a private, invitation-only family pedigree web application.
Stack: React + Vite (frontend), Supabase (PostgreSQL database + auth + storage), deployed on Vercel.
Budget: $0. Only free tiers.

## Core Architecture
- Every person is a Node with a UUID. No one manually types IDs.
- Relationships are defined ONLY by father_id and mother_id on the persons table.
- Marriages are stored in a separate unions table.
- The app renders a Focus Node UI — one person at the center, connections shown around them.
- Clicking a node recenters the graph on that person.

## Database: Supabase
- Project URL and anon key will be in .env file as VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
- We use Row Level Security (RLS) on all tables.
- Soft delete only — never physically delete rows. Use is_deleted boolean.
- All writes log to an audit_log table.

## Key Tables
- trees: The family workspace
- persons: Every human node (father_id, mother_id nullable = root node)
- unions: Every marriage/partnership between two persons
- tree_members: Links a Supabase auth user to a person node + role
- audit_log: Immutable history of every change

## Person Node Fields (important ones)
- id (UUID), tree_id, first_name, last_name, birth_name (maiden), nickname
- gender ENUM: male/female/other/unspecified
- birth_date, death_date, is_alive (boolean)
- birth_date_approx, death_date_approx (boolean — for uncertain dates)
- father_id, mother_id (UUID FK to persons, nullable)
- father_rel_type, mother_rel_type ENUM: biological/adoptive/step
- profile_picture_url (Supabase storage path)
- phone, address_line, city, country
- current_occupation JSONB (dynamic sub-fields based on category)
- education_history JSONB array (list of education records — always optional, always shown)
- notes TEXT
- is_deleted boolean default false
- created_by, last_updated_by (UUID FK to auth.users)

## Education History (JSONB array structure)
Each item: { level, institution_name, department, session, start_year, end_year, degree, is_ongoing }
Levels: school, college, university, madrasa, vocational, other
Always skippable. Not tied to current occupation. Anyone can have any number of entries.

## Current Occupation (JSONB object structure)
{ category, ...dynamic sub-fields based on category }
Categories: student, professional, business, homemaker, retired, unemployed, child
Each category unlocks different sub-fields in the form.

## Roles
owner > admin > contributor > viewer
Viewer can only edit their own linked person node.

## Visual Graph
Library: React Flow
Male nodes: rectangular cards
Female nodes: rounded rectangle cards
Deceased: greyed with memorial icon
Solid line: biological parent link
Dashed line: adoptive/step link
Double horizontal bar: active union
Single dashed bar: divorced union

## Phases (build in this order, do not skip)
Phase 1: Supabase schema + React/Vite scaffold + basic person CRUD + photo upload
Phase 2: Relationship engine + graph visualization + search
Phase 3: Auth + invite system + roles + RLS
Phase 4: Events dashboard + flashcard game
Phase 5: Export, notifications, polish
---
