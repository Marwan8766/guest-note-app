import pool from '../../database.mjs';

class Token {
  constructor(data) {
    this.data = data;
  }

  async getTokenByUserId(userId) {
    try {
      const query = `
        SELECT *
        FROM tokens
        WHERE user_id = ?
      `;

      const [rows] = await pool.query(query, [userId]);

      return rows;
    } catch (error) {
      throw error;
    }
  }

  async deleteTokensByUserId(userId) {
    try {
      const query = `
        DELETE FROM tokens
        WHERE user_id = ?
      `;

      const [result] = await pool.query(query, [userId]);
      return result.affectedRows; // Return the number of affected rows
    } catch (error) {
      throw error;
    }
  }

  async createToken(userId, token, expirationTime) {
    try {
      const query = `
        INSERT INTO tokens (user_id, token, expiresAt)
        VALUES (?, ?, ?)
      `;

      const values = [userId, token, expirationTime];

      const [result] = await pool.query(query, values);

      return result.insertId;
    } catch (error) {
      throw error;
    }
  }
}

export default Token;
