import {
  FaBox,
  FaChartLine,
  FaDollarSign,
  FaFileInvoiceDollar,
  FaHandHoldingUsd,
  FaShoppingCart,
  FaSignOutAlt,
  FaTruck,
} from "react-icons/fa";
import { GiClothes } from "react-icons/gi";
import { NavLink } from "react-router-dom";
import useAuthStore from "../stores/authStore";
import "./Sidebar.css";

const Sidebar = () => {
  const { user, logout } = useAuthStore();
  const isInvestisseur = user?.role === "investisseur";

  const handleLogout = () => {
    logout();
  };

  return (
    <aside className="sidebar">
      <div className="logo">
        <GiClothes className="logo-icon" />
        <h2>Mi Chic</h2>
      </div>

      <nav className="nav-menu">
        <NavLink
          to="/"
          className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
        >
          <FaChartLine />
          <span>Tableau de bord</span>
        </NavLink>

        {!isInvestisseur && (
          <>
            <NavLink
              to="/balles"
              className={({ isActive }) =>
                `nav-item ${isActive ? "active" : ""}`
              }
            >
              <FaBox />
              <span>Balles</span>
            </NavLink>

            <NavLink
              to="/ventes"
              className={({ isActive }) =>
                `nav-item ${isActive ? "active" : ""}`
              }
            >
              <FaShoppingCart />
              <span>Ventes</span>
            </NavLink>

            <NavLink
              to="/depenses"
              className={({ isActive }) =>
                `nav-item ${isActive ? "active" : ""}`
              }
            >
              <FaDollarSign />
              <span>Dépenses</span>
            </NavLink>

            <NavLink
              to="/livreurs"
              className={({ isActive }) =>
                `nav-item ${isActive ? "active" : ""}`
              }
            >
              <FaTruck />
              <span>Livreurs</span>
            </NavLink>

            <NavLink
              to="/investissements"
              className={({ isActive }) =>
                `nav-item ${isActive ? "active" : ""}`
              }
            >
              <FaHandHoldingUsd />
              <span>Investissements</span>
            </NavLink>
          </>
        )}

        <NavLink
          to="/rapports"
          className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
        >
          <FaFileInvoiceDollar />
          <span>Rapports</span>
        </NavLink>
      </nav>

      <div className="sidebar-footer">
        <div className="user-info">
          <div className="user-avatar">
            {user?.nom?.charAt(0).toUpperCase()}
          </div>
          <div className="user-details">
            <p className="user-name">{user?.nom}</p>
            <p className="user-role">{user?.role}</p>
          </div>
        </div>
        <button className="logout-btn" onClick={handleLogout}>
          <FaSignOutAlt />
          <span>Déconnexion</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
