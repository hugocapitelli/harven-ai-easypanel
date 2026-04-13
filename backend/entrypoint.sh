#!/bin/bash
# Harven AI Backend — Entrypoint with diagnostics

echo "=== Harven AI Backend Starting ==="
echo "ENV vars received:"
echo "  DATABASE_URL: ${DATABASE_URL:+SET (${#DATABASE_URL} chars)}${DATABASE_URL:-NOT SET}"
echo "  JWT_SECRET_KEY: ${JWT_SECRET_KEY:+SET}${JWT_SECRET_KEY:-NOT SET}"
echo "  JWT_SECRET: ${JWT_SECRET:+SET}${JWT_SECRET:-NOT SET}"
echo "  SUPABASE_KEY: ${SUPABASE_KEY:+SET (${#SUPABASE_KEY} chars)}${SUPABASE_KEY:-NOT SET}"
echo "  SUPABASE_URL: ${SUPABASE_URL:-NOT SET}"
echo "  OPENAI_API_KEY: ${OPENAI_API_KEY:+SET}${OPENAI_API_KEY:-NOT SET}"
echo "  OPENAI_MODEL: ${OPENAI_MODEL:-NOT SET}"
echo "  ENVIRONMENT: ${ENVIRONMENT:-NOT SET}"
echo "  PORT: ${PORT:-8000}"
echo "  All env var count: $(env | wc -l)"
echo "=================================="

exec uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
