import { endOfMonth, format, startOfMonth, subDays } from "date-fns";
import { fr } from "date-fns/locale";
import { useEffect, useState } from "react";
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis
} from "recharts";
import api from "../utils/api";

const MOIS = ["", "Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"];
const fmt = (n) => new Intl.NumberFormat("fr-FR").format(Math.round(n || 0));
const fmtAR = (n) => fmt(n) + " AR";
const PIE_COLORS = ["#2563eb", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "white", border: "1px solid var(--border-color)", borderRadius: 8, padding: "10px 14px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
      <p style={{ fontWeight: 600, marginBottom: 6, color: "var(--dark-color)" }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ fontSize: 13, color: p.color, margin: "2px 0" }}>{p.name} : {fmtAR(p.value)}</p>
      ))}
    </div>
  );
};

// Carte KPI
const KPI = ({ icon, label, value, sub, color = "var(--primary-color)", bgColor }) => (
  <div style={{ background: bgColor || "white", borderRadius: 12, padding: "18px 20px", boxShadow: "var(--shadow)", display: "flex", alignItems: "center", gap: 14 }}>
    <div style={{ width: 48, height: 48, borderRadius: 12, background: color + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>{icon}</div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 20, fontWeight: 700, color: "var(--dark-color)", lineHeight: 1.2 }}>{value}</div>
      <div style={{ fontSize: 13, color: "var(--secondary-color)", marginTop: 2 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color, marginTop: 2, fontWeight: 500 }}>{sub}</div>}
    </div>
  </div>
);

// Carte bénéfice avec détail
const BeneficeCard = ({ titre, icon, ca, charges, chargesLabel, benefice, color }) => (
  <div style={{ background: "white", borderRadius: 12, padding: 20, boxShadow: "var(--shadow)", borderTop: `3px solid ${color}` }}>
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
      <span style={{ fontSize: 20 }}>{icon}</span>
      <strong style={{ fontSize: 16 }}>{titre}</strong>
    </div>
    <div style={{ display: "grid", gap: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
        <span style={{ color: "var(--secondary-color)" }}>Chiffre d'affaires</span>
        <strong style={{ color: "var(--success-color)" }}>{fmtAR(ca)}</strong>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
        <span style={{ color: "var(--secondary-color)" }}>{chargesLabel}</span>
        <strong style={{ color: "var(--danger-color)" }}>− {fmtAR(charges)}</strong>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0 0", borderTop: "2px solid var(--border-color)", fontWeight: 700 }}>
        <span>Bénéfice</span>
        <strong style={{ fontSize: 18, color: benefice >= 0 ? "var(--success-color)" : "var(--danger-color)" }}>
          {fmtAR(benefice)}
        </strong>
      </div>
    </div>
  </div>
);

const SectionTitle = ({ children }) => (
  <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--dark-color)", marginBottom: 16, paddingBottom: 8, borderBottom: "2px solid var(--border-color)" }}>{children}</h3>
);

const Rapports = () => {
  const [periode, setPeriode] = useState("month");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("global");
  const [data, setData] = useState(null);
  const [rapportParJour, setRapportParJour] = useState([]);
  const [rapportParMois, setRapportParMois] = useState([]);
  const [rapportParBalle, setRapportParBalle] = useState([]);
  const [rapportExpeditions, setRapportExpeditions] = useState(null);

  useEffect(() => { loadRapports(); }, [periode]);

  const getDateParams = () => {
    const now = new Date();
    let dateDebut, dateFin;
    switch (periode) {
      case "today": dateDebut = dateFin = format(now, "yyyy-MM-dd"); break;
      case "week": dateDebut = format(subDays(now, 7), "yyyy-MM-dd"); dateFin = format(now, "yyyy-MM-dd"); break;
      case "month": dateDebut = format(startOfMonth(now), "yyyy-MM-dd"); dateFin = format(endOfMonth(now), "yyyy-MM-dd"); break;
      case "year": dateDebut = format(new Date(now.getFullYear(), 0, 1), "yyyy-MM-dd"); dateFin = format(now, "yyyy-MM-dd"); break;
      default: return "";
    }
    return `?dateDebut=${dateDebut}&dateFin=${dateFin}`;
  };

  const loadRapports = async () => {
    setLoading(true);
    try {
      const p = getDateParams();
      const [g, j, m, b, e] = await Promise.all([
        api.get(`/rapports/global${p}`),
        api.get(`/rapports/par-jour${p}`),
        api.get(`/rapports/par-mois`),
        api.get(`/rapports/par-balle`),
        api.get(`/rapports/expeditions${p}`),
      ]);
      setData(g.data.data);
      setRapportParJour(j.data.data.slice(0, 30).reverse());
      setRapportParMois(m.data.data.slice(0, 12).reverse());
      setRapportParBalle(b.data.data);
      setRapportExpeditions(e.data.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  if (loading) return <div className="main-content"><div className="loading"><div className="spinner"></div></div></div>;

  const g = data || {};
  const benefices = g.benefices || {};
  const depensesParType = g.depenses?.parType?.map((d, i) => ({ name: d._id, value: d.total, color: PIE_COLORS[i % PIE_COLORS.length] })) || [];

  const TABS = [
    { id: "global", label: "📊 Vue globale" },
    { id: "benefices", label: "💰 Bénéfices" },
    { id: "periode", label: "📅 Période" },
    { id: "balle", label: "📦 Par balle" },
    { id: "expedition", label: "🚚 Expéditions" },
  ];

  return (
    <div className="main-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Rapports & Statistiques</h1>
          <p className="text-secondary">{format(new Date(), "EEEE dd MMMM yyyy", { locale: fr })}</p>
        </div>
        <select className="form-select" style={{ minWidth: 150 }} value={periode} onChange={(e) => setPeriode(e.target.value)}>
          <option value="today">Aujourd'hui</option>
          <option value="week">Cette semaine</option>
          <option value="month">Ce mois</option>
          <option value="year">Cette année</option>
        </select>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 24, flexWrap: "wrap" }}>
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
            padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
            background: activeTab === t.id ? "var(--primary-color)" : "white",
            color: activeTab === t.id ? "white" : "var(--secondary-color)",
            boxShadow: activeTab === t.id ? "0 2px 8px rgba(37,99,235,0.3)" : "var(--shadow)",
            transition: "all 0.2s",
          }}>{t.label}</button>
        ))}
      </div>

      {/* ── TAB GLOBAL ── */}
      {activeTab === "global" && g.ventes && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 24 }}>
            <KPI icon="💰" label="Chiffre d'affaires total" value={fmtAR(g.ventes.montantVentes)} color="var(--primary-color)" sub={`${g.ventes.totalVentes} vente(s)`} />
            <KPI icon="💸" label="Total dépenses" value={fmtAR(g.depenses?.totalDepenses)} color="var(--danger-color)" sub={`${g.depenses?.nombreDepenses} entrée(s)`} />
            <KPI icon="🚚" label="Frais expéditions réels" value={fmtAR(g.expeditions?.totalFrais)} color="var(--warning-color)" sub={`${g.expeditions?.totalExpeditions} expédition(s) expédiée(s)`} />
            <KPI icon={benefices.net >= 0 ? "📈" : "📉"} label="Bénéfice net global"
              value={fmtAR(Math.abs(benefices.net))}
              color={benefices.net >= 0 ? "var(--success-color)" : "var(--danger-color)"}
              sub={benefices.net >= 0 ? "Positif ✅" : "Négatif ⚠️"}
              bgColor={benefices.net >= 0 ? "#f0fdf4" : "#fef2f2"}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
            {/* Répartition ventes */}
            <div className="card">
              <SectionTitle>💰 Répartition des ventes</SectionTitle>
              {[
                { label: "Par balle", val: g.ventes.parBalle?.montant || 0, count: g.ventes.parBalle?.count || 0, color: "var(--primary-color)" },
                { label: "Libres (fournisseur)", val: g.ventes.libres?.montantVentes || 0, count: g.ventes.libres?.count || 0, color: "var(--success-color)" },
              ].map((item) => (
                <div key={item.label} style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 13 }}>
                    <span>{item.label} <small style={{ color: "var(--secondary-color)" }}>({item.count} vente{item.count > 1 ? "s" : ""})</small></span>
                    <strong style={{ color: item.color }}>{fmtAR(item.val)}</strong>
                  </div>
                  <div style={{ background: "#e2e8f0", borderRadius: 999, height: 6 }}>
                    <div style={{ height: 6, borderRadius: 999, background: item.color, transition: "width 0.5s", width: `${g.ventes.montantVentes ? Math.round((item.val / g.ventes.montantVentes) * 100) : 0}%` }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Dépenses par type */}
            <div className="card">
              <SectionTitle>💸 Dépenses par type</SectionTitle>
              {depensesParType.length === 0 ? <p className="no-data">Aucune dépense</p> : (
                <>
                  {depensesParType.slice(0, 6).map((d) => (
                    <div key={d.name} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--border-color)", fontSize: 13 }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ width: 10, height: 10, borderRadius: 2, background: d.color, display: "inline-block" }} />{d.name}
                      </span>
                      <strong>{fmtAR(d.value)}</strong>
                    </div>
                  ))}
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0 0", fontSize: 14, fontWeight: 700 }}>
                    <span>Total</span><span style={{ color: "var(--danger-color)" }}>{fmtAR(g.depenses?.totalDepenses)}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Bilan */}
          <div className="card" style={{ marginBottom: 20 }}>
            <SectionTitle>📊 Bilan financier</SectionTitle>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
              {[
                { label: "CA Total", val: g.ventes.montantVentes, positive: true },
                { label: "− Dépenses", val: -(g.depenses?.totalDepenses || 0), positive: false },
                { label: "− Frais expéd.", val: -(g.expeditions?.totalFrais || 0), positive: false },
                { label: "= Bénéfice net", val: benefices.net, positive: benefices.net >= 0, big: true },
              ].map((item) => (
                <div key={item.label} style={{
                  background: item.big ? (item.positive ? "#f0fdf4" : "#fef2f2") : "var(--light-color)",
                  borderRadius: 8, padding: "12px 14px",
                  border: item.big ? `2px solid ${item.positive ? "var(--success-color)" : "var(--danger-color)"}` : "none"
                }}>
                  <div style={{ fontSize: 12, color: "var(--secondary-color)", marginBottom: 4 }}>{item.label}</div>
                  <div style={{ fontSize: item.big ? 20 : 15, fontWeight: 700, color: item.val >= 0 ? (item.positive ? "var(--success-color)" : "var(--dark-color)") : "var(--danger-color)" }}>
                    {fmtAR(Math.abs(item.val))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Investisseur */}
          {g.investisseur && (
            <div className="card">
              <SectionTitle>🤝 Suivi investisseur</SectionTitle>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                {[
                  { label: "Argent reçu", val: g.investisseur.totalRecu, color: "var(--success-color)", bg: "#f0fdf4" },
                  { label: "Argent versé", val: g.investisseur.totalVerse, color: "var(--danger-color)", bg: "#fef2f2" },
                  { label: g.investisseur.solde >= 0 ? "Reste à rembourser" : "Surplus", val: Math.abs(g.investisseur.solde), color: "var(--warning-color)", bg: "#fef3c7" },
                ].map((s) => (
                  <div key={s.label} style={{ background: s.bg, borderRadius: 8, padding: 14, textAlign: "center" }}>
                    <div style={{ fontSize: 11, color: "var(--secondary-color)" }}>{s.label}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{fmtAR(s.val)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── TAB BÉNÉFICES SÉPARÉS ── */}
      {activeTab === "benefices" && g.benefices && (
        <>
          <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8, padding: "12px 16px", marginBottom: 20, fontSize: 13, color: "#1d4ed8" }}>
            💡 Les bénéfices sont calculés séparément selon le type de vente pour une meilleure lisibilité.
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginBottom: 24 }}>
            <BeneficeCard
              titre="Ventes par balle"
              icon="📦"
              ca={g.ventes?.parBalle?.montant || 0}
              charges={(g.balles?.totalInvesti || 0) + (g.balles?.totalDepensesLiees || 0)}
              chargesLabel="Achat balles + dépenses liées"
              benefice={benefices.balles || 0}
              color="var(--primary-color)"
            />
            <BeneficeCard
              titre="Ventes libres (fournisseur)"
              icon="🛍️"
              ca={g.ventes?.libres?.montantVentes || 0}
              charges={g.ventes?.libres?.coutAchat || 0}
              chargesLabel="Prix d'achat produits"
              benefice={benefices.libres || 0}
              color="var(--success-color)"
            />
            <BeneficeCard
              titre="Expéditions (expédiées)"
              icon="🚚"
              ca={g.expeditions?.totalVentesExpediees || 0}
              charges={g.expeditions?.totalFrais || 0}
              chargesLabel="Frais colis + commissionnaire"
              benefice={benefices.expeditions || 0}
              color="#7c3aed"
            />
          </div>

          {/* Graphique comparatif */}
          <div className="card">
            <SectionTitle>📊 Comparaison bénéfices par activité</SectionTitle>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={[
                { name: "Par balle", ca: g.ventes?.parBalle?.montant || 0, charges: (g.balles?.totalInvesti || 0) + (g.balles?.totalDepensesLiees || 0), benefice: benefices.balles || 0 },
                { name: "Libres", ca: g.ventes?.libres?.montantVentes || 0, charges: g.ventes?.libres?.coutAchat || 0, benefice: benefices.libres || 0 },
                { name: "Expéditions", ca: g.expeditions?.totalVentesExpediees || 0, charges: g.expeditions?.totalFrais || 0, benefice: benefices.expeditions || 0 },
              ]} barSize={50}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 13 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="ca" fill="#2563eb" name="CA" radius={[4, 4, 0, 0]} />
                <Bar dataKey="charges" fill="#ef4444" name="Charges" radius={[4, 4, 0, 0]} />
                <Bar dataKey="benefice" fill="#10b981" name="Bénéfice" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Résumé bénéfice net */}
          <div className="card" style={{ marginTop: 16 }}>
            <SectionTitle>🏆 Bénéfice net consolidé</SectionTitle>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
              {[
                { label: "Bénéfice balles", val: benefices.balles || 0, color: "var(--primary-color)" },
                { label: "Bénéfice libres", val: benefices.libres || 0, color: "var(--success-color)" },
                { label: "Bénéfice expéd.", val: benefices.expeditions || 0, color: "#7c3aed" },
                { label: "− Dépenses globales", val: -(g.depenses?.globales || 0), color: "var(--danger-color)" },
                { label: "= Net total", val: benefices.net || 0, color: benefices.net >= 0 ? "var(--success-color)" : "var(--danger-color)", big: true },
              ].map((item) => (
                <div key={item.label} style={{ background: item.big ? (item.val >= 0 ? "#f0fdf4" : "#fef2f2") : "var(--light-color)", borderRadius: 8, padding: "12px 14px", border: item.big ? `2px solid ${item.color}` : "none" }}>
                  <div style={{ fontSize: 11, color: "var(--secondary-color)", marginBottom: 4 }}>{item.label}</div>
                  <div style={{ fontSize: item.big ? 20 : 15, fontWeight: 700, color: item.color }}>{fmtAR(Math.abs(item.val))}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ── TAB PÉRIODE ── */}
      {activeTab === "periode" && (
        <>
          {rapportParJour.length > 0 && (
            <div className="card" style={{ marginBottom: 20 }}>
              <SectionTitle>📅 Évolution journalière</SectionTitle>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={rapportParJour}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line type="monotone" dataKey="montantVentes" stroke="#2563eb" name="Ventes" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="depenses" stroke="#ef4444" name="Dépenses" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="fraisExpedition" stroke="#f59e0b" name="Frais expéd." strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="benefice" stroke="#10b981" name="Bénéfice" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {rapportParMois.length > 0 && (
            <div className="card">
              <SectionTitle>📆 Évolution mensuelle</SectionTitle>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={rapportParMois.map((m) => ({ ...m, label: `${MOIS[m.mois]} ${m.annee}` }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="montantVentes" fill="#2563eb" name="Ventes" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="depenses" fill="#ef4444" name="Dépenses" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="fraisExpedition" fill="#f59e0b" name="Frais expéd." radius={[4, 4, 0, 0]} />
                  <Bar dataKey="benefice" fill="#10b981" name="Bénéfice" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="table-container" style={{ marginTop: 16 }}>
                <table className="data-table">
                  <thead><tr><th>Mois</th><th>Ventes</th><th>Dépenses</th><th>Frais expéd.</th><th>Bénéfice</th></tr></thead>
                  <tbody>
                    {rapportParMois.map((m) => (
                      <tr key={`${m.annee}-${m.mois}`}>
                        <td><strong>{MOIS[m.mois]} {m.annee}</strong></td>
                        <td style={{ color: "var(--success-color)" }}>{fmtAR(m.montantVentes)}</td>
                        <td style={{ color: "var(--danger-color)" }}>{fmtAR(m.depenses)}</td>
                        <td style={{ color: "var(--warning-color)" }}>{fmtAR(m.fraisExpedition || 0)}</td>
                        <td><strong style={{ color: m.benefice >= 0 ? "var(--success-color)" : "var(--danger-color)" }}>{fmtAR(m.benefice)}</strong></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── TAB BALLE ── */}
      {activeTab === "balle" && (
        <>
          {rapportParBalle.length > 0 && (
            <div className="card" style={{ marginBottom: 20 }}>
              <SectionTitle>📦 Performance par balle</SectionTitle>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={rapportParBalle.slice(0, 8)} layout="vertical" margin={{ left: 90 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="nom" tick={{ fontSize: 11 }} width={90} />
                  <Tooltip formatter={(v) => fmtAR(v)} />
                  <Legend />
                  <Bar dataKey="prixAchat" fill="#64748b" name="Achat" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="totalVentes" fill="#2563eb" name="Ventes" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="depenses" fill="#ef4444" name="Dépenses" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="benefice" fill="#10b981" name="Bénéfice" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="table-container">
            <table className="data-table">
              <thead><tr><th>Balle</th><th>Achat</th><th>Ventes</th><th>Nb</th><th>Dépenses</th><th>Bénéfice</th><th>Marge</th></tr></thead>
              <tbody>
                {rapportParBalle.map((b) => {
                  const marge = b.prixAchat > 0 ? ((b.benefice / b.prixAchat) * 100).toFixed(1) : 0;
                  return (
                    <tr key={b.id}>
                      <td><strong>{b.nom}</strong><br /><small className="text-secondary">{b.numero}</small></td>
                      <td>{fmtAR(b.prixAchat)}</td>
                      <td style={{ color: "var(--success-color)" }}>{fmtAR(b.totalVentes)}</td>
                      <td>{b.nombreVentes}</td>
                      <td style={{ color: "var(--danger-color)" }}>{fmtAR(b.depenses)}</td>
                      <td><strong style={{ color: b.benefice >= 0 ? "var(--success-color)" : "var(--danger-color)" }}>{fmtAR(b.benefice)}</strong></td>
                      <td><strong style={{ color: parseFloat(marge) >= 0 ? "var(--success-color)" : "var(--danger-color)" }}>{marge}%</strong></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── TAB EXPÉDITIONS ── */}
      {activeTab === "expedition" && rapportExpeditions && (
        <>
          {rapportExpeditions.statsParDestination?.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginBottom: 20 }}>
              {rapportExpeditions.statsParDestination.map((d) => (
                <div key={d._id} style={{ background: "white", borderRadius: 12, padding: 16, boxShadow: "var(--shadow)" }}>
                  <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 10 }}>🌍 {d._id}</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {[
                      { label: "Expéditions", val: d.totalExpeditions, color: "var(--primary-color)", bg: "#eff6ff" },
                      { label: "Produits", val: d.totalProduits, color: "var(--warning-color)", bg: "#fef3c7" },
                      { label: "Frais réels", val: fmtAR(d.totalFrais), color: "var(--danger-color)", bg: "#fef2f2" },
                      { label: "CA expédié", val: fmtAR(d.totalVentes), color: "var(--success-color)", bg: "#f0fdf4" },
                    ].map((s) => (
                      <div key={s.label} style={{ background: s.bg, borderRadius: 6, padding: "8px 10px" }}>
                        <div style={{ fontSize: 10, color: "var(--secondary-color)" }}>{s.label}</div>
                        <div style={{ fontWeight: 700, color: s.color, fontSize: typeof s.val === "number" ? 18 : 12 }}>{s.val}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr><th>Date</th><th>Nom</th><th>Destination</th><th>Produits</th><th>CA</th><th>Frais colis</th><th>Commission</th><th>Total frais</th><th>Net</th></tr>
              </thead>
              <tbody>
                {rapportExpeditions.expeditions?.length === 0 ? (
                  <tr><td colSpan={9} className="no-data">Aucune expédition expédiée sur cette période</td></tr>
                ) : rapportExpeditions.expeditions?.map((e) => (
                  <tr key={e._id}>
                    <td>{format(new Date(e.dateExpedition), "dd/MM/yyyy")}</td>
                    <td><strong>{e.nom}</strong></td>
                    <td>{e.destination}</td>
                    <td>{e.produits?.length || 0}</td>
                    <td style={{ color: "var(--success-color)" }}>{fmtAR(e.totalVentes)}</td>
                    <td>{fmtAR(e.fraisColis)}</td>
                    <td>
                      {fmtAR(e.salaireCommissionnaire)}
                      {e.modeCommissionnaire === "pourcentage" && <small className="text-secondary"> ({e.pourcentageCommissionnaire}%)</small>}
                    </td>
                    <td style={{ color: "var(--danger-color)" }}>{fmtAR(e.totalFrais)}</td>
                    <td><strong style={{ color: (e.totalVentes - e.totalFrais) >= 0 ? "var(--success-color)" : "var(--danger-color)" }}>{fmtAR(e.totalVentes - e.totalFrais)}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default Rapports;
