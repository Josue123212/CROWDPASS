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
    (
      SELECT p.card_snapshot_masked
      FROM payments p
      WHERE p.reservation_id = r.id
      LIMIT 1
    ) AS card_snapshot_masked,
    (
      SELECT rf.status
      FROM refunds rf
      WHERE rf.reservation_id = r.id
      ORDER BY rf.requested_at DESC, rf.id DESC
      LIMIT 1
    ) AS refund_status,
    (
      SELECT rf.refund_type
      FROM refunds rf
      WHERE rf.reservation_id = r.id
      ORDER BY rf.requested_at DESC, rf.id DESC
      LIMIT 1
    ) AS refund_type,
    (
      SELECT rf.notes
      FROM refunds rf
      WHERE rf.reservation_id = r.id
      ORDER BY rf.requested_at DESC, rf.id DESC
      LIMIT 1
    ) AS refund_notes,
    r.installment_count,
    r.is_refundable_purchase,
    r.reserved_at,
    r.expires_at,
    r.payment_completed_at,
    r.cancelled_at,
    r.expired_at,
    u.full_name AS user_full_name,
    u.email AS user_email,
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
  JOIN users u ON u.id = r.user_id
  JOIN events e ON e.id = r.event_id
  LEFT JOIN reservation_items ri ON ri.reservation_id = r.id
`;

async function listReservations() {
  const result = await db.query(
    `${RESERVATION_SELECT}
     GROUP BY r.id, u.id, e.id
     ORDER BY r.reserved_at DESC`
  );

  return result.rows;
}

async function listReservationsByUser(userId) {
  const result = await db.query(
    `${RESERVATION_SELECT}
     WHERE r.user_id = $1
     GROUP BY r.id, u.id, e.id
     ORDER BY r.reserved_at DESC`,
    [userId]
  );

  return result.rows;
}

async function findReservationById(id, client = null) {
  const result = await db.query(
    `${RESERVATION_SELECT}
     WHERE r.id = $1
     GROUP BY r.id, u.id, e.id`,
    [id],
    client || undefined
  );

  return result.rows[0] || null;
}

async function findReservationByRequestKey(userId, requestKey, client = null) {
  const result = await db.query(
    `${RESERVATION_SELECT}
     WHERE r.user_id = $1
       AND r.request_key = $2
     GROUP BY r.id, u.id, e.id`,
    [userId, requestKey],
    client || undefined
  );

  return result.rows[0] || null;
}

async function findReservationRecordByIdForUpdate(id, client) {
  const result = await db.query(
    `SELECT id,
            user_id,
            event_id,
            quantity,
            subtotal_amount,
            discount_amount,
            total_amount,
            status,
            payment_status,
            expires_at,
            expired_at,
            is_refundable_purchase
     FROM reservations
     WHERE id = $1
     FOR UPDATE`,
    [id],
    client
  );

  return result.rows[0] || null;
}

async function findExpiredPendingReservationsForUpdate(filters = {}, client) {
  const { eventId = null, userId = null, reservationId = null } = filters;
  const values = [];
  const conditions = [
    `status = 'pending_payment'`,
    `payment_status = 'pending'`,
    `expired_at IS NULL`,
    `expires_at IS NOT NULL`,
    `expires_at <= NOW()`,
  ];

  if (eventId !== null) {
    values.push(eventId);
    conditions.push(`event_id = $${values.length}`);
  }

  if (userId !== null) {
    values.push(userId);
    conditions.push(`user_id = $${values.length}`);
  }

  if (reservationId !== null) {
    values.push(reservationId);
    conditions.push(`id = $${values.length}`);
  }

  const result = await db.query(
    `SELECT id,
            user_id,
            event_id,
            quantity,
            total_amount,
            status,
            payment_status,
            expires_at,
            expired_at,
            is_refundable_purchase
     FROM reservations
     WHERE ${conditions.join("\n       AND ")}
     ORDER BY expires_at ASC, id ASC
     FOR UPDATE SKIP LOCKED`,
    values,
    client
  );

  return result.rows;
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

async function lockDiscountCodeForTicket(eventId, code, ticketTypeId, client) {
  const result = await db.query(
    `SELECT dc.id,
            dc.code,
            dc.discount_type,
            dc.discount_value,
            dc.usage_limit,
            dc.starts_at,
            dc.ends_at,
            dc.applies_to_all_tickets
     FROM discount_codes dc
     LEFT JOIN discount_code_ticket_types dctt
       ON dctt.discount_code_id = dc.id
     WHERE dc.event_id = $1
       AND dc.code = $2
       AND dc.is_active = TRUE
       AND (
         dc.applies_to_all_tickets = TRUE
         OR dctt.ticket_type_id = $3
       )
     GROUP BY dc.id
     FOR UPDATE OF dc`,
    [eventId, code, ticketTypeId],
    client
  );

  return result.rows[0] || null;
}

async function countActiveReservationsByDiscountCode(discountCodeId, client = null) {
  const result = await db.query(
    `SELECT COUNT(r.id)::int AS total
     FROM reservations r
     WHERE r.discount_code_id = $1
       AND r.status IN ('confirmed', 'pending_payment')`,
    [discountCodeId],
    client || undefined
  );

  return result.rows[0]?.total || 0;
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
    requestKey,
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
    expiresInMinutes,
    paymentCompletedAt,
    shouldExpire,
  } = reservationData;

  const result = await db.query(
    `INSERT INTO reservations (
       user_id,
       event_id,
       discount_code_id,
       request_key,
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
       expires_at,
       payment_completed_at
     )
     VALUES (
       $1,
       $2,
       $3,
       $4,
       $5,
       $6,
       $7,
       $8,
       $9,
       $10,
       $11,
       $12,
       $13,
       $14,
       $15,
       CASE WHEN $18 THEN (NOW() + ($16::int * INTERVAL '1 minute'))::timestamp ELSE NULL END,
       $17
     )
     RETURNING id`,
    [
      userId,
      eventId,
      discountCodeId,
      requestKey,
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
      expiresInMinutes,
      paymentCompletedAt || null,
      Boolean(shouldExpire),
    ],
    client
  );

  return result.rows[0];
}

async function findReservationItemsByReservationId(reservationId, client = null) {
  const result = await db.query(
    `SELECT id,
            reservation_id,
            ticket_type_id,
            quantity,
            unit_price,
            discount_amount,
            total_amount
     FROM reservation_items
     WHERE reservation_id = $1
     ORDER BY id ASC`,
    [reservationId],
    client || undefined
  );

  return result.rows;
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

async function countIssuedTicketsByReservationId(reservationId, client) {
  const result = await db.query(
    `SELECT COUNT(*)::int AS total
     FROM issued_tickets
     WHERE reservation_id = $1`,
    [reservationId],
    client
  );

  return result.rows[0]?.total || 0;
}

async function listIssuedTicketsByReservationId(reservationId, client = null) {
  const result = await db.query(
    `SELECT id,
            reservation_id,
            event_id,
            ticket_type_id,
            qr_code,
            ticket_code,
            status,
            attendee_name,
            attendee_document_number,
            checked_in_at,
            created_at
     FROM issued_tickets
     WHERE reservation_id = $1
     ORDER BY id ASC`,
    [reservationId],
    client || undefined
  );

  return result.rows;
}

async function createEventCancellationRefundRequests(eventId, { notes } = {}, client) {
  const normalizedNotes = String(notes || "").trim() || null;
  const result = await db.query(
    `WITH inserted AS (
       INSERT INTO refunds (
         reservation_id,
         payment_id,
         refund_type,
         status,
         amount,
         penalty_amount,
         requested_at,
         notes
       )
       SELECT r.id,
              p.id,
              'event_cancelled',
              'pending',
              r.total_amount,
              0,
              NOW(),
              $2
       FROM reservations r
       JOIN payments p ON p.reservation_id = r.id
       WHERE r.event_id = $1
         AND r.payment_status IN ('simulated_paid', 'completed')
         AND r.payment_status <> 'refunded'
         AND r.status IN ('confirmed', 'cancelled')
         AND NOT EXISTS (
           SELECT 1
           FROM refunds rf
           WHERE rf.reservation_id = r.id
             AND rf.refund_type = 'event_cancelled'
             AND rf.status IN ('pending', 'processing', 'completed')
         )
       RETURNING 1
     )
     SELECT COUNT(*)::int AS total
     FROM inserted`,
    [eventId, normalizedNotes],
    client
  );

  return result.rows[0]?.total || 0;
}

async function claimPendingEventCancellationRefunds(limit = 10, client) {
  const normalizedLimit = Number(limit) > 0 ? Number(limit) : 10;
  const result = await db.query(
    `WITH claimed AS (
       SELECT rf.id
       FROM refunds rf
       JOIN reservations r ON r.id = rf.reservation_id
       JOIN events e ON e.id = r.event_id
       WHERE rf.refund_type = 'event_cancelled'
         AND rf.status = 'pending'
         AND e.status = 'cancelled'
       ORDER BY rf.requested_at ASC, rf.id ASC
       LIMIT $1
       FOR UPDATE OF rf SKIP LOCKED
     )
     UPDATE refunds rf
     SET status = 'processing'
     FROM claimed
     WHERE rf.id = claimed.id
     RETURNING rf.id, rf.reservation_id, rf.payment_id`,
    [normalizedLimit],
    client
  );

  return result.rows;
}

async function claimNextEventCancellationRefundForProcessing(client) {
  const result = await db.query(
    `WITH next AS (
       SELECT rf.id, rf.reservation_id, rf.payment_id
       FROM refunds rf
       JOIN reservations r ON r.id = rf.reservation_id
       JOIN events e ON e.id = r.event_id
       WHERE rf.refund_type = 'event_cancelled'
         AND rf.status = 'pending'
         AND e.status = 'cancelled'
       ORDER BY rf.requested_at ASC, rf.id ASC
       LIMIT 1
       FOR UPDATE OF rf SKIP LOCKED
     )
     UPDATE refunds rf
     SET status = 'processing'
     FROM next
     WHERE rf.id = next.id
     RETURNING rf.id, next.reservation_id, next.payment_id`,
    [],
    client
  );

  return result.rows[0] || null;
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
    paidAt,
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
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
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
      paidAt || null,
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

async function findPaymentByIdForUpdate(paymentId, client) {
  const result = await db.query(
    `SELECT id,
            reservation_id,
            method,
            status,
            gross_amount,
            paid_at
     FROM payments
     WHERE id = $1
     FOR UPDATE`,
    [paymentId],
    client
  );

  return result.rows[0] || null;
}

async function markPaymentCompleted(paymentId, client) {
  const result = await db.query(
    `UPDATE payments
     SET status = 'completed',
         paid_at = COALESCE(paid_at, NOW()),
         updated_at = NOW()
     WHERE id = $1
     RETURNING id`,
    [paymentId],
    client
  );

  return result.rows[0] || null;
}

async function attachWalletCardToPayment(paymentId, { walletCardId, cardSnapshotMasked }, client) {
  const result = await db.query(
    `UPDATE payments
     SET wallet_card_id = $2,
         card_snapshot_masked = $3,
         updated_at = NOW()
     WHERE id = $1
     RETURNING id`,
    [paymentId, walletCardId || null, cardSnapshotMasked || null],
    client
  );

  return result.rows[0] || null;
}

async function markPaymentStatus(paymentId, status, client) {
  const result = await db.query(
    `UPDATE payments
     SET status = $2,
         updated_at = NOW()
     WHERE id = $1
     RETURNING id`,
    [paymentId, status],
    client
  );

  return result.rows[0] || null;
}

async function markPaymentInstallmentsPaid(paymentId, client) {
  await db.query(
    `UPDATE payment_installments
     SET status = 'paid',
         paid_at = COALESCE(paid_at, NOW())
     WHERE payment_id = $1
       AND status <> 'paid'`,
    [paymentId],
    client
  );
}

async function markReservationPaymentCompleted(reservationId, paymentStatus, client) {
  const result = await db.query(
    `UPDATE reservations
     SET status = 'confirmed',
         payment_status = $2,
         payment_completed_at = COALESCE(payment_completed_at, NOW())
     WHERE id = $1
     RETURNING id`,
    [reservationId, paymentStatus],
    client
  );

  return result.rows[0] || null;
}

async function markReservationPaymentFailed(reservationId, client) {
  const result = await db.query(
    `UPDATE reservations
     SET payment_status = 'failed'
     WHERE id = $1
     RETURNING id`,
    [reservationId],
    client
  );

  return result.rows[0] || null;
}

async function markReservationCancelled(id, paymentStatus, client) {
  const result = await db.query(
    `UPDATE reservations
     SET status = 'cancelled',
         payment_status = $2,
         cancelled_at = NOW()
     WHERE id = $1
     RETURNING id`,
    [id, paymentStatus],
    client
  );

  return result.rows[0] || null;
}

async function markReservationExpired(id, client) {
  const result = await db.query(
    `UPDATE reservations
     SET status = 'cancelled',
         payment_status = 'failed',
         cancelled_at = COALESCE(cancelled_at, NOW()),
         expired_at = COALESCE(expired_at, NOW())
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

async function markPaymentRefunded(reservationId, status = "refunded", client) {
  await db.query(
    `UPDATE payments
     SET status = $2,
         updated_at = NOW()
     WHERE reservation_id = $1`,
    [reservationId, status],
    client
  );
}

async function markReservationCancelledForRefundStart(id, client) {
  const result = await db.query(
    `UPDATE reservations
     SET status = 'cancelled',
         cancelled_at = COALESCE(cancelled_at, NOW())
     WHERE id = $1
     RETURNING id`,
    [id],
    client
  );

  return result.rows[0] || null;
}

async function markReservationRefunded(id, client) {
  const result = await db.query(
    `UPDATE reservations
     SET status = 'refunded',
         payment_status = 'refunded'
     WHERE id = $1
     RETURNING id`,
    [id],
    client
  );

  return result.rows[0] || null;
}

async function markIssuedTicketsRefunded(reservationId, client) {
  await db.query(
    `UPDATE issued_tickets
     SET status = 'refunded',
         updated_at = NOW()
     WHERE reservation_id = $1`,
    [reservationId],
    client
  );
}

async function findLatestRefundByReservationId(reservationId, client = null) {
  const result = await db.query(
    `SELECT id,
            reservation_id,
            payment_id,
            refund_type,
            status,
            amount,
            penalty_amount,
            requested_at,
            processed_at,
            notes
     FROM refunds
     WHERE reservation_id = $1
     ORDER BY requested_at DESC, id DESC
     LIMIT 1`,
    [reservationId],
    client || undefined
  );

  return result.rows[0] || null;
}

async function createRefundRecord(refundData, client) {
  const { reservationId, paymentId, refundType, status, amount, penaltyAmount, notes } = refundData;
  const normalizedStatus = status || "pending";
  const shouldSetProcessedAt = normalizedStatus === "completed" || normalizedStatus === "rejected";
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
     VALUES ($1, CAST($2 AS INTEGER), $3, $4, CAST($5 AS NUMERIC), CAST($6 AS NUMERIC), ${shouldSetProcessedAt ? "NOW()" : "NULL"}, $7)
     RETURNING id`,
    [reservationId, paymentId, refundType, normalizedStatus, amount, penaltyAmount, notes || null],
    client
  );

  return result.rows[0] || null;
}

async function updateRefundStatus(refundId, { status, notes }, client) {
  const normalizedStatus = status || "pending";
  const shouldSetProcessedAt = normalizedStatus === "completed" || normalizedStatus === "rejected";
  const result = await db.query(
    `UPDATE refunds
     SET status = $2,
         processed_at = ${shouldSetProcessedAt ? "COALESCE(processed_at, NOW())" : "processed_at"},
         notes = COALESCE($3, notes)
     WHERE id = $1
     RETURNING id`,
    [refundId, normalizedStatus, notes || null],
    client
  );

  return result.rows[0] || null;
}

async function resetRefundToPending(refundId, { notes } = {}, client) {
  const normalizedNotes = String(notes || "").trim() || null;
  const result = await db.query(
    `UPDATE refunds
     SET status = 'pending',
         processed_at = NULL,
         notes = COALESCE($2, notes)
     WHERE id = $1
     RETURNING id`,
    [refundId, normalizedNotes],
    client
  );

  return result.rows[0] || null;
}

async function listRefundQueue(filters = {}, client = null) {
  const { eventId = null, staffUserId = null, refundType = null, refundStatus = null, limit = null, offset = null } = filters;
  const params = [];
  const conditions = [];

  if (eventId !== null) {
    params.push(eventId);
    conditions.push(`r.event_id = $${params.length}`);
  }

  if (refundType !== null) {
    params.push(refundType);
    conditions.push(`rf_latest.id IS NOT NULL`);
    conditions.push(`rf_latest.refund_type = $${params.length}`);
    conditions.push(`r.status IN ('confirmed', 'cancelled', 'refunded')`);
    conditions.push(`r.payment_status IN ('simulated_paid', 'completed', 'refunded')`);

    if (refundStatus !== null) {
      params.push(refundStatus);
      conditions.push(`rf_latest.status = $${params.length}`);

      if (refundStatus !== "completed") {
        conditions.push(`r.payment_status <> 'refunded'`);
        conditions.push(`r.status <> 'refunded'`);
      }
    }
  } else {
    conditions.push(`e.status IN ('paused', 'cancelled')`);
    conditions.push(`r.status IN ('confirmed', 'cancelled')`);
    conditions.push(`r.payment_status IN ('simulated_paid', 'completed')`);

    if (refundStatus !== null) {
      params.push(refundStatus);
      conditions.push(`rf_latest.status = $${params.length}`);
    } else {
      conditions.push(`NOT EXISTS (SELECT 1 FROM refunds rf2 WHERE rf2.reservation_id = r.id AND rf2.status = 'completed')`);
    }
  }

  if (staffUserId !== null) {
    params.push(staffUserId);
    conditions.push(
      `(
        EXISTS (SELECT 1 FROM event_staff_assignments esa WHERE esa.event_id = r.event_id AND esa.user_id = $${params.length})
        OR NOT EXISTS (SELECT 1 FROM event_staff_assignments esa2 WHERE esa2.event_id = r.event_id)
      )`
    );
  }

  let paginationSql = "";
  if (limit !== null && offset !== null) {
    params.push(Number(limit));
    params.push(Number(offset));
    paginationSql = `\n     LIMIT $${params.length - 1} OFFSET $${params.length}`;
  }

  const result = await db.query(
    `SELECT r.id,
            r.user_id,
            r.event_id,
            r.reservation_code,
            r.quantity,
            r.total_amount,
            r.status,
            r.payment_status,
            r.payment_method,
            r.reserved_at,
            r.cancelled_at,
            u.full_name AS user_full_name,
            u.email AS user_email,
            e.title AS event_title,
             e.starts_at AS event_starts_at,
            e.status AS event_status,
            e.visibility AS event_visibility,
            p.status AS payment_record_status,
            rf_latest.refund_type AS refund_type,
            rf_latest.status AS refund_status,
            rf_latest.amount AS refund_amount,
            rf_latest.penalty_amount AS refund_penalty_amount,
            rf_latest.requested_at AS refund_requested_at,
            rf_latest.processed_at AS refund_processed_at,
            rf_latest.notes AS refund_notes
     FROM reservations r
     JOIN users u ON u.id = r.user_id
     JOIN events e ON e.id = r.event_id
     LEFT JOIN payments p ON p.reservation_id = r.id
     LEFT JOIN LATERAL (
       SELECT rf.id,
              rf.refund_type,
              rf.status,
              rf.amount,
              rf.penalty_amount,
              rf.requested_at,
              rf.processed_at,
              rf.notes
       FROM refunds rf
       WHERE rf.reservation_id = r.id
       ORDER BY rf.requested_at DESC, rf.id DESC
       LIMIT 1
     ) rf_latest ON TRUE
     WHERE ${conditions.join("\n       AND ")}
     ORDER BY COALESCE(rf_latest.requested_at, r.reserved_at) ASC, r.id ASC${paginationSql}`,
    params,
    client || undefined
  );

  return result.rows;
}

async function resetRejectedEventCancellationRefundsToPending(eventId, { limit = 50, notes } = {}, client) {
  const normalizedLimit = Number(limit) > 0 ? Math.min(Number(limit), 200) : 50;
  const normalizedNotes = String(notes || "").trim() || null;
  const result = await db.query(
    `WITH candidates AS (
       SELECT rf.id
       FROM refunds rf
       JOIN reservations r ON r.id = rf.reservation_id
       WHERE r.event_id = $1
         AND rf.refund_type = 'event_cancelled'
         AND rf.status = 'rejected'
       ORDER BY rf.processed_at DESC NULLS LAST, rf.id DESC
       LIMIT $2
       FOR UPDATE OF rf SKIP LOCKED
     )
     UPDATE refunds rf
     SET status = 'pending',
         processed_at = NULL,
         notes = COALESCE($3, rf.notes)
     FROM candidates
     WHERE rf.id = candidates.id
     RETURNING rf.id`,
    [Number(eventId), normalizedLimit, normalizedNotes],
    client
  );

  return { updated: result.rowCount || 0 };
}

async function isStaffAssignedToEvent(eventId, userId, client = null) {
  const result = await db.query(
    `SELECT 1
     FROM event_staff_assignments
     WHERE event_id = $1
       AND user_id = $2
     LIMIT 1`,
    [eventId, userId],
    client || undefined
  );

  return Boolean(result.rows[0]);
}

async function listStaffUserIdsByEvent(eventId, client = null) {
  const result = await db.query(
    `SELECT user_id
     FROM event_staff_assignments
     WHERE event_id = $1`,
    [Number(eventId)],
    client || undefined
  );

  return (result.rows || []).map((row) => Number(row.user_id)).filter(Boolean);
}

async function countCapturedPaymentsForEvent(eventId, client = null) {
  const result = await db.query(
    `SELECT COUNT(*)::int AS total
     FROM reservations
     WHERE event_id = $1
       AND payment_status IN ('simulated_paid', 'completed')`,
    [eventId],
    client || undefined
  );

  return result.rows[0]?.total || 0;
}

async function getRefundMetricsByEvent(eventId, client = null) {
  const capturedPaymentsResult = await db.query(
    `SELECT COUNT(*)::int AS total
     FROM reservations
     WHERE event_id = $1
       AND payment_status IN ('simulated_paid', 'completed')`,
    [eventId],
    client || undefined
  );

  const refundedPaymentsResult = await db.query(
    `SELECT COUNT(*)::int AS total
     FROM reservations
     WHERE event_id = $1
       AND payment_status = 'refunded'`,
    [eventId],
    client || undefined
  );

  const refundsByStatusResult = await db.query(
    `SELECT rf.status,
            COUNT(*)::int AS total,
            COALESCE(SUM(rf.amount), 0)::numeric AS amount_total
     FROM refunds rf
     JOIN reservations r ON r.id = rf.reservation_id
     WHERE r.event_id = $1
     GROUP BY rf.status`,
    [eventId],
    client || undefined
  );

  const refundByStatus = refundsByStatusResult.rows.reduce(
    (acc, row) => {
      acc[row.status] = {
        total: row.total,
        amountTotal: Number(row.amount_total || 0),
      };
      return acc;
    },
    { pending: { total: 0, amountTotal: 0 }, processing: { total: 0, amountTotal: 0 }, completed: { total: 0, amountTotal: 0 }, rejected: { total: 0, amountTotal: 0 } }
  );

  return {
    capturedPaymentsPendingRefund: capturedPaymentsResult.rows[0]?.total || 0,
    refundedPayments: refundedPaymentsResult.rows[0]?.total || 0,
    refunds: refundByStatus,
  };
}

async function listAffectedCustomersByEvent(eventId, client = null) {
  const result = await db.query(
    `SELECT r.id AS reservation_id,
            r.reservation_code,
            r.user_id,
            u.full_name AS user_full_name,
            u.email AS user_email,
            r.quantity,
            r.total_amount,
            r.status AS reservation_status,
            r.payment_status,
            r.reserved_at
     FROM reservations r
     JOIN users u ON u.id = r.user_id
     WHERE r.event_id = $1
       AND r.payment_status IN ('simulated_paid', 'completed')
       AND r.status IN ('confirmed', 'cancelled')
     ORDER BY r.reserved_at ASC, r.id ASC`,
    [eventId],
    client || undefined
  );

  return result.rows;
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
  findReservationByRequestKey,
  findReservationRecordByIdForUpdate,
  findExpiredPendingReservationsForUpdate,
  findActiveReservationCountByUserAndTicketType,
  lockDiscountCodeForTicket,
  countActiveReservationsByDiscountCode,
  findTicketTypeById,
  findFirstActiveTicketTypeByEvent,
  createReservation,
  createReservationItem,
  findReservationItemsByReservationId,
  createIssuedTicket,
  countIssuedTicketsByReservationId,
  listIssuedTicketsByReservationId,
  createEventCancellationRefundRequests,
  claimPendingEventCancellationRefunds,
  claimNextEventCancellationRefundForProcessing,
  createPayment,
  createPaymentInstallment,
  findPaymentByIdForUpdate,
  markPaymentCompleted,
  attachWalletCardToPayment,
  markPaymentStatus,
  markPaymentInstallmentsPaid,
  markReservationPaymentCompleted,
  markReservationPaymentFailed,
  markReservationCancelled,
  markReservationCancelledForRefundStart,
  markReservationRefunded,
  markReservationExpired,
  markIssuedTicketsCancelled,
  markIssuedTicketsRefunded,
  markPaymentRefunded,
  findLatestRefundByReservationId,
  createRefundRecord,
  updateRefundStatus,
  resetRefundToPending,
  listRefundQueue,
  resetRejectedEventCancellationRefundsToPending,
  isStaffAssignedToEvent,
  listStaffUserIdsByEvent,
  countCapturedPaymentsForEvent,
  getRefundMetricsByEvent,
  listAffectedCustomersByEvent,
  createRefund,
  findPaymentByReservationId,
  deleteReservation,
};
