# Database Schema Documentation

This document describes the Supabase database structure for coding agents. Use this reference when interacting with the database.

---

## Connection Setup

### Environment Variables
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

### Client Initialization (TypeScript)
```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)
```

---

## Tables Overview

| Table | Purpose |
|-------|---------|
| Actions | Action items extracted from meetings |
| Companies | Company/organization entities |
| People | Personnel within companies |
| RawTranskripts | Raw transcript text data |

---

## Actions Table

Action items tied to meetings and optionally to projects.

### Schema

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | NO | `gen_random_uuid()` | Primary key |
| `meeting_id` | `smallint` | NO | - | Reference to meeting |
| `project_id` | `smallint` | YES | - | Reference to project (optional) |
| `description` | `text` | YES | - | Action item description |
| `assigned_to_department` | `text` | YES | - | Department name assigned |
| `assigned_to_person` | `text` | YES | - | Person name assigned |
| `sequence` | `text` | YES | - | Order/sequence identifier |
| `response_type` | `text` | NO | - | Type of response required |
| `urgency` | `text` | YES | - | Urgency level |

### CRUD Operations

```typescript
// SELECT all actions
const { data, error } = await supabase
  .from('Actions')
  .select('*')

// SELECT actions by meeting_id
const { data, error } = await supabase
  .from('Actions')
  .select('*')
  .eq('meeting_id', meetingId)

// SELECT actions by urgency
const { data, error } = await supabase
  .from('Actions')
  .select('*')
  .eq('urgency', 'high')

// INSERT new action
const { data, error } = await supabase
  .from('Actions')
  .insert({
    meeting_id: 1,
    description: 'Follow up with client',
    assigned_to_person: 'John Doe',
    response_type: 'email',
    urgency: 'high'
  })
  .select()

// UPDATE action
const { data, error } = await supabase
  .from('Actions')
  .update({ urgency: 'low' })
  .eq('id', actionId)
  .select()

// DELETE action
const { error } = await supabase
  .from('Actions')
  .delete()
  .eq('id', actionId)
```

---

## Companies Table

Company/organization entities.

### Schema

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | `bigint` | NO | - | Primary key |
| `created_at` | `timestamptz` | NO | `now()` | Creation timestamp |
| `company_name` | `text` | YES | - | Company name |

### CRUD Operations

```typescript
// SELECT all companies
const { data, error } = await supabase
  .from('Companies')
  .select('*')

// SELECT company by id
const { data, error } = await supabase
  .from('Companies')
  .select('*')
  .eq('id', companyId)
  .single()

// SELECT company by name
const { data, error } = await supabase
  .from('Companies')
  .select('*')
  .eq('company_name', 'Acme Corp')
  .single()

// INSERT new company
const { data, error } = await supabase
  .from('Companies')
  .insert({
    id: 1,
    company_name: 'Acme Corp'
  })
  .select()

// UPDATE company
const { data, error } = await supabase
  .from('Companies')
  .update({ company_name: 'Acme Corporation' })
  .eq('id', companyId)
  .select()

// DELETE company
const { error } = await supabase
  .from('Companies')
  .delete()
  .eq('id', companyId)
```

---

## People Table

Personnel within companies.

### Schema

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | `bigint` | NO | - | Primary key |
| `created_at` | `timestamptz` | NO | `now()` | Creation timestamp |
| `company_name` | `text` | YES | - | Company the person belongs to |
| `department` | `text` | YES | - | Department within company |
| `name` | `text` | YES | - | First name |
| `surname` | `text` | YES | - | Last name |
| `skills` | `text` | YES | - | Skills (text format) |

### CRUD Operations

```typescript
// SELECT all people
const { data, error } = await supabase
  .from('People')
  .select('*')

// SELECT person by id
const { data, error } = await supabase
  .from('People')
  .select('*')
  .eq('id', personId)
  .single()

// SELECT people by company
const { data, error } = await supabase
  .from('People')
  .select('*')
  .eq('company_name', 'Acme Corp')

// SELECT people by department
const { data, error } = await supabase
  .from('People')
  .select('*')
  .eq('department', 'Engineering')

// INSERT new person
const { data, error } = await supabase
  .from('People')
  .insert({
    id: 1,
    company_name: 'Acme Corp',
    department: 'Engineering',
    name: 'Jane',
    surname: 'Doe',
    skills: 'TypeScript, React, Node.js'
  })
  .select()

// UPDATE person
const { data, error } = await supabase
  .from('People')
  .update({
    department: 'Product',
    skills: 'Product Management, Agile'
  })
  .eq('id', personId)
  .select()

// DELETE person
const { error } = await supabase
  .from('People')
  .delete()
  .eq('id', personId)
```

---

## RawTranskripts Table

Raw transcript text data storage.

### Schema

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | `bigint` | NO | - | Primary key |
| `created_at` | `timestamptz` | NO | `now()` | Creation timestamp |
| `text` | `text` | YES | - | Raw transcript text content |

### CRUD Operations

```typescript
// SELECT all transcripts
const { data, error } = await supabase
  .from('RawTranskripts')
  .select('*')

// SELECT transcript by id
const { data, error } = await supabase
  .from('RawTranskripts')
  .select('*')
  .eq('id', transcriptId)
  .single()

// INSERT new transcript
const { data, error } = await supabase
  .from('RawTranskripts')
  .insert({
    text: 'Full transcript text content here...'
  })
  .select()

// UPDATE transcript
const { data, error } = await supabase
  .from('RawTranskripts')
  .update({ text: 'Updated transcript text' })
  .eq('id', transcriptId)
  .select()

// DELETE transcript
const { error } = await supabase
  .from('RawTranskripts')
  .delete()
  .eq('id', transcriptId)
```

---

## Common Query Patterns

### Get all actions for a specific meeting
```typescript
const { data: actions } = await supabase
  .from('Actions')
  .select('*')
  .eq('meeting_id', meetingId)
  .order('sequence', { ascending: true })
```

### Get all people in a department at a company
```typescript
const { data: people } = await supabase
  .from('People')
  .select('*')
  .eq('company_name', 'Acme Corp')
  .eq('department', 'Engineering')
```

### Get high-urgency actions assigned to a person
```typescript
const { data: urgentActions } = await supabase
  .from('Actions')
  .select('*')
  .eq('assigned_to_person', 'John Doe')
  .eq('urgency', 'high')
```

### Search people by skill
```typescript
const { data: people } = await supabase
  .from('People')
  .select('*')
  .ilike('skills', '%React%')
```

### Get actions assigned to a department
```typescript
const { data: deptActions } = await supabase
  .from('Actions')
  .select('*')
  .eq('assigned_to_department', 'Engineering')
  .order('urgency', { ascending: false })
```

---

## TypeScript Types

```typescript
// Database types
export interface Action {
  id: string                      // uuid
  meeting_id: number              // smallint
  project_id: number | null       // smallint, nullable
  description: string | null      // text, nullable
  assigned_to_department: string | null
  assigned_to_person: string | null
  sequence: string | null
  response_type: string           // required
  urgency: string | null
}

export interface Company {
  id: number                      // bigint
  created_at: string              // timestamptz (ISO string)
  company_name: string | null
}

export interface Person {
  id: number                      // bigint
  created_at: string              // timestamptz (ISO string)
  company_name: string | null
  department: string | null
  name: string | null
  surname: string | null
  skills: string | null
}

export interface RawTranskript {
  id: number                      // bigint
  created_at: string              // timestamptz (ISO string)
  text: string | null
}

// Database schema type
export interface Database {
  public: {
    Tables: {
      Actions: {
        Row: Action
        Insert: Omit<Action, 'id'> & { id?: string }
        Update: Partial<Omit<Action, 'id'>>
      }
      Companies: {
        Row: Company
        Insert: Company
        Update: Partial<Omit<Company, 'id' | 'created_at'>>
      }
      People: {
        Row: Person
        Insert: Person
        Update: Partial<Omit<Person, 'id' | 'created_at'>>
      }
      RawTranskripts: {
        Row: RawTranskript
        Insert: Omit<RawTranskript, 'id' | 'created_at'> & { id?: number; created_at?: string }
        Update: Partial<Omit<RawTranskript, 'id' | 'created_at'>>
      }
    }
  }
}
```

### Typed Client Usage
```typescript
import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

const supabase = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
)

// Now you get full type safety
const { data } = await supabase
  .from('People')
  .select('*')
  .eq('department', 'Engineering')
// data is typed as Person[] | null
```

---

## Best Practices

### Error Handling
```typescript
const { data, error } = await supabase
  .from('Actions')
  .select('*')

if (error) {
  console.error('Database error:', error.message)
  throw new Error(`Failed to fetch actions: ${error.message}`)
}

// data is guaranteed to exist here
```

### Batch Operations
```typescript
// Insert multiple records
const { data, error } = await supabase
  .from('Actions')
  .insert([
    { meeting_id: 1, description: 'Action 1', response_type: 'email' },
    { meeting_id: 1, description: 'Action 2', response_type: 'call' },
  ])
  .select()
```

### Upsert Pattern
```typescript
// Insert or update based on primary key
const { data, error } = await supabase
  .from('Companies')
  .upsert({ id: 1, company_name: 'Updated Name' })
  .select()
```

### Pagination
```typescript
const { data, error } = await supabase
  .from('People')
  .select('*')
  .range(0, 9)  // First 10 records (0-indexed)
```

---

## Relationships

### Implicit Relationships
- `People.company_name` → `Companies.company_name` (text-based reference)
- `Actions.assigned_to_person` → `People.name + surname` (text-based reference)
- `Actions.assigned_to_department` → `People.department` (text-based reference)

### Notes
- These are **implicit** relationships via text matching, not foreign keys
- When creating new records, ensure text values match existing references
- Consider migrating to proper foreign key relationships for data integrity
