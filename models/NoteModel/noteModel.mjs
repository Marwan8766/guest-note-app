import pool from '../../database.mjs';
import * as userSocketMap from '../../userSocketMap.mjs';

class Note {
  constructor(data) {
    this.data = data;
  }
  async createNotesForUsers(
    senderId,
    receiverUserIds,
    typeId,
    title,
    message,
    mediaUrls
  ) {
    try {
      const notesData = receiverUserIds.map((receiverId) => ({
        sender_id: senderId,
        receiver_id: receiverId,
        type: typeId,
        title: title,
        message: message,
      }));

      const insertQuery = `
        INSERT INTO notes (sender_id, receiver_id, type, title, message)
        VALUES (?, ?, ?, ?, ?)
      `;

      const insertedNoteIds = [];

      for (const data of notesData) {
        const [result] = await pool.query(insertQuery, [
          data.sender_id,
          data.receiver_id,
          data.type,
          data.title,
          data.message,
        ]);

        insertedNoteIds.push(result.insertId);

        // send the notification to the user who received the note in real time

        // Find the socket associated with the recipient user using the userId
        const recipientSocket = userSocketMap.getUserSocket(data.receiver_id);

        if (recipientSocket) {
          recipientSocket.emit('newNoteReceived', {
            noteId: result.insertId,
            noteTitle: data.title,
          });
        }
      }

      const mediaInsertValues = [];

      for (const noteId of insertedNoteIds) {
        for (const mediaUrl of mediaUrls) {
          mediaInsertValues.push([noteId, mediaUrl]);
        }
      }

      const mediaPlaceholders = mediaInsertValues
        .map(() => '(?, ?)')
        .join(', ');

      const mediaInsertQuery = `
        INSERT INTO media (note_id, media_url)
        VALUES ${mediaPlaceholders}
      `;

      await pool.query(mediaInsertQuery, mediaInsertValues.flat());

      return 'Notes and media created successfully';
    } catch (error) {
      throw error;
    }
  }

  async deleteReceivedNotes(receiverId, notes) {
    try {
      const updateQuery = `
        UPDATE notes
        SET active = false
        WHERE receiver_id = ? AND id IN (?)
      `;

      const values = [receiverId, notes];

      const [result] = await pool.query(updateQuery, values);

      return result.affectedRows; // Return the number of affected rows
    } catch (error) {
      throw error;
    }
  }
  async getUserTimelineNotes(userId, types, page, pageSize) {
    try {
      const currentDate = new Date();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(currentDate.getDate() - 30);

      let query = `
        SELECT n.*, nt.name AS type_name, m.media_url
        FROM notes n
        JOIN note_type nt ON n.type = nt.id
        LEFT JOIN media m ON n.id = m.note_id
        WHERE n.receiver_id = ? 
          AND n.active = true
          AND n.created_at >= ?
          AND nt.disabled = false
      `;

      const values = [userId, thirtyDaysAgo];

      if (types && types.length > 0) {
        query += 'AND n.type IN (?) ';
        values.push(types);
      }

      query += 'ORDER BY n.created_at DESC ';
      query += 'LIMIT ? OFFSET ?';

      const offset = (page - 1) * pageSize;

      values.push(pageSize, offset);

      const [rows] = await pool.query(query, values);

      const notesWithMedia = rows.reduce((acc, row) => {
        const existingNote = acc.find((note) => note.id === row.id);
        if (existingNote) {
          if (row.media_url) {
            existingNote.media.push(row.media_url);
          }
        } else {
          acc.push({
            id: row.id,
            sender_id: row.sender_id,
            receiver_id: row.receiver_id,
            type: row.type,
            type_name: row.type_name,
            title: row.title,
            message: row.message,
            created_at: row.created_at,
            updated_at: row.updated_at,
            active: row.active,
            media: row.media_url ? [row.media_url] : [],
          });
        }
        return acc;
      }, []);

      return notesWithMedia;
    } catch (error) {
      throw error;
    }
  }

  async constructNotificationMessage(userId) {
    try {
      const query = `
          SELECT COUNT(*) AS note_count, nt.name, nt.disabled
          FROM notes n
          JOIN note_type nt ON n.type = nt.id
          WHERE n.receiver_id = ?
            AND n.active = true
          GROUP BY n.type
        `;

      const [rows] = await pool.query(query, [userId]);

      if (rows.length === 0) {
        return false;
      }

      const messageParts = rows
        .filter((row) => !row.disabled)
        .map((row) => `${row.note_count} ${row.name} notes`);

      if (messageParts.length === 0) {
        return false;
      }

      const message = `You got new ${messageParts.join(', ')}.`;

      return message;
    } catch (error) {
      throw error;
    }
  }
}

export default Note;
