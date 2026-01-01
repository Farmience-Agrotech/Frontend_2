import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { RolesProvider } from "./contexts/RolesContext";
import { UsersProvider } from "./contexts/UsersContext";
import { AuthProvider } from "./hooks/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AuthGuard } from "./components/AuthGuard";
import { SettingsProvider } from "./contexts/SettingsContext";

// Pages
import Login from "./pages/auth/Login";
import Dashboard from "./pages/dashboard/Dashboard";
import Orders from "./pages/orders/Orders";
import OrderDetail from "./pages/orders/OrderDetail";
import Inventory from "./pages/inventory/Inventory";
import ProductDetail from "./pages/product/ProductDetail";
import Suppliers from "./pages/suppliers/Suppliers";
import SupplierDetail from "./pages/suppliers/SupplierDetail";
import Customers from "./pages/customers/Customers";
import CustomerDetail from "./pages/customers/CustomerDetail";
import Settings from "./pages/settings/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <RolesProvider>
            <UsersProvider>
                <SettingsProvider>
                <TooltipProvider>
                <Toaster />
                <Sonner />
                <Routes>
                  {/* Public Route - Login */}
                  <Route path="/login" element={<Login />} />

                  {/* Protected Routes - Require Authentication */}
                  <Route
                      path="/"
                      element={
                        <AuthGuard>
                          <Navigate to="/dashboard" replace />
                        </AuthGuard>
                      }
                  />

                  <Route
                      path="/dashboard"
                      element={
                        <AuthGuard>
                          <Dashboard />
                        </AuthGuard>
                      }
                  />

                  <Route
                      path="/orders"
                      element={
                        <AuthGuard>
                          <ProtectedRoute module="orders">
                            <Orders />
                          </ProtectedRoute>
                        </AuthGuard>
                      }
                  />

                  <Route
                      path="/orders/:id"
                      element={
                        <AuthGuard>
                          <ProtectedRoute module="orders">
                            <OrderDetail />
                          </ProtectedRoute>
                        </AuthGuard>
                      }
                  />

                  <Route
                      path="/inventory"
                      element={
                        <AuthGuard>
                          <ProtectedRoute module="inventory">
                            <Inventory />
                          </ProtectedRoute>
                        </AuthGuard>
                      }
                  />

                  <Route
                      path="/inventory/:id"
                      element={
                        <AuthGuard>
                          <ProtectedRoute module="inventory">
                            <ProductDetail />
                          </ProtectedRoute>
                        </AuthGuard>
                      }
                  />

                  <Route
                      path="/customers"
                      element={
                        <AuthGuard>
                          <ProtectedRoute module="customers">
                            <Customers />
                          </ProtectedRoute>
                        </AuthGuard>
                      }
                  />

                  <Route
                      path="/customers/:id"
                      element={
                        <AuthGuard>
                          <ProtectedRoute module="customers">
                            <CustomerDetail />
                          </ProtectedRoute>
                        </AuthGuard>
                      }
                  />

                  <Route
                      path="/suppliers"
                      element={
                        <AuthGuard>
                          <ProtectedRoute module="suppliers">
                            <Suppliers />
                          </ProtectedRoute>
                        </AuthGuard>
                      }
                  />

                  <Route
                      path="/suppliers/:id"
                      element={
                        <AuthGuard>
                          <ProtectedRoute module="suppliers">
                            <SupplierDetail />
                          </ProtectedRoute>
                        </AuthGuard>
                      }
                  />

                  <Route
                      path="/settings"
                      element={
                        <AuthGuard>
                          <ProtectedRoute module={['settings', 'userManagement']}>
                            <Settings />
                          </ProtectedRoute>
                        </AuthGuard>
                      }
                  />

                  {/* 404 - Not Found */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </TooltipProvider>
                </SettingsProvider>
            </UsersProvider>
          </RolesProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
);

export default App;