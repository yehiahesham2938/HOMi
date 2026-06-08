import { Model, DataTypes, } from 'sequelize';
import bcrypt from 'bcryptjs';
import sequelize from '../../../config/database.js';
// Enums
export const UserRole = {
    LANDLORD: 'LANDLORD',
    TENANT: 'TENANT',
    MAINTENANCE_PROVIDER: 'MAINTENANCE_PROVIDER',
    ADMIN: 'ADMIN',
};
export class User extends Model {
    // Instance methods
    async comparePassword(candidatePassword) {
        return bcrypt.compare(candidatePassword, this.password_hash);
    }
    // Sanitize user data for response (never expose sensitive fields)
    toSanitizedJSON() {
        const { password_hash, reset_token_hash, reset_token_expires, deleted_at, ...sanitized } = this.toJSON();
        return sanitized;
    }
}
User.init({
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
    is_banned: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    },
    ban_reason: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    ban_message: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    ban_until: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    banned_by_admin_id: {
        type: DataTypes.UUID,
        allowNull: true,
    },
    ban_created_at: {
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
}, {
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
        beforeCreate: async (user) => {
            if (user.password_hash) {
                const salt = await bcrypt.genSalt(12);
                user.password_hash = await bcrypt.hash(user.password_hash, salt);
            }
        },
        // Hash password before updating if it changed
        beforeUpdate: async (user) => {
            if (user.changed('password_hash')) {
                const salt = await bcrypt.genSalt(12);
                user.password_hash = await bcrypt.hash(user.password_hash, salt);
            }
        },
    },
});
export default User;
