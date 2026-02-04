import sequelize from '../../../config/database.js';
import { User, UserRole, type UserRoleType } from './User.js';
import { Profile, Gender, type GenderType } from './Profile.js';

// Define associations
User.hasOne(Profile, {
    foreignKey: 'user_id',
    as: 'profile',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
});

Profile.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'user',
});

// Export all models and types
export {
    sequelize,
    User,
    UserRole,
    Profile,
    Gender,
};

export type { UserRoleType, GenderType };

// Export default as object with all models for convenience
export default {
    sequelize,
    User,
    Profile,
};
