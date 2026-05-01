import {
  FaBan,
  FaBoxOpen,
  FaChevronDown,
  FaChevronUp,
  FaEdit,
  FaPlus,
  FaTrash,
} from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";
import { fmt, fmtDate, getStatutClass, getStatutLabel } from "../../helpers";

export const VenteCard = ({
  vente,
  expandedVentes,
  onChangeStatut,
  onSuppr,
  onToggle,
  onCancel,
  onDelete,
}) => {
  const navigate = useNavigate();
  const grouped = vente.produits?.length > 1;

  const singleProduit = vente.produits.length === 1;
  const expanded = expandedVentes.has(vente._id);
  const canEdit = vente.statutLivraison !== "annulé";
  const canAdd = canEdit;

  // Produit unique : récupérer l'entrée pour l'id
  const produitEntry = singleProduit ? vente.produits[0] : null;

  return (
    <div
      style={{
        background: "white",
        borderRadius: 12,
        boxShadow: "var(--shadow)",
        marginBottom: 12,
        overflow: "hidden",
        borderLeft: grouped
          ? "4px solid #2563eb"
          : "4px solid var(--border-color)",
      }}
    >
      <div style={{ padding: "14px 16px" }}>
        {/* Ligne 1 : client + statut */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 8,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <strong style={{ fontSize: 15, color: "var(--dark-color)" }}>
                {vente.nomClient}
              </strong>
              {canAdd && (
                <button
                  onClick={() =>
                    navigate(`/ventes/${vente._id}/ajouter-produit`)
                  }
                  title="Ajouter un produit"
                  style={{
                    background: "#2563eb",
                    color: "white",
                    border: "none",
                    borderRadius: "50%",
                    width: 22,
                    height: 22,
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    fontSize: 10,
                  }}
                >
                  <FaPlus />
                </button>
              )}
            </div>
            <div
              style={{
                fontSize: 12,
                color: "var(--secondary-color)",
                marginTop: 2,
              }}
            >
              {vente.telephoneClient} · {fmtDate(vente.dateVente)}
            </div>
          </div>
          <button
            className={`status-badge ${getStatutClass(vente.statutLivraison)}`}
            onClick={() => onChangeStatut(vente._id, vente.statutLivraison)}
            style={{
              cursor:
                vente.statutLivraison === "annulé" ? "not-allowed" : "pointer",
              border: "none",
              flexShrink: 0,
              marginLeft: 8,
              opacity: vente.statutLivraison === "annulé" ? 0.6 : 1,
            }}
            disabled={vente.statutLivraison === "annulé"}
          >
            {getStatutLabel(vente.statutLivraison)}
          </button>
        </div>

        {/* Ligne 2 : produit */}
        <div
          style={{
            fontSize: 13,
            color: "var(--dark-color)",
            marginBottom: 8,
          }}
        >
          {grouped ? (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                color: "#1d4ed8",
                fontWeight: 600,
              }}
            >
              <FaBoxOpen />
              {vente.produits.length} produits
            </span>
          ) : (
            <span>
              {vente.nomProduit}
              {vente.tailleProduit && (
                <span style={{ color: "var(--secondary-color)" }}>
                  {" "}
                  · {vente.tailleProduit}
                </span>
              )}
              {/* Bénéfice produit unique */}
              {singleProduit && produitEntry?.benefice !== undefined && (
                <span
                  style={{
                    marginLeft: 8,
                    fontSize: 11,
                    padding: "1px 7px",
                    borderRadius: 10,
                    fontWeight: 600,
                    background:
                      produitEntry.benefice >= 0 ? "#d1fae5" : "#fee2e2",
                    color: produitEntry.benefice >= 0 ? "#065f46" : "#991b1b",
                  }}
                >
                  {produitEntry.benefice >= 0 ? "+" : ""}
                  {new Intl.NumberFormat("fr-FR").format(
                    produitEntry.benefice,
                  )}{" "}
                  AR
                </span>
              )}
            </span>
          )}
        </div>

        {/* Ligne 3 : montants */}
        <div
          style={{
            display: "flex",
            gap: 16,
            flexWrap: "wrap",
            fontSize: 13,
            marginBottom: 10,
          }}
        >
          <span style={{ color: "var(--secondary-color)" }}>
            Vente :{" "}
            <strong style={{ color: "var(--dark-color)" }}>
              {fmt(vente.prixVente)}
            </strong>
          </span>
          {vente.fraisLivraison > 0 && (
            <span style={{ color: "var(--secondary-color)" }}>
              Frais :{" "}
              <strong style={{ color: "var(--dark-color)" }}>
                {fmt(vente.fraisLivraison)}
              </strong>
            </span>
          )}
          <span style={{ color: "var(--secondary-color)" }}>
            Total :{" "}
            <strong style={{ color: "var(--success-color)", fontSize: 14 }}>
              {fmt(vente.montantTotal)}
            </strong>
          </span>
          {/* Bénéfice total vente */}
          {vente.totalBenefice !== undefined && vente.totalBenefice !== 0 && (
            <span style={{ color: "var(--secondary-color)" }}>
              Bénéf. :{" "}
              <strong
                style={{
                  color:
                    vente.totalBenefice >= 0
                      ? "var(--success-color)"
                      : "var(--danger-color)",
                }}
              >
                {fmt(vente.totalBenefice)}
              </strong>
            </span>
          )}
        </div>

        {/* Ligne 4 : livreur + actions */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ fontSize: 12, color: "var(--secondary-color)" }}>
            {vente.livreur ? (
              <span>🚚 {vente.livreur.nom}</span>
            ) : (
              <span>Pas de livreur</span>
            )}
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {grouped && (
              <button
                onClick={() => onToggle(vente._id)}
                style={{
                  background: "#dbeafe",
                  color: "#1d4ed8",
                  border: "none",
                  borderRadius: 6,
                  padding: "5px 8px",
                  cursor: "pointer",
                  fontSize: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                {expanded ? <FaChevronUp /> : <FaChevronDown />}
                {expanded ? "Masquer" : "Détails"}
              </button>
            )}

            {/* FIX: bouton modifier produit unique */}
            {singleProduit && canEdit && produitEntry && (
              <button
                className="btn btn-sm btn-icon btn-secondary"
                onClick={() =>
                  navigate(
                    `/ventes/${vente._id}/produits/${produitEntry._id}/edit`,
                  )
                }
                title="Modifier le produit"
                style={{ color: "#d97706" }}
              >
                <FaEdit />
              </button>
            )}

            <Link
              to={`/ventes/${vente._id}/edit`}
              className="btn btn-sm btn-icon btn-secondary"
              title="Modifier la vente (client, livraison...)"
            >
              <FaEdit />
            </Link>
            {vente.statutLivraison !== "annulé" && (
              <button
                className="btn btn-sm btn-icon btn-danger"
                onClick={() => onCancel(vente._id)}
                title="Annuler"
              >
                <FaBan />
              </button>
            )}
            <button
              className="btn btn-sm btn-icon btn-danger"
              onClick={() => onDelete(vente._id, vente.nomClient)}
              title="Supprimer"
            >
              <FaTrash />
            </button>
          </div>
        </div>
      </div>

      {/* Sous-produits développés (vente groupée) */}
      {grouped && expanded && (
        <div
          style={{
            borderTop: "1px solid var(--border-color)",
            background: "#f8fafc",
          }}
        >
          {vente.produits.map((pe, idx) => (
            <div
              key={pe._id || idx}
              style={{
                padding: "10px 16px",
                borderBottom:
                  idx < vente.produits.length - 1
                    ? "1px solid var(--border-color)"
                    : "none",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>
                  <span style={{ color: "#94a3b8", marginRight: 6 }}>
                    #{idx + 1}
                  </span>
                  {pe.nomProduit}
                  {pe.tailleProduit && (
                    <span
                      style={{
                        color: "var(--secondary-color)",
                        fontWeight: 400,
                      }}
                    >
                      {" "}
                      · {pe.tailleProduit}
                    </span>
                  )}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--secondary-color)",
                    marginTop: 2,
                    display: "flex",
                    gap: 10,
                  }}
                >
                  <span>{fmt(pe.prixVente)}</span>
                  {pe.benefice !== undefined && (
                    <span
                      style={{
                        fontWeight: 600,
                        color:
                          pe.benefice >= 0
                            ? "var(--success-color)"
                            : "var(--danger-color)",
                      }}
                    >
                      {pe.benefice >= 0 ? "+" : ""}
                      {fmt(pe.benefice)}
                    </span>
                  )}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                {vente.statutLivraison !== "annulé" && (
                  <button
                    className="btn btn-sm btn-icon btn-secondary"
                    onClick={() =>
                      navigate(`/ventes/${vente._id}/produits/${pe._id}/edit`)
                    }
                    title="Modifier ce produit"
                  >
                    <FaEdit />
                  </button>
                )}
                {vente.produits.length > 1 &&
                  vente.statutLivraison !== "annulé" && (
                    <button
                      className="btn btn-sm btn-icon btn-danger"
                      onClick={() => onSuppr(vente._id, pe._id, pe.nomProduit)}
                      title="Retirer"
                    >
                      <FaTrash />
                    </button>
                  )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
