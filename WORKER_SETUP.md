# MerchantOS Background Worker Setup

The MerchantOS worker processes background jobs for email delivery, webhooks, analytics, affiliate tracking, subscriptions, and cart recovery.

## What the Worker Does

The worker processes jobs from these queues:
- **email** - Transactional and marketing email delivery
- **webhook** - Outgoing webhook notifications
- **analytics** - Analytics data aggregation
- **inventory** - Stock level updates
- **subscription** - Subscription lifecycle management
- **affiliate** - Affiliate commission calculations
- **cart_recovery** - Abandoned cart email sequences

## Local Development

### Start the Worker Locally

```bash
npm run dev:worker
```

Or manually:

```bash
node -r ts-node/register src/workers/worker.ts
```

The worker will:
- Poll all queues in round-robin fashion
- Process up to 5 jobs concurrently (configurable via `WORKER_CONCURRENCY`)
- Gracefully shutdown on SIGTERM/SIGINT

### Required Environment Variables

The worker needs the same environment variables as the main app:
- `DATABASE_URL` - PostgreSQL connection
- `RESEND_API_KEY` - Email delivery
- `BREVO_API_KEY` - Marketing emails (optional)
- All other variables from `.env.example`

## Production Deployment

### Docker

Use the provided `Dockerfile.worker`:

```bash
docker build -f Dockerfile.worker -t merchantos-worker .
docker run -d --name merchantos-worker merchantos-worker
```

### Docker Compose

The worker is included in `docker-compose.prod.yml`:

```bash
docker-compose -f docker-compose.prod.yml up -d worker
```

### Process Manager (PM2)

```bash
npm install -g pm2
pm2 start src/workers/worker.ts --name merchantos-worker --interpreter ts-node
pm2 save
pm2 startup
```

### Kubernetes

Deploy as a separate Deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: merchantos-worker
spec:
  replicas: 2
  selector:
    matchLabels:
      app: merchantos-worker
  template:
    metadata:
      labels:
        app: merchantos-worker
    spec:
      containers:
      - name: worker
        image: merchantos-worker:latest
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: merchantos-secrets
              key: database-url
        # ... other env vars
```

## Configuration

### Concurrency

Set the number of concurrent jobs via environment variable:

```bash
WORKER_CONCURRENCY=10 node src/workers/worker.ts
```

Default: 5 concurrent jobs

### Scaling

For high-volume production:
- Run multiple worker instances (horizontal scaling)
- Increase `WORKER_CONCURRENCY` per instance
- Monitor Redis connection pool limits

## Monitoring

### Health Checks

The worker doesn't expose HTTP, but you can monitor it via:
- Process health (PM2, Docker healthcheck, k8s liveness probe)
- Redis queue length metrics
- Application logs

### Logging

Worker logs include:
- Job processing start/complete/failure
- Queue polling activity
- Graceful shutdown progress

Filter logs:

```bash
# View worker logs only
pm2 logs merchantos-worker

# Docker logs
docker logs merchantos-worker

# Kubernetes
kubectl logs deployment/merchantos-worker
```

## Troubleshooting

### Worker not processing jobs

1. Check Redis connection: `redis-cli PING`
2. Verify environment variables are set
3. Check queue length: `LLEN bull:email:wait`
4. Review worker logs for errors

### Jobs failing repeatedly

1. Check job dead letter queue: `LLEN bull:email:failed`
2. Inspect failed job data
3. Verify external service credentials (Resend, Brevo, etc.)

### High memory usage

1. Reduce `WORKER_CONCURRENCY`
2. Add memory limits in Docker/Kubernetes
3. Monitor for memory leaks in job handlers

## Development

### Adding New Job Types

1. Add job type to `QueueName` in `src/lib/queue.ts`
2. Implement handler in queue processor
3. Add queue name to `QUEUES_TO_PROCESS` in `worker.ts`
4. Update this documentation

### Testing Jobs Locally

```typescript
import { enqueueJob } from '@/lib/queue';

// Enqueue a test email job
await enqueueJob('email', {
  type: 'ORDER_CONFIRMATION',
  data: { email: 'test@example.com', orderNumber: 'TEST-001' }
});
```
