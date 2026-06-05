const db = require("../config/db");

const EVENT_SELECT = `
  SELECT
    e.id,
    e.organizer_id,
    e.category_id,
    e.title,
    e.description,
    e.additional_info,
    e.featured_image_url,
    e.promo_video_url,
    e.venue,
    e.event_date,
    e.starts_at,
    e.ends_at,
    e.visibility,
    e.age_restriction,
    e.country,
    e.city,
    e.address_line,
    e.address_reference,
    e.meeting_point,
    e.latitude,
    e.longitude,
    e.total_tickets,
    e.available_tickets,
    GREATEST(COALESCE(e.total_tickets, 0) - COALESCE(e.available_tickets, 0), 0) AS tickets_sold,
    CASE WHEN COALESCE(e.available_tickets, 0) <= 0 THEN TRUE ELSE FALSE END AS is_sold_out,
    e.price,
    e.status,
    e.rejection_reason,
    e.published_at,
    e.cancelled_at,
    e.created_at,
    e.updated_at,
    COALESCE((
      SELECT SUM(p.gross_amount)
      FROM payments p
      JOIN reservations r2 ON r2.id = p.reservation_id
      WHERE r2.event_id = e.id
        AND p.status = 'completed'
    ), 0) AS revenue_total,
    COALESCE((
      SELECT SUM(p.platform_fee)
      FROM payments p
      JOIN reservations r2 ON r2.id = p.reservation_id
      WHERE r2.event_id = e.id
        AND p.status = 'completed'
    ), 0) AS platform_revenue,
    COALESCE((
      SELECT SUM(p.net_amount)
      FROM payments p
      JOIN reservations r2 ON r2.id = p.reservation_id
      WHERE r2.event_id = e.id
        AND p.status = 'completed'
    ), 0) AS organizer_revenue,
    c.slug AS category_slug,
    c.name AS category_name,
    COALESCE(
      JSON_AGG(
        JSON_BUILD_OBJECT(
          'id', ett.id,
          'name', ett.name,
          'currency', ett.currency,
          'price', ett.price,
          'stock_total', ett.stock_total,
          'stock_available', ett.stock_available,
          'sales_starts_at', ett.sales_starts_at,
          'sales_ends_at', ett.sales_ends_at,
          'sales_end_mode', ett.sales_end_mode,
          'max_per_order', ett.max_per_order,
          'max_per_user', ett.max_per_user,
          'is_active', ett.is_active
        )
      ) FILTER (WHERE ett.id IS NOT NULL),
      '[]'::json
    ) AS ticket_types
  FROM events e
  LEFT JOIN event_categories c ON c.id = e.category_id
  LEFT JOIN event_ticket_types ett ON ett.event_id = e.id
`;

const EVENT_CHANGE_REQUEST_SELECT = `
  SELECT
    ecr.id,
    ecr.event_id,
    ecr.organizer_id,
    ecr.request_type,
    ecr.status,
    ecr.explanation,
    ecr.admin_response,
    ecr.proposed_payload,
    ecr.change_summary,
    ecr.attachments,
    ecr.reviewed_by_user_id,
    ecr.reviewed_at,
    ecr.created_at,
    ecr.updated_at,
    e.title AS event_title,
    e.status AS event_status,
    e.city AS event_city,
    e.featured_image_url,
    organizer.full_name AS organizer_name,
    organizer.email AS organizer_email,
    reviewer.full_name AS reviewer_name
  FROM event_change_requests ecr
  JOIN events e ON e.id = ecr.event_id
  LEFT JOIN users organizer ON organizer.id = ecr.organizer_id
  LEFT JOIN users reviewer ON reviewer.id = ecr.reviewed_by_user_id
`;

function buildPublicFilters(filters = {}) {
  const clauses = ["e.status IN ('published', 'active')", "e.visibility = 'public'"];
  const params = [];

  if (filters.category) {
    params.push(filters.category);
    clauses.push(`(c.slug = $${params.length} OR c.name ILIKE $${params.length})`);
  }

  if (filters.city) {
    params.push(`%${filters.city}%`);
    clauses.push(`e.city ILIKE $${params.length}`);
  }

  if (filters.venue) {
    params.push(`%${filters.venue}%`);
    clauses.push(`e.venue ILIKE $${params.length}`);
  }

  if (filters.query) {
    params.push(`%${filters.query}%`);
    clauses.push(`(e.title ILIKE $${params.length} OR COALESCE(e.description, '') ILIKE $${params.length})`);
  }

  if (filters.startDate) {
    params.push(filters.startDate);
    clauses.push(`e.starts_at >= $${params.length}`);
  }

  if (filters.endDate) {
    params.push(filters.endDate);
    clauses.push(`e.starts_at <= $${params.length}`);
  }

  if (typeof filters.minPrice === "number") {
    params.push(filters.minPrice);
    clauses.push(`e.price >= $${params.length}`);
  }

  if (typeof filters.maxPrice === "number") {
    params.push(filters.maxPrice);
    clauses.push(`e.price <= $${params.length}`);
  }

  if (filters.freeOnly) {
    clauses.push("e.price = 0");
  }

  return {
    whereClause: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "",
    params,
  };
}

function buildPublicEventsOrder(sort = "upcoming") {
  switch (sort) {
    case "price_asc":
      return "ORDER BY e.price ASC, COALESCE(e.starts_at, e.event_date) ASC";
    case "price_desc":
      return "ORDER BY e.price DESC, COALESCE(e.starts_at, e.event_date) ASC";
    case "upcoming":
    default:
      return "ORDER BY COALESCE(e.starts_at, e.event_date) ASC";
  }
}

async function listCategories() {
  const result = await db.query(
    `SELECT id, slug, name
     FROM event_categories
     WHERE is_active = TRUE
     ORDER BY name ASC`
  );

  return result.rows;
}

async function countPublicEvents(filters = {}) {
  const { whereClause, params } = buildPublicFilters(filters);
  const result = await db.query(
    `SELECT COUNT(*)::int AS total
     FROM events e
     LEFT JOIN event_categories c ON c.id = e.category_id
     ${whereClause}`,
    params
  );

  return result.rows[0]?.total || 0;
}

async function listPublicEvents(filters = {}, { limit, offset } = {}) {
  const { whereClause, params } = buildPublicFilters(filters);
  const orderClause = buildPublicEventsOrder(filters.sort);
  const paginationParams = [...params];
  let paginationClause = "";

  if (typeof limit === "number" && typeof offset === "number") {
    paginationParams.push(limit, offset);
    paginationClause = `LIMIT $${paginationParams.length - 1} OFFSET $${paginationParams.length}`;
  }

  const result = await db.query(
    `${EVENT_SELECT}
     ${whereClause}
     GROUP BY e.id, c.id
     ${orderClause}
     ${paginationClause}`,
    paginationParams
  );

  return result.rows;
}

async function listPendingReviewEvents() {
  const result = await db.query(
    `${EVENT_SELECT}
     WHERE e.status = 'pending_review'
     GROUP BY e.id, c.id
     ORDER BY e.created_at ASC`
  );

  return result.rows;
}

async function listAllEvents() {
  const result = await db.query(
    `${EVENT_SELECT}
     GROUP BY e.id, c.id
     ORDER BY COALESCE(e.starts_at, e.event_date) DESC, e.created_at DESC`
  );

  return result.rows;
}

async function listCancelledEventsWithRefundProgress({ limit = 20, offset = 0 } = {}) {
  const normalizedLimit = Number(limit) > 0 ? Math.min(Number(limit), 50) : 20;
  const normalizedOffset = Number(offset) >= 0 ? Number(offset) : 0;
  const result = await db.query(
    `SELECT e.id,
            e.title,
            e.starts_at,
            e.ends_at,
            e.city,
            e.country,
            e.cancelled_at,
            COUNT(DISTINCT r.id) FILTER (
              WHERE r.payment_status IN ('simulated_paid', 'completed', 'refunded')
            )::int AS captured_reservations,
            COUNT(DISTINCT r.id) FILTER (WHERE r.payment_status = 'refunded')::int AS refunded_reservations,
            COUNT(DISTINCT rf.id) FILTER (WHERE rf.refund_type = 'event_cancelled')::int AS refunds_total,
            COUNT(DISTINCT rf.id) FILTER (WHERE rf.refund_type = 'event_cancelled' AND rf.status = 'pending')::int AS refunds_pending,
            COUNT(DISTINCT rf.id) FILTER (WHERE rf.refund_type = 'event_cancelled' AND rf.status = 'processing')::int AS refunds_processing,
            COUNT(DISTINCT rf.id) FILTER (WHERE rf.refund_type = 'event_cancelled' AND rf.status = 'completed')::int AS refunds_completed,
            COUNT(DISTINCT rf.id) FILTER (WHERE rf.refund_type = 'event_cancelled' AND rf.status = 'rejected')::int AS refunds_rejected
     FROM events e
     LEFT JOIN reservations r
       ON r.event_id = e.id
       AND r.payment_status IN ('simulated_paid', 'completed', 'refunded')
     LEFT JOIN refunds rf
       ON rf.reservation_id = r.id
       AND rf.refund_type = 'event_cancelled'
     WHERE e.status = 'cancelled'
     GROUP BY e.id
     ORDER BY e.cancelled_at DESC NULLS LAST, e.id DESC
     LIMIT $1 OFFSET $2`,
    [normalizedLimit, normalizedOffset]
  );

  return result.rows;
}

async function countCancelledEvents() {
  const result = await db.query(`SELECT COUNT(*)::int AS total FROM events WHERE status = 'cancelled'`);
  return result.rows[0]?.total || 0;
}

async function listEventsByOrganizer(organizerId) {
  const result = await db.query(
    `${EVENT_SELECT}
     WHERE e.organizer_id = $1
     GROUP BY e.id, c.id
     ORDER BY COALESCE(e.starts_at, e.event_date) DESC`,
    [organizerId]
  );

  return result.rows;
}

async function countReservationsByEvent(eventId) {
  const result = await db.query(
    `SELECT COUNT(*)::int AS total
     FROM reservations
     WHERE event_id = $1`,
    [eventId]
  );

  return result.rows[0]?.total || 0;
}

async function findPublicEventById(id) {
  const result = await db.query(
    `${EVENT_SELECT}
     WHERE e.id = $1
       AND e.status IN ('published', 'active')
       AND e.visibility = 'public'
     GROUP BY e.id, c.id`,
    [id]
  );

  return result.rows[0] || null;
}

async function findEventById(id, client = null) {
  const result = await db.query(
    `${EVENT_SELECT}
     WHERE e.id = $1
     GROUP BY e.id, c.id`,
    [id],
    client || undefined
  );

  return result.rows[0] || null;
}

async function findCategoryBySlug(slug, client = null) {
  const result = await db.query(
    `SELECT id, slug, name
     FROM event_categories
     WHERE slug = $1`,
    [slug],
    client || undefined
  );

  return result.rows[0] || null;
}

async function replaceTicketTypes(eventId, ticketTypes, client) {
  await db.query("DELETE FROM event_ticket_types WHERE event_id = $1", [eventId], client);

  for (const ticketType of ticketTypes) {
    await db.query(
      `INSERT INTO event_ticket_types (
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
         is_active,
         created_at,
         updated_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, TRUE, NOW(), NOW())`,
      [
        eventId,
        ticketType.name,
        ticketType.currency,
        ticketType.price,
        ticketType.stockTotal,
        ticketType.stockAvailable,
        ticketType.salesStartsAt || null,
        ticketType.salesEndsAt || null,
        ticketType.salesEndMode,
        ticketType.maxPerOrder,
        ticketType.maxPerUser,
      ],
      client
    );
  }
}

async function createEvent(eventData) {
  const client = await db.getClient();

  try {
    await client.query("BEGIN");

    const result = await db.query(
      `INSERT INTO events (
         organizer_id,
         category_id,
         title,
         description,
         additional_info,
         featured_image_url,
         promo_video_url,
         venue,
         event_date,
         starts_at,
         ends_at,
         visibility,
         age_restriction,
         country,
         city,
         address_line,
         address_reference,
         meeting_point,
         latitude,
         longitude,
         total_tickets,
         available_tickets,
         price,
         status,
         published_at,
         created_at,
         updated_at
       )
       VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24,
         CASE WHEN $24 IN ('published', 'active') THEN NOW() ELSE NULL END,
         NOW(),
         NOW()
       )
       RETURNING id`,
      [
        eventData.organizerId,
        eventData.categoryId,
        eventData.title,
        eventData.description,
        eventData.additionalInfo,
        eventData.featuredImageUrl,
        eventData.promoVideoUrl,
        eventData.venue,
        eventData.eventDate,
        eventData.startsAt,
        eventData.endsAt,
        eventData.visibility,
        eventData.ageRestriction,
        eventData.country,
        eventData.city,
        eventData.addressLine,
        eventData.addressReference,
        eventData.meetingPoint,
        eventData.latitude,
        eventData.longitude,
        eventData.totalTickets,
        eventData.availableTickets,
        eventData.basePrice,
        eventData.status,
      ],
      client
    );

    const eventId = result.rows[0].id;
    await replaceTicketTypes(eventId, eventData.ticketTypes, client);

    await client.query("COMMIT");
    return findEventById(eventId);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function updateEvent(id, eventData) {
  const client = await db.getClient();

  try {
    await client.query("BEGIN");

    const result = await db.query(
      `UPDATE events
       SET category_id = $2,
           title = $3,
           description = $4,
           additional_info = $5,
           featured_image_url = $6,
           promo_video_url = $7,
           venue = $8,
           event_date = $9,
           starts_at = $10,
           ends_at = $11,
           visibility = $12,
           age_restriction = $13,
           country = $14,
           city = $15,
           address_line = $16,
           address_reference = $17,
           meeting_point = $18,
           latitude = $19,
           longitude = $20,
           total_tickets = $21,
           available_tickets = $22,
           price = $23,
           status = $24,
           rejection_reason = $25,
           published_at = CASE
             WHEN $24 IN ('published', 'active') AND published_at IS NULL THEN NOW()
             WHEN $24 NOT IN ('published', 'active') THEN published_at
             ELSE published_at
           END,
           cancelled_at = CASE
             WHEN $24 = 'cancelled' THEN NOW()
             ELSE cancelled_at
           END,
           updated_at = NOW()
       WHERE id = $1
       RETURNING id`,
      [
        id,
        eventData.categoryId,
        eventData.title,
        eventData.description,
        eventData.additionalInfo,
        eventData.featuredImageUrl,
        eventData.promoVideoUrl,
        eventData.venue,
        eventData.eventDate,
        eventData.startsAt,
        eventData.endsAt,
        eventData.visibility,
        eventData.ageRestriction,
        eventData.country,
        eventData.city,
        eventData.addressLine,
        eventData.addressReference,
        eventData.meetingPoint,
        eventData.latitude,
        eventData.longitude,
        eventData.totalTickets,
        eventData.availableTickets,
        eventData.basePrice,
        eventData.status,
        eventData.rejectionReason || null,
      ],
      client
    );

    if (!result.rows[0]) {
      await client.query("ROLLBACK");
      return null;
    }

    await replaceTicketTypes(id, eventData.ticketTypes, client);
    await client.query("COMMIT");
    return findEventById(id);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function updateReviewStatus(id, { status, rejectionReason }) {
  const client = await db.getClient();
  try {
    await client.query("BEGIN");

    const result = await db.query(
      `UPDATE events
       SET status = $2,
           rejection_reason = $3,
           updated_at = NOW()
       WHERE id = $1
       RETURNING id`,
      [id, status, rejectionReason || null],
      client
    );

    if (!result.rows[0]) {
      await client.query("COMMIT");
      return null;
    }

    await db.query(
      `UPDATE events
       SET published_at = CASE
             WHEN published_at IS NULL AND status IN ('published', 'active') THEN NOW()
             ELSE published_at
           END,
           cancelled_at = CASE
             WHEN status = 'cancelled' AND cancelled_at IS NULL THEN NOW()
             ELSE cancelled_at
           END,
           updated_at = NOW()
       WHERE id = $1`,
      [id],
      client
    );

    await client.query("COMMIT");
    return findEventById(id);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function updateEventWorkflowStatus(id, { status, rejectionReason }, client = null) {
  const resolvedClient = client || (await db.getClient());
  const shouldManageTransaction = !client;

  try {
    if (shouldManageTransaction) {
      await resolvedClient.query("BEGIN");
    }

    const result = await db.query(
      `UPDATE events
       SET status = $2,
           rejection_reason = $3,
           updated_at = NOW()
       WHERE id = $1
       RETURNING id`,
      [id, status, rejectionReason || null],
      resolvedClient
    );

    if (!result.rows[0]) {
      if (shouldManageTransaction) {
        await resolvedClient.query("COMMIT");
      }
      return null;
    }

    await db.query(
      `UPDATE events
       SET published_at = CASE
             WHEN published_at IS NULL AND status IN ('published', 'active') THEN NOW()
             ELSE published_at
           END,
           cancelled_at = CASE
             WHEN status = 'cancelled' AND cancelled_at IS NULL THEN NOW()
             ELSE cancelled_at
           END,
           updated_at = NOW()
       WHERE id = $1`,
      [id],
      resolvedClient
    );

    if (shouldManageTransaction) {
      await resolvedClient.query("COMMIT");
    }

    return findEventById(id, client || undefined);
  } catch (error) {
    if (shouldManageTransaction) {
      await resolvedClient.query("ROLLBACK");
    }
    throw error;
  } finally {
    if (shouldManageTransaction) {
      resolvedClient.release();
    }
  }
}

async function findOpenChangeRequestByEventId(eventId, client = null) {
  const result = await db.query(
    `${EVENT_CHANGE_REQUEST_SELECT}
     WHERE ecr.event_id = $1
       AND ecr.status IN ('pending_review', 'needs_information')
     ORDER BY ecr.created_at DESC
     LIMIT 1`,
    [eventId],
    client || undefined
  );

  return result.rows[0] || null;
}

async function findChangeRequestById(id, client = null) {
  const result = await db.query(
    `${EVENT_CHANGE_REQUEST_SELECT}
     WHERE ecr.id = $1`,
    [id],
    client || undefined
  );

  return result.rows[0] || null;
}

async function listChangeRequestsByOrganizer(organizerId) {
  const result = await db.query(
    `${EVENT_CHANGE_REQUEST_SELECT}
     WHERE ecr.organizer_id = $1
     ORDER BY ecr.updated_at DESC, ecr.created_at DESC`,
    [organizerId]
  );

  return result.rows;
}

async function listPendingChangeRequests() {
  const result = await db.query(
    `${EVENT_CHANGE_REQUEST_SELECT}
     WHERE ecr.status = 'pending_review'
     ORDER BY ecr.created_at ASC`,
  );

  return result.rows;
}

async function createChangeRequest(changeRequestData) {
  const result = await db.query(
    `INSERT INTO event_change_requests (
       event_id,
       organizer_id,
       request_type,
       status,
       explanation,
       admin_response,
       proposed_payload,
       change_summary,
       attachments,
       reviewed_by_user_id,
       reviewed_at,
       created_at,
       updated_at
     )
     VALUES ($1, $2, $3, 'pending_review', $4, NULL, $5, $6::jsonb, $7::jsonb, NULL, NULL, NOW(), NOW())
     RETURNING id`,
    [
      changeRequestData.eventId,
      changeRequestData.organizerId,
      changeRequestData.requestType,
      changeRequestData.explanation,
      changeRequestData.proposedPayload || null,
      JSON.stringify(changeRequestData.changeSummary || []),
      JSON.stringify(changeRequestData.attachments || []),
    ]
  );

  return findChangeRequestById(result.rows[0].id);
}

async function reopenChangeRequest(id, changeRequestData) {
  const result = await db.query(
    `UPDATE event_change_requests
     SET request_type = $2,
         status = 'pending_review',
         explanation = $3,
         admin_response = NULL,
         proposed_payload = $4,
         change_summary = $5::jsonb,
         attachments = $6::jsonb,
         reviewed_by_user_id = NULL,
         reviewed_at = NULL,
         updated_at = NOW()
     WHERE id = $1
     RETURNING id`,
    [
      id,
      changeRequestData.requestType,
      changeRequestData.explanation,
      changeRequestData.proposedPayload || null,
      JSON.stringify(changeRequestData.changeSummary || []),
      JSON.stringify(changeRequestData.attachments || []),
    ]
  );

  if (!result.rows[0]) {
    return null;
  }

  return findChangeRequestById(id);
}

async function updateChangeRequestReview(id, { status, adminResponse, reviewedByUserId }) {
  const result = await db.query(
    `UPDATE event_change_requests
     SET status = $2,
         admin_response = $3,
         reviewed_by_user_id = $4,
         reviewed_at = NOW(),
         updated_at = NOW()
     WHERE id = $1
     RETURNING id`,
    [id, status, adminResponse || null, reviewedByUserId]
  );

  if (!result.rows[0]) {
    return null;
  }

  return findChangeRequestById(id);
}

async function deleteEvent(id) {
  const result = await db.query("DELETE FROM events WHERE id = $1 RETURNING id", [id]);
  return result.rows[0] || null;
}

module.exports = {
  listCategories,
  countPublicEvents,
  listPublicEvents,
  listPendingReviewEvents,
  listAllEvents,
  listCancelledEventsWithRefundProgress,
  countCancelledEvents,
  listEventsByOrganizer,
  countReservationsByEvent,
  findPublicEventById,
  findEventById,
  findCategoryBySlug,
  createEvent,
  updateEvent,
  updateReviewStatus,
  updateEventWorkflowStatus,
  findOpenChangeRequestByEventId,
  findChangeRequestById,
  listChangeRequestsByOrganizer,
  listPendingChangeRequests,
  createChangeRequest,
  reopenChangeRequest,
  updateChangeRequestReview,
  deleteEvent,
};
