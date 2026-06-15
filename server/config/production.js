// Production frontend is deployed at https://homi-platform.com. These values are
// baked in so production works out of the box, but each still honours its env var
// (CLIENT_URL / CORS_ORIGINS / WEBAUTHN_*) when set on the host, so they remain
// overridable without a code change.
const PRODUCTION_CLIENT_URL = 'https://homi-platform.com';
const PRODUCTION_CORS_ORIGINS = ['https://homi-platform.com', 'https://www.homi-platform.com'];

const splitOrigins = (value) =>
    value
        ? value.split(',').map((origin) => origin.trim()).filter(Boolean)
        : undefined;

export default {
    app: {
        nodeEnv: 'production',
        testDateEnabled: false,
        clientUrl: process.env.CLIENT_URL ?? PRODUCTION_CLIENT_URL,
    },
    security: {
        // Driven by CORS_ORIGINS when set, otherwise defaults to the homi-platform.com
        // frontend. Applies to both Express CORS and Socket.IO.
        corsOrigins: splitOrigins(process.env.CORS_ORIGINS) ?? PRODUCTION_CORS_ORIGINS,
    },
    auth: {
        webauthn: {
            rpId: process.env.WEBAUTHN_RP_ID ?? 'homi-platform.com',
            origin: process.env.WEBAUTHN_ORIGIN ?? PRODUCTION_CLIENT_URL,
        },
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
