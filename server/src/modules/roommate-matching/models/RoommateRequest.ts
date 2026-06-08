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
import type { User } from '../../auth/models/User.js';
import type { Contract } from '../../contracts/models/Contract.js';

export const RoommateRequestType = {
    SEARCH_APARTMENT: 'SEARCH_APARTMENT',
    SEARCH_ROOMMATE: 'SEARCH_ROOMMATE',
} as const;

export type RoommateRequestTypeType = (typeof RoommateRequestType)[keyof typeof RoommateRequestType];

export const RoommateRequestStatus = {
    ACTIVE: 'ACTIVE',
    PAUSED: 'PAUSED',
    MATCHED: 'MATCHED',
    EXPIRED: 'EXPIRED',
    CANCELLED: 'CANCELLED',
} as const;

export type RoommateRequestStatusType = (typeof RoommateRequestStatus)[keyof typeof RoommateRequestStatus];

export const PreferredGender = {
    MALE: 'MALE',
    FEMALE: 'FEMALE',
    ANY: 'ANY',
} as const;

export type PreferredGenderType = (typeof PreferredGender)[keyof typeof PreferredGender];

export class RoommateRequest extends Model<
    InferAttributes<RoommateRequest>,
    InferCreationAttributes<RoommateRequest>
> {
    declare id: CreationOptional<string>;
    declare user_id: ForeignKey<string>;
    declare type: RoommateRequestTypeType;
    declare status: CreationOptional<RoommateRequestStatusType>;
    declare contract_id: ForeignKey<string> | null;
    declare preferred_city: string | null;
    declare preferred_area: string | null;
    declare budget_min: number | null;
    declare budget_max: number | null;
    declare preferred_gender: PreferredGenderType | null;
    declare preferred_move_in_date: Date | null;
    declare additional_note: string | null;
    declare max_occupants: number | null;
    /** Per-room listing config for SEARCH_ROOMMATE: [{ name, ensuite, rent, listed }] */
    declare rooms_config: CreationOptional<Array<Record<string, unknown>> | null>;
    declare expires_at: CreationOptional<Date>;
    declare created_at: CreationOptional<Date>;
    declare updated_at: CreationOptional<Date>;

    // Associations
    declare user?: NonAttribute<User>;
    declare contract?: NonAttribute<Contract>;
    declare static associations: {
        user: Association<RoommateRequest, User>;
        contract: Association<RoommateRequest, Contract>;
    };
}

RoommateRequest.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        user_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id',
            },
        },
        type: {
            type: DataTypes.ENUM(...Object.values(RoommateRequestType)),
            allowNull: false,
        },
        status: {
            type: DataTypes.ENUM(...Object.values(RoommateRequestStatus)),
            allowNull: false,
            defaultValue: RoommateRequestStatus.ACTIVE,
        },
        contract_id: {
            type: DataTypes.UUID,
            allowNull: true,
            references: {
                model: 'contracts',
                key: 'id',
            },
        },
        preferred_city: {
            type: DataTypes.STRING(100),
            allowNull: true,
        },
        preferred_area: {
            type: DataTypes.STRING(100),
            allowNull: true,
        },
        budget_min: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
        },
        budget_max: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
        },
        preferred_gender: {
            type: DataTypes.ENUM(...Object.values(PreferredGender)),
            allowNull: true,
        },
        preferred_move_in_date: {
            type: DataTypes.DATEONLY,
            allowNull: true,
        },
        additional_note: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        max_occupants: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        rooms_config: {
            type: DataTypes.JSONB,
            allowNull: true,
        },
        expires_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: () => {
                const date = new Date();
                date.setDate(date.getDate() + 30);
                return date;
            },
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
        tableName: 'roommate_requests',
        modelName: 'RoommateRequest',
        timestamps: true,
        underscored: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            { fields: ['user_id'] },
            { fields: ['type'] },
            { fields: ['status'] },
            { fields: ['preferred_city', 'preferred_area'] },
            { fields: ['expires_at'] },
        ],
    }
);

export default RoommateRequest;
