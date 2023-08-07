import express from 'express';
import AppError from './utils/appError.mjs';
import globalErrorHandler from './controllers/appErrorController.mjs';
import * as userSocketMap from './userSocketMap.mjs';
import { protectSocket } from './controllers/authController.mjs';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';
import pool from './database.mjs';

import dotenv from 'dotenv';

const app = express();
app.use(cors());

// Use body-parser to retrieve the raw body as a buffer
import bodyParser from 'body-parser';

app.use((req, res, next) => {
  console.log(`Incoming request: ${req.method} ${req.url}`);
  next();
});

// Middleware to parse urlencoded data
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

import userRouter from './routes/userRoutes.mjs';
import authRouter from './routes/authRoutes.mjs';
import noteRouter from './routes/noteRoutes.mjs';

// Routing
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/users', userRouter);
// app.use(myMulter(fileValidation.media));
app.use('/api/v1/notes', noteRouter);

app.all('*', (req, res, next) => {
  next(new AppError(`Couldn't find ${req.originalUrl} on this server!`, 400));
});

// IMPLEMENTING a global error handling middleware
app.use(globalErrorHandler);

// Server setup
dotenv.config({ path: './config.env' });

const port = process.env.PORT;
const server = http.createServer(app);

// Socket.io setup
const io = new Server(server, {
  cors: {
    origin: '*',
  },
});

io.use(async (socket, next) => {
  try {
    if (socket.handshake.auth && socket.handshake.auth.token) {
      const token = socket.handshake.auth.token;
      await protectSocket(token, socket);
      next(); // Continue if authentication is successful
    } else {
      throw new Error('Authentication error');
    }
  } catch (error) {
    console.log(error);
    next(error); // Pass the error to the error handling middleware
  }
});

io.on('connection', (socket) => {
  const userId = socket.user.id;
  userSocketMap.addUserSocket(userId, socket);

  socket.on('disconnect', () => {
    userSocketMap.removeUserSocket(userId);
  });
});

server.listen(port, `0.0.0.0`, () => {
  console.log(`Server running on port ${port}...`);
});
server.timeout = 120000; // 120 seconds

const checkDBConnection = () => {
  if (!pool) console.error('Error connecting to the database:');
  console.log('Database connected...');
};
checkDBConnection();

process.on('unhandledRejection', (err) => {
  console.log('UNHANDLED REJECTION, server is shutting down...');
  console.log(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});
