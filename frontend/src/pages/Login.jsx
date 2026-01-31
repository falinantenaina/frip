import { useState } from "react";
import { FaEnvelope, FaLock } from "react-icons/fa";
import { GiClothes } from "react-icons/gi";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import useAuthStore from "../stores/authStore";
import "./Auth.css";

const Login = () => {
  const [formData, setFormData] = useState({
    email: "",
    motDePasse: "",
  });

  const { login, loading } = useAuthStore();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const result = await login(formData.email, formData.motDePasse);

    if (result.success) {
      toast.success("Connexion réussie !");
      navigate("/");
    } else {
      toast.error(result.message || "Erreur de connexion");
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <GiClothes className="auth-icon" />
          <h1>Mi Chic</h1>
          <p>Connectez-vous à votre compte</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">
              <FaEnvelope /> Email
            </label>
            <input
              type="email"
              name="email"
              className="form-input"
              placeholder="exemple@email.com"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              <FaLock /> Mot de passe
            </label>
            <input
              type="password"
              name="motDePasse"
              className="form-input"
              placeholder="••••••••"
              value={formData.motDePasse}
              onChange={handleChange}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={loading}
          >
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </form>

        {/*  <div className="auth-footer">
          <p>
            Pas de compte ?{" "}
            <Link to="/register" className="auth-link">
              S'inscrire
            </Link>
          </p>
        </div> */}
      </div>
    </div>
  );
};

export default Login;
