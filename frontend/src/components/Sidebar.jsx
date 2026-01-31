import { useState } from "react";
import {
  FaBars,
  FaBox,
  FaChartLine,
  FaDollarSign,
  FaFileInvoiceDollar,
  FaHandHoldingUsd,
  FaShoppingCart,
  FaSignOutAlt,
  FaTimes,
  FaTruck,
} from "react-icons/fa";
import { NavLink } from "react-router-dom";
import useAuthStore from "../stores/authStore";
import "./Sidebar.css";

const Sidebar = () => {
  const { user, logout } = useAuthStore();
  const isInvestisseur = user?.role === "investisseur";
  const [isExpanded, setIsExpanded] = useState(false);

  const handleLogout = () => {
    logout();
  };

  const toggleSidebar = () => {
    setIsExpanded(!isExpanded);
  };

  // Fermer la sidebar après un clic sur un lien (mobile)
  const handleLinkClick = () => {
    if (window.innerWidth <= 768) {
      setIsExpanded(false);
    }
  };

  return (
    <>
      {/* Bouton hamburger (mobile seulement) */}
      <button
        className="sidebar-toggle"
        onClick={toggleSidebar}
        aria-label="Toggle menu"
      >
        {isExpanded ? <FaTimes /> : <FaBars />}
      </button>

      {/* Overlay pour fermer la sidebar en cliquant à côté (mobile) */}
      {isExpanded && (
        <div className="sidebar-overlay" onClick={() => setIsExpanded(false)} />
      )}

      <aside className={`sidebar ${isExpanded ? "expanded" : ""}`}>
        <div className="logo">
          <img src="/icon.webp" alt="Logo michic" />
          <h2>Mi Chic</h2>
        </div>

        <nav className="nav-menu">
          <NavLink
            to="/"
            className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
            onClick={handleLinkClick}
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
                onClick={handleLinkClick}
              >
                <FaBox />
                <span>Balles</span>
              </NavLink>

              <NavLink
                to="/ventes"
                className={({ isActive }) =>
                  `nav-item ${isActive ? "active" : ""}`
                }
                onClick={handleLinkClick}
              >
                <FaShoppingCart />
                <span>Ventes</span>
              </NavLink>

              <NavLink
                to="/depenses"
                className={({ isActive }) =>
                  `nav-item ${isActive ? "active" : ""}`
                }
                onClick={handleLinkClick}
              >
                <FaDollarSign />
                <span>Dépenses</span>
              </NavLink>

              <NavLink
                to="/livreurs"
                className={({ isActive }) =>
                  `nav-item ${isActive ? "active" : ""}`
                }
                onClick={handleLinkClick}
              >
                <FaTruck />
                <span>Livreurs</span>
              </NavLink>

              <NavLink
                to="/investissements"
                className={({ isActive }) =>
                  `nav-item ${isActive ? "active" : ""}`
                }
                onClick={handleLinkClick}
              >
                <FaHandHoldingUsd />
                <span>Investissements</span>
              </NavLink>
            </>
          )}

          <NavLink
            to="/rapports"
            className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
            onClick={handleLinkClick}
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
    </>
  );
};

export default Sidebar;
