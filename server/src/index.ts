import { createServer } from 'node:http';
import { env } from './config/env.js';
import { testConnection, syncDatabase } from './config/database.js';
import { seedAmenities } from './seeds/amenities.seed.js';
import { seedHouseRules } from './seeds/house_rules.seed.js';
import { seedHabits } from './seeds/habits.seed.js';
import { seedAdminAccount } from './seeds/admin.seed.js';
import contractService from './modules/contracts/services/contract.service.js';
import app from './app.js';
// Triggering seed re-run
import { initSocketServer } from './shared/realtime/socket.js';
import { connectRedis, disconnectRedis } from './shared/infrastructure/redis.client.js';

const registerGracefulShutdown = (httpServer: ReturnType<typeof createServer>): void => {
    const shutdown = async (signal: string) => {
        console.log(`\n${signal} received. Closing server...`);
        httpServer.close(async () => {
            await disconnectRedis();
            process.exit(0);
        });
    };

    process.on('SIGINT', () => {
        void shutdown('SIGINT');
    });
    process.on('SIGTERM', () => {
        void shutdown('SIGTERM');
    });
};

try {
    await connectRedis();
    await testConnection();
    await syncDatabase(false);
    await seedAmenities();
    await seedHouseRules();
    await seedHabits();
    await seedAdminAccount();
    await contractService.syncPropertyStatuses();


    const httpServer = createServer(app);
    initSocketServer(httpServer);
    registerGracefulShutdown(httpServer);

    httpServer.listen(env.PORT, () => {
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

export default app;
