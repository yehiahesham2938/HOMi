import { Model, DataTypes, } from 'sequelize';
import sequelize from '../../../config/database.js';
export class PropertyOwnershipDoc extends Model {
}
PropertyOwnershipDoc.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    property_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'properties',
            key: 'id',
        },
        onDelete: 'CASCADE',
    },
    document_url: {
        type: DataTypes.TEXT('long'),
        allowNull: false,
        validate: {
            isValidDocumentInput(value) {
                const isHttpUrl = /^https?:\/\/.+/i.test(value);
                const isDataImage = /^data:(image|application\/pdf)\/[a-zA-Z0-9.+-]+;base64,/.test(value);
                if (!isHttpUrl && !isDataImage) {
                    throw new Error('Document must be a valid URL or a base64 encoded document');
                }
            },
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
}, {
    sequelize,
    tableName: 'property_ownership_docs',
    modelName: 'PropertyOwnershipDoc',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        {
            fields: ['property_id'],
        },
    ],
});
export default PropertyOwnershipDoc;
