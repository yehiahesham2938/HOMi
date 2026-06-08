import { Model, DataTypes, } from 'sequelize';
import sequelize from '../../../config/database.js';
export class PropertyAmenity extends Model {
}
PropertyAmenity.init({
    property_id: {
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true,
        references: {
            model: 'properties',
            key: 'id',
        },
    },
    amenity_id: {
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true,
        references: {
            model: 'amenities',
            key: 'id',
        },
    },
}, {
    sequelize,
    tableName: 'property_amenities',
    modelName: 'PropertyAmenity',
    timestamps: false,
    underscored: true,
    indexes: [
        { fields: ['property_id'] },
        { fields: ['amenity_id'] },
    ],
});
export default PropertyAmenity;
