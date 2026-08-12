# Copart Auction API

PostgreSQL-native FastAPI service for streamed Copart CSV imports and indexed auction search.

## Run locally

```bash
cp .env.example .env
createdb -U postgres copart
alembic upgrade head
uvicorn app.main:app --reload
```

Set `DATABASE_URL` in `.env` to your local PostgreSQL connection string, for example `postgresql+psycopg://copart:copart@localhost:5432/copart`. The API is available at `http://localhost:8000`; documentation is at `/docs`, `/redoc`, and `/openapi.json`.

## Import and search

```bash
curl -F file=@salesdata.csv http://localhost:8000/api/v1/import
curl 'http://localhost:8000/api/v1/search?q=Toyota%204%20Runner'
curl 'http://localhost:8000/api/v1/auctions/upcoming?page=1&page_size=100'
python -m scripts.import_csv salesdata.csv
```

Imports stream CSV rows in configurable batches, preserve raw and unknown fields in JSONB, and upsert by `lot_number`. Existing values are replaced only by records with a newer `last_updated_time`. Date `0` represents unscheduled inventory and is excluded from default upcoming searches. Set `API_AUTH_ENABLED=true` and `API_KEY` to require `X-API-Key` on import endpoints.