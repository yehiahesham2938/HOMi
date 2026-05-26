import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Op } from 'sequelize';
import {
    sequelize,
    Property,
    PropertyImage,
    Amenity,
    PropertySpecifications,
    PropertyDetailedLocation,
    HouseRule,
} from '../../../../src/modules/properties/models/index.js';
import { User } from '../../../../src/modules/auth/models/User.js';
import { propertyService, PropertyError } from '../../../../src/modules/properties/services/property.service.js';
import type { 
    CreatePropertyRequest, 
    UpdatePropertyRequest, 
    PropertyQuery 
} from '../../../../src/modules/properties/interfaces/property.interfaces.js';

vi.mock('../../../../src/modules/properties/models/index.js', () => ({
    sequelize: { transaction: vi.fn() },
    Property: { create: vi.fn(), findByPk: vi.fn(), findAndCountAll: vi.fn(), update: vi.fn() },
    PropertyImage: { bulkCreate: vi.fn(), destroy: vi.fn(), findAll: vi.fn() },
    Amenity: { findAll: vi.fn() },
    PropertySpecifications: { create: vi.fn(), findOrCreate: vi.fn(), findOne: vi.fn() },
    PropertyDetailedLocation: { create: vi.fn(), findOrCreate: vi.fn(), findOne: vi.fn() },
    HouseRule: { findAll: vi.fn() },
    PropertyOwnershipDoc: {
        bulkCreate: vi.fn().mockResolvedValue([]),
        findAll: vi.fn().mockResolvedValue([]),
        destroy: vi.fn().mockResolvedValue(0),
    },
    PropertyStatus: {
        DRAFT: 'DRAFT',
        PENDING_APPROVAL: 'PENDING_APPROVAL',
        AVAILABLE: 'AVAILABLE',
        REJECTED: 'REJECTED',
        RENTED: 'RENTED',
    },
}));

vi.mock('../../../../src/modules/auth/models/User.js', () => ({
    User: { findByPk: vi.fn() },
}));

/**
 * Creates a mock Sequelize model instance.
 * The update method actually modifies the object to fix testing of return values.
 */
const sequelizeMock = (data: any = {}) => ({
    id: 'mock-id',
    ...data,
    update: vi.fn().mockImplementation(function (this: any, updates: any) {
        Object.assign(this, updates);
        return Promise.resolve(this);
    }),
    destroy: vi.fn().mockResolvedValue(undefined),
    setAmenities: vi.fn().mockResolvedValue(undefined),
    setHouseRules: vi.fn().mockResolvedValue(undefined),
    getAmenities: vi.fn().mockResolvedValue([]),
    getHouseRules: vi.fn().mockResolvedValue([]),
});

describe('PropertyService', () => {
    const mockTx = { commit: vi.fn(), rollback: vi.fn() };
    const uid = 'landlord-1';
    const pid = 'property-1';

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(sequelize.transaction).mockResolvedValue(mockTx as any);
    });

    it('should be defined', () => expect(propertyService).toBeDefined());

    describe('createProperty', () => {
        const input: CreatePropertyRequest = {
            title: 'Test', 
            description: 'Desc', 
            monthly_price: 1000, 
            security_deposit: 500,
            address: '123 St', 
            furnishing: 'Fully', 
            availability_date: '2025-01-01',
            specifications: { bedrooms: 1, bathrooms: 1, area_sqft: 500 },
            detailed_location: { 
                city: 'City', area: 'Area', street_name: 'St', building_number: '1', 
                floor: 1, unit_apt: '1', location_lat: 0, location_long: 0 
            },
            images: [{ image_url: 'url', is_main: true }],
            ownership_documents: [],
        };

        it('throws when user not found', async () => {
            vi.mocked(User.findByPk).mockResolvedValue(null);
            await expect(propertyService.createProperty(uid, input)).rejects.toThrow(PropertyError);
            expect(mockTx.rollback).toHaveBeenCalled();
        });

        it('throws when not a landlord', async () => {
            vi.mocked(User.findByPk).mockResolvedValue({ id: uid, role: 'TENANT' } as any);
            await expect(propertyService.createProperty(uid, input)).rejects.toMatchObject({ code: 'FORBIDDEN' });
        });

        it('throws on invalid amenities', async () => {
            vi.mocked(User.findByPk).mockResolvedValue({ id: uid, role: 'LANDLORD' } as any);
            vi.mocked(Amenity.findAll).mockResolvedValue([]);
            await expect(propertyService.createProperty(uid, { ...input, amenity_names: ['Wifi'] })).rejects.toMatchObject({ code: 'INVALID_AMENITY_NAMES' });
        });

        it('creates property successfully', async () => {
            vi.mocked(User.findByPk).mockResolvedValue({ id: uid, role: 'LANDLORD' } as any);
            vi.mocked(Amenity.findAll).mockResolvedValue([{ id: 'a1', name: 'Wifi' }] as any);
            vi.mocked(HouseRule.findAll).mockResolvedValue([]);
            const prop = sequelizeMock({ id: pid, landlord_id: uid, title: 'Test' });
            vi.mocked(Property.create).mockResolvedValue(prop as any);
            vi.mocked(PropertySpecifications.create).mockResolvedValue({ id: 's1' } as any);
            vi.mocked(PropertyDetailedLocation.create).mockResolvedValue({ id: 'l1' } as any);
            vi.mocked(PropertyImage.bulkCreate).mockResolvedValue([{ id: 'i1' }] as any);

            const res = await propertyService.createProperty(uid, { ...input, amenity_names: ['Wifi'] });
            expect(res.id).toBe(pid);
            expect(mockTx.commit).toHaveBeenCalled();
            expect(prop.setAmenities).toHaveBeenCalledWith(['a1'], { transaction: mockTx });
        });
    });

    describe('getPropertyById', () => {
        it('throws if not found', async () => {
            vi.mocked(Property.findByPk).mockResolvedValue(null);
            await expect(propertyService.getPropertyById(pid)).rejects.toMatchObject({ code: 'PROPERTY_NOT_FOUND' });
        });

        it('returns formatted property', async () => {
            const prop = sequelizeMock({ 
                id: pid, landlord_id: uid, title: 'Test', images: [], amenities: [], houseRules: [], 
                specifications: { area_sqft: 100 }, detailedLocation: { city: 'City' } 
            });
            vi.mocked(Property.findByPk).mockResolvedValue(prop as any);
            const res = await propertyService.getPropertyById(pid);
            expect(res.title).toBe('Test');
            expect(res.specifications?.areaSqft).toBe(100);
        });
    });

    describe('getAllProperties', () => {
        it('filters and paginates', async () => {
            vi.mocked(Property.findAndCountAll).mockResolvedValue({
                count: 1,
                rows: [sequelizeMock({ id: pid, landlord_id: uid, images: [], amenities: [], houseRules: [], specifications: {}, detailedLocation: {} })]
            } as any);
            const query: PropertyQuery = { minPrice: 100, page: 2, limit: 5 };
            const res = await propertyService.getAllProperties(query);
            expect(res.properties).toHaveLength(1);
            expect(res.pagination.page).toBe(2);
            
            const calls = vi.mocked(Property.findAndCountAll).mock.calls;
            const args = calls[0]![0];
            expect(args?.offset).toBe(5);
            expect((args?.where as any).monthly_price[Op.gte]).toBe(100);
        });
    });

    describe('updateProperty', () => {
        it('throws if not found', async () => {
            vi.mocked(Property.findByPk).mockResolvedValue(null);
            await expect(propertyService.updateProperty(pid, uid, {})).rejects.toMatchObject({ code: 'PROPERTY_NOT_FOUND' });
        });

        it('throws if not owner', async () => {
            vi.mocked(Property.findByPk).mockResolvedValue(sequelizeMock({ landlord_id: 'other' }) as any);
            await expect(propertyService.updateProperty(pid, uid, {})).rejects.toMatchObject({ code: 'FORBIDDEN' });
        });

        it('updates fields successfully', async () => {
            const prop = sequelizeMock({ id: pid, landlord_id: uid, title: 'Old' });
            vi.mocked(Property.findByPk).mockResolvedValue(prop as any);
            vi.mocked(PropertySpecifications.findOne).mockResolvedValue(null);
            vi.mocked(PropertyDetailedLocation.findOne).mockResolvedValue(null);
            vi.mocked(PropertyImage.findAll).mockResolvedValue([]);

            const input: UpdatePropertyRequest = { title: 'New' };
            const res = await propertyService.updateProperty(pid, uid, input);
            expect(res.title).toBe('New');
            expect(mockTx.commit).toHaveBeenCalled();
        });

        it('updates specifications and images', async () => {
            const prop = sequelizeMock({ id: pid, landlord_id: uid });
            vi.mocked(Property.findByPk).mockResolvedValue(prop as any);
            const spec = sequelizeMock({ id: 's1' });
            vi.mocked(PropertySpecifications.findOrCreate).mockResolvedValue([spec, true] as any);
            vi.mocked(PropertyDetailedLocation.findOne).mockResolvedValue(null);
            vi.mocked(PropertyImage.bulkCreate).mockResolvedValue([{ id: 'i1' }] as any);

            const input: UpdatePropertyRequest = { 
                specifications: { bedrooms: 5 },
                images: [{ image_url: 'u', is_main: true }]
            };
            await propertyService.updateProperty(pid, uid, input);

            expect(spec.update).toHaveBeenCalledWith({ bedrooms: 5 }, { transaction: mockTx });
            expect(PropertyImage.destroy).toHaveBeenCalled();
            expect(PropertyImage.bulkCreate).toHaveBeenCalled();
        });
    });

    describe('deleteProperty', () => {
        it('throws if not found', async () => {
            vi.mocked(Property.findByPk).mockResolvedValue(null);
            await expect(propertyService.deleteProperty(pid, uid)).rejects.toMatchObject({ code: 'PROPERTY_NOT_FOUND' });
        });

        it('throws if not owner', async () => {
            vi.mocked(Property.findByPk).mockResolvedValue(sequelizeMock({ landlord_id: 'other' }) as any);
            await expect(propertyService.deleteProperty(pid, uid)).rejects.toMatchObject({ code: 'FORBIDDEN' });
        });

        it('deletes successfully', async () => {
            const prop = sequelizeMock({ id: pid, landlord_id: uid });
            vi.mocked(Property.findByPk).mockResolvedValue(prop as any);
            const res = await propertyService.deleteProperty(pid, uid);
            expect(prop.destroy).toHaveBeenCalled();
            expect(res.success).toBe(true);
        });
    });
});
