import { Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './stores/authStore';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Balles from './pages/Balles';
import BalleForm from './pages/BalleForm';
import BalleDetails from './pages/BalleDetails';
import Ventes from './pages/Ventes';
import VenteForm from './pages/VenteForm';
import Depenses from './pages/Depenses';
import DepenseForm from './pages/DepenseForm';
import Livreurs from './pages/Livreurs';
import LivreurDetails from './pages/LivreurDetails';
import Rapports from './pages/Rapports';
import ProduitForm from './pages/ProduitForm';
import Investissements from './pages/Investissements';

// Route protégée
const PrivateRoute = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? children : <Navigate to="/login" />;
};

// Route protégée Admin seulement
const AdminRoute = ({ children }) => {
  const { isAuthenticated, user } = useAuthStore();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  if (user?.role !== 'admin') {
    return <Navigate to="/" />;
  }
  
  return children;
};

// Route publique (redirige si connecté)
const PublicRoute = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  return !isAuthenticated ? children : <Navigate to="/" />;
};

function App() {
  const { isAuthenticated } = useAuthStore();

  return (
    <div className="app-container">
      {isAuthenticated && <Sidebar />}
      
      <Routes>
        {/* Routes publiques */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />

        {/* Routes protégées - Accessibles à tous les utilisateurs connectés */}
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />

        <Route
          path="/rapports"
          element={
            <PrivateRoute>
              <Rapports />
            </PrivateRoute>
          }
        />

        {/* Routes protégées - Admin seulement */}
        <Route
          path="/balles"
          element={
            <AdminRoute>
              <Balles />
            </AdminRoute>
          }
        />

        <Route
          path="/balles/new"
          element={
            <AdminRoute>
              <BalleForm />
            </AdminRoute>
          }
        />

        <Route
          path="/balles/:id"
          element={
            <AdminRoute>
              <BalleDetails />
            </AdminRoute>
          }
        />

        <Route
          path="/balles/:id/edit"
          element={
            <AdminRoute>
              <BalleForm />
            </AdminRoute>
          }
        />

        <Route
          path="/ventes"
          element={
            <AdminRoute>
              <Ventes />
            </AdminRoute>
          }
        />

        <Route
          path="/ventes/new"
          element={
            <AdminRoute>
              <VenteForm />
            </AdminRoute>
          }
        />

        <Route
          path="/ventes/:id/edit"
          element={
            <AdminRoute>
              <VenteForm />
            </AdminRoute>
          }
        />

        <Route
          path="/depenses"
          element={
            <AdminRoute>
              <Depenses />
            </AdminRoute>
          }
        />

        <Route
          path="/livreurs"
          element={
            <AdminRoute>
              <Livreurs />
            </AdminRoute>
          }
        />

        <Route
          path="/livreurs/:id"
          element={
            <AdminRoute>
              <LivreurDetails />
            </AdminRoute>
          }
        />

        <Route
          path="/produits/new"
          element={
            <AdminRoute>
              <ProduitForm />
            </AdminRoute>
          }
        />

        <Route
          path="/depenses/new"
          element={
            <AdminRoute>
              <DepenseForm />
            </AdminRoute>
          }
        />

        <Route
          path="/investissements"
          element={
            <AdminRoute>
              <Investissements />
            </AdminRoute>
          }
        />

        {/* Redirection par défaut */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </div>
  );
}

export default App;
