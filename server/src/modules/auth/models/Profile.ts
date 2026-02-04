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
import sequelize from '../../../config/database.js';
import { encrypt, decrypt } from '../../../shared/utils/encryption.util.js';
import type { User } from './User.js';

// Enums
export const Gender = {
    MALE: 'MALE',
    FEMALE: 'FEMALE',
} as const;

export type GenderType = (typeof Gender)[keyof typeof Gender];

export class Profile extends Model<
    InferAttributes<Profile>,
    InferCreationAttributes<Profile>
> {
    // Primary key
    declare id: CreationOptional<string>;

    // Foreign key
    declare user_id: ForeignKey<string>;

    // Core fields (required at registration)
    declare first_name: string;
    declare last_name: string;
    declare phone_number: string;

    // Optional fields
    declare bio: CreationOptional<string | null>;
    declare avatar_url: CreationOptional<string | null>;

    // Verification fields (nullable until user completes verification)
    declare national_id: CreationOptional<string | null>; // Encrypted at rest
    declare gender: CreationOptional<GenderType | null>;
    declare birthdate: CreationOptional<Date | null>;

    // Gamification
    declare gamification_points: CreationOptional<number>;

    // Budget preferences
    declare preferred_budget_min: CreationOptional<number | null>;
    declare preferred_budget_max: CreationOptional<number | null>;

    // Timestamps
    declare created_at: CreationOptional<Date>;
    declare updated_at: CreationOptional<Date>;

    // Associations
    declare user?: NonAttribute<User>;
    declare static associations: {
        user: Association<Profile, User>;
    };

    // Virtual getter for decrypted national ID
    getDecryptedNationalId(): string | null {
        if (!this.national_id) return null;
        try {
            return decrypt(this.national_id);
        } catch {
            return null;
        }
    }

    // Check if profile verification is complete
    isVerificationComplete(): boolean {
        return !!(this.national_id && this.gender && this.birthdate);
    }

    // Sanitize profile data for response
    toSanitizedJSON(): Omit<InferAttributes<Profile>, 'national_id'> & { national_id?: never } {
        const json = this.toJSON();
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { national_id, ...sanitized } = json;
        return sanitized;
    }
}

Profile.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        user_id: {
            type: DataTypes.UUID,
            allowNull: false,
            unique: true,
            references: {
                model: 'users',
                key: 'id',
            },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
        },
        first_name: {
            type: DataTypes.STRING(100),
            allowNull: false,
        },
        last_name: {
            type: DataTypes.STRING(100),
            allowNull: false,
        },
        phone_number: {
            type: DataTypes.STRING(20),
            allowNull: false,
        },
        bio: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        avatar_url: {
            type: DataTypes.STRING(500),
            allowNull: true,
        },
        national_id: {
            type: DataTypes.STRING(500), // Encrypted value is longer than plain text
            allowNull: true, // Nullable until user completes verification
        },
        gender: {
            type: DataTypes.ENUM(...Object.values(Gender)),
            allowNull: true, // Nullable until user completes verification
        },
        birthdate: {
            type: DataTypes.DATEONLY,
            allowNull: true, // Nullable until user completes verification
        },
        gamification_points: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            allowNull: false,
        },
        preferred_budget_min: {
            type: DataTypes.DECIMAL(12, 2),
            allowNull: true,
        },
        preferred_budget_max: {
            type: DataTypes.DECIMAL(12, 2),
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
    },
    {
        sequelize,
        tableName: 'profiles',
        modelName: 'Profile',
        timestamps: true,
        underscored: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        hooks: {
            // Encrypt national ID before creating profile (only if provided)
            beforeCreate: async (profile: Profile) => {
                if (profile.national_id) {
                    profile.national_id = encrypt(profile.national_id);
                }
            },
            // Encrypt national ID before updating if it changed (only if provided)
            beforeUpdate: async (profile: Profile) => {
                if (profile.changed('national_id') && profile.national_id) {
                    profile.national_id = encrypt(profile.national_id);
                }
            },
        },
    }
);

export default Profile;
