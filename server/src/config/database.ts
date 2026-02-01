import { Sequelize, type Options } from 'sequelize';
import { env } from './env.js';

const getDatabaseConfig = (): Options => {
    // Use DATABASE_URL if available (for production/cloud deployments)
    if (env.DATABASE_URL) {
        const config: Options = {
            dialect: 'postgres',
            logging: env.NODE_ENV === 'development' ? console.log : false,
            pool: {
                max: 10,
                min: 0,
                acquire: 30000,
                idle: 10000,
            },
            define: {
                timestamps: true,
                underscored: true,
                paranoid: false,
            },
            dialectOptions: env.NODE_ENV === 'production' ? {
                ssl: {
                    require: true,
                    rejectUnauthorized: false,
                },
            } : {},
        };
        return config;
    }

    // Use individual credentials for development
    const config: Options = {
        dialect: 'postgres',
        logging: env.NODE_ENV === 'development' ? console.log : false,
        host: env.DB_HOST,
        port: env.DB_PORT,
        database: env.DB_NAME,
        username: env.DB_USER,
        password: env.DB_PASSWORD,
        pool: {
            max: 10,
            min: 0,
            acquire: 30000,
            idle: 10000,
        },
        define: {
            timestamps: true,
            underscored: true,
            paranoid: false,
        },
    };
    return config;
};

// Create Sequelize instance
const sequelizeConfig = getDatabaseConfig();

export const sequelize = env.DATABASE_URL
    ? new Sequelize(env.DATABASE_URL, sequelizeConfig)
    : new Sequelize(sequelizeConfig);

// Test database connection
export const testConnection = async (): Promise<void> => {
    try {
        await sequelize.authenticate();
        console.log('✅ Database connection established successfully.');
    } catch (error) {
        console.error('❌ Unable to connect to the database:', error);
        throw error;
    }
};

// Sync database (use with caution in production)
export const syncDatabase = async (force: boolean = false): Promise<void> => {
    try {
        await sequelize.sync({ force, alter: env.NODE_ENV === 'development' });
        console.log('✅ Database synchronized successfully.');
    } catch (error) {
        console.error('❌ Database synchronization failed:', error);
        throw error;
    }
};

export default sequelize;
