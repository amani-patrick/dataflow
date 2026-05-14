# DataFlow

Smart file tools — merge & clean Excel files, convert PDFs to Excel, and compress files for submission. Built with React + Node.js, fully dockerized.

## Features

- **Excel Tools** — Drag & drop multiple `.xlsx` / `.csv` files, preview data, fill missing fields, remove duplicates, sort by any column, add TOTAL rows for numeric columns, remove unwanted columns, and download a clean merged file.
- **PDF → Excel** — Upload text-based PDFs and extract their tables into a structured Excel workbook (one sheet per PDF).
- **Compress** — Bundle any files into a ZIP, or optimize images with a quality slider before zipping.

## Quick Start (Docker)

```bash
docker compose up -d
```

Open [http://localhost](http://localhost).

## Local Development

```bash
# Backend
cd backend && npm install && npm run dev

# Frontend (separate terminal)
cd frontend && npm install && npm run dev
```

Frontend runs on `http://localhost:3000`, backend on `http://localhost:4000`.

## CI/CD

On every push to `main` (excluding docs/markdown changes), GitHub Actions builds and pushes Docker images to GHCR:

- `ghcr.io/amani-patrick/dataflow-backend:latest`
- `ghcr.io/amani-patrick/dataflow-frontend:latest`

Only the service whose code changed gets rebuilt (path-filtered jobs).

## Deploy on a VPS

```bash
# Pull latest images and restart
docker compose pull && docker compose up -d
```
