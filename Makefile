.PHONY: setup install backend frontend dev dev-full dev-granola granola-watcher clean help kill-ports ngrok

# Default target
help:
	@echo "Available commands:"
	@echo "  make setup           - Create venv and install dependencies"
	@echo "  make install         - Install dependencies (assumes venv exists)"
	@echo "  make backend         - Start FastAPI backend (port 8000)"
	@echo "  make frontend        - Start Vite frontend (port 8080)"
	@echo "  make granola-watcher - Start Granola transcript watcher"
	@echo "  make ngrok           - Start ngrok tunnel (port 8000)"
	@echo "  make dev             - Kill ports, start backend + frontend"
	@echo "  make dev-granola     - Kill ports, start backend + frontend + granola watcher"
	@echo "  make dev-full        - Kill ports, start backend + frontend + ngrok"
	@echo "  make kill-ports      - Kill processes on ports 8000 and 8080"
	@echo "  make clean           - Remove venv and cache files"

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

# Kill processes on common ports
kill-ports:
	@echo "Killing processes on ports 8000 and 8080..."
	-@lsof -ti :8000 | xargs kill -9 2>/dev/null || true
	-@lsof -ti :8080 | xargs kill -9 2>/dev/null || true
	@echo "Ports cleared."

# Start ngrok tunnel
ngrok:
	@echo "Starting ngrok tunnel on port 8000..."
	ngrok http 8000

# Start both backend and frontend (requires two terminals or background processes)
dev:
	@echo "Killing existing processes on ports 8000 and 8080..."
	-@lsof -ti :8000 | xargs kill -9 2>/dev/null || true
	-@lsof -ti :8080 | xargs kill -9 2>/dev/null || true
	@sleep 1
	@echo ""
	@echo "Starting development servers..."
	@echo "Backend:  http://localhost:8000"
	@echo "Frontend: http://localhost:8080"
	@echo "Ngrok:    Run 'make ngrok' in another terminal for Twilio webhooks"
	@echo ""
	@echo "Press Ctrl+C to stop"
	@make -j2 backend frontend

# Start everything including ngrok (opens 3 processes)
dev-full:
	@echo "Killing existing processes on ports 8000 and 8080..."
	-@lsof -ti :8000 | xargs kill -9 2>/dev/null || true
	-@lsof -ti :8080 | xargs kill -9 2>/dev/null || true
	@sleep 1
	@echo ""
	@echo "Starting all development servers + ngrok..."
	@echo "Backend:  http://localhost:8000"
	@echo "Frontend: http://localhost:8080"
	@echo "Ngrok:    Check terminal output for public URL"
	@echo ""
	@echo "Press Ctrl+C to stop all"
	@make -j3 backend frontend ngrok

# Start Granola transcript watcher
granola-watcher:
	@echo "Starting Granola watcher..."
	@echo "Monitoring: ~/Library/Application Support/Granola/cache-v3.json"
	@echo "Webhook:    http://localhost:8000/api/webhooks/granola"
	cd $(CURDIR) && ./venv/bin/python scripts/granola_watcher.py \
		--webhook-url "http://localhost:8000/api/webhooks/granola?company_id=1" \
		--poll-interval 15

# Start backend + frontend + Granola watcher
dev-granola:
	@echo "Killing existing processes on ports 8000 and 8080..."
	-@lsof -ti :8000 | xargs kill -9 2>/dev/null || true
	-@lsof -ti :8080 | xargs kill -9 2>/dev/null || true
	@sleep 1
	@echo ""
	@echo "Starting development servers + Granola watcher..."
	@echo "Backend:         http://localhost:8000"
	@echo "Frontend:        http://localhost:8080"
	@echo "Granola Watcher: Monitoring local Granola cache"
	@echo ""
	@echo "Press Ctrl+C to stop all processes"
	@make -j3 backend frontend granola-watcher

# Clean up
clean:
	rm -rf venv
	rm -rf backend/__pycache__
	rm -rf backend/**/__pycache__
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete 2>/dev/null || true
