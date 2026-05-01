import {
  endOfDay,
  format,
  isThisMonth,
  isThisWeek,
  isToday,
  parseISO,
  startOfDay,
} from "date-fns";
import { fr } from "date-fns/locale";
import { Fragment, useEffect, useState } from "react";
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
import { toast } from "react-toastify";
import { VenteCard } from "../components/ventes/VenteCard";
import { fmt, getStatutClass, getStatutLabel } from "../helpers";
import useAppStore from "../stores/appStore";

const Ventes = () => {
  const {
    ventes,
    loading,
    fetchVentes,
    deleteVente,
    annulerVente,
    updateVente,
    supprimerProduit,
  } = useAppStore();
  const navigate = useNavigate();
  const [filterStatut, setFilterStatut] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPeriode, setFilterPeriode] = useState("tous");
  const [filterDateSpecifique, setFilterDateSpecifique] = useState("");
  const [expandedVentes, setExpandedVentes] = useState(new Set());
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);

  useEffect(() => {
    fetchVentes();
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const handler = (e) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    setIsMobile(mq.matches);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    fetchVentes({ statutLivraison: filterStatut || undefined }, true);
  }, [filterStatut]);

  const toggleExpand = (id) =>
    setExpandedVentes((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const handleDelete = async (id, client) => {
    if (!window.confirm(`Supprimer la vente de ${client} ?`)) return;
    const r = await deleteVente(id);
    r.success
      ? toast.success("Vente supprimée")
      : toast.error(r.message || "Erreur");
  };

  const handleAnnuler = async (id) => {
    const raison = prompt("Raison de l'annulation:");
    if (!raison) return;
    const r = await annulerVente(id, raison);
    r.success
      ? toast.success("Vente annulée")
      : toast.error(r.message || "Erreur");
  };

  const handleChangeStatut = async (id, currentStatut) => {
    const map = {
      en_attente: "en_cours",
      en_cours: "livré",
      livré: "en_attente",
    };
    const nextStatut = map[currentStatut];
    if (!nextStatut) return;
    const r = await updateVente(id, { statutLivraison: nextStatut });
    r.success
      ? toast.success(`Statut → "${getStatutLabel(nextStatut)}"`)
      : toast.error(r.message || "Erreur");
  };

  const handleSupprimerProduit = async (
    venteId,
    produitEntryId,
    nomProduit,
  ) => {
    if (!window.confirm(`Retirer "${nomProduit}" ?`)) return;
    const r = await supprimerProduit(venteId, produitEntryId);
    r.success
      ? toast.success("Produit retiré")
      : toast.error(r.message || "Erreur");
  };

  const fmtDate = (d) => format(new Date(d), "dd/MM/yyyy", { locale: fr });

  // Vente groupée = plusieurs sous-produits
  const isGroupee = (v) => v.produits && v.produits.length > 1;
  // Vente avec exactement 1 sous-produit modifiable
  const hasSingleProduit = (v) => v.produits && v.produits.length === 1;

  const filteredVentes = ventes.filter((v) => {
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      if (
        !v.nomClient.toLowerCase().includes(s) &&
        !v.telephoneClient.includes(s) &&
        !v.nomProduit?.toLowerCase().includes(s) &&
        !(v.produits || []).some((p) => p.nomProduit?.toLowerCase().includes(s))
      )
        return false;
    }
    const dv = new Date(v.dateVente);
    if (filterPeriode === "jour") return isToday(dv);
    if (filterPeriode === "semaine") return isThisWeek(dv, { weekStartsOn: 1 });
    if (filterPeriode === "mois") return isThisMonth(dv);
    if (filterPeriode === "date" && filterDateSpecifique) {
      const debut = startOfDay(parseISO(filterDateSpecifique));
      const fin = endOfDay(parseISO(filterDateSpecifique));
      return dv >= debut && dv <= fin;
    }
    return true;
  });

  const totalFiltre = filteredVentes.reduce(
    (acc, v) => acc + (v.montantTotal || 0),
    0,
  );

  const PeriodeBtn = ({ value, label }) => (
    <button
      onClick={() => {
        setFilterPeriode(value);
        setFilterDateSpecifique("");
      }}
      style={{
        padding: isMobile ? "6px 10px" : "7px 14px",
        borderRadius: 6,
        border:
          filterPeriode === value ? "none" : "1px solid var(--border-color)",
        background: filterPeriode === value ? "var(--primary-color)" : "white",
        color: filterPeriode === value ? "white" : "var(--secondary-color)",
        cursor: "pointer",
        fontSize: isMobile ? 12 : 13,
        fontWeight: filterPeriode === value ? 600 : 400,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );

  if (loading.ventes && ventes.length === 0)
    return (
      <div className="main-content">
        <div className="loading">
          <div className="spinner"></div>
        </div>
      </div>
    );

  return (
    <div className="main-content">
      <div className="page-header">
        <h1 className="page-title">Gestion des Ventes</h1>
        <Link to="/ventes/new" className="btn btn-primary">
          <FaPlus />
          {!isMobile && " Nouvelle vente"}
        </Link>
      </div>

      {/* Filtres */}
      <div
        style={{
          background: "white",
          padding: isMobile ? "12px" : "16px 20px",
          borderRadius: 8,
          boxShadow: "var(--shadow)",
          marginBottom: 16,
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <select
            className="form-select"
            style={{
              flex: "0 0 auto",
              minWidth: 130,
              fontSize: isMobile ? 13 : 14,
            }}
            value={filterStatut}
            onChange={(e) => setFilterStatut(e.target.value)}
          >
            <option value="">Tous statuts</option>
            <option value="en_attente">En attente</option>
            <option value="en_cours">En cours</option>
            <option value="livré">Livré</option>
            <option value="annulé">Annulé</option>
          </select>
          <input
            type="text"
            className="form-input"
            style={{ flex: 1, minWidth: 120 }}
            placeholder="Rechercher client, produit..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div
          style={{
            display: "flex",
            gap: 6,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <PeriodeBtn value="tous" label="Tout" />
          <PeriodeBtn value="jour" label="Aujourd'hui" />
          <PeriodeBtn value="semaine" label="Semaine" />
          <PeriodeBtn value="mois" label="Mois" />
          <input
            type="date"
            className="form-input"
            style={{
              padding: "6px 10px",
              fontSize: 13,
              width: isMobile ? "100%" : 150,
              border:
                filterPeriode === "date"
                  ? "2px solid var(--primary-color)"
                  : "1px solid var(--border-color)",
              borderRadius: 6,
            }}
            value={filterDateSpecifique}
            onChange={(e) => {
              setFilterDateSpecifique(e.target.value);
              setFilterPeriode(e.target.value ? "date" : "tous");
            }}
          />
        </div>
      </div>

      {/* Résumé période */}
      {filterPeriode !== "tous" && (
        <div
          style={{
            background: "#eff6ff",
            border: "1px solid #bfdbfe",
            borderRadius: 8,
            padding: "10px 16px",
            marginBottom: 16,
            display: "flex",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 6,
          }}
        >
          <span style={{ fontSize: 13, color: "#1d4ed8" }}>
            <strong>{filteredVentes.length}</strong> vente(s)
          </span>
          <span style={{ fontSize: 13, color: "#1d4ed8", fontWeight: 700 }}>
            Total : {fmt(totalFiltre)}
          </span>
        </div>
      )}

      {filteredVentes.length === 0 ? (
        <div className="table-container">
          <p className="no-data">Aucune vente trouvée</p>
        </div>
      ) : isMobile ? (
        /* ── VUE CARTES (mobile) ── */
        <div>
          {filteredVentes.map((vente) => (
            <VenteCard
              key={vente._id}
              vente={vente}
              expandedVentes={expandedVentes}
              onChangeStatut={handleChangeStatut}
              onSuppr={handleSupprimerProduit}
              onToggle={toggleExpand}
              onCancel={handleAnnuler}
              onDelete={handleDelete}
            />
          ))}
        </div>
      ) : (
        /* ── VUE TABLEAU (desktop) ── */
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
                const grouped = isGroupee(vente);
                const singleProduit = hasSingleProduit(vente);
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
                            onClick={() => toggleExpand(vente._id)}
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
                            handleChangeStatut(vente._id, vente.statutLivraison)
                          }
                          style={{
                            cursor:
                              vente.statutLivraison === "annulé"
                                ? "not-allowed"
                                : "pointer",
                            border: "none",
                            opacity:
                              vente.statutLivraison === "annulé" ? 0.6 : 1,
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
                              onClick={() => handleAnnuler(vente._id)}
                              title="Annuler"
                            >
                              <FaBan />
                            </button>
                          )}
                          <button
                            className="btn btn-sm btn-icon btn-danger"
                            onClick={() =>
                              handleDelete(vente._id, vente.nomClient)
                            }
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
                                      handleSupprimerProduit(
                                        vente._id,
                                        pe._id,
                                        pe.nomProduit,
                                      )
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
      )}
    </div>
  );
};

export default Ventes;
