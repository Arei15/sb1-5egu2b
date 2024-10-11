const socket = io(window.location.origin.replace(/^http/, 'ws'));

console.log('Socket connection established');

const createCallBtn = document.getElementById('create-call');
const joinCallBtn = document.getElementById('join-call');
const callIdDisplay = document.getElementById('call-id');
const joinCallIdInput = document.getElementById('join-call-id');
const callSection = document.getElementById('call-section');
const localVideo = document.getElementById('local-video');
const remoteVideo = document.getElementById('remote-video');
const endCallBtn = document.getElementById('end-call');

let peer;

createCallBtn.addEventListener('click', () => {
  console.log('Create Call button clicked');
  socket.emit('create-call');
});

socket.on('call-created', (callId) => {
  console.log('Call created with ID:', callId);
  callIdDisplay.textContent = `Call ID: ${callId}`;
});

joinCallBtn.addEventListener('click', () => {
  const callId = joinCallIdInput.value.trim();
  if (callId) {
    console.log('Joining call with ID:', callId);
    socket.emit('join-call', callId);
  } else {
    console.error('Please enter a valid Call ID');
    alert('Please enter a valid Call ID');
  }
});

socket.on('joined-call', (managerId) => {
  console.log('Joined call, manager ID:', managerId);
  startCall(false, managerId);
});

socket.on('client-joined', (clientId) => {
  console.log('Client joined, client ID:', clientId);
  startCall(true, clientId);
});

function startCall(isManager, peerId) {
  console.log('Starting call, isManager:', isManager, 'peerId:', peerId);
  navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    .then((stream) => {
      localVideo.srcObject = stream;
      peer = new SimplePeer({
        initiator: isManager,
        stream: stream,
        trickle: false
      });

      peer.on('signal', (data) => {
        console.log('Sending signal');
        socket.emit('signal', { to: peerId, signal: data });
      });

      peer.on('stream', (remoteStream) => {
        console.log('Received remote stream');
        remoteVideo.srcObject = remoteStream;
      });

      peer.on('error', (err) => {
        console.error('Peer error:', err);
      });

      callSection.style.display = 'block';
    })
    .catch((err) => {
      console.error('Error accessing media devices:', err);
      alert('Error accessing media devices. Please make sure you have given permission to use camera and microphone.');
    });
}

socket.on('signal', ({ from, signal }) => {
  console.log('Received signal from:', from);
  if (peer) {
    peer.signal(signal);
  }
});

endCallBtn.addEventListener('click', () => {
  console.log('Ending call');
  if (peer) {
    peer.destroy();
  }
  localVideo.srcObject.getTracks().forEach(track => track.stop());
  remoteVideo.srcObject = null;
  callSection.style.display = 'none';
  socket.emit('end-call');
});

socket.on('call-ended', () => {
  console.log('Call ended by peer');
  if (peer) {
    peer.destroy();
  }
  localVideo.srcObject.getTracks().forEach(track => track.stop());
  remoteVideo.srcObject = null;
  callSection.style.display = 'none';
});

socket.on('call-not-found', () => {
  console.error('Call not found');
  alert('Call not found. Please check the Call ID and try again.');
});

window.onerror = function(message, source, lineno, colno, error) {
  console.error('Global error:', message, 'at', source, lineno, colno, error);
};