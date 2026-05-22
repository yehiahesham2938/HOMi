import { Model, DataTypes, type Optional } from 'sequelize';
import sequelize from '../../../config/database.js';

export enum TenantReportReason {
    LATE_PAYMENT = 'LATE_PAYMENT',
    PROPERTY_DAMAGE = 'PROPERTY_DAMAGE',
    NOISE_COMPLAINT = 'NOISE_COMPLAINT',
    UNAUTHORIZED_OCCUPANTS = 'UNAUTHORIZED_OCCUPANTS',
    OTHER = 'OTHER',
}

export enum TenantReportStatus {
    OPEN = 'OPEN',
    REVIEWED = 'REVIEWED',
    ACTIONED = 'ACTIONED',
    DISMISSED = 'DISMISSED',
}

export interface TenantReportAttributes {
    id: string;
    contract_id: string;
    reporter_id: string; // landlord's user id
    tenant_id: string; // tenant's user id
    reason: TenantReportReason;
    details: string;
    status: TenantReportStatus;
    created_at?: Date;
    updated_at?: Date;
}

export type TenantReportCreationAttributes = Optional<TenantReportAttributes, 'id' | 'status' | 'created_at' | 'updated_at'>;

export class TenantReport extends Model<TenantReportAttributes, TenantReportCreationAttributes> implements TenantReportAttributes {
    public id!: string;
    public contract_id!: string;
    public reporter_id!: string;
    public tenant_id!: string;
    public reason!: TenantReportReason;
    public details!: string;
    public status!: TenantReportStatus;

    public readonly created_at!: Date;
    public readonly updated_at!: Date;
}

TenantReport.init(
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
        reporter_id: {
            type: DataTypes.UUID,
            allowNull: false,
        },
        tenant_id: {
            type: DataTypes.UUID,
            allowNull: false,
        },
        reason: {
            type: DataTypes.ENUM(...Object.values(TenantReportReason)),
            allowNull: false,
        },
        details: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        status: {
            type: DataTypes.ENUM(...Object.values(TenantReportStatus)),
            defaultValue: TenantReportStatus.OPEN,
            allowNull: false,
        },
    },
    {
        sequelize,
        tableName: 'tenant_reports',
        timestamps: true,
        underscored: true,
    }
);
