// SedekahMap Constants

export const APP_NAME = 'SedekahMap';
export const APP_DESCRIPTION = 'Platform Distribusi Sedekah Tepat Sasaran Berbasis Peta';

export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export const API_ROUTES = {
  // Public
  PUBLIC_MAP_DATA: '/api/public/map-data',
  PUBLIC_HEATMAP_DATA: '/api/public/heatmap-data',
  PUBLIC_STATS: '/api/public/stats',
  PUBLIC_REVIEWS: '/api/public/reviews',

  // Auth
  AUTH_LOGIN: '/api/auth/login',
  AUTH_REGISTER: '/api/auth/register',
  AUTH_LOGOUT: '/api/auth/logout',

  // Verifikator
  VERIFIKATOR_BENEFICIARIES: '/api/verifikator/beneficiaries',

  // Donatur
  DONATUR_ACCESS_REQUESTS: '/api/donatur/access-requests',
  DONATUR_DISTRIBUTIONS: '/api/donatur/distributions',
  DONATUR_REVIEWS: '/api/donatur/reviews',

  // Admin
  ADMIN_ACCESS_REQUESTS: '/api/admin/access-requests',
  ADMIN_DISTRIBUTIONS: '/api/admin/distributions',
  ADMIN_USERS: '/api/admin/users',
} as const;

export const ROLES = {
  ADMIN: 'admin',
  VERIFIKATOR: 'verifikator',
  DONATUR: 'donatur',
} as const;

export const PERMISSIONS = {
  // Beneficiary
  BENEFICIARY_CREATE: 'beneficiary:create',
  BENEFICIARY_READ: 'beneficiary:read',
  BENEFICIARY_UPDATE: 'beneficiary:update',
  BENEFICIARY_DELETE: 'beneficiary:delete',

  // Access Request
  ACCESS_REQUEST_CREATE: 'access_request:create',
  ACCESS_REQUEST_READ: 'access_request:read',
  ACCESS_REQUEST_APPROVE: 'access_request:approve',
  ACCESS_REQUEST_REJECT: 'access_request:reject',

  // Distribution
  DISTRIBUTION_CREATE: 'distribution:create',
  DISTRIBUTION_READ: 'distribution:read',
  DISTRIBUTION_VERIFY: 'distribution:verify',

  // Review
  REVIEW_CREATE: 'review:create',
  REVIEW_READ: 'review:read',

  // User Management
  USER_CREATE: 'user:create',
  USER_READ: 'user:read',
  USER_UPDATE: 'user:update',
  USER_DELETE: 'user:delete',
  USER_ASSIGN_ROLE: 'user:assign_role',
} as const;

export const STATUS = {
  BENEFICIARY: {
    VERIFIED: 'verified',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed',
    EXPIRED: 'expired',
  },
  ACCESS_REQUEST: {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected',
  },
  DISTRIBUTION: {
    PENDING_PROOF: 'pending_proof',
    PENDING_REVIEW: 'pending_review',
    COMPLETED: 'completed',
    REJECTED: 'rejected',
  },
} as const;

export const REGION_LEVELS = {
  PROVINSI: 1,
  KABUPATEN: 2,
  KECAMATAN: 3,
  DESA: 4,
} as const;

export const MAP_CONFIG = {
  DEFAULT_CENTER: {
    lat: -2.5489, // Indonesia center
    lng: 118.0149,
  },
  DEFAULT_ZOOM: 5,
  MIN_ZOOM: 3,
  MAX_ZOOM: 18,
} as const;
