import { Navigate, Route, Routes } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import BalleDetails from "./pages/BalleDetails";
import BalleForm from "./pages/BalleForm";
import Balles from "./pages/Balles";
import Dashboard from "./pages/Dashboard";
import DepenseForm from "./pages/DepenseForm";
import Depenses from "./pages/Depenses";
import Expeditions from "./pages/Expeditions";
import Investissements from "./pages/Investissements";
import LivreurDetails from "./pages/LivreurDetails";
import Livreurs from "./pages/Livreurs";
import Login from "./pages/Login";
import ProduitForm from "./pages/ProduitForm";
import Rapports from "./pages/Rapports";
import VenteForm from "./pages/VenteForm";
import Ventes from "./pages/Ventes";
import AjouterProduitPage from "./pages/ventes/AjouterProduitPage";
import EditVenteInfoPage from "./pages/ventes/EditVenteInfoPage";
import ModifierProduitPage from "./pages/ventes/ModifierProduitPage";
import useAuthStore from "./stores/authStore";

const PrivateRoute = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? children : <Navigate to="/login" />;
};

const AdminRoute = ({ children }) => {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" />;
  if (user?.role !== "admin") return <Navigate to="/" />;
  return children;
};

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
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
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

        {/* Balles */}
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

        {/* Ventes */}
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

        {/* ── Modification séparée : infos générales ───────────────────── */}
        <Route
          path="/ventes/:id/edit"
          element={
            <AdminRoute>
              <EditVenteInfoPage />
            </AdminRoute>
          }
        />

        {/* ── Gestion des produits d'une vente ─────────────────────────── */}
        <Route
          path="/ventes/:id/ajouter-produit"
          element={
            <AdminRoute>
              <AjouterProduitPage />
            </AdminRoute>
          }
        />
        <Route
          path="/ventes/:venteId/produits/:produitEntryId/edit"
          element={
            <AdminRoute>
              <ModifierProduitPage />
            </AdminRoute>
          }
        />

        {/* Dépenses */}
        <Route
          path="/depenses"
          element={
            <AdminRoute>
              <Depenses />
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

        {/* Livreurs */}
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

        {/* Autres */}
        <Route
          path="/produits/new"
          element={
            <AdminRoute>
              <ProduitForm />
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
        <Route
          path="/expeditions"
          element={
            <AdminRoute>
              <Expeditions />
            </AdminRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </div>
  );
}

export default App;
