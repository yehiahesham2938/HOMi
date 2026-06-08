import { Model, DataTypes, } from 'sequelize';
import sequelize from '../../../config/database.js';
// ─── Enums ───────────────────────────────────────────────────────────────────
export const ContractStatus = {
    PENDING_LANDLORD: 'PENDING_LANDLORD',
    PENDING_TENANT: 'PENDING_TENANT',
    PENDING_PAYMENT: 'PENDING_PAYMENT',
    ACTIVE: 'ACTIVE',
    TERMINATED: 'TERMINATED',
    EXPIRED: 'EXPIRED',
};
export const PaymentSchedule = {
    MONTHLY: 'MONTHLY',
    QUARTERLY: 'QUARTERLY',
    ANNUALLY: 'ANNUALLY',
};
export const ContractPaymentStatus = {
    PENDING: 'PENDING',
    PAID: 'PAID',
    FAILED: 'FAILED',
};
export const RentDueDate = {
    FIRST_OF_MONTH: '1ST_OF_MONTH',
    FIFTH_OF_MONTH: '5TH_OF_MONTH',
    LAST_DAY_OF_MONTH: 'LAST_DAY_OF_MONTH',
};
export class Contract extends Model {
}
Contract.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    contract_id: {
        type: DataTypes.STRING(20),
        allowNull: false,
        unique: true,
    },
    lease_id: {
        type: DataTypes.STRING(20),
        allowNull: true,
        unique: true,
    },
    rental_request_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'rental_requests',
            key: 'id',
        },
    },
    property_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'properties',
            key: 'id',
        },
    },
    landlord_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id',
        },
    },
    tenant_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id',
        },
    },
    status: {
        type: DataTypes.ENUM(...Object.values(ContractStatus)),
        allowNull: false,
        defaultValue: ContractStatus.PENDING_LANDLORD,
    },
    rent_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
    },
    security_deposit: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
    },
    service_fee: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 10.00,
    },
    payment_schedule: {
        type: DataTypes.ENUM(...Object.values(PaymentSchedule)),
        allowNull: false,
        defaultValue: PaymentSchedule.MONTHLY,
    },
    rent_due_date: {
        type: DataTypes.ENUM(...Object.values(RentDueDate)),
        allowNull: true,
    },
    late_fee_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
    },
    max_occupants: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    move_in_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
    },
    lease_duration_months: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    landlord_national_id: {
        type: DataTypes.STRING(500),
        allowNull: true,
    },
    property_registration_number: {
        type: DataTypes.STRING(100),
        allowNull: true,
    },
    landlord_signature_url: {
        type: DataTypes.STRING(500),
        allowNull: true,
    },
    landlord_signed_at: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    tenant_national_id: {
        type: DataTypes.STRING(500),
        allowNull: true,
    },
    tenant_emergency_contact_name: {
        type: DataTypes.STRING(200),
        allowNull: true,
    },
    tenant_emergency_phone: {
        type: DataTypes.STRING(50),
        allowNull: true,
    },
    tenant_signature_url: {
        type: DataTypes.STRING(500),
        allowNull: true,
    },
    tenant_signed_at: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    tenant_agreed_terms: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    },
    payment_status: {
        type: DataTypes.ENUM(...Object.values(ContractPaymentStatus)),
        allowNull: false,
        defaultValue: ContractPaymentStatus.PENDING,
    },
    payment_verified_at: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    paymob_order_id: {
        type: DataTypes.BIGINT,
        allowNull: true,
    },
    paymob_transaction_id: {
        type: DataTypes.BIGINT,
        allowNull: true,
    },
    autopay_enabled: {
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
    tableName: 'contracts',
    modelName: 'Contract',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        { fields: ['rental_request_id'] },
        { fields: ['property_id'] },
        { fields: ['landlord_id'] },
        { fields: ['tenant_id'] },
        { fields: ['status'] },
        { fields: ['payment_status'] },
        {
            unique: true,
            fields: ['contract_id'],
            name: 'unique_contract_id',
        },
    ],
});
export default Contract;
