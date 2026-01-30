.PHONY: help build up down restart logs ps shell db-generate db-migrate db-seed clean

# Default target
help:
	@echo "Available commands:"
	@echo "  make build          - Build or rebuild services"
	@echo "  make up             - Start services in background"
	@echo "  make down           - Stop and remove containers"
	@echo "  make restart        - Restart services"
	@echo "  make logs           - View container logs"
	@echo "  make ps             - List running containers"
	@echo "  make shell          - Open a shell in the backend container"
	@echo "  make db-generate    - Generate Prisma client"
	@echo "  make db-migrate     - Run database migrations"
	@echo "  make db-seed        - Seed the database"
	@echo "  make clean          - Stop containers and remove volumes"

build:
	docker compose up --build -d

up:
	docker compose up -d

down:
	docker compose down

restart:
	docker compose restart

logs:
	docker compose logs -f

ps:
	docker compose ps

shell:
	docker compose exec app sh

db-generate:
	docker compose exec app bun run db:generate

db-migrate:
	docker compose exec app bun run db:migrate:deploy

db-seed:
	docker compose exec app bunx prisma db seed

clean:
	docker compose down -v
