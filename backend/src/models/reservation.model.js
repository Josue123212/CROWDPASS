const db = require("../config/db");

const RESERVATION_SELECT = `
  SELECT
    r.id,
    r.user_id,
    r.event_id,
    r.discount_code_id,
    r.reservation_code,
    r.quantity,
    r.subtotal_amount,
    r.discount_amount,
    r.refundable_fee,
    r.total_amount,
    r.status,
    r.payment_status,
    r.payment_method,
    r.installment_count,
    r.is_refundable_purchase,
    r.reserved_at,
    r.payment_completed_at,
    r.cancelled_at,
    e.title AS event_title,
    e.starts_at AS event_starts_at,
    e.ends_at AS event_ends_at,
    COALESCE(
      JSON_AGG(
        JSON_BUILD_OBJECT(
          'id', ri.id,
          'ticket_type_id', ri.ticket_type_id,
          'quantity', ri.quantity,
          'unit_price', ri.unit_price,
          'discount_amount', ri.discount_amount,
          'total_amount', ri.total_amount
        )
      ) FILTER (WHERE ri.id IS NOT NULL),
      '[]'::json
    ) AS items
  FROM reservations r
  JOIN events e ON e.id = r.event_id
  LEFT JOIN reservation_items ri ON ri.reservation_id = r.id
`;

async function listReservations() {
  const result = await db.query(
    `${RESERVATION_SELECT}
     GROUP BY r.id, e.id
     ORDER BY r.reserved_at DESC`
  );

  return result.rows;
}

async function listReservationsByUser(userId) {
  const result = await db.query(
    `${RESERVATION_SELECT}
     WHERE r.user_id = $1
     GROUP BY r.id, e.id
     ORDER BY r.reserved_at DESC`,
    [userId]
  );

  return result.rows;
}

async function findReservationById(id, client = null) {
  const result = await db.query(
    `${RESERVATION_SELECT}
     WHERE r.id = $1
     GROUP BY r.id, e.id`,
    [id],
    client || undefined
  );

  return result.rows[0] || null;
}

async function findActiveReservationCountByUserAndTicketType(userId, ticketTypeId, client = null) {
  const result = await db.query(
    `SELECT COALESCE(SUM(ri.quantity), 0)::int AS total
     FROM reservation_items ri
     JOIN reservations r ON r.id = ri.reservation_id
     WHERE r.user_id = $1
       AND ri.ticket_type_id = $2
       AND r.status IN ('confirmed', 'pending_payment')`,
    [userId, ticketTypeId],
    client || undefined
  );

  return result.rows[0]?.total || 0;
}

async function findDiscountCodeForTicket(eventId, code, ticketTypeId, client = null) {
  const result = await db.query(
    `SELECT dc.id,
            dc.code,
            dc.discount_type,
            dc.discount_value,
            dc.usage_limit,
            dc.starts_at,
            dc.ends_at,
            dc.applies_to_all_tickets,
            COUNT(r.id)::int AS used_count
     FROM discount_codes dc
     LEFT JOIN reservations r
       ON r.discount_code_id = dc.id
      AND r.status IN ('confirmed', 'pending_payment')
     LEFT JOIN discount_code_ticket_types dctt
       ON dctt.discount_code_id = dc.id
     WHERE dc.event_id = $1
       AND dc.code = $2
       AND dc.is_active = TRUE
       AND (
         dc.applies_to_all_tickets = TRUE
         OR dctt.ticket_type_id = $3
       )
     GROUP BY dc.id`,
    [eventId, code, ticketTypeId],
    client || undefined
  );

  return result.rows[0] || null;
}

async function findTicketTypeById(ticketTypeId, client = null) {
  const result = await db.query(
    `SELECT id,
            event_id,
            name,
            currency,
            price,
            stock_total,
            stock_available,
            sales_starts_at,
            sales_ends_at,
            sales_end_mode,
            max_per_order,
            max_per_user,
            is_active
     FROM event_ticket_types
     WHERE id = $1`,
    [ticketTypeId],
    client || undefined
  );

  return result.rows[0] || null;
}

async function findFirstActiveTicketTypeByEvent(eventId, client = null) {
  const result = await db.query(
    `SELECT id,
            event_id,
            name,
            currency,
            price,
            stock_total,
            stock_available,
            sales_starts_at,
            sales_ends_at,
            sales_end_mode,
            max_per_order,
            max_per_user,
            is_active
     FROM event_ticket_types
     WHERE event_id = $1
       AND is_active = TRUE
     ORDER BY id ASC
     LIMIT 1`,
    [eventId],
    client || undefined
  );

  return result.rows[0] || null;
}

async function createReservation(reservationData, client) {
  const {
    userId,
    eventId,
    discountCodeId,
    reservationCode,
    quantity,
    subtotalAmount,
    discountAmount,
    refundableFee,
    totalAmount,
    status,
    paymentStatus,
    paymentMethod,
    installmentCount,
    isRefundablePurchase,
  } = reservationData;

  const result = await db.query(
    `INSERT INTO reservations (
       user_id,
       event_id,
       discount_code_id,
       reservation_code,
       quantity,
       subtotal_amount,
       discount_amount,
       refundable_fee,
       total_amount,
       status,
       payment_status,
       payment_method,
       installment_count,
       is_refundable_purchase,
       payment_completed_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, CASE WHEN $11 IN ('simulated_paid', 'completed') THEN NOW() ELSE NULL END)
     RETURNING id`,
    [
      userId,
      eventId,
      discountCodeId,
      reservationCode,
      quantity,
      subtotalAmount,
      discountAmount,
      refundableFee,
      totalAmount,
      status,
      paymentStatus,
      paymentMethod,
      installmentCount,
      isRefundablePurchase,
    ],
    client
  );

  return result.rows[0];
}

async function createReservationItem(reservationItemData, client) {
  const { reservationId, ticketTypeId, quantity, unitPrice, discountAmount, totalAmount } = reservationItemData;
  const result = await db.query(
    `INSERT INTO reservation_items (
       reservation_id,
       ticket_type_id,
       quantity,
       unit_price,
       discount_amount,
       total_amount
     )
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [reservationId, ticketTypeId, quantity, unitPrice, discountAmount, totalAmount],
    client
  );

  return result.rows[0];
}

async function createIssuedTicket(ticketData, client) {
  const {
    reservationItemId,
    reservationId,
    eventId,
    ticketTypeId,
    ownerUserId,
    qrCode,
    ticketCode,
    attendeeName,
    attendeeDocumentNumber,
  } = ticketData;
  const result = await db.query(
    `INSERT INTO issued_tickets (
       reservation_item_id,
       reservation_id,
       event_id,
       ticket_type_id,
       owner_user_id,
       qr_code,
       ticket_code,
       attendee_name,
       attendee_document_number
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id`,
    [
      reservationItemId,
      reservationId,
      eventId,
      ticketTypeId,
      ownerUserId,
      qrCode,
      ticketCode,
      attendeeName,
      attendeeDocumentNumber,
    ],
    client
  );

  return result.rows[0];
}

async function createPayment(paymentData, client) {
  const {
    reservationId,
    method,
    status,
    grossAmount,
    platformFee,
    additionalFee,
    netAmount,
    transactionReference,
    installmentCount,
  } = paymentData;
  const result = await db.query(
    `INSERT INTO payments (
       reservation_id,
       method,
       status,
       gross_amount,
       platform_fee,
       additional_fee,
       net_amount,
       transaction_reference,
       installment_count,
       paid_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CASE WHEN $3 = 'completed' THEN NOW() ELSE NULL END)
     RETURNING id`,
    [
      reservationId,
      method,
      status,
      grossAmount,
      platformFee,
      additionalFee,
      netAmount,
      transactionReference,
      installmentCount,
    ],
    client
  );

  return result.rows[0];
}

async function createPaymentInstallment(installmentData, client) {
  const { paymentId, installmentNumber, amount, status, dueAt, paidAt } = installmentData;
  const result = await db.query(
    `INSERT INTO payment_installments (
       payment_id,
       installment_number,
       amount,
       status,
       due_at,
       paid_at
     )
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [paymentId, installmentNumber, amount, status, dueAt, paidAt],
    client
  );

  return result.rows[0];
}

async function markReservationCancelled(id, client) {
  const result = await db.query(
    `UPDATE reservations
     SET status = 'cancelled',
         payment_status = 'refunded',
         cancelled_at = NOW()
     WHERE id = $1
     RETURNING id`,
    [id],
    client
  );

  return result.rows[0] || null;
}

async function markIssuedTicketsCancelled(reservationId, client) {
  await db.query(
    `UPDATE issued_tickets
     SET status = 'cancelled',
         updated_at = NOW()
     WHERE reservation_id = $1`,
    [reservationId],
    client
  );
}

async function markPaymentRefunded(reservationId, client) {
  await db.query(
    `UPDATE payments
     SET status = 'refunded',
         updated_at = NOW()
     WHERE reservation_id = $1`,
    [reservationId],
    client
  );
}

async function createRefund(refundData, client) {
  const { reservationId, paymentId, refundType, amount, penaltyAmount, notes } = refundData;
  const result = await db.query(
    `INSERT INTO refunds (
       reservation_id,
       payment_id,
       refund_type,
       status,
       amount,
       penalty_amount,
       processed_at,
       notes
     )
     VALUES ($1, $2, $3, 'completed', $4, $5, NOW(), $6)
     RETURNING id`,
    [reservationId, paymentId, refundType, amount, penaltyAmount, notes],
    client
  );

  return result.rows[0];
}

async function findPaymentByReservationId(reservationId, client = null) {
  const result = await db.query(
    `SELECT id, reservation_id, status
     FROM payments
     WHERE reservation_id = $1`,
    [reservationId],
    client || undefined
  );

  return result.rows[0] || null;
}

async function deleteReservation(id) {
  const result = await db.query("DELETE FROM reservations WHERE id = $1 RETURNING id", [id]);
  return result.rows[0] || null;
}

module.exports = {
  listReservations,
  listReservationsByUser,
  findReservationById,
  findActiveReservationCountByUserAndTicketType,
  findDiscountCodeForTicket,
  findTicketTypeById,
  findFirstActiveTicketTypeByEvent,
  createReservation,
  createReservationItem,
  createIssuedTicket,
  createPayment,
  createPaymentInstallment,
  markReservationCancelled,
  markIssuedTicketsCancelled,
  markPaymentRefunded,
  createRefund,
  findPaymentByReservationId,
  deleteReservation,
};
