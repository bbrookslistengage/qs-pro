# Worker Service

The Worker service handles background job processing using BullMQ for the QS Pro application.

## Features

- Shell Query execution via BullMQ queues
- Health checks and metrics endpoints
- Bull Board UI for queue monitoring and management
- Redis-based job queue management

## Environment Variables

```bash
# Required
REDIS_URL=redis://localhost:6379
DATABASE_URL=postgres://qs_runtime:change_me_dev_only@127.0.0.1:5432/qs_pro

# Admin access for Bull Board UI
ADMIN_API_KEY=your-secure-admin-key-here
```

## Bull Board Admin UI

The Bull Board UI is available at `/admin/queues` and provides a web interface for monitoring and managing BullMQ queues.

### Authentication

Bull Board is protected with API key authentication. To access the UI:

1. Set the `ADMIN_API_KEY` environment variable to a secure random string
2. Include the API key in your requests using the `x-admin-key` header

**Example:**
```bash
# Using curl
curl -H "x-admin-key: your-admin-key" http://localhost:3001/admin/queues

# Using httpie
http http://localhost:3001/admin/queues x-admin-key:your-admin-key
```

**Security Notes:**
- If `ADMIN_API_KEY` is not set, all requests to `/admin/*` routes will be denied
- Always use a strong, randomly generated key in production
- Never commit the actual API key to version control
- Consider using a secrets manager in production environments

## Development

```bash
# Start the worker service
pnpm --filter worker start

# Run tests
pnpm --filter worker test

# Type checking
pnpm --filter worker typecheck
```

## Architecture

- **BullMQ Queues**: `shell-query` queue for MCE query execution
- **Redis**: Job queue and state management
- **Health Checks**: `/health` endpoint for monitoring
- **Metrics**: Prometheus-compatible metrics at `/metrics`
