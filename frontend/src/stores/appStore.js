/**
 * Store global avec cache intelligent.
 * Évite les rechargements inutiles entre changements de pages.
 * TTL configurable par ressource.
 */
import { create } from "zustand";
import api from "../utils/api";

const CACHE_TTL = {
  balles: 60_000, // 1 min
  livreurs: 120_000, // 2 min
  ventes: 30_000, // 30s (données fréquentes)
  depenses: 60_000,
  produits: 60_000,
  investissements: 120_000,
  versements: 120_000,
  expeditions: 30_000,
};

function isStale(lastFetch, ttl) {
  if (!lastFetch) return true;
  return Date.now() - lastFetch > ttl;
}

const useAppStore = create((set, get) => ({
  // ── State ────────────────────────────────────────────────────────────────
  balles: [],
  ventes: [],
  depenses: [],
  livreurs: [],
  produits: [],
  investissements: [],
  versements: [],
  expeditions: [],
  paiements: {}, // keyed by livreurId
  prosduitsDispo: {}, // keyed by balleId

  // Timestamps du dernier fetch
  _lastFetch: {},
  loading: {},
  errors: {},

  // ── Helpers internes ─────────────────────────────────────────────────────
  _setLoading: (key, val) =>
    set((s) => ({ loading: { ...s.loading, [key]: val } })),
  _setError: (key, msg) =>
    set((s) => ({ errors: { ...s.errors, [key]: msg } })),
  _setLastFetch: (key) =>
    set((s) => ({ _lastFetch: { ...s._lastFetch, [key]: Date.now() } })),

  // ── BALLES ───────────────────────────────────────────────────────────────
  fetchBalles: async (filters = {}, force = false) => {
    const hasFilters = Object.keys(filters).length > 0;
    if (
      !hasFilters &&
      !force &&
      !isStale(get()._lastFetch.balles, CACHE_TTL.balles)
    )
      return { success: true };
    get()._setLoading("balles", true);
    try {
      const cleanFilters = Object.fromEntries(
        Object.entries(filters).filter(
          ([_, value]) => value !== undefined && value !== null && value !== "",
        ),
      );
      const params = new URLSearchParams(cleanFilters).toString();
      const res = await api.get(`/balles${params ? `?${params}` : ""}`);
      set({ balles: res.data.data });
      get()._setLastFetch("balles");
      return { success: true };
    } catch (e) {
      get()._setError("balles", e.response?.data?.message);
      return { success: false, message: e.response?.data?.message };
    } finally {
      get()._setLoading("balles", false);
    }
  },

  fetchBalle: async (id) => {
    try {
      const res = await api.get(`/balles/${id}`);
      return { success: true, data: res.data.data };
    } catch (e) {
      return { success: false, message: e.response?.data?.message };
    }
  },

  createBalle: async (data) => {
    try {
      const res = await api.post("/balles", data);
      set((s) => ({ balles: [res.data.data, ...s.balles] }));
      return { success: true, data: res.data.data };
    } catch (e) {
      return { success: false, message: e.response?.data?.message };
    }
  },

  updateBalle: async (id, data) => {
    try {
      const res = await api.put(`/balles/${id}`, data);
      set((s) => ({
        balles: s.balles.map((b) => (b._id === id ? res.data.data : b)),
      }));
      return { success: true, data: res.data.data };
    } catch (e) {
      return { success: false, message: e.response?.data?.message };
    }
  },

  deleteBalle: async (id) => {
    try {
      await api.delete(`/balles/${id}`);
      set((s) => ({ balles: s.balles.filter((b) => b._id !== id) }));
      return { success: true };
    } catch (e) {
      return { success: false, message: e.response?.data?.message };
    }
  },

  recalculateStats: async (id) => {
    try {
      const res = await api.put(`/balles/${id}/recalculate`);
      set((s) => ({
        balles: s.balles.map((b) => (b._id === id ? res.data.data : b)),
      }));
      return { success: true };
    } catch (e) {
      return { success: false, message: e.response?.data?.message };
    }
  },

  // ── VENTES ───────────────────────────────────────────────────────────────
  fetchVentes: async (filters = {}, force = false) => {
    const hasFilters = Object.keys(filters).length > 0;
    if (
      !hasFilters &&
      !force &&
      !isStale(get()._lastFetch.ventes, CACHE_TTL.ventes)
    )
      return { success: true };
    get()._setLoading("ventes", true);
    try {
      const cleanFilters = Object.fromEntries(
        Object.entries(filters).filter(
          ([_, v]) => v !== undefined && v !== null && v !== "",
        ),
      );
      const params = new URLSearchParams(cleanFilters).toString();
      const res = await api.get(`/ventes${params ? `?${params}` : ""}`);
      set({ ventes: res.data.data });
      get()._setLastFetch("ventes");
      return { success: true };
    } catch (e) {
      get()._setError("ventes", e.response?.data?.message);
      return { success: false, message: e.response?.data?.message };
    } finally {
      get()._setLoading("ventes", false);
    }
  },

  fetchVente: async (id) => {
    try {
      const res = await api.get(`/ventes/${id}`);
      return { success: true, data: res.data.data };
    } catch (e) {
      return { success: false, message: e.response?.data?.message };
    }
  },

  /** Créer une nouvelle vente */
  createVente: async (data) => {
    try {
      const res = await api.post("/ventes", data);
      const newVente = res.data.data;
      set((s) => ({ ventes: [newVente, ...s.ventes] }));
      // Invalider cache balles si vente par balle
      if (data.typeVente === "balle") {
        set((s) => ({ _lastFetch: { ...s._lastFetch, balles: 0 } }));
      }
      return { success: true, data: newVente };
    } catch (e) {
      return { success: false, message: e.response?.data?.message };
    }
  },

  /** Modifier les infos générales d'une vente (pas les produits) */
  updateVente: async (id, data) => {
    try {
      const res = await api.put(`/ventes/${id}`, data);
      set((s) => ({
        ventes: s.ventes.map((v) => (v._id === id ? res.data.data : v)),
      }));
      return { success: true, data: res.data.data };
    } catch (e) {
      return { success: false, message: e.response?.data?.message };
    }
  },

  /** Ajouter un produit à une vente existante */
  ajouterProduit: async (venteId, data) => {
    try {
      const res = await api.post(`/ventes/${venteId}/produits`, data);
      set((s) => ({
        ventes: s.ventes.map((v) => (v._id === venteId ? res.data.data : v)),
      }));
      if (data.typeVente === "balle" || res.data.data?.balle) {
        set((s) => ({ _lastFetch: { ...s._lastFetch, balles: 0 } }));
      }
      return { success: true, data: res.data.data };
    } catch (e) {
      return { success: false, message: e.response?.data?.message };
    }
  },

  /** Modifier un produit dans une vente */
  modifierProduit: async (venteId, produitEntryId, data) => {
    try {
      const res = await api.put(
        `/ventes/${venteId}/produits/${produitEntryId}`,
        data,
      );
      set((s) => ({
        ventes: s.ventes.map((v) => (v._id === venteId ? res.data.data : v)),
      }));
      return { success: true, data: res.data.data };
    } catch (e) {
      return { success: false, message: e.response?.data?.message };
    }
  },

  /** Supprimer un produit d'une vente */
  supprimerProduit: async (venteId, produitEntryId) => {
    try {
      const res = await api.delete(
        `/ventes/${venteId}/produits/${produitEntryId}`,
      );
      set((s) => ({
        ventes: s.ventes.map((v) => (v._id === venteId ? res.data.data : v)),
      }));
      return { success: true };
    } catch (e) {
      return { success: false, message: e.response?.data?.message };
    }
  },

  /** Annuler une vente */
  annulerVente: async (id, raisonAnnulation) => {
    try {
      const res = await api.put(`/ventes/${id}/annuler`, { raisonAnnulation });
      set((s) => ({
        ventes: s.ventes.map((v) => (v._id === id ? res.data.data : v)),
      }));
      set((s) => ({ _lastFetch: { ...s._lastFetch, balles: 0 } }));
      return { success: true };
    } catch (e) {
      return { success: false, message: e.response?.data?.message };
    }
  },

  /** Supprimer une vente */
  deleteVente: async (id) => {
    try {
      await api.delete(`/ventes/${id}`);
      set((s) => ({ ventes: s.ventes.filter((v) => v._id !== id) }));
      set((s) => ({ _lastFetch: { ...s._lastFetch, balles: 0 } }));
      return { success: true };
    } catch (e) {
      return { success: false, message: e.response?.data?.message };
    }
  },

  ajouterProduit: async (venteId, data) => {
    try {
      const res = await api.post(`/ventes/${venteId}/produits`, data);
      set((s) => ({
        ventes: s.ventes.map((v) => (v._id === venteId ? res.data.data : v)),
      }));
      return { success: true, data: res.data.data };
    } catch (e) {
      return { success: false, message: e.response?.data?.message };
    }
  },

  supprimerProduit: async (venteId, produitEntryId) => {
    try {
      const res = await api.delete(
        `/ventes/${venteId}/produits/${produitEntryId}`,
      );
      set((s) => ({
        ventes: s.ventes.map((v) => (v._id === venteId ? res.data.data : v)),
      }));
      return { success: true };
    } catch (e) {
      return { success: false, message: e.response?.data?.message };
    }
  },

  modifierProduit: async (venteId, produitEntryId, data) => {
    try {
      const res = await api.put(
        `/ventes/${venteId}/produits/${produitEntryId}`,
        data,
      );
      set((s) => ({
        ventes: s.ventes.map((v) => (v._id === venteId ? res.data.data : v)),
      }));
      return { success: true, data: res.data.data };
    } catch (e) {
      return { success: false, message: e.response?.data?.message };
    }
  },

  // ── LIVREURS ─────────────────────────────────────────────────────────────
  fetchLivreurs: async (force = false) => {
    if (!force && !isStale(get()._lastFetch.livreurs, CACHE_TTL.livreurs))
      return { success: true };
    get()._setLoading("livreurs", true);
    try {
      const res = await api.get("/livreurs");
      set({ livreurs: res.data.data });
      get()._setLastFetch("livreurs");
      return { success: true };
    } catch (e) {
      return { success: false, message: e.response?.data?.message };
    } finally {
      get()._setLoading("livreurs", false);
    }
  },

  createLivreur: async (data) => {
    try {
      const res = await api.post("/livreurs", data);
      set((s) => ({ livreurs: [res.data.data, ...s.livreurs] }));
      return { success: true, data: res.data.data };
    } catch (e) {
      return { success: false, message: e.response?.data?.message };
    }
  },

  updateLivreur: async (id, data) => {
    try {
      const res = await api.put(`/livreurs/${id}`, data);
      set((s) => ({
        livreurs: s.livreurs.map((l) => (l._id === id ? res.data.data : l)),
      }));
      return { success: true };
    } catch (e) {
      return { success: false, message: e.response?.data?.message };
    }
  },

  deleteLivreur: async (id) => {
    try {
      await api.delete(`/livreurs/${id}`);
      set((s) => ({ livreurs: s.livreurs.filter((l) => l._id !== id) }));
      return { success: true };
    } catch (e) {
      return { success: false, message: e.response?.data?.message };
    }
  },

  // ── DÉPENSES ─────────────────────────────────────────────────────────────
  fetchDepenses: async (filters = {}, force = false) => {
    const hasFilters = Object.keys(filters).length > 0;
    if (
      !hasFilters &&
      !force &&
      !isStale(get()._lastFetch.depenses, CACHE_TTL.depenses)
    )
      return { success: true };
    get()._setLoading("depenses", true);
    try {
      const params = new URLSearchParams(filters).toString();
      const res = await api.get(`/depenses${params ? `?${params}` : ""}`);
      set({ depenses: res.data.data });
      get()._setLastFetch("depenses");
      return { success: true };
    } catch (e) {
      return { success: false, message: e.response?.data?.message };
    } finally {
      get()._setLoading("depenses", false);
    }
  },

  createDepense: async (data) => {
    try {
      const res = await api.post("/depenses", data);
      set((s) => ({ depenses: [res.data.data, ...s.depenses] }));
      set((s) => ({ _lastFetch: { ...s._lastFetch, balles: 0 } }));
      return { success: true };
    } catch (e) {
      return { success: false, message: e.response?.data?.message };
    }
  },

  updateDepense: async (id, data) => {
    try {
      const res = await api.put(`/depenses/${id}`, data);
      set((s) => ({
        depenses: s.depenses.map((d) => (d._id === id ? res.data.data : d)),
      }));
      return { success: true };
    } catch (e) {
      return { success: false, message: e.response?.data?.message };
    }
  },

  deleteDepense: async (id) => {
    try {
      await api.delete(`/depenses/${id}`);
      set((s) => ({ depenses: s.depenses.filter((d) => d._id !== id) }));
      return { success: true };
    } catch (e) {
      return { success: false, message: e.response?.data?.message };
    }
  },

  // ── INVESTISSEMENTS / VERSEMENTS ─────────────────────────────────────────
  fetchInvestissements: async (filters = {}, force = false) => {
    const hasFilters = Object.keys(filters).length > 0;
    if (
      !hasFilters &&
      !force &&
      !isStale(get()._lastFetch.investissements, CACHE_TTL.investissements)
    )
      return { success: true };
    try {
      const params = new URLSearchParams(filters).toString();
      const res = await api.get(
        `/investissements${params ? `?${params}` : ""}`,
      );
      set({ investissements: res.data.data });
      get()._setLastFetch("investissements");
      return { success: true };
    } catch (e) {
      return { success: false };
    }
  },

  createInvestissement: async (data) => {
    try {
      const res = await api.post("/investissements", data);
      set((s) => ({ investissements: [res.data.data, ...s.investissements] }));
      return { success: true };
    } catch (e) {
      return { success: false, message: e.response?.data?.message };
    }
  },

  updateInvestissement: async (id, data) => {
    try {
      const res = await api.put(`/investissements/${id}`, data);
      set((s) => ({
        investissements: s.investissements.map((i) =>
          i._id === id ? res.data.data : i,
        ),
      }));
      return { success: true };
    } catch (e) {
      return { success: false };
    }
  },

  deleteInvestissement: async (id) => {
    try {
      await api.delete(`/investissements/${id}`);
      set((s) => ({
        investissements: s.investissements.filter((i) => i._id !== id),
      }));
      return { success: true };
    } catch (e) {
      return { success: false };
    }
  },

  fetchVersements: async (filters = {}, force = false) => {
    const hasFilters = Object.keys(filters).length > 0;
    if (
      !hasFilters &&
      !force &&
      !isStale(get()._lastFetch.versements, CACHE_TTL.versements)
    )
      return { success: true };
    try {
      const params = new URLSearchParams(filters).toString();
      const res = await api.get(`/versements${params ? `?${params}` : ""}`);
      set({ versements: res.data.data });
      get()._setLastFetch("versements");
      return { success: true };
    } catch (e) {
      return { success: false };
    }
  },

  createVersement: async (data) => {
    try {
      const res = await api.post("/versements", data);
      set((s) => ({ versements: [res.data.data, ...s.versements] }));
      return { success: true };
    } catch (e) {
      return { success: false, message: e.response?.data?.message };
    }
  },

  updateVersement: async (id, data) => {
    try {
      const res = await api.put(`/versements/${id}`, data);
      set((s) => ({
        versements: s.versements.map((v) => (v._id === id ? res.data.data : v)),
      }));
      return { success: true };
    } catch (e) {
      return { success: false };
    }
  },

  deleteVersement: async (id) => {
    try {
      await api.delete(`/versements/${id}`);
      set((s) => ({ versements: s.versements.filter((v) => v._id !== id) }));
      return { success: true };
    } catch (e) {
      return { success: false };
    }
  },

  // ── EXPÉDITIONS ──────────────────────────────────────────────────────────
  fetchExpeditions: async (filters = {}, force = false) => {
    const hasFilters = Object.keys(filters).length > 0;
    if (
      !hasFilters &&
      !force &&
      !isStale(get()._lastFetch.expeditions, CACHE_TTL.expeditions)
    )
      return { success: true };
    get()._setLoading("expeditions", true);
    try {
      const params = new URLSearchParams(filters).toString();
      const res = await api.get(`/expeditions${params ? `?${params}` : ""}`);
      set({ expeditions: res.data.data });
      get()._setLastFetch("expeditions");
      return { success: true };
    } catch (e) {
      return { success: false, message: e.response?.data?.message };
    } finally {
      get()._setLoading("expeditions", false);
    }
  },

  // Expéditions en préparation pour sélection dans formulaire vente
  fetchExpeditionsEnPreparation: async () => {
    try {
      const res = await api.get("/expeditions/en-preparation");
      return { success: true, data: res.data.data };
    } catch (e) {
      return { success: false, data: [] };
    }
  },

  createExpedition: async (data) => {
    try {
      const res = await api.post("/expeditions", data);
      set((s) => ({ expeditions: [res.data.data, ...s.expeditions] }));
      return { success: true, data: res.data.data };
    } catch (e) {
      return { success: false, message: e.response?.data?.message };
    }
  },

  expedierExpedition: async (id, data) => {
    try {
      const res = await api.put(`/expeditions/${id}/expedier`, data);
      set((s) => ({
        expeditions: s.expeditions.map((e) =>
          e._id === id ? res.data.data : e,
        ),
      }));
      return { success: true, data: res.data.data };
    } catch (e) {
      return { success: false, message: e.response?.data?.message };
    }
  },

  rattacherVente: async (expeditionId, venteId) => {
    try {
      const res = await api.put(
        `/expeditions/${expeditionId}/rattacher-vente`,
        { venteId },
      );
      set((s) => ({
        expeditions: s.expeditions.map((e) =>
          e._id === expeditionId ? res.data.data : e,
        ),
      }));
      return { success: true, data: res.data.data };
    } catch (e) {
      return { success: false, message: e.response?.data?.message };
    }
  },

  updateExpedition: async (id, data) => {
    try {
      const res = await api.put(`/expeditions/${id}`, data);
      set((s) => ({
        expeditions: s.expeditions.map((e) =>
          e._id === id ? res.data.data : e,
        ),
      }));
      return { success: true, data: res.data.data };
    } catch (e) {
      return { success: false, message: e.response?.data?.message };
    }
  },

  deleteExpedition: async (id) => {
    try {
      await api.delete(`/expeditions/${id}`);
      set((s) => ({ expeditions: s.expeditions.filter((e) => e._id !== id) }));
      return { success: true };
    } catch (e) {
      return { success: false, message: e.response?.data?.message };
    }
  },

  // ── PRODUITS DISPONIBLES ─────────────────────────────────────────────────
  fetchProduitsDisponibles: async (balleId) => {
    try {
      const res = await api.get(`/produits/balle/${balleId}/disponibles`);
      set((s) => ({
        prosduitsDispo: { ...s.prosduitsDispo, [balleId]: res.data.data },
      }));
      return { success: true, data: res.data.data };
    } catch (e) {
      return { success: false, data: [] };
    }
  },

  // ── PAIEMENTS LIVREUR ────────────────────────────────────────────────────
  fetchPaiements: async (livreurId) => {
    try {
      const res = await api.get(`/livreurs/${livreurId}/paiements`);
      set((s) => ({
        paiements: { ...s.paiements, [livreurId]: res.data.data },
      }));
      return { success: true };
    } catch (e) {
      return { success: false };
    }
  },

  createPaiement: async (data) => {
    try {
      const res = await api.post("/paiements-livreurs", data);
      const livreurId = data.livreur;
      set((s) => ({
        paiements: {
          ...s.paiements,
          [livreurId]: [res.data.data, ...(s.paiements[livreurId] || [])],
        },
      }));
      return { success: true, data: res.data.data };
    } catch (e) {
      return { success: false, message: e.response?.data?.message };
    }
  },

  // ── INVALIDATION CACHE ───────────────────────────────────────────────────
  invalidateCache: (keys = []) => {
    const update = {};
    keys.forEach((k) => (update[k] = 0));
    set((s) => ({ _lastFetch: { ...s._lastFetch, ...update } }));
  },
}));

export default useAppStore;
