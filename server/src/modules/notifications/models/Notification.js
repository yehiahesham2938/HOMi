import { Model, DataTypes, } from 'sequelize';
import sequelize from '../../../config/database.js';
export const NotificationType = {
    // Maintenance lifecycle
    MAINTENANCE_REQUEST_POSTED: 'MAINTENANCE_REQUEST_POSTED',
    MAINTENANCE_NEW_APPLICATION: 'MAINTENANCE_NEW_APPLICATION',
    MAINTENANCE_APPLICATION_ACCEPTED: 'MAINTENANCE_APPLICATION_ACCEPTED',
    MAINTENANCE_APPLICATION_REJECTED: 'MAINTENANCE_APPLICATION_REJECTED',
    MAINTENANCE_PROVIDER_EN_ROUTE: 'MAINTENANCE_PROVIDER_EN_ROUTE',
    MAINTENANCE_PROVIDER_ARRIVED: 'MAINTENANCE_PROVIDER_ARRIVED',
    MAINTENANCE_AWAITING_CONFIRMATION: 'MAINTENANCE_AWAITING_CONFIRMATION',
    MAINTENANCE_COMPLETED: 'MAINTENANCE_COMPLETED',
    MAINTENANCE_DISPUTED: 'MAINTENANCE_DISPUTED',
    MAINTENANCE_CONFLICT_RESOLVED: 'MAINTENANCE_CONFLICT_RESOLVED',
    MAINTENANCE_LANDLORD_CHARGE: 'MAINTENANCE_LANDLORD_CHARGE',
    MAINTENANCE_RATED: 'MAINTENANCE_RATED',
    // Generic
    SYSTEM: 'SYSTEM',
    // Visit requests
    VISIT_REQUEST_RECEIVED: 'VISIT_REQUEST_RECEIVED',
    VISIT_REQUEST_ACCEPTED: 'VISIT_REQUEST_ACCEPTED',
    VISIT_REQUEST_DECLINED: 'VISIT_REQUEST_DECLINED',
};
export class Notification extends Model {
}
Notification.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
    },
    type: {
        type: DataTypes.STRING(64),
        allowNull: false,
    },
    title: {
        type: DataTypes.STRING(255),
        allowNull: false,
    },
    body: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    related_entity_type: {
        type: DataTypes.STRING(64),
        allowNull: true,
    },
    related_entity_id: {
        type: DataTypes.STRING(64),
        allowNull: true,
    },
    data: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {},
    },
    is_read: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    },
    read_at: {
        type: DataTypes.DATE,
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
}, {
    sequelize,
    tableName: 'notifications',
    modelName: 'Notification',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        { fields: ['user_id', 'is_read'] },
        { fields: ['user_id', 'created_at'] },
        { fields: ['type'] },
    ],
});
export default Notification;
