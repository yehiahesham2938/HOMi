import { Model, DataTypes, } from 'sequelize';
import sequelize from '../../../config/database.js';
export class PropertyHouseRule extends Model {
}
PropertyHouseRule.init({
    property_id: {
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true,
        references: {
            model: 'properties',
            key: 'id',
        },
    },
    house_rule_id: {
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true,
        references: {
            model: 'house_rules',
            key: 'id',
        },
    },
}, {
    sequelize,
    tableName: 'property_house_rules',
    modelName: 'PropertyHouseRule',
    timestamps: false,
    underscored: true,
    indexes: [
        { fields: ['property_id'] },
        { fields: ['house_rule_id'] },
    ],
});
export default PropertyHouseRule;
