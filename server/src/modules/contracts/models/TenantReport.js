import { Model, DataTypes } from 'sequelize';
import sequelize from '../../../config/database.js';
export var TenantReportReason;
(function (TenantReportReason) {
    TenantReportReason["LATE_PAYMENT"] = "LATE_PAYMENT";
    TenantReportReason["PROPERTY_DAMAGE"] = "PROPERTY_DAMAGE";
    TenantReportReason["NOISE_COMPLAINT"] = "NOISE_COMPLAINT";
    TenantReportReason["UNAUTHORIZED_OCCUPANTS"] = "UNAUTHORIZED_OCCUPANTS";
    TenantReportReason["OTHER"] = "OTHER";
})(TenantReportReason || (TenantReportReason = {}));
export var TenantReportStatus;
(function (TenantReportStatus) {
    TenantReportStatus["OPEN"] = "OPEN";
    TenantReportStatus["REVIEWED"] = "REVIEWED";
    TenantReportStatus["ACTIONED"] = "ACTIONED";
    TenantReportStatus["DISMISSED"] = "DISMISSED";
})(TenantReportStatus || (TenantReportStatus = {}));
export class TenantReport extends Model {
}
TenantReport.init({
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
}, {
    sequelize,
    tableName: 'tenant_reports',
    timestamps: true,
    underscored: true,
});
