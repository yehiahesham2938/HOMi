import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';
import createDefaultConfig from '../../config/default.js';
import developmentConfig from '../../config/development.js';
import productionConfig from '../../config/production.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
const defaultConfig = createDefaultConfig(process.env);
const nodeEnvSchema = z.enum(['development', 'production', 'test']);
const appConfigSchema = z.object({
    app: z.object({
        nodeEnv: nodeEnvSchema,
        port: z.number().int().positive(),
        clientUrl: z.string().min(1),
        testDateEnabled: z.boolean(),
    }),
    security: z.object({
        corsOrigins: z.array(z.string().min(1)).min(1),
    }),
    database: z.object({
        host: z.string().min(1),
        port: z.number().int().positive(),
        name: z.string().min(1),
        user: z.string().min(1),
        password: z.string(),
        url: z.string().optional(),
        pool: z.object({
            max: z.number().int().positive(),
            min: z.number().int().nonnegative(),
            acquireMs: z.number().int().positive(),
            idleMs: z.number().int().positive(),
        }),
    }),
    auth: z.object({
        jwt: z.object({
            accessSecret: z.string().min(1),
            refreshSecret: z.string().min(1),
            accessExpiration: z.string().min(1),
            refreshExpiration: z.string().min(1),
        }),
        webauthn: z.object({
            rpId: z.string().optional(),
            origin: z.string().optional(),
        }),
    }),
    encryption: z.object({
        key: z.string().min(1),
    }),
    email: z.object({
        host: z.string().min(1),
        port: z.number().int().positive(),
        user: z.string(),
        pass: z.string(),
        fromEmail: z.string().min(1),
        fromName: z.string().min(1),
    }),
    adminSeed: z.object({
        email: z.string().min(1),
        password: z.string().min(1),
    }),
    paymob: z.object({
        baseUrl: z.string().min(1),
        apiKey: z.string(),
        integrationId: z.number().int().nonnegative(),
        walletIntegrationId: z.number().int().nonnegative(),
        iframeId: z.number().int().nonnegative(),
        walletIframeId: z.number().int().nonnegative(),
        hmacSecret: z.string(),
    }),
    gemini: z.object({
        apiKey: z.string(),
        modelName: z.string().min(1),
    }),
    scalability: z.object({
        redis: z.object({
            enabled: z.boolean(),
            restUrl: z.string().min(1),
            restToken: z.string().min(1),
            keyPrefix: z.string().min(1),
        }),
        rateLimit: z.object({
            enabled: z.boolean(),
            windowSeconds: z.number().int().positive(),
            maxRequests: z.number().int().positive(),
            prefix: z.string().min(1),
            standardHeaders: z.boolean(),
            legacyHeaders: z.boolean(),
        }),
        cache: z.object({
            enabled: z.boolean(),
            prefix: z.string().min(1),
            defaultTtlSeconds: z.number().int().positive(),
            popularPropertiesTtlSeconds: z.number().int().positive(),
            sessionTtlSeconds: z.number().int().positive(),
        }),
    }),
});
const deepMerge = (target, source) => {
    const output = { ...target };
    for (const [key, sourceValue] of Object.entries(source)) {
        const targetValue = output[key];
        if (sourceValue &&
            typeof sourceValue === 'object' &&
            !Array.isArray(sourceValue) &&
            targetValue &&
            typeof targetValue === 'object' &&
            !Array.isArray(targetValue)) {
            output[key] = deepMerge(targetValue, sourceValue);
            continue;
        }
        output[key] = sourceValue;
    }
    return output;
};
const getProfileOverrides = (nodeEnv) => {
    if (nodeEnv === 'production')
        return productionConfig;
    return developmentConfig;
};
const resolvedNodeEnv = nodeEnvSchema.parse(process.env.NODE_ENV ?? defaultConfig.app.nodeEnv);
const mergedConfig = deepMerge(defaultConfig, getProfileOverrides(resolvedNodeEnv));
export const appConfig = appConfigSchema.parse(mergedConfig);
export const env = {
    NODE_ENV: appConfig.app.nodeEnv,
    PORT: appConfig.app.port,
    TEST_DATE: appConfig.app.testDateEnabled,
    CLIENT_URL: appConfig.app.clientUrl,
    CORS_ORIGINS: appConfig.security.corsOrigins,
    DB_HOST: appConfig.database.host,
    DB_PORT: appConfig.database.port,
    DB_NAME: appConfig.database.name,
    DB_USER: appConfig.database.user,
    DB_PASSWORD: appConfig.database.password,
    DATABASE_URL: appConfig.database.url,
    DB_POOL_MAX: appConfig.database.pool.max,
    DB_POOL_MIN: appConfig.database.pool.min,
    DB_POOL_ACQUIRE_MS: appConfig.database.pool.acquireMs,
    DB_POOL_IDLE_MS: appConfig.database.pool.idleMs,
    JWT_SECRET: appConfig.auth.jwt.accessSecret,
    JWT_REFRESH_SECRET: appConfig.auth.jwt.refreshSecret,
    JWT_ACCESS_EXPIRATION: appConfig.auth.jwt.accessExpiration,
    JWT_REFRESH_EXPIRATION: appConfig.auth.jwt.refreshExpiration,
    ENCRYPTION_KEY: appConfig.encryption.key,
    SMTP_HOST: appConfig.email.host,
    SMTP_PORT: appConfig.email.port,
    SMTP_USER: appConfig.email.user,
    SMTP_PASS: appConfig.email.pass,
    SMTP_FROM_EMAIL: appConfig.email.fromEmail,
    SMTP_FROM_NAME: appConfig.email.fromName,
    WEBAUTHN_RP_ID: appConfig.auth.webauthn.rpId,
    WEBAUTHN_ORIGIN: appConfig.auth.webauthn.origin,
    ADMIN_SEED_EMAIL: appConfig.adminSeed.email,
    ADMIN_SEED_PASSWORD: appConfig.adminSeed.password,
    PAYMOB_BASE_URL: appConfig.paymob.baseUrl,
    PAYMOB_API_KEY: appConfig.paymob.apiKey,
    PAYMOB_INTEGRATION_ID: appConfig.paymob.integrationId,
    PAYMOB_WALLET_INTEGRATION_ID: appConfig.paymob.walletIntegrationId,
    PAYMOB_IFRAME_ID: appConfig.paymob.iframeId,
    PAYMOB_WALLET_IFRAME_ID: appConfig.paymob.walletIframeId,
    PAYMOB_HMAC_SECRET: appConfig.paymob.hmacSecret,
    GEMINI_API_KEY: appConfig.gemini.apiKey,
    GEMINI_MODEL_NAME: appConfig.gemini.modelName,
    REDIS_ENABLED: appConfig.scalability.redis.enabled,
    UPSTASH_REDIS_REST_URL: appConfig.scalability.redis.restUrl,
    UPSTASH_REDIS_REST_TOKEN: appConfig.scalability.redis.restToken,
    REDIS_KEY_PREFIX: appConfig.scalability.redis.keyPrefix,
    RATE_LIMIT_ENABLED: appConfig.scalability.rateLimit.enabled,
    RATE_LIMIT_WINDOW_SECONDS: appConfig.scalability.rateLimit.windowSeconds,
    RATE_LIMIT_MAX_REQUESTS: appConfig.scalability.rateLimit.maxRequests,
    RATE_LIMIT_PREFIX: appConfig.scalability.rateLimit.prefix,
    RATE_LIMIT_STANDARD_HEADERS: appConfig.scalability.rateLimit.standardHeaders,
    RATE_LIMIT_LEGACY_HEADERS: appConfig.scalability.rateLimit.legacyHeaders,
    CACHE_ENABLED: appConfig.scalability.cache.enabled,
    CACHE_PREFIX: appConfig.scalability.cache.prefix,
    CACHE_DEFAULT_TTL_SECONDS: appConfig.scalability.cache.defaultTtlSeconds,
    CACHE_POPULAR_PROPERTIES_TTL_SECONDS: appConfig.scalability.cache.popularPropertiesTtlSeconds,
    SESSION_TTL_SECONDS: appConfig.scalability.cache.sessionTtlSeconds,
};
export default env;
