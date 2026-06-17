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
type NodeEnvironment = z.infer<typeof nodeEnvSchema>;

type DeepPartial<T> = {
    [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

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
        resendApiKey: z.string().optional(),
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

export type AppConfig = z.infer<typeof appConfigSchema>;

const deepMerge = <T extends object>(target: T, source: DeepPartial<T>): T => {
    const output = { ...target } as Record<string, unknown>;
    for (const [key, sourceValue] of Object.entries(source)) {
        const targetValue = output[key];
        if (
            sourceValue &&
            typeof sourceValue === 'object' &&
            !Array.isArray(sourceValue) &&
            targetValue &&
            typeof targetValue === 'object' &&
            !Array.isArray(targetValue)
        ) {
            output[key] = deepMerge(
                targetValue as Record<string, unknown>,
                sourceValue as Record<string, unknown>
            );
            continue;
        }
        output[key] = sourceValue;
    }
    return output as T;
};

const getProfileOverrides = (nodeEnv: NodeEnvironment): DeepPartial<AppConfig> => {
    if (nodeEnv === 'production') return productionConfig as DeepPartial<AppConfig>;
    return developmentConfig as DeepPartial<AppConfig>;
};

const resolvedNodeEnv = nodeEnvSchema.parse(process.env.NODE_ENV ?? defaultConfig.app.nodeEnv);

const mergedConfig = deepMerge(
    defaultConfig as AppConfig,
    getProfileOverrides(resolvedNodeEnv)
);

export const appConfig = appConfigSchema.parse(mergedConfig);

export interface EnvConfig {
    NODE_ENV: NodeEnvironment;
    PORT: number;
    TEST_DATE: boolean;
    CLIENT_URL: string;
    CORS_ORIGINS: string[];

    DB_HOST: string;
    DB_PORT: number;
    DB_NAME: string;
    DB_USER: string;
    DB_PASSWORD: string;
    DATABASE_URL: string | undefined;
    DB_POOL_MAX: number;
    DB_POOL_MIN: number;
    DB_POOL_ACQUIRE_MS: number;
    DB_POOL_IDLE_MS: number;

    JWT_SECRET: string;
    JWT_REFRESH_SECRET: string;
    JWT_ACCESS_EXPIRATION: string;
    JWT_REFRESH_EXPIRATION: string;

    ENCRYPTION_KEY: string;

    SMTP_HOST: string;
    SMTP_PORT: number;
    SMTP_USER: string;
    SMTP_PASS: string;
    SMTP_FROM_EMAIL: string;
    SMTP_FROM_NAME: string;
    RESEND_API_KEY: string | undefined;

    WEBAUTHN_RP_ID: string | undefined;
    WEBAUTHN_ORIGIN: string | undefined;

    ADMIN_SEED_EMAIL: string;
    ADMIN_SEED_PASSWORD: string;

    PAYMOB_BASE_URL: string;
    PAYMOB_API_KEY: string;
    PAYMOB_INTEGRATION_ID: number;
    PAYMOB_WALLET_INTEGRATION_ID: number;
    PAYMOB_IFRAME_ID: number;
    PAYMOB_WALLET_IFRAME_ID: number;
    PAYMOB_HMAC_SECRET: string;

    GEMINI_API_KEY: string;
    GEMINI_MODEL_NAME: string;

    REDIS_ENABLED: boolean;
    UPSTASH_REDIS_REST_URL: string;
    UPSTASH_REDIS_REST_TOKEN: string;
    REDIS_KEY_PREFIX: string;

    RATE_LIMIT_ENABLED: boolean;
    RATE_LIMIT_WINDOW_SECONDS: number;
    RATE_LIMIT_MAX_REQUESTS: number;
    RATE_LIMIT_PREFIX: string;
    RATE_LIMIT_STANDARD_HEADERS: boolean;
    RATE_LIMIT_LEGACY_HEADERS: boolean;

    CACHE_ENABLED: boolean;
    CACHE_PREFIX: string;
    CACHE_DEFAULT_TTL_SECONDS: number;
    CACHE_POPULAR_PROPERTIES_TTL_SECONDS: number;
    SESSION_TTL_SECONDS: number;
}

export const env: EnvConfig = {
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
    RESEND_API_KEY: appConfig.email.resendApiKey,

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
