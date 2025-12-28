// =============================================================================
// API SERVICES - INDEX
// =============================================================================

// Client
export { default as apiClient, getToken, setToken, removeToken, isAuthenticated } from './client';

// Services
export { default as authApi } from './auth.api';
export { default as productsApi } from './products.api';
export { default as ordersApi } from './orders.api';
export { default as inventoryApi } from './inventory.api';

// Individual functions
export * from './auth.api';
export * from './products.api';
export * from './orders.api';
export * from './inventory.api';