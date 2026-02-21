.PHONY: setup install backend frontend dev clean help

# Default target
help:
	@echo "Available commands:"
	@echo "  make setup     - Create venv and install dependencies"
	@echo "  make install   - Install dependencies (assumes venv exists)"
	@echo "  make backend   - Start FastAPI backend (port 8000)"
	@echo "  make frontend  - Start Vite frontend (port 8080)"
	@echo "  make dev       - Start both backend and frontend"
	@echo "  make clean     - Remove venv and cache files"

# Create virtual environment and install dependencies
setup:
	@echo "Creating virtual environment..."
	python3 -m venv venv
	@echo "Installing backend dependencies..."
	./venv/bin/pip install --upgrade pip
	./venv/bin/pip install -r backend/requirements.txt
	@echo "Installing frontend dependencies..."
	cd 404NotFoundLovable && npm install
	@echo "Setup complete! Run 'make dev' to start both servers."

# Install dependencies only (assumes venv exists)
install:
	./venv/bin/pip install -r backend/requirements.txt
	cd 404NotFoundLovable && npm install

# Start backend server
backend:
	@echo "Starting FastAPI backend on http://localhost:8000"
	cd $(CURDIR) && ./venv/bin/python -m uvicorn backend.main:app --reload --port 8000

# Start frontend server
frontend:
	@echo "Starting Vite frontend on http://localhost:8080"
	cd 404NotFoundLovable && npm run dev

# Start both backend and frontend (requires two terminals or background processes)
dev:
	@echo "Starting development servers..."
	@echo "Backend: http://localhost:8000"
	@echo "Frontend: http://localhost:8080"
	@echo ""
	@echo "Press Ctrl+C to stop"
	@make -j2 backend frontend

# Clean up
clean:
	rm -rf venv
	rm -rf backend/__pycache__
	rm -rf backend/**/__pycache__
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete 2>/dev/null || true
