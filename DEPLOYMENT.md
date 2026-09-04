# Deployment

1. Push the repository to GitHub.
2. Create a managed PostgreSQL database.
3. Deploy `backend/` to a container/Python host and set `DATABASE_URL`, `CORS_ORIGINS`.
4. Set frontend `VITE_API_URL` to the deployed API.
5. Deploy `frontend/` to Vercel or equivalent.
6. Verify `/api/health` and all major dashboard routes.

Never commit real `.env` files or credentials.
