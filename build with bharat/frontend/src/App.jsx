import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth, ROLES } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';
import Login from './pages/Login';

import HospitalDashboard from './pages/dashboards/HospitalDashboard';
import CollectionDashboard from './pages/dashboards/CollectionDashboard';
import TransportDashboard from './pages/dashboards/TransportDashboard';
import TreatmentDashboard from './pages/dashboards/TreatmentDashboard';
import GovernmentDashboard from './pages/dashboards/GovernmentDashboard';
import InspectorDashboard from './pages/dashboards/InspectorDashboard';
import PersonnelDirectory from './pages/PersonnelDirectory';

function RootRedirect() {
  const { isAuthenticated, role, getDashboardRoute, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (isAuthenticated && role) {
    return <Navigate to={getDashboardRoute(role)} replace />;
  }

  return <Navigate to="/login" replace />;
}

function LoginRoute() {
  const { isAuthenticated, role, getDashboardRoute, loading } = useAuth();

  if (!loading && isAuthenticated && role) {
    return <Navigate to={getDashboardRoute(role)} replace />;
  }

  return <Login />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <Routes>
            {/* Public / Auth */}
            <Route path="/login" element={<LoginRoute />} />
            <Route path="/" element={<RootRedirect />} />

            {/* 1. Hospital Authority */}
            <Route
              path="/hospital"
              element={
                <ProtectedRoute allowedRoles={[ROLES.HOSPITAL_AUTHORITY]}>
                  <AppLayout>
                    <HospitalDashboard />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            {/* 2. Collection Officer */}
            <Route
              path="/collection"
              element={
                <ProtectedRoute allowedRoles={[ROLES.COLLECTION_OFFICER]}>
                  <AppLayout>
                    <CollectionDashboard />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            {/* 3. Transport Officer */}
            <Route
              path="/transport"
              element={
                <ProtectedRoute allowedRoles={[ROLES.TRANSPORT_OFFICER]}>
                  <AppLayout>
                    <TransportDashboard />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            {/* 4. Treatment Facility (CBWTF) */}
            <Route
              path="/treatment"
              element={
                <ProtectedRoute allowedRoles={[ROLES.TREATMENT_FACILITY]}>
                  <AppLayout>
                    <TreatmentDashboard />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            {/* 5. Government Authority */}
            <Route
              path="/government"
              element={
                <ProtectedRoute allowedRoles={[ROLES.GOVERNMENT_AUTHORITY]}>
                  <AppLayout>
                    <GovernmentDashboard />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            {/* 6. Compliance Inspector */}
            <Route
              path="/inspector"
              element={
                <ProtectedRoute allowedRoles={[ROLES.COMPLIANCE_INSPECTOR]}>
                  <AppLayout>
                    <InspectorDashboard />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            {/* 7. Personnel Directory (Hospital & Government Authority) */}
            <Route
              path="/personnel"
              element={
                <ProtectedRoute allowedRoles={[ROLES.HOSPITAL_AUTHORITY, ROLES.GOVERNMENT_AUTHORITY]}>
                  <AppLayout>
                    <PersonnelDirectory />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            {/* Catch-all fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
