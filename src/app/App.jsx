import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '@/features/auth/AuthContext';
import { ThemeProvider, useTheme } from '@/shared/context/ThemeContext';
import { ScopeProvider } from '@/scope/ScopeContext';
import { DateRangeProvider } from '@/shared/context/DateRangeContext';
import { ToastProvider } from '@/shared/context/ToastContext';
import AppLayout from '@/app/layout/AppLayout';
import LoginScreen from '@/features/auth/LoginScreen';
const OverviewDashboard = lazy(() => import('@/features/overview/OverviewDashboard'));
const DrillDownView = lazy(() => import('@/features/branch/DrillDownView'));
const MapView = lazy(() => import('@/features/map/MapView'));
const LeaderboardScreen = lazy(() => import('@/features/leaderboard/LeaderboardScreen'));
const DSANetworkHealth = lazy(() => import('@/features/dsa/DSANetworkHealth'));
const LoanPipeline = lazy(() => import('@/features/pipeline/LoanPipeline'));
const OfficerActivityMonitor = lazy(() => import('@/features/officers/OfficerActivityMonitor'));
const IncentiveDashboard = lazy(() => import('@/features/incentives/IncentiveDashboard'));
const ReportsScreen = lazy(() => import('@/features/reports/ReportsScreen'));
const AlertsScreen = lazy(() => import('@/features/alerts/AlertsScreen'));
const SettingsProfile = lazy(() => import('@/features/settings/SettingsProfile'));
const DashboardSetup = lazy(() => import('@/features/setup/DashboardSetup'));

function LandingRedirect() {
  const { prefs } = useTheme();
  return <Navigate to={prefs.landing || '/overview'} replace />;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ScopeProvider>
          <DateRangeProvider>
            <ToastProvider>
              <BrowserRouter>
                <Suspense fallback={null}>
                <Routes>
                  <Route path="/login" element={<LoginScreen />} />
                  <Route path="/setup" element={<DashboardSetup />} />
                  <Route element={<AppLayout />}>
                    <Route path="/overview" element={<OverviewDashboard />} />
                    <Route path="/drilldown" element={<DrillDownView />} />
                    <Route path="/map" element={<MapView />} />
                    <Route path="/leaderboard" element={<LeaderboardScreen />} />
                    <Route path="/dsa" element={<DSANetworkHealth />} />
                    <Route path="/pipeline" element={<LoanPipeline />} />
                    <Route path="/activity" element={<OfficerActivityMonitor />} />
                    <Route path="/incentives" element={<IncentiveDashboard />} />
                    <Route path="/reports" element={<ReportsScreen />} />
                    <Route path="/alerts" element={<AlertsScreen />} />
                    <Route path="/settings" element={<SettingsProfile />} />
                  </Route>
                  <Route path="*" element={<LandingRedirect />} />
                </Routes>
                </Suspense>
              </BrowserRouter>
            </ToastProvider>
          </DateRangeProvider>
        </ScopeProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
