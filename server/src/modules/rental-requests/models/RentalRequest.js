import { Model, DataTypes, } from 'sequelize';
import sequelize from '../../../config/database.js';
// ─── Enums ───────────────────────────────────────────────────────────────────
export const RentalRequestDuration = {
    SIX_MONTHS: '6_MONTHS',
    TWELVE_MONTHS: '12_MONTHS',
    TWENTY_FOUR_MONTHS: '24_MONTHS',
};
// Supports 1 to 120 months (up to 10 years) while preserving legacy values.
export const RentalRequestDurationValues = Array.from({ length: 120 }, (_, index) => `${index + 1}_MONTHS`);
export const LivingSituation = {
    SINGLE: 'SINGLE',
    FAMILY: 'FAMILY',
    MARRIED: 'MARRIED',
    STUDENTS: 'STUDENTS',
};
export const RentalRequestStatus = {
    PENDING: 'PENDING',
    APPROVED: 'APPROVED',
    DECLINED: 'DECLINED',
};
export class RentalRequest extends Model {
}
RentalRequest.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    tenant_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id',
        },
    },
    property_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'properties',
            key: 'id',
        },
    },
    move_in_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
    },
    duration: {
        type: DataTypes.ENUM(...RentalRequestDurationValues),
        allowNull: false,
    },
    occupants: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            min: 1,
        },
    },
    living_situation: {
        type: DataTypes.ENUM(...Object.values(LivingSituation)),
        allowNull: false,
    },
    message: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    status: {
        type: DataTypes.ENUM(...Object.values(RentalRequestStatus)),
        allowNull: false,
        defaultValue: RentalRequestStatus.PENDING,
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
    tableName: 'rental_requests',
    modelName: 'RentalRequest',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    // NOTE: The (tenant_id, property_id) pair is uniquely enforced ONLY for
    // PENDING requests via a Postgres partial unique index created in the
    // pre-sync migration (`uniq_pending_rental_request_per_tenant_property`).
    // We deliberately do NOT declare a Sequelize-level unique here because
    // historical APPROVED/DECLINED rows must coexist with brand-new PENDING
    // ones — otherwise tenants couldn't re-apply after a contract ends.
    indexes: [
        { fields: ['tenant_id'] },
        { fields: ['property_id'] },
        { fields: ['status'] },
        { fields: ['tenant_id', 'property_id'] },
    ],
});
export default RentalRequest;
