const reservationService = require("../services/reservation.service");
const ApiError = require("../utils/apiError");
const { success } = require("../utils/response");
const PDFDocument = require("pdfkit");
const QRCode = require("qrcode");

const ALLOWED_PAYMENT_METHODS = ["credit_card", "debit_card", "pagoefectivo", "transfer"];
const ALLOWED_INSTALLMENTS = [1, 3, 4, 5];

async function listReservations(req, res) {
  const reservations = await reservationService.getReservations(req.user);
  return success(res, {
    message: "Reservas obtenidas correctamente.",
    data: reservations,
  });
}

async function getReservation(req, res) {
  const reservation = await reservationService.getReservationById(req.params.id, req.user);
  return success(res, {
    message: "Reserva obtenida correctamente.",
    data: reservation,
  });
}

async function createReservation(req, res) {
  const {
    eventId,
    ticketTypeId,
    quantity,
    discountCode,
    paymentMethod = "transfer",
    installmentCount = 1,
    isRefundablePurchase = false,
  } = req.body;

  if (!eventId || Number(eventId) <= 0) {
    throw new ApiError(400, "El evento es obligatorio.");
  }

  if (!quantity || Number(quantity) <= 0) {
    throw new ApiError(400, "La cantidad de tickets debe ser mayor a 0.");
  }

  if (ticketTypeId && Number(ticketTypeId) <= 0) {
    throw new ApiError(400, "El tipo de ticket enviado es invalido.");
  }

  if (!ALLOWED_PAYMENT_METHODS.includes(paymentMethod)) {
    throw new ApiError(400, "El metodo de pago enviado no es valido.");
  }

  if (!ALLOWED_INSTALLMENTS.includes(Number(installmentCount))) {
    throw new ApiError(400, "La cantidad de cuotas enviada no es valida.");
  }

  const reservation = await reservationService.createReservation({
    userId: req.user.sub,
    userRole: req.user.role,
    eventId: Number(eventId),
    ticketTypeId: ticketTypeId ? Number(ticketTypeId) : null,
    quantity: Number(quantity),
    discountCode,
    requestKey: typeof req.headers["idempotency-key"] === "string" ? req.headers["idempotency-key"] : "",
    paymentMethod,
    installmentCount: Number(installmentCount),
    isRefundablePurchase: Boolean(isRefundablePurchase),
  });

  return success(
    res,
    {
      message: "Reserva creada correctamente.",
      data: reservation,
    },
    201
  );
}

async function cancelReservation(req, res) {
  const reservation = await reservationService.cancelReservation(req.params.id, req.user);
  return success(res, {
    message: reservation?.expired_at
      ? "La reserva ya habia expirado y se libero automaticamente."
      : "Reserva cancelada correctamente.",
    data: reservation,
  });
}

async function deleteReservation(req, res) {
  const reservation = await reservationService.removeReservation(req.params.id);
  return success(res, {
    message: "Reserva eliminada correctamente.",
    data: reservation,
  });
}

async function listRefundQueue(req, res) {
  const eventId = req.query.eventId ? Number(req.query.eventId) : null;
  const refundType = typeof req.query.refundType === "string" ? req.query.refundType.trim() : "";
  const refundStatus = typeof req.query.status === "string" ? req.query.status.trim() : "";
  const page = req.query.page ? Number(req.query.page) : null;
  const limit = req.query.limit ? Number(req.query.limit) : null;

  if (req.query.eventId && (!Number.isFinite(eventId) || eventId <= 0)) {
    throw new ApiError(400, "El eventId enviado es invalido.");
  }

  if (req.query.page && (!Number.isFinite(page) || page <= 0)) {
    throw new ApiError(400, "La pagina enviada es invalida.");
  }

  if (req.query.limit && (!Number.isFinite(limit) || limit <= 0 || limit > 500)) {
    throw new ApiError(400, "El limite enviado es invalido.");
  }

  const result = await reservationService.getRefundQueue({ eventId, refundType, refundStatus, page, limit }, req.user);

  if (result && typeof result === "object" && Array.isArray(result.items)) {
    return success(res, {
      message: "Cola de reembolsos obtenida correctamente.",
      data: result.items,
      meta: {
        page: result.page,
        limit: result.limit,
        hasNextPage: Boolean(result.hasNextPage),
      },
    });
  }

  return success(res, {
    message: "Cola de reembolsos obtenida correctamente.",
    data: result,
  });
}

async function getRefundMetrics(req, res) {
  const eventId = req.query.eventId ? Number(req.query.eventId) : null;

  if (!req.query.eventId || !Number.isFinite(eventId) || eventId <= 0) {
    throw new ApiError(400, "El eventId enviado es invalido.");
  }

  const metrics = await reservationService.getRefundMetrics({ eventId }, req.user);
  return success(res, {
    message: "Metricas de reembolsos obtenidas correctamente.",
    data: metrics,
  });
}

async function startRefund(req, res) {
  const notes = req.body?.notes;
  const refund = await reservationService.startRefund(Number(req.params.id), { notes }, req.user);
  return success(res, {
    message: "Reembolso iniciado correctamente.",
    data: refund,
  });
}

async function completeRefund(req, res) {
  const notes = req.body?.notes;
  const reservation = await reservationService.completeRefund(Number(req.params.id), { notes }, req.user);
  return success(res, {
    message: "Reembolso completado correctamente.",
    data: reservation,
  });
}

async function rejectRefund(req, res) {
  const notes = req.body?.notes;
  const refund = await reservationService.rejectRefund(Number(req.params.id), { notes }, req.user);
  return success(res, {
    message: "Reembolso rechazado correctamente.",
    data: refund,
  });
}

async function retryRefund(req, res) {
  const notes = req.body?.notes;
  const refund = await reservationService.retryEventCancellationRefund(Number(req.params.id), { notes }, req.user);
  return success(res, {
    message: "Reembolso reprogramado correctamente.",
    data: refund,
  });
}

async function runRefundWorker(req, res) {
  const limit = req.body?.limit;
  const normalizedLimit = Number.isFinite(Number(limit)) && Number(limit) > 0 ? Math.min(Number(limit), 50) : 8;
  const result = await reservationService.processEventCancellationRefundsBatch({ limit: normalizedLimit });
  return success(res, {
    message: "Worker ejecutado correctamente.",
    data: result,
  });
}

async function requestRefund(req, res) {
  const refund = await reservationService.requestRefund(Number(req.params.id), req.user);
  return success(res, {
    message: "Solicitud de reembolso registrada.",
    data: refund,
  });
}

async function listIssuedTickets(req, res) {
  const payload = await reservationService.getIssuedTicketsForCustomer(req.params.id, req.user);
  return success(res, {
    message: "Entradas emitidas obtenidas correctamente.",
    data: payload,
  });
}

async function downloadTicketsPdf(req, res) {
  const { reservation, issuedTickets } = await reservationService.getIssuedTicketsForCustomer(req.params.id, req.user);

  if (!Array.isArray(issuedTickets) || issuedTickets.length === 0) {
    throw new ApiError(409, "No hay entradas emitidas para descargar.");
  }

  const safeCode = reservation?.reservation_code || `RES-${reservation?.id || req.params.id}`;
  const fileName = `crowdpass-${safeCode}.pdf`;

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

  const doc = new PDFDocument({ size: "A4", margin: 48 });
  doc.pipe(res);

  const eventTitle = reservation?.event_title || `Evento #${reservation?.event_id || ""}`;
  const eventDate = reservation?.event_starts_at ? new Date(reservation.event_starts_at).toLocaleString() : "Fecha por confirmar";
  const purchaseDate = reservation?.reserved_at ? new Date(reservation.reserved_at).toLocaleString() : "";

  for (let index = 0; index < issuedTickets.length; index += 1) {
    const ticket = issuedTickets[index];
    const ticketNumber = index + 1;

    if (index > 0) {
      doc.addPage();
    }

    doc.fontSize(18).text("CROWDPASS", { align: "center" });
    doc.moveDown(0.6);
    doc.fontSize(16).text(eventTitle, { align: "center" });
    doc.moveDown(0.6);

    doc.fontSize(11).text(`Reserva: ${safeCode}`);
    doc.text(`Entrada: ${ticketNumber} de ${issuedTickets.length}`);
    doc.text(`Fecha del evento: ${eventDate}`);
    if (purchaseDate) {
      doc.text(`Fecha de compra: ${purchaseDate}`);
    }
    doc.moveDown(0.8);

    const ticketCode = ticket?.ticket_code || `TCK-${reservation?.id || req.params.id}-${ticketNumber}`;
    doc.fontSize(12).text(`Codigo de entrada: ${ticketCode}`);

    const qrContent = String(ticket?.qr_code || ticketCode);
    const qrBuffer = await QRCode.toBuffer(qrContent, {
      type: "png",
      errorCorrectionLevel: "M",
      margin: 1,
      scale: 8,
    });

    const qrTop = doc.y + 12;
    doc.image(qrBuffer, doc.page.margins.left, qrTop, { width: 220 });
    doc.fontSize(10).text("Escanea este QR en el control de acceso.", doc.page.margins.left + 240, qrTop + 24, {
      width: 260,
    });

    const attendeeName = ticket?.attendee_name ? String(ticket.attendee_name) : "";
    if (attendeeName) {
      doc.fontSize(11).text(`Asistente: ${attendeeName}`, doc.page.margins.left + 240, qrTop + 60, { width: 260 });
    }

    doc.moveDown(14);
    doc.fontSize(9).fillColor("#667085").text("Este documento es valido solo para la reserva indicada.", { align: "center" });
    doc.fillColor("#000000");
  }

  doc.end();
}

module.exports = {
  listReservations,
  getReservation,
  createReservation,
  cancelReservation,
  listRefundQueue,
  getRefundMetrics,
  startRefund,
  completeRefund,
  rejectRefund,
  retryRefund,
  runRefundWorker,
  requestRefund,
  listIssuedTickets,
  downloadTicketsPdf,
  deleteReservation,
};
