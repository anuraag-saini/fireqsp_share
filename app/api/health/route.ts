import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Get system metrics
    const startTime = Date.now();
    
    // Check database connectivity (if you have database checks)
    // You can add database ping here if needed
    
    // Memory usage
    const memoryUsage = process.memoryUsage();
    
    // Environment info
    const nodeVersion = process.version;
    const platform = process.platform;
    const env = process.env.NODE_ENV || 'development';
    
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      system: {
        nodeVersion,
        platform,
        environment: env,
        memory: {
          used: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
          total: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
          external: Math.round(memoryUsage.external / 1024 / 1024), // MB
        },
        pid: process.pid,
      },
      services: {
        api: 'healthy',
        database: 'healthy', // You can add actual DB check here
        // Add other service checks as needed
      }
    };
    
    return NextResponse.json(healthData);
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json(
      { 
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Health check failed',
        uptime: process.uptime(),
      },
      { status: 500 }
    );
  }
}
