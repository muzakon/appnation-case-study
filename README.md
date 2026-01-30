# AppNation Case Study

## Project Setup

### Prerequisites
- Docker & Docker Compose
- Make (optional)

### Quick Start
1. **Configure Environment**: Copy `.env.example` to `.env` and fill in required variables.
2. **Build & Start**:
   ```bash
   make build
   ```
   *This command builds the image and starts all services (API, Postgres, Redis).*

3. **Verify**: The API will be available at `http://localhost:4000`.

---

## Authentication

The project uses Firebase Authentication. For development, a **Mock Token** system is available.

### Example Mock Token
To authenticate as the seeded user (`alice@example.com`):
`Bearer mock:email=alice@example.com:id=a1111111-1111-1111-1111-111111111111`

---
## API Endpoints

### Documentation
- **Swagger UI**: `http://localhost:4000/openapi`

### Chats (`/api/chats`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| **GET** | `/api/chats` | List user's chats (paginated) |
| **GET** | `/api/chats/:chatId/history` | Get message history for a specific chat |
| **POST** | `/api/chats/:chatId/completion` | Send a message and get an AI response (supports SSE streaming) |

### Example Request (Completion)
```bash
curl -X POST http://localhost:4000/api/chats/b2222222-2222-2222-2222-222222222222/completion \
  -H "Authorization: Bearer mock:email=alice@example.com:id=a1111111-1111-1111-1111-111111111111" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Hello!"}'
```

---

## Development Commands
- `make logs`: View real-time logs.
- `make shell`: Access the backend container.
- `make db-seed`: Re-run database seeding.
- `make clean`: Reset the entire environment including database volumes.
- `make test`: Run tests


## Feature Flags
Flags can be configured in `config/feature-flags.yaml`.

## Changes I'd like to Implement
- In production, i'd probably use Google Cloud Platform's Parameters Store or i could store the configuration in Google Cloud Storage with caching TTL for feature flags and configuration management. So no deployment needed when changing flags.
- I'd also add more comprehensive logging and monitoring (Such as Sentry) for production use.
- I'd NOT use the current Docker setup. I'd prepare a proper deployment configuration with proper CI/CD pipelines and dockerfile. This URL describes the production setup for Elysia very well: https://elysiajs.com/patterns/deploy
- I'd also add more comprehensive testing (Unit, Integration, E2E) for production use.
- I'd also add more comprehensive error handling and validation for production use.
- I'd also add more comprehensive security measures for production use. (Real Firebase App check, Real firebase jwt validation, etc.)