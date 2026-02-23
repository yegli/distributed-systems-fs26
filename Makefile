.PHONY: up down build install logs ps clean

# Default: install deps, then bring up the full stack
up: install
	docker compose up --build

# Install deps and generate seed.sql with bcrypt-hashed demo passwords
install:
	cd backend && npm install
	cd frontend && npm install
	cd backend && node src/db/generate-seed.js

# Rebuild images without restarting
build:
	docker compose build

# Stop and remove containers (keeps volumes / data)
down:
	docker compose down

# Follow logs for all services
logs:
	docker compose logs -f

# Show running containers
ps:
	docker compose ps

# Full teardown including named volumes (wipes database)
clean:
	docker compose down -v
	rm -rf backend/node_modules frontend/node_modules
