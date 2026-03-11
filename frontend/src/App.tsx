import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import Layout from './components/Layout/Layout';

// Auth
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';

// Dashboard
import DashboardHome from './pages/Dashboard/DashboardHome';

// Transactions
import TransactionsList from './pages/Transactions/TransactionsList';
import TransactionForm from './pages/Transactions/TransactionForm';

// Assets
import AssetsList from './pages/Assets/AssetsList';
import AssetForm from './pages/Assets/AssetForm';
import AssetDetail from './pages/Assets/AssetDetail';

// Livestock
import LivestockList from './pages/Livestock/LivestockList';
import LivestockForm from './pages/Livestock/LivestockForm';
import LivestockDetail from './pages/Livestock/LivestockDetail';

// Crops
import PlotsList from './pages/Crops/PlotsList';
import CropsList from './pages/Crops/CropsList';
import CropForm from './pages/Crops/CropForm';
import CropDetail from './pages/Crops/CropDetail';

// Stocks
import StocksList from './pages/Stocks/StocksList';
import StockDetail from './pages/Stocks/StockDetail';

// Sales
import SalesList from './pages/Sales/SalesList';
import SaleForm from './pages/Sales/SaleForm';
import CustomersList from './pages/Sales/CustomersList';

// Reports
import ProfitLoss from './pages/Reports/ProfitLoss';
import BalanceSheet from './pages/Reports/BalanceSheet';
import CashFlow from './pages/Reports/CashFlow';
import CropAnalysis from './pages/Reports/CropAnalysis';
import LivestockAnalysis from './pages/Reports/LivestockAnalysis';

// Closures
import ClosuresList from './pages/Closures/ClosuresList';
import ClosureForm from './pages/Closures/ClosureForm';
import ClosureDetail from './pages/Closures/ClosureDetail';

// Treasury
import TreasuryPage from './pages/Treasury/TreasuryPage';

// Settings
import ProjectSettings from './pages/Settings/ProjectSettings';
import Associates from './pages/Settings/Associates';
import Accounts from './pages/Settings/Accounts';
import UserProfile from './pages/Settings/UserProfile';
import UserManagement from './pages/Settings/UserManagement';
import ProjectsPage from './pages/Projects/ProjectsPage';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated ? <Navigate to="/" replace /> : <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Routes publiques */}
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

        {/* Routes protégées */}
        <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route index element={<Navigate to="/projects" replace />} />
          <Route path="projects" element={<ProjectsPage />} />
          <Route path="projects/:projectId">
            <Route path="dashboard" element={<DashboardHome />} />
            <Route path="transactions" element={<TransactionsList />} />
            <Route path="transactions/new" element={<TransactionForm />} />
            <Route path="transactions/:id/edit" element={<TransactionForm />} />
            <Route path="assets" element={<AssetsList />} />
            <Route path="assets/new" element={<AssetForm />} />
            <Route path="assets/:id" element={<AssetDetail />} />
            <Route path="assets/:id/edit" element={<AssetForm />} />
            <Route path="livestock" element={<LivestockList />} />
            <Route path="livestock/new" element={<LivestockForm />} />
            <Route path="livestock/:id" element={<LivestockDetail />} />
            <Route path="livestock/:id/edit" element={<LivestockForm />} />
            <Route path="plots" element={<PlotsList />} />
            <Route path="crops" element={<CropsList />} />
            <Route path="crops/new" element={<CropForm />} />
            <Route path="crops/:id" element={<CropDetail />} />
            <Route path="crops/:id/edit" element={<CropForm />} />
            <Route path="stocks" element={<StocksList />} />
            <Route path="stocks/:id" element={<StockDetail />} />
            <Route path="sales" element={<SalesList />} />
            <Route path="sales/new" element={<SaleForm />} />
            <Route path="sales/:id/edit" element={<SaleForm />} />
            <Route path="customers" element={<CustomersList />} />
            <Route path="reports/profit-loss" element={<ProfitLoss />} />
            <Route path="reports/balance-sheet" element={<BalanceSheet />} />
            <Route path="reports/cash-flow" element={<CashFlow />} />
            <Route path="reports/crops" element={<CropAnalysis />} />
            <Route path="reports/livestock" element={<LivestockAnalysis />} />
            <Route path="closures" element={<ClosuresList />} />
            <Route path="closures/new" element={<ClosureForm />} />
            <Route path="closures/:id" element={<ClosureDetail />} />
            <Route path="treasury" element={<TreasuryPage />} />
            <Route path="settings" element={<ProjectSettings />} />
            <Route path="settings/associates" element={<Associates />} />
          </Route>
          <Route path="accounts" element={<Accounts />} />
          <Route path="profile" element={<UserProfile />} />
          <Route path="admin/users" element={<UserManagement />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
