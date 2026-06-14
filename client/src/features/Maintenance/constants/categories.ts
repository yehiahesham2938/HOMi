export const MAINTENANCE_CATEGORIES = [
    'structural',
    'appliances',
    'utilities',
    'plumbing',
    'electrical',
    'hvac',
    'pest',
    'exterior',
    'common',
    'security',
    'other',
] as const;

export type MaintenanceCategory = (typeof MAINTENANCE_CATEGORIES)[number];
