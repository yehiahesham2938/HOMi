import { Model, DataTypes, } from 'sequelize';
import sequelize from '../../../config/database.js';
export class PropertyImage extends Model {
}
PropertyImage.init({
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
    },
    image_url: {
        type: DataTypes.TEXT('long'),
        allowNull: false,
        validate: {
            isValidImageInput(value) {
                const isHttpUrl = /^https?:\/\/.+/i.test(value);
                const isDataImage = /^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(value);
                if (!isHttpUrl && !isDataImage) {
                    throw new Error('Image must be a valid URL or a base64 data image');
                }
            },
        },
    },
    is_main: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
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
    tableName: 'property_images',
    modelName: 'PropertyImage',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        {
            fields: ['property_id'],
        },
        {
            fields: ['is_main'],
        },
    ],
});
export default PropertyImage;
