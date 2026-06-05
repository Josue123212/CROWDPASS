const db = require("../config/db");
const walletModel = require("../models/wallet.model");
const ApiError = require("../utils/apiError");

const CARD_NUMBER_REGEX = /^\d{12,19}$/;
const BRAND_REGEX = /^[\p{L}0-9_ -]{2,30}$/u;
const HOLDER_REGEX = /^[\p{L}\s'.-]{3,120}$/u;

function buildMaskedPan(last4) {
  return `${last4} **** **** ****`;
}

function normalizeCardResponse(card) {
  if (!card) {
    return null;
  }

  const maskedToken = String(card.first4 || "").trim() || String(card.last4 || "").trim();

  return {
    id: card.id,
    brand: card.brand,
    last4: card.last4,
    masked: buildMaskedPan(maskedToken),
    exp_month: card.exp_month,
    exp_year: card.exp_year,
    holder_name: card.holder_name,
    is_default: card.is_default,
    created_at: card.created_at,
    updated_at: card.updated_at,
  };
}

function normalizeMonth(value) {
  const month = Number.parseInt(value, 10);
  if (!Number.isFinite(month) || month < 1 || month > 12) {
    throw new ApiError(400, "El mes de expiracion es invalido.");
  }
  return month;
}

function normalizeYear(value) {
  const year = Number.parseInt(value, 10);
  if (!Number.isFinite(year) || year < 2020 || year > 2100) {
    throw new ApiError(400, "El ano de expiracion es invalido.");
  }
  return year;
}

function normalizeBrand(value) {
  const brand = String(value || "").trim().toUpperCase();
  if (!BRAND_REGEX.test(brand)) {
    throw new ApiError(400, "La marca de tarjeta es invalida.");
  }
  return brand;
}

function normalizeHolderName(value) {
  const holderName = String(value || "").trim();
  if (!HOLDER_REGEX.test(holderName)) {
    throw new ApiError(400, "El nombre del titular es invalido.");
  }
  return holderName;
}

function normalizeCardNumber(cardNumber) {
  const normalized = String(cardNumber || "").trim().replace(/\s+/g, "");
  if (!CARD_NUMBER_REGEX.test(normalized)) {
    throw new ApiError(400, "El numero de tarjeta es invalido.");
  }
  return normalized;
}

function inferBrandFromNumber(cardNumber) {
  if (typeof cardNumber !== "string" || cardNumber.length === 0) {
    return "VISA";
  }

  if (cardNumber.startsWith("4")) {
    return "VISA";
  }

  if (cardNumber.startsWith("34") || cardNumber.startsWith("37")) {
    return "AMEX";
  }

  if (cardNumber.startsWith("5") || cardNumber.startsWith("2")) {
    return "MASTERCARD";
  }

  return "VISA";
}

async function listCards(user) {
  if (!user || !["customer", "client"].includes(user.role)) {
    throw new ApiError(403, "No tienes permisos para gestionar tarjetas.");
  }

  const cards = await walletModel.listWalletCardsByUser(user.sub);
  return cards.map(normalizeCardResponse);
}

async function createCard(payload, user) {
  if (!user || !["customer", "client"].includes(user.role)) {
    throw new ApiError(403, "No tienes permisos para gestionar tarjetas.");
  }

  const normalizedCardNumber = normalizeCardNumber(payload.cardNumber);
  const last4 = normalizedCardNumber.slice(-4);
  const first4 = normalizedCardNumber.slice(0, 4);
  let brand = null;

  try {
    if (payload.brand) {
      brand = normalizeBrand(payload.brand);
    }
  } catch {
    brand = null;
  }

  if (!brand) {
    brand = inferBrandFromNumber(normalizedCardNumber);
  }

  const expMonth = normalizeMonth(payload.expMonth);
  const expYear = normalizeYear(payload.expYear);
  const holderName = normalizeHolderName(payload.holderName);
  const isDefault = Boolean(payload.isDefault);

  const client = await db.getClient();

  try {
    await client.query("BEGIN");
    await walletModel.lockWalletCardsByUser(user.sub, client);

    const existing = await walletModel.findWalletCardByFingerprint(
      {
        userId: user.sub,
        brand,
        last4,
        expMonth,
        expYear,
      },
      client
    );

    if (existing) {
      throw new ApiError(409, "Ya tienes esta tarjeta registrada.");
    }

    if (isDefault) {
      await walletModel.clearDefaultCardByUser(user.sub, client);
    }

    const inserted = await walletModel.createWalletCard(
      {
        userId: user.sub,
        brand,
        first4,
        last4,
        expMonth,
        expYear,
        holderName,
        isDefault,
      },
      client
    );

    const card = await walletModel.findWalletCardById(inserted.id, client);
    await client.query("COMMIT");
    return normalizeCardResponse(card);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function setDefaultCard(cardId, user) {
  if (!user || !["customer", "client"].includes(user.role)) {
    throw new ApiError(403, "No tienes permisos para gestionar tarjetas.");
  }

  const normalizedCardId = Number(cardId);
  if (!Number.isFinite(normalizedCardId) || normalizedCardId <= 0) {
    throw new ApiError(400, "El id de tarjeta es invalido.");
  }

  const client = await db.getClient();

  try {
    await client.query("BEGIN");
    await walletModel.lockWalletCardsByUser(user.sub, client);

    const card = await walletModel.findWalletCardById(normalizedCardId, client);
    if (!card || Number(card.user_id) !== Number(user.sub)) {
      throw new ApiError(404, "Tarjeta no encontrada.");
    }

    await walletModel.clearDefaultCardByUser(user.sub, client);
    await walletModel.setWalletCardDefaultByUser(user.sub, normalizedCardId, client);

    const updated = await walletModel.findWalletCardById(normalizedCardId, client);
    await client.query("COMMIT");
    return normalizeCardResponse(updated);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function deleteCard(cardId, user) {
  if (!user || !["customer", "client"].includes(user.role)) {
    throw new ApiError(403, "No tienes permisos para gestionar tarjetas.");
  }

  const normalizedCardId = Number(cardId);
  if (!Number.isFinite(normalizedCardId) || normalizedCardId <= 0) {
    throw new ApiError(400, "El id de tarjeta es invalido.");
  }

  const client = await db.getClient();

  try {
    await client.query("BEGIN");
    await walletModel.lockWalletCardsByUser(user.sub, client);

    const deleted = await walletModel.deleteWalletCardByUser(user.sub, normalizedCardId, client);
    if (!deleted) {
      throw new ApiError(404, "Tarjeta no encontrada.");
    }

    if (deleted.is_default) {
      const fallbackCardId = await walletModel.findNewestCardIdByUser(user.sub, client);
      if (fallbackCardId) {
        await walletModel.setWalletCardDefaultByUser(user.sub, fallbackCardId, client);
      }
    }

    await client.query("COMMIT");
    return { id: normalizedCardId };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  listCards,
  createCard,
  setDefaultCard,
  deleteCard,
};
