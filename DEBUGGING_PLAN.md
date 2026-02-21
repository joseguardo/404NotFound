# Debugging Plan: Company Creation Flow

## Problem Statement
The company creation flow is not working. This plan outlines a systematic approach to identify and fix the issue.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND (React)                               │
├─────────────────────────────────────────────────────────────────────────┤
│  Index.tsx ──► CompanySelector.tsx ──► CreateCompanyModal.tsx           │
│       │              │                        │                          │
│       │              ▼                        │                          │
│       │      handleCreateCompany()            │                          │
│       │              │                        │                          │
│       ▼              ▼                        ▼                          │
│  api.createCompany() ────────────────────────────────────────────────── │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                          POST /api/companies
                       {company_name: string}
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         BACKEND (FastAPI)                                │
├─────────────────────────────────────────────────────────────────────────┤
│  main.py ──► routers/companies.py ──► database/client.py                │
│                     │                        │                           │
│              create_company()          SupabaseClient                    │
│                     │                  .create_company()                 │
│                     ▼                        │                           │
│           Check duplicate name               ▼                           │
│                     │               Supabase INSERT                      │
│                     ▼                                                    │
│            Return CompanyResponse                                        │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       DATABASE (Supabase)                                │
├─────────────────────────────────────────────────────────────────────────┤
│  Table: Companies                                                        │
│  ├── id (int, auto-increment)                                           │
│  ├── company_name (text)                                                │
│  └── created_at (timestamp)                                             │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Debugging Steps

### Step 1: Verify Backend is Running
**Files:** `backend/main.py`
**Actions:**
1. Check if the FastAPI server is running on `http://localhost:8000`
2. Test the health endpoint: `curl http://localhost:8000/api/health`
3. If not running, start with: `cd backend && uvicorn main:app --reload`

### Step 2: Verify Environment Variables
**Files:** `backend/config.py`, `.env`
**Actions:**
1. Confirm `.env` file exists in the `backend/` parent directory
2. Verify `SUPABASE_URL` and `SUPABASE_KEY` are correctly set
3. Check for any loading errors at backend startup

### Step 3: Test API Endpoint Directly
**Endpoint:** `POST /api/companies`
**Actions:**
```bash
curl -X POST http://localhost:8000/api/companies \
  -H "Content-Type: application/json" \
  -d '{"company_name": "Test Company"}'
```
**Expected Response:**
```json
{"id": 1, "company_name": "Test Company", "created_at": "..."}
```
**Possible Issues:**
- 500: Supabase connection failed
- 400: Company already exists
- 422: Invalid request body (missing company_name)

### Step 4: Check Supabase Connection
**Files:** `backend/database/client.py`
**Actions:**
1. Verify the Supabase table "Companies" exists
2. Check Supabase RLS (Row Level Security) policies
3. Ensure the API key has INSERT permissions

### Step 5: Test Frontend API Call
**Files:** `src/services/api.ts`
**Actions:**
1. Open browser DevTools → Network tab
2. Click "New Company" → Enter name → Submit
3. Check the POST request to `/api/companies`
4. Verify request payload and response

### Step 6: Check CORS Configuration
**Files:** `backend/main.py`
**Actions:**
1. Verify frontend origin is in CORS allowed list
2. Current allowed: `localhost:8080`, `localhost:5173`
3. Check browser console for CORS errors

---

## Potential Bug Areas (Priority Order)

### HIGH Priority

1. **Backend Not Running**
   - Server not started
   - Port 8000 already in use
   - Python import errors

2. **Supabase Connection Issues**
   - Invalid credentials in `.env`
   - Network connectivity issues
   - Table "Companies" doesn't exist

3. **CORS Errors**
   - Frontend running on different port than allowed
   - Missing CORS headers

### MEDIUM Priority

4. **Frontend Error Handling**
   - Location: `CompanySelector.tsx:62-69`
   - Issue: `handleCreateCompany` doesn't catch errors
   - The modal catches errors, but the parent function throws them

5. **API Response Handling**
   - Location: `api.ts:107-118`
   - Issue: Error response parsing could fail if response isn't JSON

### LOW Priority

6. **Race Condition on Duplicate Check**
   - Location: `companies.py:28-31`
   - Concurrent requests could bypass duplicate check

---

## Recommended Fix Order

1. **Verify infrastructure** (backend running, .env configured)
2. **Test API directly** with curl/Postman
3. **Check browser console** for errors
4. **Add error handling** in `CompanySelector.handleCreateCompany`
5. **Add request logging** to backend for debugging

---

## Key Files to Inspect

| Layer | File | Purpose |
|-------|------|---------|
| Frontend | `src/components/nexus/CompanySelector.tsx:62-69` | Calls API |
| Frontend | `src/components/nexus/Modals/CreateCompanyModal.tsx:40-48` | Form submission |
| Frontend | `src/services/api.ts:107-118` | API client |
| Backend | `backend/routers/companies.py:25-36` | POST endpoint |
| Backend | `backend/database/client.py:40-47` | Supabase insert |
| Backend | `backend/config.py` | Environment vars |
| Config | `.env` | Credentials |

---

## Testing Commands

```bash
# 1. Start backend
cd backend && uvicorn main:app --reload --port 8000

# 2. Start frontend (in another terminal)
cd 404NotFoundLovable && npm run dev

# 3. Test health
curl http://localhost:8000/api/health

# 4. Test company creation
curl -X POST http://localhost:8000/api/companies \
  -H "Content-Type: application/json" \
  -d '{"company_name": "Debug Test"}'

# 5. List companies
curl http://localhost:8000/api/companies
```

---

## Debugging Success Criteria

The company creation flow is working when:
1. Backend health check returns `{"status": "healthy"}`
2. POST to `/api/companies` returns a company with `id`
3. Frontend modal closes after creation
4. Success toast appears
5. User is redirected to the editor view
6. Going back shows the new company in the list
