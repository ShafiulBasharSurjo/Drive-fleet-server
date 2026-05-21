# DriveFleet API

Express + MongoDB backend for the DriveFleet car rental platform.

## Environment

Copy `.env.example` to `.env` and configure:

| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default 5000) |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret for signing JWT cookies |
| `CLIENT_URL` | Frontend origin for CORS |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID for token verification |

## Scripts

```bash
npm install
npm run dev    # development with --watch
npm start      # production
```

## API Routes

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/auth/register` | | Create account |
| POST | `/auth/login` | | Login, set cookie |
| POST | `/auth/google` | | Google ID token login |
| POST | `/auth/logout` | | Clear cookie |
| GET | `/auth/me` | ✓ | Current user |
| GET | `/cars` | | List cars (`search`, `type` query) |
| GET | `/cars/featured` | | Top 6 available cars |
| GET | `/cars/my` | ✓ | Owner's cars |
| GET | `/cars/:id` | | Single car |
| POST | `/cars` | ✓ | Add car |
| PATCH | `/cars/:id` | ✓ | Update own car |
| DELETE | `/cars/:id` | ✓ | Delete own car |
| POST | `/bookings` | ✓ | Create booking (`$inc` count) |
| GET | `/bookings/my` | ✓ | User bookings |
