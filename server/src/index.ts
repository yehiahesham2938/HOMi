import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env.js';
import { testConnection, syncDatabase } from './config/database.js';
import swaggerSpec from './config/swagger.js';
import { AuthError } from './modules/auth/services/auth.service.js';

// Import routes
import authRoutes from './modules/auth/routes/auth.routes.js';

// Import models to register them
import './modules/auth/models/index.js';

// Create Express app
const app = express();

// ======================
// Security Middleware
// ======================
// Disable CSP in development for Swagger UI
if (env.NODE_ENV === 'production') {
    app.use(helmet());
} else {
    app.use(helmet({ contentSecurityPolicy: false }));
}
app.use(cors({
    origin: env.NODE_ENV === 'production'
        ? ['https://homi.app'] // Update with actual domain
        : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5174'],
    credentials: true,
}));

// ======================
// Body Parsing
// ======================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ======================
// API Documentation (Swagger UI)
// ======================
/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check
 *     description: Check if the API server is running
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Server is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: HOMi API is running
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 environment:
 *                   type: string
 *                   enum: [development, production, test]
 */
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'HOMi API Documentation',
    swaggerOptions: {
        persistAuthorization: true,
    },
}));

// Serve raw OpenAPI spec as JSON
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
    });
});

// ======================
// API Routes
// ======================
app.use('/api/auth', authRoutes);

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

    // Handle AuthError
    if (err instanceof AuthError) {
        res.status(err.statusCode).json({
            success: false,
            message: err.message,
            code: err.code,
        });
        return;
    }

    // Handle Sequelize errors
    if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
        res.status(400).json({
            success: false,
            message: 'Validation error',
            code: 'VALIDATION_ERROR',
        });
        return;
    }

    // Default error response
    res.status(500).json({
        success: false,
        message: env.NODE_ENV === 'production'
            ? 'Internal server error'
            : err.message,
        code: 'INTERNAL_ERROR',
        ...(env.NODE_ENV !== 'production' && { stack: err.stack }),
    });
});

// ======================
// Start Server
// ======================
async function startServer(): Promise<void> {
    try {
        // Test database connection
        await testConnection();

        // Sync database (creates tables if they don't exist)
        // Note: In production, use migrations instead
        await syncDatabase(false);

        // Start listening
        app.listen(env.PORT, () => {
            console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🏠 HOMi API Server                                       ║
║                                                            ║
║   Environment: ${env.NODE_ENV.padEnd(40)}║
║   Port:        ${String(env.PORT).padEnd(40)}║
║   URL:         http://localhost:${String(env.PORT).padEnd(26)}║
║   API Docs:    http://localhost:${String(env.PORT)}/api-docs${' '.repeat(18)}║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
      `);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

// Start the server
startServer();

export default app;
