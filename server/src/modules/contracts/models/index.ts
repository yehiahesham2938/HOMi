import sequelize from '../../../config/database.js';
import { User } from '../../auth/models/User.js';
import { Profile } from '../../auth/models/Profile.js';
import { Property } from '../../properties/models/Property.js';
import { RentalRequest } from '../../rental-requests/models/RentalRequest.js';
import { PropertySpecifications } from '../../properties/models/PropertySpecifications.js';
import {
    Contract,
    ContractStatus,
    ContractPaymentStatus,
    PaymentSchedule,
    RentDueDate,
    type ContractStatusType,
    type ContractPaymentStatusType,
    type PaymentScheduleType,
    type RentDueDateType,
} from './Contract.js';
import {
    ContractMaintenanceResponsibility,
    MaintenanceArea,
    ResponsibleParty,
    type MaintenanceAreaType,
    type ResponsiblePartyType,
} from './ContractMaintenanceResponsibility.js';
import { TenantReport, TenantReportReason, TenantReportStatus } from './TenantReport.js';
import { LeaseTerminationRequest, LeaseTerminationStatus } from './LeaseTerminationRequest.js';

// ─── Associations ─────────────────────────────────────────────────────────────

// Contract belongs to RentalRequest
Contract.belongsTo(RentalRequest, {
    foreignKey: 'rental_request_id',
    as: 'rentalRequest',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
});

RentalRequest.hasOne(Contract, {
    foreignKey: 'rental_request_id',
    as: 'contract',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
});

// Contract belongs to Property
Contract.belongsTo(Property, {
    foreignKey: 'property_id',
    as: 'property',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
});

Property.hasMany(Contract, {
    foreignKey: 'property_id',
    as: 'contracts',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
});

// Contract belongs to User (landlord)
Contract.belongsTo(User, {
    foreignKey: 'landlord_id',
    as: 'landlord',
});

// Contract belongs to User (tenant)
Contract.belongsTo(User, {
    foreignKey: 'tenant_id',
    as: 'tenant',
});

Contract.hasMany(ContractMaintenanceResponsibility, {
    foreignKey: 'contract_id',
    as: 'maintenanceResponsibilities',
    onDelete: 'CASCADE',
});

ContractMaintenanceResponsibility.belongsTo(Contract, {
    foreignKey: 'contract_id',
    as: 'contract',
});

// TenantReport Associations
TenantReport.belongsTo(Contract, { foreignKey: 'contract_id', as: 'contract' });
TenantReport.belongsTo(User, { foreignKey: 'reporter_id', as: 'reporter' });
TenantReport.belongsTo(User, { foreignKey: 'tenant_id', as: 'reportedTenant' });
Contract.hasMany(TenantReport, { foreignKey: 'contract_id', as: 'tenantReports' });

// LeaseTerminationRequest Associations
LeaseTerminationRequest.belongsTo(Contract, { foreignKey: 'contract_id', as: 'contract' });
LeaseTerminationRequest.belongsTo(User, { foreignKey: 'requester_id', as: 'requester' });
Contract.hasMany(LeaseTerminationRequest, { foreignKey: 'contract_id', as: 'terminationRequests' });

// ─── Exports ──────────────────────────────────────────────────────────────────

export {
    sequelize,
    Contract,
    ContractStatus,
    ContractPaymentStatus,
    PaymentSchedule,
    RentDueDate,
    ContractMaintenanceResponsibility,
    MaintenanceArea,
    ResponsibleParty,
    User,
    Profile,
    Property,
    RentalRequest,
    PropertySpecifications,
    TenantReport,
    TenantReportReason,
    TenantReportStatus,
    LeaseTerminationRequest,
    LeaseTerminationStatus,
};

export type {
    ContractStatusType,
    ContractPaymentStatusType,
    PaymentScheduleType,
    RentDueDateType,
    MaintenanceAreaType,
    ResponsiblePartyType,
};

export default {
    sequelize,
    Contract,
    ContractMaintenanceResponsibility,
    TenantReport,
    LeaseTerminationRequest,
};
