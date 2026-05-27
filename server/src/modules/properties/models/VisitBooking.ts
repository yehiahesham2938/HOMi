import {
    Model,
    DataTypes,
    type InferAttributes,
    type InferCreationAttributes,
    type CreationOptional,
    type ForeignKey,
    type NonAttribute,
    type Association,
} from 'sequelize';
import sequelize from '../../../config/database.js';
import type { Property } from './Property.js';
import type { User } from '../../auth/models/User.js';

export const VisitBookingStatus = {
    PENDING: 'PENDING',
    ACCEPTED: 'ACCEPTED',
    DECLINED: 'DECLINED',
} as const;

export type VisitBookingStatusType = (typeof VisitBookingStatus)[keyof typeof VisitBookingStatus];

export class VisitBooking extends Model<
    InferAttributes<VisitBooking>,
    InferCreationAttributes<VisitBooking>
> {
    declare id: CreationOptional<string>;
    declare property_id: ForeignKey<string>;
    declare tenant_id: ForeignKey<string>;
    declare visit_date: Date;
    declare status: CreationOptional<VisitBookingStatusType>;
    declare created_at: CreationOptional<Date>;
    declare updated_at: CreationOptional<Date>;

    declare property?: NonAttribute<Property>;
    declare tenant?: NonAttribute<User>;

    declare static associations: {
        property: Association<VisitBooking, Property>;
        tenant: Association<VisitBooking, User>;
    };
}

VisitBooking.init(
    {
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
    },
    {
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
    }
);

export default VisitBooking;
