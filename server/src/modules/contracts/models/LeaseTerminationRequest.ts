import { Model, DataTypes, type Optional } from 'sequelize';
import sequelize from '../../../config/database.js';

export enum LeaseTerminationStatus {
    PENDING = 'PENDING',
    APPROVED = 'APPROVED',
    REJECTED = 'REJECTED',
}

export interface LeaseTerminationRequestAttributes {
    id: string;
    contract_id: string;
    requester_id: string;
    reason: string;
    scenario: string; // The chosen scenario (e.g., Early exit, Property uninhabitable, Landlord breached contract, Mutual Agreement, or LANDLORD_INITIATED)
    details: string;  // Detailed explanation of the request
    status: LeaseTerminationStatus;
    damage_deduction?: number | null;
    mutual_deposit_option?: 'LANDLORD' | 'TENANT' | 'SPLIT' | null;
    created_at?: Date;
    updated_at?: Date;
}

export type LeaseTerminationRequestCreationAttributes = Optional<
    LeaseTerminationRequestAttributes,
    'id' | 'status' | 'created_at' | 'updated_at' | 'scenario' | 'details' | 'damage_deduction' | 'mutual_deposit_option'
>;

export class LeaseTerminationRequest extends Model<LeaseTerminationRequestAttributes, LeaseTerminationRequestCreationAttributes> implements LeaseTerminationRequestAttributes {
    declare id: string;
    declare contract_id: string;
    declare requester_id: string;
    declare reason: string;
    declare scenario: string;
    declare details: string;
    declare status: LeaseTerminationStatus;
    declare damage_deduction: number | null;
    declare mutual_deposit_option: 'LANDLORD' | 'TENANT' | 'SPLIT' | null;

    declare created_at: Date;
    declare updated_at: Date;
}

LeaseTerminationRequest.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        contract_id: {
            type: DataTypes.UUID,
            allowNull: false,
        },
        requester_id: {
            type: DataTypes.UUID,
            allowNull: false,
        },
        reason: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        scenario: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: 'LANDLORD_INITIATED',
        },
        details: {
            type: DataTypes.TEXT,
            allowNull: false,
            defaultValue: '',
        },
        status: {
            type: DataTypes.ENUM(...Object.values(LeaseTerminationStatus)),
            defaultValue: LeaseTerminationStatus.PENDING,
            allowNull: false,
        },
        damage_deduction: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
        },
        mutual_deposit_option: {
            type: DataTypes.STRING,
            allowNull: true,
        },
    },
    {
        sequelize,
        tableName: 'lease_termination_requests',
        timestamps: true,
        underscored: true,
    }
);
