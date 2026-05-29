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

function buildPublicFilters(filters = {}) {
  const clauses = ["e.status IN ('published', 'active')"];
  const params = [];

  if (filters.category) {
    params.push(filters.category);
    clauses.push(`(c.slug = $${params.length} OR c.name ILIKE $${params.length})`);
  }

  if (filters.city) {
    params.push(filters.city);
    clauses.push(`e.city ILIKE $${params.length}`);
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

  return {
    whereClause: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "",
    params,
  };
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

async function listPublicEvents(filters = {}) {
  const { whereClause, params } = buildPublicFilters(filters);
  const result = await db.query(
    `${EVENT_SELECT}
     ${whereClause}
     GROUP BY e.id, c.id
     ORDER BY COALESCE(e.starts_at, e.event_date) ASC`,
    params
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

async function findPublicEventById(id) {
  const result = await db.query(
    `${EVENT_SELECT}
     WHERE e.id = $1
       AND e.status IN ('published', 'active')
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
  const result = await db.query(
    `UPDATE events
     SET status = $2,
         rejection_reason = $3,
         published_at = CASE
           WHEN $2 = 'published' AND published_at IS NULL THEN NOW()
           ELSE published_at
         END,
         updated_at = NOW()
     WHERE id = $1
     RETURNING id`,
    [id, status, rejectionReason || null]
  );

  if (!result.rows[0]) {
    return null;
  }

  return findEventById(id);
}

async function deleteEvent(id) {
  const result = await db.query("DELETE FROM events WHERE id = $1 RETURNING id", [id]);
  return result.rows[0] || null;
}

module.exports = {
  listCategories,
  listPublicEvents,
  listPendingReviewEvents,
  listAllEvents,
  listEventsByOrganizer,
  findPublicEventById,
  findEventById,
  findCategoryBySlug,
  createEvent,
  updateEvent,
  updateReviewStatus,
  deleteEvent,
};
