import { create } from 'zustand';
import api from '../utils/api';

// Store pour les produits
export const useProduitStore = create((set) => ({
  produits: [],
  loading: false,
  error: null,

  fetchProduits: async (filters = {}) => {
    set({ loading: true, error: null });
    try {
      const params = new URLSearchParams(filters).toString();
      const response = await api.get(`/produits${params ? `?${params}` : ''}`);
      set({ produits: response.data.data, loading: false });
      return { success: true };
    } catch (error) {
      set({ loading: false, error: error.response?.data?.message });
      return { success: false };
    }
  },

  createProduit: async (produitData) => {
    set({ loading: true, error: null });
    try {
      const response = await api.post('/produits', produitData);
      set((state) => ({
        produits: [response.data.data, ...state.produits],
        loading: false,
      }));
      return { success: true, data: response.data.data };
    } catch (error) {
      set({ loading: false, error: error.response?.data?.message });
      return { success: false, message: error.response?.data?.message };
    }
  },

  createProduitsBulk: async (balleId, produits) => {
    set({ loading: true, error: null });
    try {
      const response = await api.post('/produits/bulk', { balle: balleId, produits });
      set((state) => ({
        produits: [...response.data.data, ...state.produits],
        loading: false,
      }));
      return { success: true, data: response.data.data };
    } catch (error) {
      set({ loading: false, error: error.response?.data?.message });
      return { success: false, message: error.response?.data?.message };
    }
  },

  updateProduit: async (id, produitData) => {
    set({ loading: true, error: null });
    try {
      const response = await api.put(`/produits/${id}`, produitData);
      set((state) => ({
        produits: state.produits.map((p) => (p._id === id ? response.data.data : p)),
        loading: false,
      }));
      return { success: true };
    } catch (error) {
      set({ loading: false, error: error.response?.data?.message });
      return { success: false };
    }
  },

  deleteProduit: async (id) => {
    set({ loading: true, error: null });
    try {
      await api.delete(`/produits/${id}`);
      set((state) => ({
        produits: state.produits.filter((p) => p._id !== id),
        loading: false,
      }));
      return { success: true };
    } catch (error) {
      set({ loading: false, error: error.response?.data?.message });
      return { success: false };
    }
  },

  clearError: () => set({ error: null }),
}));

// Store pour les dépenses
export const useDepenseStore = create((set) => ({
  depenses: [],
  loading: false,
  error: null,

  fetchDepenses: async (filters = {}) => {
    set({ loading: true, error: null });
    try {
      const params = new URLSearchParams(filters).toString();
      const response = await api.get(`/depenses${params ? `?${params}` : ''}`);
      set({ depenses: response.data.data, loading: false });
      return { success: true };
    } catch (error) {
      set({ loading: false, error: error.response?.data?.message });
      return { success: false };
    }
  },

  createDepense: async (depenseData) => {
    set({ loading: true, error: null });
    try {
      const response = await api.post('/depenses', depenseData);
      set((state) => ({
        depenses: [response.data.data, ...state.depenses],
        loading: false,
      }));
      return { success: true, data: response.data.data };
    } catch (error) {
      set({ loading: false, error: error.response?.data?.message });
      return { success: false, message: error.response?.data?.message };
    }
  },

  updateDepense: async (id, depenseData) => {
    set({ loading: true, error: null });
    try {
      const response = await api.put(`/depenses/${id}`, depenseData);
      set((state) => ({
        depenses: state.depenses.map((d) => (d._id === id ? response.data.data : d)),
        loading: false,
      }));
      return { success: true };
    } catch (error) {
      set({ loading: false, error: error.response?.data?.message });
      return { success: false };
    }
  },

  deleteDepense: async (id) => {
    set({ loading: true, error: null });
    try {
      await api.delete(`/depenses/${id}`);
      set((state) => ({
        depenses: state.depenses.filter((d) => d._id !== id),
        loading: false,
      }));
      return { success: true };
    } catch (error) {
      set({ loading: false, error: error.response?.data?.message });
      return { success: false };
    }
  },

  clearError: () => set({ error: null }),
}));

// Store pour les livreurs
export const useLivreurStore = create((set) => ({
  livreurs: [],
  loading: false,
  error: null,

  fetchLivreurs: async (filters = {}) => {
    set({ loading: true, error: null });
    try {
      const params = new URLSearchParams(filters).toString();
      const response = await api.get(`/livreurs${params ? `?${params}` : ''}`);
      set({ livreurs: response.data.data, loading: false });
      return { success: true };
    } catch (error) {
      set({ loading: false, error: error.response?.data?.message });
      return { success: false };
    }
  },

  createLivreur: async (livreurData) => {
    set({ loading: true, error: null });
    try {
      const response = await api.post('/livreurs', livreurData);
      set((state) => ({
        livreurs: [response.data.data, ...state.livreurs],
        loading: false,
      }));
      return { success: true, data: response.data.data };
    } catch (error) {
      set({ loading: false, error: error.response?.data?.message });
      return { success: false, message: error.response?.data?.message };
    }
  },

  updateLivreur: async (id, livreurData) => {
    set({ loading: true, error: null });
    try {
      const response = await api.put(`/livreurs/${id}`, livreurData);
      set((state) => ({
        livreurs: state.livreurs.map((l) => (l._id === id ? response.data.data : l)),
        loading: false,
      }));
      return { success: true };
    } catch (error) {
      set({ loading: false, error: error.response?.data?.message });
      return { success: false };
    }
  },

  deleteLivreur: async (id) => {
    set({ loading: true, error: null });
    try {
      await api.delete(`/livreurs/${id}`);
      set((state) => ({
        livreurs: state.livreurs.filter((l) => l._id !== id),
        loading: false,
      }));
      return { success: true };
    } catch (error) {
      set({ loading: false, error: error.response?.data?.message });
      return { success: false };
    }
  },

  clearError: () => set({ error: null }),
}));
