import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// =============================================================================
// SETTINGS TYPES
// =============================================================================

interface OrderSettings {
    allowZeroStockOrders: boolean;  // Allow placing orders when inventory is zero
    requireApprovalForZeroStock: boolean;  // Require manager approval for zero stock orders
}

interface NotificationSettings {
    newQuotes: boolean;
    orderUpdates: boolean;
    lowStock: boolean;
    paymentReceived: boolean;
}

interface AppSettings {
    theme: 'light' | 'dark';
    language: 'en' | 'hi';
    currency: string;
    dateFormat: string;
}

interface SettingsState {
    orderSettings: OrderSettings;
    notificationSettings: NotificationSettings;
    appSettings: AppSettings;
}

// =============================================================================
// CONTEXT TYPE
// =============================================================================

interface SettingsContextType {
    // Order Settings
    orderSettings: OrderSettings;
    setAllowZeroStockOrders: (value: boolean) => void;
    setRequireApprovalForZeroStock: (value: boolean) => void;

    // Notification Settings
    notificationSettings: NotificationSettings;
    updateNotificationSettings: (settings: Partial<NotificationSettings>) => void;

    // App Settings
    appSettings: AppSettings;
    setTheme: (theme: 'light' | 'dark') => void;
    setLanguage: (language: 'en' | 'hi') => void;

    // Bulk update
    updateSettings: (settings: Partial<SettingsState>) => void;

    // Reset to defaults
    resetSettings: () => void;

    // Loading state
    isLoading: boolean;
}

// =============================================================================
// DEFAULT VALUES
// =============================================================================

const defaultOrderSettings: OrderSettings = {
    allowZeroStockOrders: false,  // Default: Don't allow zero stock orders
    requireApprovalForZeroStock: true,
};

const defaultNotificationSettings: NotificationSettings = {
    newQuotes: true,
    orderUpdates: true,
    lowStock: true,
    paymentReceived: false,
};

const defaultAppSettings: AppSettings = {
    theme: 'light',
    language: 'en',
    currency: 'INR',
    dateFormat: 'DD/MM/YYYY',
};

const defaultSettings: SettingsState = {
    orderSettings: defaultOrderSettings,
    notificationSettings: defaultNotificationSettings,
    appSettings: defaultAppSettings,
};

// =============================================================================
// LOCAL STORAGE KEY
// =============================================================================

const SETTINGS_STORAGE_KEY = 'bulkflow_app_settings';

// =============================================================================
// CONTEXT CREATION
// =============================================================================

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

// =============================================================================
// PROVIDER COMPONENT
// =============================================================================

export function SettingsProvider({ children }: { children: ReactNode }) {
    const [isLoading, setIsLoading] = useState(true);
    const [settings, setSettings] = useState<SettingsState>(defaultSettings);

    // ---------------------------------------------------------------------------
    // Load settings from localStorage on mount
    // ---------------------------------------------------------------------------
    useEffect(() => {
        try {
            const savedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
            if (savedSettings) {
                const parsed = JSON.parse(savedSettings);
                setSettings({
                    orderSettings: { ...defaultOrderSettings, ...parsed.orderSettings },
                    notificationSettings: { ...defaultNotificationSettings, ...parsed.notificationSettings },
                    appSettings: { ...defaultAppSettings, ...parsed.appSettings },
                });
            }
        } catch (error) {
            console.error('Error loading settings from localStorage:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // ---------------------------------------------------------------------------
    // Save settings to localStorage whenever they change
    // ---------------------------------------------------------------------------
    useEffect(() => {
        if (!isLoading) {
            try {
                localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
            } catch (error) {
                console.error('Error saving settings to localStorage:', error);
            }
        }
    }, [settings, isLoading]);

    // ---------------------------------------------------------------------------
    // Order Settings Handlers
    // ---------------------------------------------------------------------------
    const setAllowZeroStockOrders = (value: boolean) => {
        setSettings((prev) => ({
            ...prev,
            orderSettings: {
                ...prev.orderSettings,
                allowZeroStockOrders: value,
            },
        }));
    };

    const setRequireApprovalForZeroStock = (value: boolean) => {
        setSettings((prev) => ({
            ...prev,
            orderSettings: {
                ...prev.orderSettings,
                requireApprovalForZeroStock: value,
            },
        }));
    };

    // ---------------------------------------------------------------------------
    // Notification Settings Handlers
    // ---------------------------------------------------------------------------
    const updateNotificationSettings = (newSettings: Partial<NotificationSettings>) => {
        setSettings((prev) => ({
            ...prev,
            notificationSettings: {
                ...prev.notificationSettings,
                ...newSettings,
            },
        }));
    };

    // ---------------------------------------------------------------------------
    // App Settings Handlers
    // ---------------------------------------------------------------------------
    const setTheme = (theme: 'light' | 'dark') => {
        setSettings((prev) => ({
            ...prev,
            appSettings: {
                ...prev.appSettings,
                theme,
            },
        }));
    };

    const setLanguage = (language: 'en' | 'hi') => {
        setSettings((prev) => ({
            ...prev,
            appSettings: {
                ...prev.appSettings,
                language,
            },
        }));
    };

    // ---------------------------------------------------------------------------
    // Bulk Update Handler
    // ---------------------------------------------------------------------------
    const updateSettings = (newSettings: Partial<SettingsState>) => {
        setSettings((prev) => ({
            ...prev,
            ...newSettings,
            orderSettings: {
                ...prev.orderSettings,
                ...newSettings.orderSettings,
            },
            notificationSettings: {
                ...prev.notificationSettings,
                ...newSettings.notificationSettings,
            },
            appSettings: {
                ...prev.appSettings,
                ...newSettings.appSettings,
            },
        }));
    };

    // ---------------------------------------------------------------------------
    // Reset Handler
    // ---------------------------------------------------------------------------
    const resetSettings = () => {
        setSettings(defaultSettings);
        localStorage.removeItem(SETTINGS_STORAGE_KEY);
    };

    // ---------------------------------------------------------------------------
    // Context Value
    // ---------------------------------------------------------------------------
    const contextValue: SettingsContextType = {
        // Order Settings
        orderSettings: settings.orderSettings,
        setAllowZeroStockOrders,
        setRequireApprovalForZeroStock,

        // Notification Settings
        notificationSettings: settings.notificationSettings,
        updateNotificationSettings,

        // App Settings
        appSettings: settings.appSettings,
        setTheme,
        setLanguage,

        // Bulk operations
        updateSettings,
        resetSettings,

        // Loading state
        isLoading,
    };

    return (
        <SettingsContext.Provider value={contextValue}>
            {children}
        </SettingsContext.Provider>
    );
}

// =============================================================================
// CUSTOM HOOK
// =============================================================================

export function useSettings() {
    const context = useContext(SettingsContext);
    if (!context) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
}

// =============================================================================
// CONVENIENCE HOOKS
// =============================================================================

/**
 * Hook to get only order settings
 */
export function useOrderSettings() {
    const { orderSettings, setAllowZeroStockOrders, setRequireApprovalForZeroStock } = useSettings();
    return {
        ...orderSettings,
        setAllowZeroStockOrders,
        setRequireApprovalForZeroStock,
    };
}

/**
 * Hook to check if zero stock orders are allowed
 */
export function useAllowZeroStockOrders() {
    const { orderSettings } = useSettings();
    return orderSettings.allowZeroStockOrders;
}