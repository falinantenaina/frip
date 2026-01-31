export const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log pour le développement
  if (process.env.NODE_ENV === "development") {
    console.error(err);
  }

  // Erreur de validation Mongoose
  if (err.name === "ValidationError") {
    const message = Object.values(err.errors).map((val) => val.message);
    error = {
      statusCode: 400,
      message: message,
    };
  }

  // Erreur de duplication (clé unique)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    error = {
      statusCode: 400,
      message: `${field} existe déjà`,
    };
  }

  // Erreur ObjectId invalide
  if (err.name === "CastError") {
    error = {
      statusCode: 400,
      message: "Ressource non trouvée - ID invalide",
    };
  }

  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || "Erreur serveur",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};
