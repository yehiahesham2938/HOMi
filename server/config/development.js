export default {
    app: {
        nodeEnv: 'development',
        testDateEnabled: true,
    },
    security: {
        corsOrigins: ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5174'],
    },
    scalability: {
        redis: {
            enabled: false,
        },
        rateLimit: {
            enabled: false,
            windowSeconds: 600,
            maxRequests: 50,
        },
        cache: {
            enabled: false,
            defaultTtlSeconds: 900,
            popularPropertiesTtlSeconds: 600,
            sessionTtlSeconds: 900,
        },
    },
};
