const walletService = require("../services/wallet.service");
const { success } = require("../utils/response");

async function listCards(req, res) {
  const cards = await walletService.listCards(req.user);
  return success(res, {
    message: "Tarjetas obtenidas correctamente.",
    data: cards,
  });
}

async function createCard(req, res) {
  const created = await walletService.createCard(req.body || {}, req.user);
  return success(
    res,
    {
      message: "Tarjeta registrada correctamente.",
      data: created,
    },
    201
  );
}

async function setDefaultCard(req, res) {
  const updated = await walletService.setDefaultCard(req.params.id, req.user);
  return success(res, {
    message: "Tarjeta predeterminada actualizada correctamente.",
    data: updated,
  });
}

async function deleteCard(req, res) {
  const deleted = await walletService.deleteCard(req.params.id, req.user);
  return success(res, {
    message: "Tarjeta eliminada correctamente.",
    data: deleted,
  });
}

module.exports = {
  listCards,
  createCard,
  setDefaultCard,
  deleteCard,
};

