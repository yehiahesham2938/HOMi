import { Model, DataTypes, } from 'sequelize';
import sequelize from '../../../config/database.js';
// ─── Enums ───────────────────────────────────────────────────────────────────
export const PropertyStatus = {
    DRAFT: 'DRAFT',
    PENDING_APPROVAL: 'PENDING_APPROVAL',
    AVAILABLE: 'AVAILABLE',
    REJECTED: 'REJECTED',
    RENTED: 'RENTED',
    UNAVAILABLE: 'UNAVAILABLE',
};
export const FurnishingStatus = {
    FULLY: 'Fully',
    SEMI: 'Semi',
    UNFURNISHED: 'Unfurnished',
};
export const PropertyType = {
    APARTMENT: 'APARTMENT',
    VILLA: 'VILLA',
    STUDIO: 'STUDIO',
    CHALET: 'CHALET',
};
export const TargetTenant = {
    ANY: 'ANY',
    STUDENTS: 'STUDENTS',
    FAMILIES: 'FAMILIES',
    TOURISTS: 'TOURISTS',
};
export class Property extends Model {
}
Property.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    landlord_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id',
        },
    },
    title: {
        type: DataTypes.STRING(255),
        allowNull: false,
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    monthly_price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: null,
        validate: {
            min: 0,
        },
    },
    security_deposit: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: null,
        validate: {
            min: 0,
        },
    },
    address: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    type: {
        type: DataTypes.ENUM(...Object.values(PropertyType)),
        allowNull: true,
        defaultValue: null,
    },
    furnishing: {
        type: DataTypes.ENUM(...Object.values(FurnishingStatus)),
        allowNull: true,
        defaultValue: null,
    },
    status: {
        type: DataTypes.ENUM(...Object.values(PropertyStatus)),
        allowNull: false,
        defaultValue: PropertyStatus.DRAFT,
    },
    target_tenant: {
        type: DataTypes.ENUM(...Object.values(TargetTenant)),
        allowNull: false,
        defaultValue: TargetTenant.ANY,
    },
    availability_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        defaultValue: null,
    },
    maintenance_responsibilities: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: [],
    },
    rejection_reason: {
        type: DataTypes.TEXT,
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
    tableName: 'properties',
    modelName: 'Property',
    timestamps: true,
    paranoid: true, // Enables soft deletes
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    deletedAt: 'deleted_at',
    indexes: [
        {
            fields: ['landlord_id'],
        },
        {
            fields: ['status'],
        },
        {
            fields: ['monthly_price'],
        },
        {
            fields: ['availability_date'],
        },
    ],
});
export default Property;
