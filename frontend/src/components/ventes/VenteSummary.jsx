import { fmt } from "../../helpers";

export const VenteSummary = ({ filteredVentes, filterPeriode }) => {
  const total = filteredVentes.reduce(
    (acc, v) => acc + (v.montantTotal || 0),
    0,
  );

  return (
    filterPeriode !== "tous" && (
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
          Total : {fmt(total)}
        </span>
      </div>
    )
  );
};
