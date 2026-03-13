# Stellen API

> A production-grade REST API — JWT auth, rate limiting, PostgreSQL, Swagger docs, Docker.
> Built by [Stellen Ncube](mailto:officialstellen@gmail.com).

[![CI/CD](https://github.com/stellen/stellen-api/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/stellen/stellen-api/actions)

---

## Stack

| Layer          | Technology                          |
|----------------|-------------------------------------|
| Runtime        | Node.js 20                          |
| Framework      | Express 4                           |
| Database       | PostgreSQL 16 via `pg` pool         |
| Authentication | JWT (access + refresh token rotation) |
| Rate Limiting  | `express-rate-limit` — 3-tier       |
| Validation     | `express-validator`                 |
| Docs           | Swagger / OpenAPI 3.0               |
| Logging        | Winston                             |
| Security       | Helmet, CORS, bcrypt (cost 12)      |
| Container      | Docker multi-stage + Compose        |
| CI/CD          | GitHub Actions → Railway            |

---

## Quick Start

```bash
# 1. Clone and install
git clone https://github.com/stellen/stellen-api
cd stellen-api
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env — set DB creds and JWT secrets

# 3. Run database + migrate + seed
docker compose up postgres -d
npm run migrate
npm run seed

# 4. Start dev server (hot reload)
npm run dev
```

Server runs at **http://localhost:3000**
Swagger docs at **http://localhost:3000/docs**

---

## Docker (full stack)

```bash
# Start everything (API + Postgres + migrate)
docker compose up --build

# Include pgAdmin GUI at http://localhost:5050
docker compose --profile dev up --build

# Run tests in containers
docker compose -f docker-compose.test.yml up --build --exit-code-from api_test
```

---

## API Endpoints

### Auth  `/api/v1/auth`
| Method | Path              | Auth     | Description            |
|--------|-------------------|----------|------------------------|
| POST   | `/register`       | Public   | Register new user      |
| POST   | `/login`          | Public   | Login, get tokens      |
| POST   | `/refresh`        | Public   | Rotate tokens          |
| POST   | `/logout`         | Bearer   | Revoke refresh token   |
| GET    | `/me`             | Bearer   | Get own profile        |
| PUT    | `/change-password`| Bearer   | Change password        |

### Posts  `/api/v1/posts`
| Method | Path    | Auth         | Description               |
|--------|---------|--------------|---------------------------|
| GET    | `/`     | Optional     | List posts (paginated)    |
| GET    | `/:id`  | Optional     | Get single post           |
| POST   | `/`     | Bearer       | Create post               |
| PATCH  | `/:id`  | Bearer/Owner | Update post               |
| DELETE | `/:id`  | Bearer/Owner | Delete post               |

### Users  `/api/v1/users` _(admin only)_
| Method | Path    | Auth   | Description  |
|--------|---------|--------|--------------|
| GET    | `/`     | Admin  | List users   |
| GET    | `/:id`  | Admin  | Get user     |
| PATCH  | `/:id`  | Admin  | Update user  |
| DELETE | `/:id`  | Admin  | Delete user  |

### Categories  `/api/v1/categories`
| Method | Path    | Auth   | Description        |
|--------|---------|--------|--------------------|
| GET    | `/`     | Public | List categories    |
| GET    | `/:id`  | Public | Get category       |
| POST   | `/`     | Admin  | Create category    |
| PATCH  | `/:id`  | Admin  | Update category    |
| DELETE | `/:id`  | Admin  | Delete category    |

### Health  `/api/v1/health`
| Method | Path | Auth   | Description              |
|--------|------|--------|--------------------------|
| GET    | `/`  | Public | DB ping, uptime, memory  |

---

## Rate Limits

| Limiter   | Window  | Max Requests          |
|-----------|---------|-----------------------|
| Global    | 15 min  | 100 (all endpoints)   |
| Auth      | 15 min  | 10 (register/login)   |
| Write     | 15 min  | 30 (POST/PUT/DELETE)  |

---

## Authentication Flow

```
1. POST /auth/register  →  { accessToken, refreshToken }
2. Include in headers:  Authorization: Bearer <accessToken>
3. accessToken expires (15m default)
4. POST /auth/refresh   { refreshToken }  →  new token pair
5. POST /auth/logout    →  refresh token revoked from DB
```

---

## Password Policy

- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

---

## Project Structure

```
stellen-api/
├── src/
│   ├── app.js                   # Express app factory
│   ├── server.js                # Entry point + graceful shutdown
│   ├── config/
│   │   ├── database.js          # pg Pool
│   │   ├── migrate.js           # Schema migrations
│   │   ├── seed.js              # Demo data
│   │   └── swagger.js           # OpenAPI spec
│   ├── middleware/
│   │   ├── auth.js              # protect, roles, optionalAuth
│   │   ├── rateLimiter.js       # global, auth, write limiters
│   │   ├── validate.js          # express-validator handler
│   │   └── errorHandler.js      # global error + 404
│   ├── routes/
│   │   ├── auth.js              # /api/v1/auth
│   │   ├── posts.js             # /api/v1/posts
│   │   ├── users.js             # /api/v1/users
│   │   ├── categories.js        # /api/v1/categories
│   │   └── health.js            # /api/v1/health
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── postsController.js
│   │   ├── usersController.js
│   │   └── categoriesController.js
│   ├── validators/
│   │   ├── auth.js
│   │   └── posts.js
│   └── utils/
│       ├── jwt.js               # sign/verify helpers
│       ├── logger.js            # Winston
│       └── response.js          # Standardised response helpers
├── tests/
│   ├── setup.js                 # Shared test helpers
│   ├── health.test.js
│   ├── auth.test.js
│   └── posts.test.js
├── .github/workflows/
│   └── ci-cd.yml                # Test → Build → Deploy
├── Dockerfile                   # Multi-stage production build
├── docker-compose.yml           # Local full stack
├── docker-compose.test.yml      # Isolated test environment
├── .env.example
└── README.md
```

---

## Deploy to Railway

1. Push to GitHub
2. Create a Railway project, add PostgreSQL plugin
3. Set env vars (copy from `.env.example`, fill real values)
4. Set `RAILWAY_TOKEN` in GitHub Secrets
5. Push to `main` — CI/CD builds, pushes Docker image, deploys automatically

---

## Seed Credentials

| Role  | Email                   | Password     |
|-------|-------------------------|--------------|
| Admin | admin@stellenapi.dev    | Admin@1234   |
| User  | demo@stellenapi.dev     | User@1234    |

> Change these immediately in production.

---

*100% self-taught. Built from South Africa.*
