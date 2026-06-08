export default {
    app: {
        nodeEnv: 'production',
        testDateEnabled: false,
    },
    security: {
        corsOrigins: ['https://homi.app'],
    },
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
