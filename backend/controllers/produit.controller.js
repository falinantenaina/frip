import Balle from "../models/balle.model.js";
import Produit from "../models/produit.model.js";

// @desc    Obtenir tous les produits
// @route   GET /api/produits
// @access  Private
export const getProduits = async (req, res, next) => {
  try {
    const { balle, statut, search } = req.query;

    let query = {};

    if (balle) {
      query.balle = balle;
    }

    if (statut) {
      query.statut = statut;
    }

    if (search) {
      query.$or = [
        { nom: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const produits = await Produit.find(query)
      .populate("balle", "nom numero")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: produits.length,
      data: produits,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtenir un produit par ID
// @route   GET /api/produits/:id
// @access  Private
export const getProduit = async (req, res, next) => {
  try {
    const produit = await Produit.findById(req.params.id).populate(
      "balle",
      "nom numero prixAchat",
    );

    if (!produit) {
      return res.status(404).json({
        success: false,
        message: "Produit non trouvé",
      });
    }

    res.status(200).json({
      success: true,
      data: produit,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Créer un nouveau produit
// @route   POST /api/produits
// @access  Private (Admin only)
export const createProduit = async (req, res, next) => {
  try {
    // Vérifier que la balle existe
    const balle = await Balle.findById(req.body.balle);

    if (!balle) {
      return res.status(404).json({
        success: false,
        message: "Balle non trouvée",
      });
    }

    const produit = await Produit.create(req.body);

    await produit.populate("balle", "nom numero");

    res.status(201).json({
      success: true,
      data: produit,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Créer plusieurs produits en une fois
// @route   POST /api/produits/bulk
// @access  Private (Admin only)
export const createProduitsBulk = async (req, res, next) => {
  try {
    const { balle, produits } = req.body;

    // Vérifier que la balle existe
    const balleDoc = await Balle.findById(balle);

    if (!balleDoc) {
      return res.status(404).json({
        success: false,
        message: "Balle non trouvée",
      });
    }

    // Ajouter l'ID de la balle à chaque produit
    const produitsWithBalle = produits.map((p) => ({
      ...p,
      balle,
    }));

    const createdProduits = await Produit.insertMany(produitsWithBalle);

    res.status(201).json({
      success: true,
      count: createdProduits.length,
      data: createdProduits,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mettre à jour un produit
// @route   PUT /api/produits/:id
// @access  Private (Admin only)
export const updateProduit = async (req, res, next) => {
  try {
    let produit = await Produit.findById(req.params.id);

    if (!produit) {
      return res.status(404).json({
        success: false,
        message: "Produit non trouvé",
      });
    }

    // Ne pas permettre de changer le statut en "vendu" manuellement
    if (req.body.statut === "vendu") {
      return res.status(400).json({
        success: false,
        message:
          'Le statut "vendu" est géré automatiquement lors de la création d\'une vente',
      });
    }

    produit = await Produit.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate("balle", "nom numero");

    res.status(200).json({
      success: true,
      data: produit,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Supprimer un produit
// @route   DELETE /api/produits/:id
// @access  Private (Admin only)
export const deleteProduit = async (req, res, next) => {
  try {
    const produit = await Produit.findById(req.params.id);

    if (!produit) {
      return res.status(404).json({
        success: false,
        message: "Produit non trouvé",
      });
    }

    // Ne pas permettre de supprimer un produit vendu
    if (produit.statut === "vendu") {
      return res.status(400).json({
        success: false,
        message: "Impossible de supprimer un produit déjà vendu",
      });
    }

    await produit.deleteOne();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtenir les produits disponibles d'une balle
// @route   GET /api/produits/balle/:balleId/disponibles
// @access  Private
export const getProduitsDisponibles = async (req, res, next) => {
  try {
    const produits = await Produit.find({
      balle: req.params.balleId,
      statut: "disponible",
    }).populate("balle", "nom numero");

    res.status(200).json({
      success: true,
      count: produits.length,
      data: produits,
    });
  } catch (error) {
    next(error);
  }
};
