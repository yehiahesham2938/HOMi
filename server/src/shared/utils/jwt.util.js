import jwt from 'jsonwebtoken';
import env from '../../config/env.js';
// Parse duration string to seconds
function parseDuration(duration) {
    const match = duration.match(/^(\d+)([smhd])$/);
    if (!match)
        return 900; // Default 15 minutes
    const [, value, unit] = match;
    const num = parseInt(value, 10);
    switch (unit) {
        case 's': return num;
        case 'm': return num * 60;
        case 'h': return num * 60 * 60;
        case 'd': return num * 60 * 60 * 24;
        default: return 900;
    }
}
/**
 * Generates an access token (short-lived).
 * Default expiration: 15 minutes
 * @param payload - User data to encode in the token
 * @returns Signed JWT access token
 */
export function generateAccessToken(payload) {
    const expiresIn = parseDuration(env.JWT_ACCESS_EXPIRATION);
    return jwt.sign({ userId: payload.userId, email: payload.email, role: payload.role }, env.JWT_SECRET, { expiresIn, issuer: 'homi-auth', audience: 'homi-api' });
}
/**
 * Generates a refresh token (long-lived).
 * Default expiration: 7 days
 * @param payload - User data to encode in the token
 * @returns Signed JWT refresh token
 */
export function generateRefreshToken(payload) {
    const expiresIn = parseDuration(env.JWT_REFRESH_EXPIRATION);
    return jwt.sign({ userId: payload.userId, email: payload.email, role: payload.role }, env.JWT_REFRESH_SECRET, { expiresIn, issuer: 'homi-auth', audience: 'homi-api' });
}
/**
 * Generates both access and refresh tokens.
 * @param userId - User's unique identifier
 * @param email - User's email
 * @param role - User's role
 * @returns Object containing both tokens
 */
export function generateTokenPair(userId, email, role) {
    const payload = {
        userId,
        email,
        role,
    };
    return {
        accessToken: generateAccessToken(payload),
        refreshToken: generateRefreshToken(payload),
    };
}
/**
 * Verifies and decodes an access token.
 * @param token - The JWT access token to verify
 * @returns Decoded payload if valid
 * @throws Error if token is invalid or expired
 */
export function verifyAccessToken(token) {
    try {
        const decoded = jwt.verify(token, env.JWT_SECRET, {
            issuer: 'homi-auth',
            audience: 'homi-api',
        });
        return decoded;
    }
    catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            throw new Error('Access token has expired');
        }
        if (error instanceof jwt.JsonWebTokenError) {
            throw new Error('Invalid access token');
        }
        throw error;
    }
}
/**
 * Verifies and decodes a refresh token.
 * @param token - The JWT refresh token to verify
 * @returns Decoded payload if valid
 * @throws Error if token is invalid or expired
 */
export function verifyRefreshToken(token) {
    try {
        const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET, {
            issuer: 'homi-auth',
            audience: 'homi-api',
        });
        return decoded;
    }
    catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            throw new Error('Refresh token has expired');
        }
        if (error instanceof jwt.JsonWebTokenError) {
            throw new Error('Invalid refresh token');
        }
        throw error;
    }
}
/**
 * Extracts the token from Authorization header.
 * Supports "Bearer <token>" format only.
 * @param authHeader - The Authorization header value
 * @returns The extracted token or null
 */
export function extractBearerToken(authHeader) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }
    return authHeader.slice(7);
}
export default {
    generateAccessToken,
    generateRefreshToken,
    generateTokenPair,
    verifyAccessToken,
    verifyRefreshToken,
    extractBearerToken,
};
