const userSockets = {};

export const addUserSocket = (userId, socket) => {
  userSockets[userId] = socket;
};

export const removeUserSocket = (userId) => {
  delete userSockets[userId];
};

export const getUserSocket = (userId) => {
  return userSockets[userId];
};
