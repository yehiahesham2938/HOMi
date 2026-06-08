import { Model, DataTypes, } from 'sequelize';
import sequelize from '../../../config/database.js';
export class PropertySpecifications extends Model {
}
PropertySpecifications.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    property_id: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true, // One-to-one
        references: {
            model: 'properties',
            key: 'id',
        },
    },
    bedrooms: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            min: 0,
        },
    },
    bathrooms: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            min: 0,
        },
    },
    area_sqft: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
            min: 0,
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
    tableName: 'property_specifications',
    modelName: 'PropertySpecifications',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        {
            unique: true,
            fields: ['property_id'],
        },
    ],
});
export default PropertySpecifications;
