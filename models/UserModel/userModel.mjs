import pool from '../../database.mjs';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

class User {
  constructor(data) {
    this.data = data;
  }

  async createUser() {
    try {
      const hashedPassword = await bcrypt.hash(this.data.password, 12);

      const query = `
        INSERT INTO users (name, email, password)
        VALUES (?, ?, ?)
      `;

      const values = [this.data.name, this.data.email, hashedPassword];

      const [result] = await pool.query(query, values);

      // Set the new user id in this.data
      this.data.id = result.insertId;

      return {
        id: result.insertId,
        name: this.data.name,
        email: this.data.email,
      };
    } catch (error) {
      throw error;
    }
  }

  async updateProfile(fieldsToUpdate, userId) {
    try {
      const allowedFields = [
        'name',
        'profilePicture',
        'notifications',
        'emailConfirmed',
        'emailConfirmOtp',
        'emailConfirmOtpExpires',
      ];

      // Filter out any fields that are not allowed and not undefined
      const validUpdates = Object.keys(fieldsToUpdate).filter(
        (field) =>
          allowedFields.includes(field) && fieldsToUpdate[field] !== undefined
      );

      // If there are no valid updates, return
      if (validUpdates.length === 0) {
        return;
      }

      // Create the SET clause for the SQL query
      const setClause = validUpdates.map((field) => `${field} = ?`).join(', ');

      // Prepare the values for the SQL query
      const values = validUpdates.map((field) => fieldsToUpdate[field]);
      values.push(userId);

      // Update the user in the database using prepared statement
      const query = `
      UPDATE users
      SET ${setClause}
      WHERE id = ?
    `;

      await pool.query(query, values);

      // Construct the new user object with updated fields
      const updatedUser = { ...this.data, ...fieldsToUpdate };

      return updatedUser;
    } catch (error) {
      throw error;
    }
  }

  async findByEmail(email) {
    try {
      const query = `
        SELECT *
        FROM users
        WHERE email = ?
      `;

      const [rows] = await pool.query(query, [email]);

      if (rows.length === 0) {
        return null; // User not found
      }

      return rows[0]; // Return the first user found
    } catch (error) {
      throw error;
    }
  }

  async findById(id) {
    try {
      const query = `
        SELECT *
        FROM users
        WHERE id = ?
      `;

      const [rows] = await pool.query(query, [id]);

      if (rows.length === 0) {
        return null; // User not found
      }

      return rows[0]; // Return the first user found
    } catch (error) {
      throw error;
    }
  }

  async createEmailConfirmOtp() {
    try {
      const resetOtp = Math.floor(10000 + Math.random() * 90000).toString();
      const otpExpiration = Date.now() + 90 * 1000; // 90 seconds in milliseconds

      const hashedOtp = crypto
        .createHash('sha256')
        .update(resetOtp)
        .digest('hex');

      const query = `
        UPDATE users
        SET emailConfirmOtp = ?, emailConfirmOtpExpires = ?
        WHERE id = ?
      `;

      const values = [hashedOtp, otpExpiration, this.data.id];

      await pool.query(query, values);

      return resetOtp;
    } catch (error) {
      throw error;
    }
  }

  async correctPassword(candidatePassword, userId) {
    try {
      const [rows] = await pool.query(
        'SELECT password FROM users WHERE id = ?',
        [userId]
      );

      if (rows.length === 0) {
        return false;
      }

      return await bcrypt.compare(candidatePassword, rows[0].password);
    } catch (error) {
      throw error;
    }
  }

  async updateUserPassword(newPassword, userId) {
    try {
      const hashedPassword = await bcrypt.hash(newPassword, 12);

      const query = `
        UPDATE users
        SET password = ?, passwordChangedAt = ?,emailConfirmOtp = ?,emailConfirmOtpExpires = ?
        WHERE id = ?
      `;

      const values = [
        hashedPassword,
        new Date(Date.now() - 1000),
        null,
        null,
        userId,
      ];

      await pool.query(query, values);
    } catch (error) {
      throw error;
    }
  }
  passwordHasChanged(jwtTimestamp, passwordChangedAt) {
    try {
      const changedAt = parseInt(passwordChangedAt.getTime() / 1000, 10);
      return jwtTimestamp < changedAt;
    } catch (error) {
      throw error;
    }
  }

  // Method to find all user IDs
  async findAllUserIds() {
    try {
      const [rows] = await pool.query('SELECT id FROM users');
      const userIds = rows.map((row) => row.id);
      return userIds;
    } catch (error) {
      throw error;
    }
  }
}

export default User;
