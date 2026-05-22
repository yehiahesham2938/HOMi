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
    requester_id: string; // The landlord who requested the termination
    reason: string;
    status: LeaseTerminationStatus;
    created_at?: Date;
    updated_at?: Date;
}

export type LeaseTerminationRequestCreationAttributes = Optional<LeaseTerminationRequestAttributes, 'id' | 'status' | 'created_at' | 'updated_at'>;

export class LeaseTerminationRequest extends Model<LeaseTerminationRequestAttributes, LeaseTerminationRequestCreationAttributes> implements LeaseTerminationRequestAttributes {
    public id!: string;
    public contract_id!: string;
    public requester_id!: string;
    public reason!: string;
    public status!: LeaseTerminationStatus;

    public readonly created_at!: Date;
    public readonly updated_at!: Date;
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
        status: {
            type: DataTypes.ENUM(...Object.values(LeaseTerminationStatus)),
            defaultValue: LeaseTerminationStatus.PENDING,
            allowNull: false,
        },
    },
    {
        sequelize,
        tableName: 'lease_termination_requests',
        timestamps: true,
        underscored: true,
    }
);
