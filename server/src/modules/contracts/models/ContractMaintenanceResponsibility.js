import { Model, DataTypes, } from 'sequelize';
import sequelize from '../../../config/database.js';
// ─── Enums ───────────────────────────────────────────────────────────────────
export const MaintenanceArea = {
    STRUCTURAL_REPAIRS: 'Structural Repairs',
    INTERIOR_APPLIANCES: 'Interior Appliances',
    UTILITY_BILLS: 'Utility Bills',
    PLUMBING: 'Plumbing',
    ELECTRICAL: 'Electrical',
    HVAC: 'HVAC / Air Conditioning',
    PEST_CONTROL: 'Pest Control',
    EXTERIOR_MAINTENANCE: 'Exterior Maintenance',
    COMMON_AREAS: 'Common Areas',
    SECURITY_SYSTEMS: 'Security Systems',
};
export const ResponsibleParty = {
    LANDLORD: 'LANDLORD',
    TENANT: 'TENANT',
};
export class ContractMaintenanceResponsibility extends Model {
}
ContractMaintenanceResponsibility.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    contract_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'contracts',
            key: 'id',
        },
        onDelete: 'CASCADE',
    },
    area: {
        type: DataTypes.ENUM(...Object.values(MaintenanceArea)),
        allowNull: false,
    },
    responsible_party: {
        type: DataTypes.ENUM(...Object.values(ResponsibleParty)),
        allowNull: false,
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
    tableName: 'contract_maintenance_responsibilities',
    modelName: 'ContractMaintenanceResponsibility',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        { fields: ['contract_id'] },
    ],
});
export default ContractMaintenanceResponsibility;
