import { Model, DataTypes, } from 'sequelize';
import sequelize from '../../../config/database.js';
import { encrypt, decrypt } from '../../../shared/utils/encryption.util.js';
// Enums
export const Gender = {
    MALE: 'MALE',
    FEMALE: 'FEMALE',
    PREFER_NOT_TO_SAY: 'PREFER_NOT_TO_SAY',
};
export class Profile extends Model {
    // Virtual getter for decrypted national ID
    getDecryptedNationalId() {
        if (!this.national_id)
            return null;
        try {
            return decrypt(this.national_id);
        }
        catch {
            return null;
        }
    }
    // Check if profile verification is complete
    isVerificationComplete() {
        return !!(this.national_id && this.gender && this.birthdate);
    }
    /** Step 3 (rental prefs or landlord business) submitted and saved */
    isOnboardingStep3Complete() {
        return this.onboarding_step3_completed === true;
    }
    // Sanitize profile data for response
    toSanitizedJSON() {
        const json = this.toJSON();
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { national_id, ...sanitized } = json;
        return sanitized;
    }
}
Profile.init({
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
        type: DataTypes.TEXT, // TEXT to support base64-encoded images
        allowNull: true,
    },
    current_location: {
        type: DataTypes.STRING(255),
        allowNull: true,
    },
    e_signature_url: {
        type: DataTypes.TEXT,
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
    wallet_balance: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
    },
    wallet_pending_order_id: {
        type: DataTypes.BIGINT,
        allowNull: true,
    },
    wallet_pending_amount_cents: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    wallet_pending_save_card: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    },
    preferred_language: {
        type: DataTypes.STRING(10),
        allowNull: true,
    },
    tenant_rental_preferences: {
        type: DataTypes.JSONB,
        allowNull: true,
    },
    landlord_business_profile: {
        type: DataTypes.JSONB,
        allowNull: true,
    },
    onboarding_step3_skipped: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    },
    onboarding_step3_completed: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    },
    onboarding_step2_completed: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
    },
    updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
    },
}, {
    sequelize,
    tableName: 'profiles',
    modelName: 'Profile',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    hooks: {
        // Encrypt national ID before creating profile (only if provided)
        beforeCreate: async (profile) => {
            if (profile.national_id) {
                profile.national_id = encrypt(profile.national_id);
            }
        },
        // Encrypt national ID before updating if it changed (only if provided)
        beforeUpdate: async (profile) => {
            if (profile.changed('national_id') && profile.national_id) {
                profile.national_id = encrypt(profile.national_id);
            }
        },
    },
});
export default Profile;
