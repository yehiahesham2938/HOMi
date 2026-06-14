const toNumber = (value: unknown, fallback: number): number => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

export const createDefaultConfig = (rawEnv: NodeJS.ProcessEnv = process.env) => ({
    app: {
        nodeEnv: rawEnv.NODE_ENV ?? 'development',
        port: toNumber(rawEnv.PORT, 3000),
        clientUrl: rawEnv.CLIENT_URL ?? 'http://localhost:5173',
        testDateEnabled: false,
    },
    security: {
        // Comma-separated list of allowed browser origins. In production set
        // CORS_ORIGINS to your deployed frontend URL(s), e.g.
        //   CORS_ORIGINS=https://your-app.vercel.app
        corsOrigins: rawEnv.CORS_ORIGINS
            ? rawEnv.CORS_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean)
            : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5174'],
    },
    database: {
        host: rawEnv.DB_HOST ?? 'localhost',
        port: toNumber(rawEnv.DB_PORT, 5432),
        name: rawEnv.DB_NAME ?? 'homi_db',
        user: rawEnv.DB_USER ?? 'postgres',
        password: rawEnv.DB_PASSWORD ?? '',
        url: rawEnv.DATABASE_URL,
        pool: {
            max: toNumber(rawEnv.DB_POOL_MAX, 10),
            min: toNumber(rawEnv.DB_POOL_MIN, 2),
            acquireMs: toNumber(rawEnv.DB_POOL_ACQUIRE_MS, 30000),
            idleMs: toNumber(rawEnv.DB_POOL_IDLE_MS, 30000),
        },
    },
    auth: {
        jwt: {
            accessSecret: rawEnv.JWT_SECRET ?? 'dev-jwt-secret-change-in-production',
            refreshSecret: rawEnv.JWT_REFRESH_SECRET ?? 'dev-refresh-secret-change-in-production',
            accessExpiration: rawEnv.JWT_ACCESS_EXPIRATION ?? '15m',
            refreshExpiration: rawEnv.JWT_REFRESH_EXPIRATION ?? '7d',
        },
        webauthn: {
            rpId: rawEnv.WEBAUTHN_RP_ID,
            origin: rawEnv.WEBAUTHN_ORIGIN,
        },
    },
    encryption: {
        key: rawEnv.ENCRYPTION_KEY ?? '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    },
    email: {
        host: rawEnv.SMTP_HOST ?? 'smtp.gmail.com',
        port: toNumber(rawEnv.SMTP_PORT, 587),
        user: rawEnv.SMTP_USER ?? '',
        pass: rawEnv.SMTP_PASS ?? '',
        fromEmail: rawEnv.SMTP_FROM_EMAIL ?? 'noreply@homi.com',
        fromName: rawEnv.SMTP_FROM_NAME ?? 'HOMi',
    },
    adminSeed: {
        email: rawEnv.ADMIN_SEED_EMAIL ?? 'Homi@admin.com',
        password: rawEnv.ADMIN_SEED_PASSWORD ?? 'HomiAdmin',
    },
    paymob: {
        baseUrl: rawEnv.PAYMOB_BASE_URL ?? 'https://accept.paymob.com',
        apiKey: rawEnv.PAYMOB_API_KEY ?? '',
        integrationId: toNumber(rawEnv.PAYMOB_INTEGRATION_ID, 0),
        walletIntegrationId: toNumber(rawEnv.PAYMOB_WALLET_INTEGRATION_ID, 5607894),
        iframeId: toNumber(rawEnv.PAYMOB_IFRAME_ID, 0),
        walletIframeId: toNumber(rawEnv.PAYMOB_WALLET_IFRAME_ID, 0),
        hmacSecret: rawEnv.PAYMOB_HMAC_SECRET ?? '',
    },
    gemini: {
        apiKey: rawEnv.GEMINI_API_KEY ?? '',
        modelName: rawEnv.GEMINI_MODEL_NAME ?? 'gemini-2.0-flash',
    },
    scalability: {
        redis: {
            enabled: rawEnv.REDIS_ENABLED === 'true',
            restUrl: rawEnv.UPSTASH_REDIS_REST_URL ?? '',
            restToken: rawEnv.UPSTASH_REDIS_REST_TOKEN ?? '',
            keyPrefix: rawEnv.REDIS_KEY_PREFIX ?? 'homi:',
        },
        rateLimit: {
            enabled: rawEnv.RATE_LIMIT_ENABLED === 'true',
            windowSeconds: toNumber(rawEnv.RATE_LIMIT_WINDOW_SECONDS, 600),
            maxRequests: toNumber(rawEnv.RATE_LIMIT_MAX_REQUESTS, 100),
            prefix: rawEnv.RATE_LIMIT_PREFIX ?? 'homi:ratelimit:ip',
            standardHeaders: true,
            legacyHeaders: false,
        },
        cache: {
            enabled: rawEnv.CACHE_ENABLED === 'true',
            prefix: rawEnv.CACHE_PREFIX ?? 'homi:cache',
            defaultTtlSeconds: toNumber(rawEnv.CACHE_DEFAULT_TTL_SECONDS, 600),
            popularPropertiesTtlSeconds: toNumber(rawEnv.CACHE_POPULAR_PROPERTIES_TTL_SECONDS, 600),
            sessionTtlSeconds: toNumber(rawEnv.SESSION_TTL_SECONDS, 900),
        },
    },
});

export default createDefaultConfig;
