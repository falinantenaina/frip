import { Fragment } from "react";
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

export const VenteTable = ({
  filteredVentes,
  vente,
  expandedVentes,
  onChangeStatut,
  onSuppr,
  onCancel,
  onToggle,
  onDelete,
}) => {
  const navigate = useNavigate();
  return (
    <div className="table-container">
      <table className="data-table">
        <thead>
          <tr>
            <th style={{ width: 36 }}></th>
            <th>Date</th>
            <th>Client</th>
            <th>Produit(s)</th>
            <th>Destination</th>
            <th>Vente</th>
            <th>Bénéfice</th>
            <th>Total</th>
            <th>Livreur</th>
            <th>Statut</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredVentes.map((vente) => {
            const grouped = vente.produits?.length > 1;
            const singleProduit = vente.produits.length === 1;
            const expanded = expandedVentes.has(vente._id);
            const canEdit = vente.statutLivraison !== "annulé";
            const canAdd = canEdit;
            const produitEntry = singleProduit ? vente.produits[0] : null;

            return (
              <Fragment key={vente._id}>
                <tr style={grouped ? { background: "#f0f9ff" } : {}}>
                  {/* Expand/collapse pour ventes groupées */}
                  <td style={{ textAlign: "center" }}>
                    {grouped && (
                      <button
                        onClick={() => onToggle(vente._id)}
                        style={{
                          background: "#dbeafe",
                          color: "#1d4ed8",
                          border: "none",
                          borderRadius: 6,
                          padding: "4px 8px",
                          cursor: "pointer",
                        }}
                      >
                        {expanded ? <FaChevronUp /> : <FaChevronDown />}
                      </button>
                    )}
                  </td>

                  <td>{fmtDate(vente.dateVente)}</td>

                  {/* Client + bouton ajouter */}
                  <td>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <div>
                        <strong>{vente.nomClient}</strong>
                        <br />
                        <small className="text-secondary">
                          {vente.telephoneClient}
                        </small>
                      </div>
                      {canAdd && (
                        <button
                          onClick={() =>
                            navigate(`/ventes/${vente._id}/ajouter-produit`)
                          }
                          title="Ajouter un produit"
                          style={{
                            flexShrink: 0,
                            background: "#2563eb",
                            color: "white",
                            border: "none",
                            borderRadius: "50%",
                            width: 26,
                            height: 26,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            fontSize: 11,
                          }}
                        >
                          <FaPlus />
                        </button>
                      )}
                    </div>
                  </td>

                  {/* Produit(s) */}
                  <td>
                    {grouped ? (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          color: "#1d4ed8",
                          fontWeight: 600,
                          fontSize: 13,
                        }}
                      >
                        <FaBoxOpen /> {vente.produits.length} produits
                      </span>
                    ) : (
                      <span>
                        {vente.nomProduit}
                        {vente.tailleProduit && (
                          <small className="text-secondary">
                            {" "}
                            · {vente.tailleProduit}
                          </small>
                        )}
                      </span>
                    )}
                  </td>

                  {/* Destination */}
                  <td>
                    <span
                      style={{
                        fontSize: 12,
                        padding: "2px 8px",
                        borderRadius: 12,
                        background:
                          vente.destinationClient === "Antsirabe"
                            ? "#dbeafe"
                            : "#f0fdf4",
                        color:
                          vente.destinationClient === "Antsirabe"
                            ? "#1d4ed8"
                            : "#166534",
                      }}
                    >
                      {vente.destinationClient || "Local"}
                    </span>
                  </td>

                  {/* Montant vente (somme produits) */}
                  <td>{fmt(vente.prixVente)}</td>

                  {/* Bénéfice total */}
                  <td>
                    {vente.totalBenefice !== undefined &&
                    vente.totalBenefice !== 0 ? (
                      <strong
                        style={{
                          color:
                            vente.totalBenefice >= 0
                              ? "var(--success-color)"
                              : "var(--danger-color)",
                        }}
                      >
                        {vente.totalBenefice >= 0 ? "+" : ""}
                        {fmt(vente.totalBenefice)}
                      </strong>
                    ) : (
                      <span className="text-secondary">—</span>
                    )}
                  </td>

                  {/* Total client (vente + frais) */}
                  <td>
                    <strong className="text-success">
                      {fmt(vente.montantTotal)}
                    </strong>
                  </td>

                  {/* Livreur */}
                  <td>
                    {vente.livreur ? (
                      <>
                        {vente.livreur.nom}
                        <br />
                        <small className="text-secondary">
                          {vente.livreur.telephone}
                        </small>
                      </>
                    ) : (
                      "—"
                    )}
                  </td>

                  {/* Statut cliquable */}
                  <td>
                    <button
                      className={`status-badge ${getStatutClass(vente.statutLivraison)}`}
                      onClick={() =>
                        onChangeStatut(vente._id, vente.statutLivraison)
                      }
                      style={{
                        cursor:
                          vente.statutLivraison === "annulé"
                            ? "not-allowed"
                            : "pointer",
                        border: "none",
                        opacity: vente.statutLivraison === "annulé" ? 0.6 : 1,
                      }}
                      disabled={vente.statutLivraison === "annulé"}
                    >
                      {getStatutLabel(vente.statutLivraison)}
                    </button>
                  </td>

                  {/* Actions */}
                  <td>
                    <div className="flex gap-10">
                      {/* FIX: modifier le produit unique */}
                      {singleProduit && canEdit && produitEntry && (
                        <button
                          className="btn btn-sm btn-icon"
                          style={{
                            background: "#fef3c7",
                            color: "#d97706",
                            border: "1px solid #fde68a",
                          }}
                          onClick={() =>
                            navigate(
                              `/ventes/${vente._id}/produits/${produitEntry._id}/edit`,
                            )
                          }
                          title="Modifier le produit"
                        >
                          <FaEdit />
                        </button>
                      )}

                      {/* Modifier vente (infos client/livraison) */}
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
                  </td>
                </tr>

                {/* Sous-lignes produits (vente groupée développée) */}
                {grouped &&
                  expanded &&
                  vente.produits.map((pe, idx) => (
                    <tr
                      key={`${vente._id}-p${idx}`}
                      style={{
                        background: "#f8fafc",
                        borderLeft: "4px solid #bfdbfe",
                      }}
                    >
                      <td></td>
                      <td
                        style={{
                          color: "#94a3b8",
                          fontSize: 12,
                          paddingLeft: 20,
                        }}
                      >
                        #{idx + 1}
                      </td>
                      <td></td>
                      <td style={{ paddingLeft: 16 }}>
                        <strong>{pe.nomProduit}</strong>
                        {pe.tailleProduit && (
                          <small className="text-secondary">
                            {" "}
                            · {pe.tailleProduit}
                          </small>
                        )}
                      </td>
                      <td></td>
                      {/* Prix vente produit */}
                      <td>{fmt(pe.prixVente)}</td>
                      {/* Bénéfice produit */}
                      <td>
                        {pe.benefice !== undefined ? (
                          <span
                            style={{
                              fontSize: 12,
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
                        ) : (
                          <span className="text-secondary">—</span>
                        )}
                      </td>
                      <td colSpan={3}></td>
                      <td>
                        <div className="flex gap-10">
                          {vente.statutLivraison !== "annulé" && (
                            <button
                              className="btn btn-sm btn-icon btn-secondary"
                              onClick={() =>
                                navigate(
                                  `/ventes/${vente._id}/produits/${pe._id}/edit`,
                                )
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
                                onClick={() =>
                                  onSuppr(vente._id, pe._id, pe.nomProduit)
                                }
                                title="Retirer"
                              >
                                <FaTrash />
                              </button>
                            )}
                        </div>
                      </td>
                    </tr>
                  ))}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
