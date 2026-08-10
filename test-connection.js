const net = require('net');

const socket = net.createConnection(5432, 'ep-morning-sunset-az1v1ckn-pooler.c-3.ap-southeast-1.aws.neon.tech');

socket.on('connect', () => {
  console.log('✅ Connected to Neon host on port 5432');
  socket.end();
});

socket.on('error', (err) => {
  console.log('❌ Connection failed:', err.message);
});

socket.setTimeout(10000, () => {
  console.log('⏱️ Connection timed out');
  socket.destroy();
});