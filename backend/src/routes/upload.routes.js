const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const { success } = require("../utils/response");
const asyncHandler = require("../utils/asyncHandler");
const { authenticate } = require("../middlewares/auth.middleware");
const ApiError = require("../utils/apiError");

const router = express.Router();

// Directorio donde se guardan las imágenes subidas
const UPLOADS_DIR = path.join(__dirname, "../../../uploads");

// Asegurarse de que el directorio exista
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_FILE_SIZE_MB = 5;

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    cb(null, UPLOADS_DIR);
  },
  filename(_req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
    const uniqueName = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${ext}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE_MB * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new ApiError(400, `Tipo de archivo no permitido. Solo se aceptan: JPEG, PNG, WebP y GIF.`));
    }
  },
});

/**
 * POST /api/uploads/image
 * Sube una imagen y devuelve la URL pública donde se puede acceder.
 * Requiere autenticación (cualquier rol).
 */
router.post(
  "/image",
  authenticate,
  upload.single("image"),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      throw new ApiError(400, "No se recibió ningún archivo de imagen.");
    }

    // Construir la URL pública a partir del host de la request
    const protocol = req.headers["x-forwarded-proto"] || req.protocol || "http";
    const host = req.headers["x-forwarded-host"] || req.get("host");
    const publicUrl = `${protocol}://${host}/uploads/${req.file.filename}`;

    return success(res, {
      message: "Imagen subida correctamente.",
      data: { url: publicUrl, filename: req.file.filename },
    });
  })
);

module.exports = router;
