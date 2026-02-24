# 404NotFound - HackEurope Paris 

---

## HackEurope Paris (21-22 February 2026)

GitHub repo: https://github.com/joseguardo/404NotFound 

HackEurope platform: https://app.hackeurope.eu/dashboard 

DevPost submission system: https://devpost.com/software/404notmissing https://hackeurope.devpost.com/ 

Discord: https://discord.com/channels/1469389295545749514 

---

## 404NotFound Intelligent meeting action extraction and organizational structure management.

404NotFound turns meeting transcripts into structured, actionable outcomes. Upload a transcript (or connect Granola/Recall.ai), and the system automatically extracts action items, identifies urgency, assigns them to the right people, and dispatches communications via email, phone call, or Linear ticket.

Built at HackEurope by team 404NotFound.

---

## Inspiration

During the opening presentation of HackEurope here in Paris, we experienced something small but revealing: we were told that every participant should have receive a hackathon bracelet. But the bracelets never arrived.

It wasn't a catastrophic failure, but it exposed a deeper issue. In complex, fast-moving organizations, decisions are made in meetings, tasks are verbally assigned, but execution often fails.

We started asking:
- Was the budget approved?
- Did the Finance department notify the Operations department?
- Who placed the vendor order?
- Was shipment verified?

Most likely, all of these steps were discussed. But discussion is not enough, there needs to be coordinated action after all the meetings. Teams don't have a persistent, structured memory of what was decided, who owns it, and what depends on it.

So we built a Meeting Memory Layer.

## What it does

404NOTMissing transforms raw meeting transcripts into structured, executable actions.

Instead of meetings producing ive notes, our system:
- Ingests meeting transcripts
- Extracts structured actions
- Assigns them to departments or individuals based on the organisation schema of the company
- Tracks urgency and status
- Creates a live execution board

Every decision becomes:
 - An action (e.g. order 300 bracelets for HackEurope Paris)
- With an owner (e.g. Lead of Operations department)
- With a deadline (e.g. 3 business days)
- With a status (e.g. TO DO)
- With escalation if needed

The result:
- No lost tasks
- No ambiguous ownership
- No invisible dependencies
- No "Did we do that?" meetings

The meeting transcripts stop being documentation, they become an execution engine.

## How we built it

We designed 404NOTmissing as an agent-driven execution system.

1. Transcript Ingestion
We start with meeting transcripts (synthetic for this demo), representing realistic multi-department coordination inside HackEurope. Each transcript is stored as raw text in our database.

2. Agent-Based Extraction Layer
Instead of builda full knowledge graph infrastructure, we implemented a set of focused AI agents that operate over transcripts to extract structured execution data.
Our agents perform:
- Entity extraction (people, departments, projects)
- Task detection (actionable commitments vs discussion)
- Sequence identification (what depends on what)
- Priority inference
- Ownership assignment

3. Structured Execution Model (Database-Driven)
Extracted actions are stored in a  structured database schema, which acts like as a lightweight "meeting memory layer" — not a full knowledge graph yet, but a persistent execution record.

4. Execution & Integrations
Once structured, actions can trigger operational workflows:
- Ticket creation (in Linear)
- Phone call reminders (via ElevenLabs)
- Email dispatch

## Challenges we ran into

The biggest challeng was designing a clean data model that supports:
- Multi-city organizations
- Department routing
- Status tracking
- Dependency chains
- API-triggered execution

Also, inferring structuaning from the raw transcript data because meetings can get messy.

## Accomplishments that we're proud of

- Designing a functional Meeting Memory Layer
- Detecting dependencies between actions
- Assigning structured ownership automatically
- Enabling downstream integration (Linear, Gmail, phone)
- Turning conversations into operational workflows

## What we learned

Teamwork makes the dream work.

## What's next for 404NOTmissing

Next, we want to:
- Implementing a Temporal Knowledge Graph for decision tracking
- Deeply integrate with Miro MCP and AI Flows
- Enable real-time action extraction during live meetings
- Add automatic escalation for overdue tasks
- Expand dependency modeling across multiple projects
- Build analytics around execution bottlenecks

---

## Features

- **Organizational Structure Editor** -- Create and manage companies, departments, and people with three visualization modes (hierarchy, orbital, grid)
- **7-Stage Processing Pipeline** -- Text extraction, topic identification, project matching, action extraction, dependency sequencing, database persistence, and automated dispatch
- **Smart Communication Routing** -- Actions are automatically routed based on urgency: very high (email + phone), high (phone), medium (email), low (logged only)
- **AI Phone Agent** -- Twilio-powered outbound calls with Claude-driven natural language conversation
- **Transcript Ingestion** -- Upload PDF/DOCX/TXT files, or ingest from Granola and Recall.ai
- **MCP Integrations** -- Linear (issue tracking) and Miro (board collaboration) via Model Context Protocol

---

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, Framer Motion, React Query |
| Backend | FastAPI, Pydantic, Uvicorn |
| Database | Supabase (PostgreSQL) |
| AI/LLM | OpenAI, Anthropic Claude |
| Comms | Twilio (voice), Resend (email) |
| Integrations | Linear, Miro, Granola, Recall.ai |

---

## Project Structure

```
.
├── 404NotFoundLovable/          # React frontend
│   ├── src/
│   │   ├── pages/               # Routes: landing, app, upload, meeting overview
│   │   ├── components/
│   │   │   ├── nexus/           # Org editor (views, panels, modals, hooks)
│   │   │   ├── upload-experience/  # Transcript upload & processing UI
│   │   │   ├── landing/         # Landing page sections
│   │   │   └── ui/              # shadcn-ui primitives
│   │   └── services/api.ts      # Backend API client
│   └── package.json
│
├── backend/                     # FastAPI backend
│   ├── main.py                  # App entry point, CORS, router mounting
│   ├── config.py                # Environment variable loading
│   ├── routers/                 # API endpoints
│   │   ├── companies.py         # Company CRUD
│   │   ├── structure.py         # Org structure endpoints
│   │   ├── people.py            # Person management
│   │   ├── transcripts.py       # Transcript upload & processing
│   │   ├── phone_calls.py       # Twilio phone integration
│   │   ├── webhooks.py          # Granola webhook handler
│   │   └── mock_actions.py      # Mock action execution
│   ├── services/                # Business logic
│   │   ├── orchestrator.py      # 7-stage processing pipeline
│   │   ├── action_extraction.py # LLM-powered action extraction
│   │   ├── action_dispatcher.py # Email/call/Linear dispatch
│   │   ├── action_sequence.py   # Dependency sequencing
│   │   ├── email_service/       # Resend email integration
│   │   └── ai_phone_agent/      # Twilio voice agent
│   ├── database/
│   │   ├── client.py            # Supabase CRUD operations
│   │   ├── models.py            # Pydantic request/response models
│   │   └── prompts.py           # LLM system prompts
│   ├── mcp_clients/             # Model Context Protocol integrations
│   │   ├── linear.py            # Linear issue tracking
│   │   └── miro.py              # Miro boards
│   └── requirements.txt
│
├── scripts/
│   └── granola_watcher.py       # Polls local Granola cache for new transcripts
│
├── Makefile                     # Dev commands
└── MockTranskripts/             # Sample transcript files for testing
```

---

## Getting Started

### Prerequisites

- Python 3.8+
- Node.js 18+ with npm
- A [Supabase](https://supabase.com) project with the required tables (see [Database Schema](#database-schema))

### Setup

```bash
# Clone the repo
git clone https://github.com/joseguardo/404NotFound.git
cd 404NotFound

# Create venv, install backend + frontend dependencies
make setup

# Configure environment variables
cp .env.example .env   # then fill in your keys (see below)

# Start both servers
make dev
```

- Frontend: http://localhost:8080
- Backend: http://localhost:8000
- API docs: http://localhost:8000/docs

### Environment Variables

Create a `.env` file in the project root:

```env
# Required
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-anon-key
OPENAI_API_KEY=sk-...

# Email dispatch
RESEND_API_KEY=re_...

# Phone agent
TWILIO_ACCOUNT_SID=your-sid
TWILIO_AUTH_TOKEN=your-token
TWILIO_PHONE_NUMBER=+1234567890

# Integrations (optional)
LINEAR_API_KEY=your-linear-key
MIRO_ACCESS_TOKEN=your-miro-token
GRANOLA_WEBHOOK_SECRET=your-secret
```

---

## Make Commands

| Command | Description |
|---------|-------------|
| `make setup` | Create venv and install all dependencies |
| `make dev` | Start backend + frontend |
| `make dev-full` | Start backend + frontend + ngrok tunnel |
| `make dev-granola` | Start backend + frontend + Granola watcher |
| `make backend` | Start FastAPI server only (port 8000) |
| `make frontend` | Start Vite dev server only (port 8080) |
| `make granola-watcher` | Start Granola transcript watcher |
| `make ngrok` | Start ngrok tunnel for Twilio webhooks |
| `make kill-ports` | Kill processes on ports 8000 and 8080 |
| `make clean` | Remove venv and cache files |

---

## How It Works

### Processing Pipeline

When a transcript is uploaded, the orchestrator runs seven stages:

1. **Text Extraction** -- Extracts raw text from PDF, DOCX, or TXT files
2. **Topic Identification** -- LLM identifies discussion topics and themes
3. **Project Matching** -- Maps topics to existing projects in the database
4. **Action Extraction** -- Extracts action items with assignee, urgency, and response type
5. **Dependency Sequencing** -- Orders actions by dependencies and priority
6. **Database Persistence** -- Stores actions and metadata in Supabase
7. **Communication Dispatch** -- Sends emails, makes phone calls, or creates Linear tickets based on urgency rules

### Urgency-Based Routing

| Urgency | Actions Taken |
|---------|--------------|
| VERY HIGH | Email + Phone call + Linear ticket |
| HIGH | Phone call + Linear ticket |
| MEDIUM | Email + Linear ticket |
| LOW | Linear ticket only |

---

## Database Schema

Five tables in Supabase:

| Table | Purpose |
|-------|---------|
| **Companies** | Company/organization entities |
| **People** | Personnel with department, skills, and company association |
| **Projects** | Active/inactive project tracking |
| **Actions** | Extracted action items with urgency, assignee, and response type |
| **RawTranskripts** | Raw transcript text storage |

See [`.claude/DATABASE.md`](.claude/DATABASE.md) for full schema details, TypeScript types, and query examples.

---

## API Endpoints

The backend exposes RESTful endpoints under `/api`:

- **Companies** -- `GET/POST/PUT/DELETE /api/companies`
- **People** -- `GET/POST/PUT/DELETE /api/people`
- **Structure** -- `GET /api/structure/{company_id}` (full org structure)
- **Transcripts** -- `POST /api/transcripts/upload`, `POST /api/transcripts/process`
- **Phone Calls** -- `POST /api/phone/call`, `POST /api/phone/register-call`
- **Webhooks** -- `POST /api/webhooks/granola`

Full interactive docs available at http://localhost:8000/docs when running the backend.

---

## License

Hackathon project -- no license specified.
