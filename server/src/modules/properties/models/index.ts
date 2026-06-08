import sequelize from '../../../config/database.js';
import { User } from '../../auth/models/User.js';
import {
    Property,
    PropertyStatus,
    FurnishingStatus,
    PropertyType,
    TargetTenant,
    type PropertyStatusType,
    type FurnishingStatusType,
    type PropertyTypeType,
    type TargetTenantType,
} from './Property.js';
import { PropertyImage } from './PropertyImage.js';
import { Amenity } from './Amenity.js';
import { PropertyAmenity } from './PropertyAmenity.js';
import { PropertySpecifications } from './PropertySpecifications.js';
import { PropertyDetailedLocation } from './PropertyDetailedLocation.js';
import { HouseRule } from './HouseRule.js';
import { PropertyHouseRule } from './PropertyHouseRule.js';
import { PropertyOwnershipDoc } from './PropertyOwnershipDoc.js';
import { PropertyReport, PropertyReportReason, PropertyReportStatus } from './PropertyReport.js';
import { VisitBooking, VisitBookingStatus, type VisitBookingStatusType } from './VisitBooking.js';

// ─── Associations ─────────────────────────────────────────────────────────────

// Property belongs to User (landlord)
Property.belongsTo(User, {
    foreignKey: 'landlord_id',
    as: 'landlord',
});

// User has many Properties
User.hasMany(Property, {
    foreignKey: 'landlord_id',
    as: 'properties',
});

// Property has many PropertyImages
Property.hasMany(PropertyImage, {
    foreignKey: 'property_id',
    as: 'images',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
});

// PropertyImage belongs to Property
PropertyImage.belongsTo(Property, {
    foreignKey: 'property_id',
    as: 'property',
});

// Property has many PropertyOwnershipDocs
Property.hasMany(PropertyOwnershipDoc, {
    foreignKey: 'property_id',
    as: 'ownershipDocs',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
});

// PropertyOwnershipDoc belongs to Property
PropertyOwnershipDoc.belongsTo(Property, {
    foreignKey: 'property_id',
    as: 'property',
});

// Property has one PropertySpecifications (one-to-one)
Property.hasOne(PropertySpecifications, {
    foreignKey: 'property_id',
    as: 'specifications',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
});

// PropertySpecifications belongs to Property
PropertySpecifications.belongsTo(Property, {
    foreignKey: 'property_id',
    as: 'property',
});

// Property has one PropertyDetailedLocation (one-to-one)
Property.hasOne(PropertyDetailedLocation, {
    foreignKey: 'property_id',
    as: 'detailedLocation',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
});

// PropertyDetailedLocation belongs to Property
PropertyDetailedLocation.belongsTo(Property, {
    foreignKey: 'property_id',
    as: 'property',
});

// Property <-> Amenity many-to-many through PropertyAmenity
Property.belongsToMany(Amenity, {
    through: PropertyAmenity,
    foreignKey: 'property_id',
    otherKey: 'amenity_id',
    as: 'amenities',
});

Amenity.belongsToMany(Property, {
    through: PropertyAmenity,
    foreignKey: 'amenity_id',
    otherKey: 'property_id',
    as: 'properties',
});

// Property <-> HouseRule many-to-many through PropertyHouseRule
Property.belongsToMany(HouseRule, {
    through: PropertyHouseRule,
    foreignKey: 'property_id',
    otherKey: 'house_rule_id',
    as: 'houseRules',
});

HouseRule.belongsToMany(Property, {
    through: PropertyHouseRule,
    foreignKey: 'house_rule_id',
    otherKey: 'property_id',
    as: 'properties',
});

// Property has many reports submitted by tenants
Property.hasMany(PropertyReport, {
    foreignKey: 'property_id',
    as: 'reports',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
});

// PropertyReport belongs to Property
PropertyReport.belongsTo(Property, {
    foreignKey: 'property_id',
    as: 'property',
});

// PropertyReport belongs to reporter (User)
PropertyReport.belongsTo(User, {
    foreignKey: 'reporter_id',
    as: 'reporter',
});

User.hasMany(PropertyReport, {
    foreignKey: 'reporter_id',
    as: 'submittedPropertyReports',
});

// PropertyReport can be reviewed/actioned by an admin (User)
PropertyReport.belongsTo(User, {
    foreignKey: 'reviewed_by_admin_id',
    as: 'reviewedBy',
});

User.hasMany(PropertyReport, {
    foreignKey: 'reviewed_by_admin_id',
    as: 'reviewedPropertyReports',
});

// Property has many VisitBookings
Property.hasMany(VisitBooking, {
    foreignKey: 'property_id',
    as: 'visitBookings',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
});

VisitBooking.belongsTo(Property, {
    foreignKey: 'property_id',
    as: 'property',
});

// User has many VisitBookings
User.hasMany(VisitBooking, {
    foreignKey: 'tenant_id',
    as: 'visitBookings',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
});

VisitBooking.belongsTo(User, {
    foreignKey: 'tenant_id',
    as: 'tenant',
});

// ─── Exports ──────────────────────────────────────────────────────────────────

export {
    sequelize,
    Property,
    PropertyStatus,
    FurnishingStatus,
    PropertyType,
    TargetTenant,
    PropertyImage,
    Amenity,
    PropertyAmenity,
    PropertySpecifications,
    PropertyDetailedLocation,
    HouseRule,
    PropertyHouseRule,
    PropertyOwnershipDoc,
    PropertyReport,
    PropertyReportReason,
    PropertyReportStatus,
    VisitBooking,
    VisitBookingStatus,
};

export type { PropertyStatusType, FurnishingStatusType, PropertyTypeType, TargetTenantType, VisitBookingStatusType };

export default {
    sequelize,
    Property,
    PropertyImage,
    Amenity,
    PropertyAmenity,
    PropertySpecifications,
    PropertyDetailedLocation,
    HouseRule,
    PropertyHouseRule,
    PropertyOwnershipDoc,
    PropertyReport,
    PropertyReportReason,
    PropertyReportStatus,
    VisitBooking,
    VisitBookingStatus,
};
