import { Server as HttpServer } from 'node:http';
import { Server, type Socket } from 'socket.io';
import { env } from '../../config/env.js';
import { extractBearerToken, verifyAccessToken, type JWTPayload } from '../utils/jwt.util.js';
import { messageService } from '../../modules/messages/services/message.service.js';
import { MaintenanceRequest } from '../../modules/maintenance/models/MaintenanceRequest.js';
import { UserRole } from '../../modules/auth/models/User.js';

interface AuthedSocket extends Socket {
    data: {
        user?: JWTPayload;
    };
}

let io: Server | null = null;

function resolveToken(socket: Socket): string | null {
    const authToken = socket.handshake.auth?.token;
    if (typeof authToken === 'string' && authToken.trim()) {
        return authToken.trim();
    }

    const authorization = socket.handshake.headers.authorization;
    return extractBearerToken(authorization);
}

export function initSocketServer(server: HttpServer): Server {
    io = new Server(server, {
        cors: {
            origin: env.NODE_ENV === 'development'
                ? (origin, callback) => callback(null, true)
                : env.CORS_ORIGINS,
            credentials: true,
        },
    });

    io.use((socket, next) => {
        try {
            const token = resolveToken(socket);
            if (!token) {
                return next(new Error('Unauthorized: missing token'));
            }

            const decoded = verifyAccessToken(token);
            (socket as AuthedSocket).data.user = decoded;
            return next();
        } catch {
            return next(new Error('Unauthorized: invalid token'));
        }
    });

    io.on('connection', (socket) => {
        const authedSocket = socket as AuthedSocket;
        const user = authedSocket.data.user;

        if (!user) {
            socket.disconnect(true);
            return;
        }

        socket.join(`user:${user.userId}`);

        socket.on('conversation:join', async (payload: { conversationId?: string }) => {
            const conversationId = payload?.conversationId;
            if (!conversationId) {
                return;
            }

            const canAccess = await messageService.canUserAccessConversation(user.userId, conversationId);
            if (!canAccess) {
                return;
            }

            socket.join(`conversation:${conversationId}`);
        });

        socket.on('conversation:leave', (payload: { conversationId?: string }) => {
            const conversationId = payload?.conversationId;
            if (!conversationId) {
                return;
            }

            socket.leave(`conversation:${conversationId}`);
        });

        // ─── Maintenance request live tracking ──────────────────────────
        socket.on('maintenance:join', async (payload: { requestId?: string }) => {
            const requestId = payload?.requestId;
            if (!requestId) return;
            try {
                const req = await MaintenanceRequest.findByPk(requestId);
                if (!req) return;
                const isParty =
                    req.tenant_id === user.userId ||
                    req.landlord_id === user.userId ||
                    req.assigned_provider_id === user.userId ||
                    user.role === UserRole.ADMIN;
                if (!isParty) return;
                socket.join(`maintenance_request:${requestId}`);
            } catch {
                /* ignore */
            }
        });

        socket.on('maintenance:leave', (payload: { requestId?: string }) => {
            const requestId = payload?.requestId;
            if (!requestId) return;
            socket.leave(`maintenance_request:${requestId}`);
        });
    });

    // ─── NID Session namespace (unauthenticated) ─────────────────────────────
    // Mobile phones scanning the QR code may not have an active HOMI session.
    // We use a separate namespace and let clients join rooms by the session token.
    const nidNs = io.of('/nid-session');
    nidNs.on('connection', (socket) => {
        socket.on('join', (payload: { token?: string }) => {
            const token = payload?.token;
            if (token && /^[0-9a-f]{64}$/.test(token)) {
                socket.join(`nid:${token}`);
            }
        });
    });

    return io;
}

export function getIO(): Server {
    if (!io) {
        throw new Error('Socket.IO has not been initialized');
    }
    return io;
}

/** Emit a nid:completed event to all desktop clients waiting for this session token. */
export function emitNidCompleted(
    token: string,
    payload: { nationalId: string; fullNameArabic: string }
): void {
    if (!io) return;
    io.of('/nid-session').to(`nid:${token}`).emit('nid:completed', payload);
}

export default {
    initSocketServer,
    getIO,
    emitNidCompleted,
};
