from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.routers import companies, structure, people, transcripts

app = FastAPI(
    title="Nexus API",
    description="API for managing company organizational structures",
    version="1.0.0",
)

# Configure CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8080",
        "http://localhost:5173",
        "http://127.0.0.1:8080",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(companies.router)
app.include_router(structure.router)
app.include_router(people.router)
app.include_router(transcripts.router)


@app.get("/")
def root():
    """Health check endpoint."""
    return {"status": "ok", "service": "Nexus API"}


@app.get("/api/health")
def health():
    """Health check endpoint."""
    return {"status": "healthy"}
