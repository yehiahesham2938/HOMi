import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env.js';
import swaggerSpec from './config/swagger.js';
import { globalRateLimiter } from './shared/middleware/rate-limit.middleware.js';
import { isRedisReady } from './shared/infrastructure/redis.client.js';
import { AuthError } from './modules/auth/services/auth.service.js';
import { PropertyError } from './modules/properties/services/property.service.js';
import { RentalRequestError } from './modules/rental-requests/services/rental-request.service.js';
import { ContractError } from './modules/contracts/services/contract.service.js';
import { PaymentMethodError } from './modules/payment-methods/services/payment-method.service.js';
import { SavedPropertiesError } from './modules/saved-properties/services/saved-properties.service.js';
import { MessageError } from './modules/messages/services/message.service.js';
import { AdminError } from './modules/admin/services/admin.service.js';
import { MaintenanceError } from './modules/maintenance/services/maintenance.service.js';
import { RoommateMatchingError } from './modules/roommate-matching/services/roommate-matching.service.js';

// Import routes
import authRoutes from './modules/auth/routes/auth.routes.js';
import propertyRoutes from './modules/properties/routes/property.routes.js';
import rentalRequestRoutes from './modules/rental-requests/routes/rental-request.routes.js';
import contractRoutes from './modules/contracts/routes/contract.routes.js';
import paymentMethodRoutes from './modules/payment-methods/routes/payment-method.routes.js';
import savedPropertiesRoutes from './modules/saved-properties/routes/saved-properties.routes.js';
import messageRoutes from './modules/messages/routes/message.routes.js';
import adminRoutes from './modules/admin/routes/admin.routes.js';
import maintenanceRoutes from './modules/maintenance/routes/maintenance.routes.js';
import notificationRoutes from './modules/notifications/routes/notification.routes.js';
import roommateMatchingRoutes from './modules/roommate-matching/routes/roommate-matching.routes.js';

// Import models to register them
import './modules/auth/models/index.js';
import './modules/properties/models/index.js';
import './modules/rental-requests/models/index.js';
import './modules/contracts/models/index.js';
import './modules/payment-methods/models/index.js';
import './modules/saved-properties/models/index.js';
import './modules/messages/models/index.js';
import './modules/admin/models/ActivityLog.js';
import './modules/maintenance/models/index.js';
import './modules/notifications/models/Notification.js';
import './modules/roommate-matching/models/index.js';

// Create Express app
const app = express();

// ======================
// Security Middleware
// ======================
const helmetOptions = {
    crossOriginOpenerPolicy: {
        policy: 'same-origin-allow-popups' as const,
    },
};

if (env.NODE_ENV === 'production') {
    app.use(helmet(helmetOptions));
} else {
    app.use(helmet({ ...helmetOptions, contentSecurityPolicy: false }));
}
app.use(cors({
    origin: env.CORS_ORIGINS,
    credentials: true,
}));

app.use(cookieParser());
app.use(globalRateLimiter);

// ======================
// Body Parsing
// ======================
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// ======================
// API Documentation (Swagger UI)
// ======================
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'HOMi API Documentation',
    swaggerOptions: {
        persistAuthorization: true,
    },
}));

app.get('/api-docs.json', (_req: Request, res: Response) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
});

// ======================
// Health Check
// ======================
app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
        success: true,
        message: 'HOMi API is running',
        timestamp: new Date().toISOString(),
        environment: env.NODE_ENV,
        redis: {
            enabled: env.REDIS_ENABLED,
            ready: isRedisReady(),
        },
    });
});

// ======================
// API Routes
// ======================
app.use('/api/auth', authRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/rental-requests', rentalRequestRoutes);
app.use('/api/contracts', contractRoutes);
app.use('/api/payment-methods', paymentMethodRoutes);
app.use('/api/saved-properties', savedPropertiesRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/roommate-matching', roommateMatchingRoutes);

// ======================
// 404 Handler
// ======================
app.use((_req: Request, res: Response) => {
    res.status(404).json({
        success: false,
        message: 'Resource not found',
        code: 'NOT_FOUND',
    });
});

// ======================
// Global Error Handler
// ======================
interface ErrorResponse {
    success: false;
    message: string;
    code: string;
    stack?: string;
}

app.use((
    err: Error,
    _req: Request,
    res: Response<ErrorResponse>,
    _next: NextFunction
) => {
    console.error('❌ Error:', err);

    if (err instanceof AuthError) {
        res.status(err.statusCode).json({
            success: false,
            message: err.message,
            code: err.code,
            ...(err.details !== undefined && { details: err.details }),
        });
        return;
    }

    if (err instanceof PropertyError) {
        res.status(err.statusCode).json({
            success: false,
            message: err.message,
            code: err.code,
        });
        return;
    }

    if (err instanceof RentalRequestError) {
        res.status(err.statusCode).json({
            success: false,
            message: err.message,
            code: err.code,
        });
        return;
    }

    if (err instanceof ContractError) {
        res.status(err.statusCode).json({
            success: false,
            message: err.message,
            code: err.code,
        });
        return;
    }

    if (err instanceof PaymentMethodError) {
        res.status(err.statusCode).json({
            success: false,
            message: err.message,
            code: err.code,
        });
        return;
    }

    if (err instanceof SavedPropertiesError) {
        res.status(err.statusCode).json({
            success: false,
            message: err.message,
            code: err.code,
        });
        return;
    }

    if (err instanceof MessageError) {
        res.status(err.statusCode).json({
            success: false,
            message: err.message,
            code: err.code,
        });
        return;
    }

    if (err instanceof AdminError) {
        res.status(err.statusCode).json({
            success: false,
            message: err.message,
            code: err.code,
        });
        return;
    }

    if (err instanceof MaintenanceError) {
        res.status(err.statusCode).json({
            success: false,
            message: err.message,
            code: err.code,
        });
        return;
    }

    if (err instanceof RoommateMatchingError) {
        res.status(err.statusCode).json({
            success: false,
            message: err.message,
            code: err.code,
        });
        return;
    }

    if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
        res.status(400).json({
            success: false,
            message: 'Validation error',
            code: 'VALIDATION_ERROR',
        });
        return;
    }

    res.status(500).json({
        success: false,
        message: env.NODE_ENV === 'production'
            ? 'Internal server error'
            : err.message,
        code: 'INTERNAL_ERROR',
        ...(env.NODE_ENV !== 'production' && { stack: err.stack }),
    });
});

export default app;
