export default {
    app: {
        nodeEnv: 'production',
        testDateEnabled: false,
    },
    // corsOrigins intentionally omitted here so the value is driven by the
    // CORS_ORIGINS environment variable (see config/default.ts). Set it to your
    // deployed frontend URL on Railway, e.g. CORS_ORIGINS=https://your-app.vercel.app
    database: {
        pool: {
            max: 30,
            min: 5,
            acquireMs: 60000,
            idleMs: 30000,
        },
    },
    scalability: {
        
        redis: {
            enabled: true,
        },
        rateLimit: {
            enabled: true,
            windowSeconds: 600,
            maxRequests: 50, 
        },
        cache: {
            enabled: true,
            defaultTtlSeconds: 900,
            popularPropertiesTtlSeconds: 600,
            sessionTtlSeconds: 900,
        },
    },
};
