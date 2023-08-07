import Agenda from 'agenda';
import findAllUserIds from '../models/UserModel/userModel.mjs';
import constructNotificationMessage from '../models/NoteModel/noteModel.mjs';
import sendMail from './email.mjs';

// Create a new Agenda instance
const agenda = new Agenda();

// Define the job to send notifications
agenda.define('sendNotifications', async (job) => {
  const userIds = await findAllUserIds();

  for (const userId of userIds) {
    const notificationMessage = await constructNotificationMessage(userId);
    if (notificationMessage) {
      console.log(
        `Sending notification to user ${userId}: ${notificationMessage}`
      );

      const html = `
  <html>
    <head>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 0;
        }

        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 24px;
        }

        h1 {
          color: #0066cc;
          font-size: 24px;
          margin-bottom: 16px;
        }

        p {
          font-size: 16px;
          line-height: 1.5;
          color: #333333;
          margin-bottom: 24px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Your notes stats for today</h1>
        <p>${notificationMessage}</p>
      </div>
    </body>
  </html>
`;

      const mailOptions = {
        email: userEmail,
        subject: 'Your latest notes stats',
        html,
      };
      await sendMail(mailOptions);
    }
  }
});

// Start the agenda process
(async () => {
  await agenda.start();
  await agenda.every('0 4 * * *', 'sendNotifications');
})();
