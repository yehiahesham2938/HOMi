import { Server } from 'socket.io';
import { env } from '../../config/env.js';
import { extractBearerToken, verifyAccessToken } from '../utils/jwt.util.js';
import { messageService } from '../../modules/messages/services/message.service.js';
import { MaintenanceRequest } from '../../modules/maintenance/models/MaintenanceRequest.js';
import { UserRole } from '../../modules/auth/models/User.js';
let io = null;
function resolveToken(socket) {
    const authToken = socket.handshake.auth?.token;
    if (typeof authToken === 'string' && authToken.trim()) {
        return authToken.trim();
    }
    const authorization = socket.handshake.headers.authorization;
    return extractBearerToken(authorization);
}
export function initSocketServer(server) {
    io = new Server(server, {
        cors: {
            origin: env.CORS_ORIGINS,
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
            socket.data.user = decoded;
            return next();
        }
        catch {
            return next(new Error('Unauthorized: invalid token'));
        }
    });
    io.on('connection', (socket) => {
        const authedSocket = socket;
        const user = authedSocket.data.user;
        if (!user) {
            socket.disconnect(true);
            return;
        }
        socket.join(`user:${user.userId}`);
        socket.on('conversation:join', async (payload) => {
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
        socket.on('conversation:leave', (payload) => {
            const conversationId = payload?.conversationId;
            if (!conversationId) {
                return;
            }
            socket.leave(`conversation:${conversationId}`);
        });
        // ─── Maintenance request live tracking ──────────────────────────
        socket.on('maintenance:join', async (payload) => {
            const requestId = payload?.requestId;
            if (!requestId)
                return;
            try {
                const req = await MaintenanceRequest.findByPk(requestId);
                if (!req)
                    return;
                const isParty = req.tenant_id === user.userId ||
                    req.landlord_id === user.userId ||
                    req.assigned_provider_id === user.userId ||
                    user.role === UserRole.ADMIN;
                if (!isParty)
                    return;
                socket.join(`maintenance_request:${requestId}`);
            }
            catch {
                /* ignore */
            }
        });
        socket.on('maintenance:leave', (payload) => {
            const requestId = payload?.requestId;
            if (!requestId)
                return;
            socket.leave(`maintenance_request:${requestId}`);
        });
    });
    return io;
}
export function getIO() {
    if (!io) {
        throw new Error('Socket.IO has not been initialized');
    }
    return io;
}
export default {
    initSocketServer,
    getIO,
};
