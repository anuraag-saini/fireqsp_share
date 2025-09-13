# Health Monitoring System - FireQSP

## Overview

This document describes the health monitoring system integrated into the FireQSP admin dashboard for Railway deployment monitoring.

## Components

### 1. Health API Endpoint (`/api/health`)

**Location:** `app/api/health/route.ts`

**Features:**
- Real-time system health status
- Uptime monitoring
- Memory usage tracking
- Environment information
- Service status checks
- Node.js version and platform info

**Response Format:**
```json
{
  "status": "healthy",
  "timestamp": "2025-09-13T...",
  "uptime": 12345,
  "system": {
    "nodeVersion": "v18.17.0",
    "platform": "linux",
    "environment": "production",
    "memory": {
      "used": 45,
      "total": 128,
      "external": 12
    },
    "pid": 1234
  },
  "services": {
    "api": "healthy",
    "database": "healthy"
  }
}
```

### 2. HealthMonitor Component

**Location:** `components/admin/HealthMonitor.tsx`

**Features:**
- Auto-refresh every 30 seconds (toggleable)
- Response time measurement
- Visual status indicators
- System metrics display
- Service status grid
- Railway integration information

### 3. SystemStatusIndicator Component

**Location:** `components/admin/SystemStatusIndicator.tsx`

**Features:**
- Compact status indicator for admin header
- Real-time status updates every 60 seconds
- Color-coded status (green/red/yellow)
- Response time display

## Integration Points

### Admin Dashboard Integration

The health monitoring is integrated into the admin dashboard in two locations:

1. **Overview Tab**: Full HealthMonitor component for comprehensive monitoring
2. **Settings Tab**: Dedicated health monitoring section
3. **Header**: SystemStatusIndicator for quick status reference

### Railway Configuration

**Health Check URL:** `https://your-domain.railway.app/api/health`

Configure in Railway dashboard:
- Path: `/api/health`
- Method: GET
- Expected Status: 200
- Timeout: 30 seconds

## Railway Deployment Fixes

### 1. Graceful Shutdown Handling

**File:** `next.config.ts`

Added SIGTERM and SIGINT handlers to prevent Railway deployment errors:

```typescript
// Handle graceful shutdown for Railway
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully...');
  process.exit(0);
});
```

### 2. Port Configuration

**File:** `package.json`

Updated start script to use Railway's PORT environment variable:

```json
{
  "scripts": {
    "start": "next start -p ${PORT:-3000}"
  }
}
```

### 3. Railway Configuration

**File:** `railway.toml`

```toml
[build]
builder = "nixpacks"

[deploy]
startCommand = "npm start"
restartPolicyType = "on-failure"
restartPolicyMaxRetries = 10

[environment]
NODE_OPTIONS = "--max-old-space-size=4096"
```

## Monitoring Features

### Real-Time Metrics

- **Uptime**: Time since last application restart
- **Response Time**: API endpoint response time
- **Memory Usage**: Heap memory consumption
- **System Info**: Node.js version, platform, process ID

### Status Indicators

- **Green (Healthy)**: All systems operational
- **Red (Unhealthy)**: Issues detected
- **Yellow (Checking)**: Status verification in progress

### Auto-Refresh

- HealthMonitor: 30-second intervals (toggleable)
- StatusIndicator: 60-second intervals
- Manual refresh available

## Usage

### Accessing Health Data

1. **Direct API**: `GET /api/health`
2. **Admin Dashboard**: Navigate to Overview or Settings tab
3. **Header Status**: Always visible in admin header

### Monitoring Best Practices

1. **Regular Monitoring**: Check the Overview tab regularly
2. **Response Time**: Monitor for degradation (>1000ms = slow)
3. **Memory Usage**: Watch for memory leaks
4. **Service Status**: Ensure all services remain healthy

### Troubleshooting

**Common Issues:**

1. **High Response Time**: Check server load and network
2. **Memory Growth**: Look for memory leaks in application
3. **Service Failures**: Check individual service health
4. **Deployment Issues**: Review Railway logs for SIGTERM handling

**Quick Fixes:**

1. **Restart Application**: Use Railway dashboard
2. **Clear Memory**: Application restart clears memory
3. **Check Logs**: Railway deployment logs for errors

## Railway Integration Benefits

1. **Health Checks**: Railway can monitor `/api/health` endpoint
2. **Load Balancing**: Health status informs load balancer
3. **Auto-Restart**: Unhealthy instances automatically restarted
4. **Monitoring**: Integration with Railway's monitoring system

## Development Notes

### Adding New Health Checks

To add new service health checks, modify `/api/health/route.ts`:

```typescript
// Add your service check
const databaseHealthy = await checkDatabase();

const healthData = {
  // ... existing fields
  services: {
    api: 'healthy',
    database: databaseHealthy ? 'healthy' : 'unhealthy',
    yourService: 'healthy' // Add new service
  }
};
```

### Customizing Thresholds

Response time thresholds in HealthMonitor component:

```typescript
// Current thresholds
const isExcellent = responseTime < 500;  // < 500ms
const isGood = responseTime < 1000;      // < 1000ms
const isSlow = responseTime >= 1000;     // >= 1000ms
```

## Deployment Checklist

Before deploying to Railway:

- [ ] Health endpoint accessible at `/api/health`
- [ ] SIGTERM handlers in place
- [ ] PORT environment variable configured
- [ ] railway.toml file present
- [ ] Admin dashboard health integration working
- [ ] Status indicator in header functional

## Support

For issues with the health monitoring system:

1. Check Railway deployment logs
2. Verify health endpoint response
3. Review admin dashboard console for errors
4. Test individual components in development

## Security Considerations

- Health endpoint provides system information
- Consider rate limiting for public deployments
- Monitor for potential information disclosure
- Ensure admin access controls are in place
