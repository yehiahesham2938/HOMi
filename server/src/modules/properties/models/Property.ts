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

// ─── Enums ───────────────────────────────────────────────────────────────────

export const PropertyStatus = {
    DRAFT: 'DRAFT',
    PENDING_APPROVAL: 'PENDING_APPROVAL',
    AVAILABLE: 'AVAILABLE',
    REJECTED: 'REJECTED',
    RENTED: 'RENTED',
    UNAVAILABLE: 'UNAVAILABLE',
} as const;


export type PropertyStatusType = (typeof PropertyStatus)[keyof typeof PropertyStatus];

export const FurnishingStatus = {
    FULLY: 'Fully',
    SEMI: 'Semi',
    UNFURNISHED: 'Unfurnished',
} as const;

export type FurnishingStatusType = (typeof FurnishingStatus)[keyof typeof FurnishingStatus];

export const PropertyType = {
    APARTMENT: 'APARTMENT',
    VILLA: 'VILLA',
    STUDIO: 'STUDIO',
    CHALET: 'CHALET',
} as const;

export type PropertyTypeType = (typeof PropertyType)[keyof typeof PropertyType];

export const TargetTenant = {
    ANY: 'ANY',
    STUDENTS: 'STUDENTS',
    FAMILIES: 'FAMILIES',
    TOURISTS: 'TOURISTS',
} as const;

export type TargetTenantType = (typeof TargetTenant)[keyof typeof TargetTenant];

// ─── Forward declarations ──────────────────────────────────────────────────
import type { User } from '../../auth/models/User.js';
import type { PropertyImage } from './PropertyImage.js';
import type { Amenity } from './Amenity.js';
import type { PropertySpecifications } from './PropertySpecifications.js';
import type { PropertyDetailedLocation } from './PropertyDetailedLocation.js';
import type { PropertyOwnershipDoc } from './PropertyOwnershipDoc.js';

export class Property extends Model<
    InferAttributes<Property>,
    InferCreationAttributes<Property>
> {
    // Primary key
    declare id: CreationOptional<string>;

    // Foreign keys
    declare landlord_id: ForeignKey<string>;

    // Property details
    declare title: string;
    declare description: string;
    declare monthly_price: number | null;
    declare security_deposit: number | null;
    declare address: string;
    declare type: PropertyTypeType | null;
    declare furnishing: FurnishingStatusType | null;
    declare status: CreationOptional<PropertyStatusType>;
    declare target_tenant: CreationOptional<TargetTenantType>;
    declare availability_date: Date | null;
    declare maintenance_responsibilities: CreationOptional<Array<{ area: string; responsible_party: 'LANDLORD' | 'TENANT' }>>;
    declare rejection_reason: string | null;

    // Timestamps
    declare created_at: CreationOptional<Date>;
    declare updated_at: CreationOptional<Date>;
    declare deleted_at: CreationOptional<Date | null>;

    // Associations
    declare landlord?: NonAttribute<User>;
    declare images?: NonAttribute<PropertyImage[]>;
    declare amenities?: NonAttribute<Amenity[]>;
    declare specifications?: NonAttribute<PropertySpecifications>;
    declare detailedLocation?: NonAttribute<PropertyDetailedLocation>;
    declare ownershipDocs?: NonAttribute<PropertyOwnershipDoc[]>;
    declare static associations: {
        landlord: Association<Property, User>;
        images: Association<Property, PropertyImage>;
        amenities: Association<Property, Amenity>;
        specifications: Association<Property, PropertySpecifications>;
        detailedLocation: Association<Property, PropertyDetailedLocation>;
        ownershipDocs: Association<Property, PropertyOwnershipDoc>;
    };
}

Property.init(
    {
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
    },
    {
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
    }
);

export default Property;
