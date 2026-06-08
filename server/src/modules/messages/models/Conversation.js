import { Model, DataTypes, } from 'sequelize';
import sequelize from '../../../config/database.js';
export class Conversation extends Model {
}
Conversation.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    participant_one_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id',
        },
    },
    participant_two_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id',
        },
    },
    property_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'properties',
            key: 'id',
        },
    },
    is_support: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    },
    last_message_at: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: null,
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
    tableName: 'conversations',
    modelName: 'Conversation',
    timestamps: true,
    paranoid: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    deletedAt: 'deleted_at',
    indexes: [
        {
            fields: ['participant_one_id'],
        },
        {
            fields: ['participant_two_id'],
        },
        {
            fields: ['last_message_at'],
        },
    ],
});
export default Conversation;
