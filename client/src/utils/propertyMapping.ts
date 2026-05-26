import {
    resolveLandlordUserIdFromPropertyResponse
} from '../services/property.service';
import type {
    PropertyResponse
} from '../services/property.service';

export interface PropertyUI {
    id: string;
    ownerId: string;
    title: string;
    address: string;
    price: number;
    beds: number;
    baths: number;
    sqft: number;
    image: string;
    allImages: string[];
    tags: string[];
    rating: number;
    securityDeposit: number;
    furnishing: string;
    targetTenant: string;
    availableDate: string;
    petsAllowed: boolean;
    description: string;
    ownerName: string;
    ownerImage: string;
    ownerVerified: boolean;
    maintenanceResponsibilities: Array<{
        area: string;
        responsible_party: 'LANDLORD' | 'TENANT';
    }>;
    locationLat: number | null;
    locationLng: number | null;
    availabilityDateISO: string | null;
    listedAtISO: string;
    type?: string;
}

const mapTargetTenant = (targetTenant: string) => {
    switch (targetTenant) {
        case 'STUDENTS':
            return 'Students';
        case 'FAMILIES':
            return 'Families';
        case 'TOURISTS':
            return 'Tourists';
        default:
            return 'Any';
    }
};

const mapFurnishingLabel = (furnishing: string | null): string => {
    if (furnishing === 'Fully') return 'Fully Furnished';
    if (furnishing === 'Semi') return 'Semi-Furnished';
    return 'Unfurnished';
};

export const mapPropertyToUI = (property: PropertyResponse): PropertyUI => {
    const mainImage = property.images.find((image) => image.isMain)?.imageUrl;
    const fallbackImage = property.images[0]?.imageUrl;
    const image = mainImage || fallbackImage || 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=800&q=80';
    const allImages = property.images.length > 0 ? property.images.map((img) => img.imageUrl) : [image];
    const tags = property.amenities.slice(0, 2).map((amenity) => amenity.name);
    const normalizedFurnishing = mapFurnishingLabel(property.furnishing);

    return {
        id: property.id,
        ownerId: resolveLandlordUserIdFromPropertyResponse(property),
        title: property.title,
        address: property.address,
        price: property.monthlyPrice,
        beds: property.specifications?.bedrooms ?? 0,
        baths: property.specifications?.bathrooms ?? 0,
        sqft: property.specifications?.areaSqft ?? 0,
        image,
        allImages,
        tags: tags.length > 0 ? tags : [property.type ?? 'Property', normalizedFurnishing],
        rating: 4.8,
        securityDeposit: property.securityDeposit,
        furnishing: normalizedFurnishing,
        targetTenant: mapTargetTenant(property.targetTenant),
        availableDate: property.availabilityDate ? new Date(property.availabilityDate).toLocaleDateString() : 'Not specified',
        availabilityDateISO: property.availabilityDate ?? null,
        listedAtISO: property.createdAt,
        type: property.type || 'Apartment',
        locationLat:
            property.detailedLocation != null && Number.isFinite(property.detailedLocation.locationLat)
                ? property.detailedLocation.locationLat
                : null,
        locationLng:
            property.detailedLocation != null && Number.isFinite(property.detailedLocation.locationLong)
                ? property.detailedLocation.locationLong
                : null,
        petsAllowed: property.houseRules.some((rule) => rule.name === 'Pets Allowed'),
        description: property.description,
        ownerName: property.landlord
            ? `${property.landlord.firstName} ${property.landlord.lastName}`.trim()
            : 'Owner',
        ownerImage:
            property.landlord?.avatarUrl ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(
                property.landlord
                    ? `${property.landlord.firstName} ${property.landlord.lastName}`.trim() || 'Owner'
                    : 'Owner'
            )}&background=0f172a&color=ffffff&size=128`,
        ownerVerified: Boolean(property.landlord?.isVerified),
        maintenanceResponsibilities: property.maintenanceResponsibilities ?? [],
    };
};
