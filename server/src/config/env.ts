import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

interface EnvConfig {
    // Server
    NODE_ENV: 'development' | 'production' | 'test';
    PORT: number;

    // Database
    DB_HOST: string;
    DB_PORT: number;
    DB_NAME: string;
    DB_USER: string;
    DB_PASSWORD: string;
    DATABASE_URL: string | undefined;

    // JWT
    JWT_SECRET: string;
    JWT_REFRESH_SECRET: string;
    JWT_ACCESS_EXPIRATION: string;
    JWT_REFRESH_EXPIRATION: string;

    // Encryption
    ENCRYPTION_KEY: string;
}

function getEnvString(key: string, defaultValue?: string): string {
    const value = process.env[key];
    if (value === undefined) {
        if (defaultValue !== undefined) {
            return defaultValue;
        }
        throw new Error(`Environment variable ${key} is required but not set`);
    }
    return value;
}

function getEnvNumber(key: string, defaultValue?: number): number {
    const value = process.env[key];
    if (value === undefined) {
        if (defaultValue !== undefined) {
            return defaultValue;
        }
        throw new Error(`Environment variable ${key} is required but not set`);
    }
    const parsed = parseInt(value, 10);
    if (isNaN(parsed)) {
        throw new Error(`Environment variable ${key} must be a valid number`);
    }
    return parsed;
}

function validateNodeEnv(value: string): 'development' | 'production' | 'test' {
    if (value === 'development' || value === 'production' || value === 'test') {
        return value;
    }
    throw new Error(`NODE_ENV must be 'development', 'production', or 'test'`);
}

export const env: EnvConfig = {
    // Server
    NODE_ENV: validateNodeEnv(getEnvString('NODE_ENV', 'development')),
    PORT: getEnvNumber('PORT', 3000),

    // Database
    DB_HOST: getEnvString('DB_HOST', 'localhost'),
    DB_PORT: getEnvNumber('DB_PORT', 5432),
    DB_NAME: getEnvString('DB_NAME', 'homi_db'),
    DB_USER: getEnvString('DB_USER', 'postgres'),
    DB_PASSWORD: getEnvString('DB_PASSWORD', ''),
    DATABASE_URL: process.env['DATABASE_URL'],

    // JWT
    JWT_SECRET: getEnvString('JWT_SECRET', 'dev-jwt-secret-change-in-production'),
    JWT_REFRESH_SECRET: getEnvString('JWT_REFRESH_SECRET', 'dev-refresh-secret-change-in-production'),
    JWT_ACCESS_EXPIRATION: getEnvString('JWT_ACCESS_EXPIRATION', '15m'),
    JWT_REFRESH_EXPIRATION: getEnvString('JWT_REFRESH_EXPIRATION', '7d'),

    // Encryption (32 bytes = 64 hex characters for AES-256)
    ENCRYPTION_KEY: getEnvString('ENCRYPTION_KEY', '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'),
};

export default env;
