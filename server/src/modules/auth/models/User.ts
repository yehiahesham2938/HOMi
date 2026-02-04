import {
    Model,
    DataTypes,
    type InferAttributes,
    type InferCreationAttributes,
    type CreationOptional,
    type NonAttribute,
    type Association,
    type ForeignKey,
} from 'sequelize';
import bcrypt from 'bcryptjs';
import sequelize from '../../../config/database.js';

// Enums
export const UserRole = {
    LANDLORD: 'LANDLORD',
    TENANT: 'TENANT',
    MAINTENANCE_PROVIDER: 'MAINTENANCE_PROVIDER',
    ADMIN: 'ADMIN',
} as const;

export type UserRoleType = (typeof UserRole)[keyof typeof UserRole];

// Forward declaration for Profile import
import type { Profile } from './Profile.js';
export class User extends Model<
    InferAttributes<User>,
    InferCreationAttributes<User>
> {
    // Primary key
    declare id: CreationOptional<string>;

    // Core fields
    declare email: string;
    declare password_hash: string;
    declare role: UserRoleType;
    declare is_verified: CreationOptional<boolean>;

    // Password reset fields
    declare reset_token_hash: CreationOptional<string | null>;
    declare reset_token_expires: CreationOptional<Date | null>;

    // Email verification fields
    declare email_verified: CreationOptional<boolean>;
    declare email_verification_token_hash: CreationOptional<string | null>;
    declare email_verification_token_expires: CreationOptional<Date | null>;

    // Timestamps
    declare created_at: CreationOptional<Date>;
    declare updated_at: CreationOptional<Date>;
    declare deleted_at: CreationOptional<Date | null>;

    // Associations
    declare profile?: NonAttribute<Profile>;
    declare static associations: {
        profile: Association<User, Profile>;
    };

    // Instance methods
    async comparePassword(candidatePassword: string): Promise<boolean> {
        return bcrypt.compare(candidatePassword, this.password_hash);
    }

    // Sanitize user data for response (never expose sensitive fields)
    toSanitizedJSON(): Omit<InferAttributes<User>, 'password_hash' | 'reset_token_hash' | 'reset_token_expires' | 'deleted_at'> {
        const { password_hash, reset_token_hash, reset_token_expires, deleted_at, ...sanitized } = this.toJSON();
        return sanitized;
    }
}

User.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        email: {
            type: DataTypes.STRING(255),
            allowNull: false,
            unique: true,
            validate: {
                isEmail: true,
            },
        },
        password_hash: {
            type: DataTypes.STRING(255),
            allowNull: false,
        },
        role: {
            type: DataTypes.ENUM(...Object.values(UserRole)),
            allowNull: false,
        },
        is_verified: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            allowNull: false,
        },
        reset_token_hash: {
            type: DataTypes.STRING(255),
            allowNull: true,
        },
        reset_token_expires: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        email_verified: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            allowNull: false,
        },
        email_verification_token_hash: {
            type: DataTypes.STRING(255),
            allowNull: true,
        },
        email_verification_token_expires: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        created_at: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
        },
        updated_at: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
        },
        deleted_at: {
            type: DataTypes.DATE,
            allowNull: true,
        },
    },
    {
        sequelize,
        tableName: 'users',
        modelName: 'User',
        timestamps: true,
        paranoid: true, // Enables soft deletes
        underscored: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        deletedAt: 'deleted_at',
        indexes: [
            {
                unique: true,
                fields: ['email'],
            },
        ],
        hooks: {
            // Hash password before creating user
            beforeCreate: async (user: User) => {
                if (user.password_hash) {
                    const salt = await bcrypt.genSalt(12);
                    user.password_hash = await bcrypt.hash(user.password_hash, salt);
                }
            },
            // Hash password before updating if it changed
            beforeUpdate: async (user: User) => {
                if (user.changed('password_hash')) {
                    const salt = await bcrypt.genSalt(12);
                    user.password_hash = await bcrypt.hash(user.password_hash, salt);
                }
            },
        },
    }
);

export default User;
