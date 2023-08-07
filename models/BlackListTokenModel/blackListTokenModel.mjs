import pool from '../../database.mjs';

class BlackListToken {
  constructor(data) {
    this.data = data;
  }

  async insertTokens(tokens) {
    try {
      let insertedTokensLength = 0;

      for (const token of tokens) {
        const query = `
          INSERT INTO blacklist_tokens (token, expiresAt)
          VALUES (?, ?)
        `;

        const values = [token.token, token.expiresAt];

        await pool.query(query, values);

        insertedTokensLength++;
      }
      return insertedTokensLength;
    } catch (error) {
      throw error;
    }
  }

  async findByToken(token) {
    try {
      const query = `
        SELECT token, expiresAt
        FROM blacklist_tokens
        WHERE token = ?
      `;

      const [rows] = await pool.query(query, [token]);
      return rows[0];
    } catch (error) {
      throw error;
    }
  }
}

export default BlackListToken;
