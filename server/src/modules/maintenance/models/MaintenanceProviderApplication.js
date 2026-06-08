import { Model, DataTypes, } from 'sequelize';
import sequelize from '../../../config/database.js';
export const MaintenanceProviderType = {
    CENTER: 'CENTER',
    INDIVIDUAL: 'INDIVIDUAL',
};
export const MaintenanceApplicationStatus = {
    PENDING: 'PENDING',
    APPROVED: 'APPROVED',
    REJECTED: 'REJECTED',
};
export class MaintenanceProviderApplication extends Model {
}
MaintenanceProviderApplication.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
        references: {
            model: 'users',
            key: 'id',
        },
        onDelete: 'CASCADE',
    },
    provider_type: {
        type: DataTypes.ENUM(...Object.values(MaintenanceProviderType)),
        allowNull: false,
    },
    business_name: {
        type: DataTypes.STRING(255),
        allowNull: true,
    },
    category: {
        type: DataTypes.STRING(120),
        allowNull: false,
    },
    categories: {
        type: DataTypes.JSONB,
        allowNull: true,
    },
    criminal_record_document: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    selfie_image: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    national_id_front: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    national_id_back: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    number_of_employees: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    company_location: {
        type: DataTypes.STRING(255),
        allowNull: true,
    },
    documentation_files: {
        type: DataTypes.JSONB,
        allowNull: true,
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    status: {
        type: DataTypes.ENUM(...Object.values(MaintenanceApplicationStatus)),
        allowNull: false,
        defaultValue: MaintenanceApplicationStatus.PENDING,
    },
    rejection_reason: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    reviewed_by_admin_id: {
        type: DataTypes.UUID,
        allowNull: true,
    },
    reviewed_at: {
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
    tableName: 'maintenance_provider_applications',
    modelName: 'MaintenanceProviderApplication',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
});
export default MaintenanceProviderApplication;
