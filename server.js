const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const calls = new Map();

app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/call', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'call.html'));
});

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  socket.on('create-call', () => {
    console.log('Creating call for:', socket.id);
    const callId = uuidv4();
    calls.set(callId, { manager: socket.id });
    socket.emit('call-created', callId);
    console.log('Call created:', callId);
  });

  socket.on('join-call', (callId) => {
    console.log('Join call request:', callId, 'from:', socket.id);
    const call = calls.get(callId);
    if (call) {
      call.client = socket.id;
      socket.to(call.manager).emit('client-joined', socket.id);
      socket.emit('joined-call', call.manager);
      console.log('Client joined call:', callId);
    } else {
      console.log('Call not found:', callId);
      socket.emit('call-not-found');
    }
  });

  socket.on('signal', ({ to, signal }) => {
    console.log('Signaling from', socket.id, 'to', to);
    socket.to(to).emit('signal', { from: socket.id, signal });
  });

  socket.on('end-call', () => {
    console.log('Call ended by:', socket.id);
    for (const [callId, call] of calls.entries()) {
      if (call.manager === socket.id || call.client === socket.id) {
        calls.delete(callId);
        if (call.manager === socket.id) {
          socket.to(call.client).emit('call-ended');
        } else {
          socket.to(call.manager).emit('call-ended');
        }
        console.log('Call removed:', callId);
        break;
      }
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    for (const [callId, call] of calls.entries()) {
      if (call.manager === socket.id || call.client === socket.id) {
        calls.delete(callId);
        if (call.manager === socket.id) {
          socket.to(call.client).emit('call-ended');
        } else {
          socket.to(call.manager).emit('call-ended');
        }
        console.log('Call removed due to disconnect:', callId);
        break;
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});