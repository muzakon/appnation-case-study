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


## Feature Flags
Flags can be configured in `config/feature-flags.yaml`.