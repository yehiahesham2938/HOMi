import { Model, DataTypes, } from 'sequelize';
import sequelize from '../../../config/database.js';
export const VisitBookingStatus = {
    PENDING: 'PENDING',
    ACCEPTED: 'ACCEPTED',
    DECLINED: 'DECLINED',
};
export class VisitBooking extends Model {
}
VisitBooking.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    property_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'properties', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
    },
    tenant_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
    },
    visit_date: {
        type: DataTypes.DATE,
        allowNull: false,
    },
    status: {
        type: DataTypes.ENUM(...Object.values(VisitBookingStatus)),
        allowNull: false,
        defaultValue: VisitBookingStatus.PENDING,
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
    tableName: 'visit_bookings',
    modelName: 'VisitBooking',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        { fields: ['property_id'] },
        { fields: ['tenant_id'] },
        { fields: ['status'] },
        { fields: ['visit_date'] },
    ],
});
export default VisitBooking;
