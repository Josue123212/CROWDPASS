const paymentService = require("../services/payment.service");
const { success } = require("../utils/response");

async function checkout(req, res) {
  const result = await paymentService.checkoutPayment(req.body || {}, req.user);
  const message = result.alreadyPaid
    ? "El pago ya se encontraba completado."
    : result.outcome === "declined"
      ? "El pago fue rechazado por la pasarela simulada."
      : "Pago completado correctamente.";

  return success(res, {
    message,
    data: result.reservation,
  });
}

module.exports = {
  checkout,
};

