# Construye el frontend (React) en una etapa aparte, con Node...
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ...y lo sirve desde el backend (Django), con Python.
FROM python:3.12-slim
ENV PYTHONUNBUFFERED=1 \
    DJANGO_SETTINGS_MODULE=config.settings

WORKDIR /app/backend
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ ./
COPY --from=frontend-build /app/frontend/dist /app/frontend/dist

EXPOSE 8000
CMD ["sh", "-c", "python manage.py migrate --noinput && python manage.py asegurar_admin_inicial && gunicorn config.wsgi:application --bind 0.0.0.0:${PORT:-8000}"]
