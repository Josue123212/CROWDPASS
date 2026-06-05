const db = require("../config/db");

async function listWalletCardsByUser(userId, client = null) {
  const result = await db.query(
    `SELECT *
     FROM wallet_cards
     WHERE user_id = $1
     ORDER BY is_default DESC, created_at DESC, id DESC`,
    [userId],
    client || undefined
  );

  return result.rows;
}

async function lockWalletCardsByUser(userId, client) {
  await db.query(
    `SELECT id
     FROM wallet_cards
     WHERE user_id = $1
     FOR UPDATE`,
    [userId],
    client
  );
}

async function findWalletCardById(cardId, client = null) {
  const result = await db.query(
    `SELECT *
     FROM wallet_cards
     WHERE id = $1`,
    [cardId],
    client || undefined
  );

  return result.rows[0] || null;
}

async function findWalletCardByFingerprint({ userId, brand, last4, expMonth, expYear }, client) {
  const result = await db.query(
    `SELECT id
     FROM wallet_cards
     WHERE user_id = $1
       AND brand = $2
       AND last4 = $3
       AND exp_month = $4
       AND exp_year = $5
     LIMIT 1`,
    [userId, brand, last4, expMonth, expYear],
    client
  );

  return result.rows[0] || null;
}

async function clearDefaultCardByUser(userId, client) {
  await db.query(
    `UPDATE wallet_cards
     SET is_default = FALSE,
         updated_at = NOW()
     WHERE user_id = $1
       AND is_default = TRUE`,
    [userId],
    client
  );
}

async function createWalletCard({ userId, brand, first4, last4, expMonth, expYear, holderName, isDefault }, client) {
  try {
    const result = await db.query(
      `INSERT INTO wallet_cards (
         user_id,
         brand,
         first4,
         last4,
         exp_month,
         exp_year,
         holder_name,
         is_default,
         created_at,
         updated_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
       RETURNING id`,
      [userId, brand, first4 || null, last4, expMonth, expYear, holderName, Boolean(isDefault)],
      client
    );

    return result.rows[0] || null;
  } catch (error) {
    if (error?.code !== "42703") {
      throw error;
    }

    const fallbackResult = await db.query(
      `INSERT INTO wallet_cards (
         user_id,
         brand,
         last4,
         exp_month,
         exp_year,
         holder_name,
         is_default,
         created_at,
         updated_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
       RETURNING id`,
      [userId, brand, last4, expMonth, expYear, holderName, Boolean(isDefault)],
      client
    );

    return fallbackResult.rows[0] || null;
  }
}

async function setWalletCardDefaultByUser(userId, cardId, client) {
  const result = await db.query(
    `UPDATE wallet_cards
     SET is_default = TRUE,
         updated_at = NOW()
     WHERE id = $1
       AND user_id = $2
     RETURNING id`,
    [cardId, userId],
    client
  );

  return result.rows[0] || null;
}

async function deleteWalletCardByUser(userId, cardId, client) {
  const result = await db.query(
    `DELETE FROM wallet_cards
     WHERE id = $1
       AND user_id = $2
     RETURNING id, is_default`,
    [cardId, userId],
    client
  );

  return result.rows[0] || null;
}

async function findNewestCardIdByUser(userId, client) {
  const result = await db.query(
    `SELECT id
     FROM wallet_cards
     WHERE user_id = $1
     ORDER BY created_at DESC, id DESC
     LIMIT 1`,
    [userId],
    client
  );

  return result.rows[0]?.id || null;
}

module.exports = {
  listWalletCardsByUser,
  lockWalletCardsByUser,
  findWalletCardById,
  findWalletCardByFingerprint,
  clearDefaultCardByUser,
  createWalletCard,
  setWalletCardDefaultByUser,
  deleteWalletCardByUser,
  findNewestCardIdByUser,
};
