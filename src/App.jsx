import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { ScopeProvider } from './context/ScopeContext';
import { DateRangeProvider } from './context/DateRangeContext';
import { ToastProvider } from './context/ToastContext';
import AppLayout from './components/layout/AppLayout';
import LoginScreen from './screens/auth/LoginScreen';
const OverviewDashboard = lazy(() => import('./screens/overview/OverviewDashboard'));
const DrillDownView = lazy(() => import('./screens/drilldown/DrillDownView'));
const MapView = lazy(() => import('./screens/map/MapView'));
const LeaderboardScreen = lazy(() => import('./screens/leaderboard/LeaderboardScreen'));
const DSANetworkHealth = lazy(() => import('./screens/dsa/DSANetworkHealth'));
const LoanPipeline = lazy(() => import('./screens/pipeline/LoanPipeline'));
const OfficerActivityMonitor = lazy(() => import('./screens/activity/OfficerActivityMonitor'));
const IncentiveDashboard = lazy(() => import('./screens/incentive/IncentiveDashboard'));
const ReportsScreen = lazy(() => import('./screens/reports/ReportsScreen'));
const AlertsScreen = lazy(() => import('./screens/alerts/AlertsScreen'));
const SettingsProfile = lazy(() => import('./screens/settings/SettingsProfile'));
const DashboardSetup = lazy(() => import('./screens/setup/DashboardSetup'));

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
