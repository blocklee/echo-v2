const { spawn } = require('child_process');
const path = require('path');

// Kill any existing node processes on port 3001
const kill = spawn('pkill', ['-f', 'node echo-data-api.js']);
kill.on('exit', () => {
  console.log('Starting ECHO Data API...');
  const api = spawn('node', ['echo-data-api.js'], {
    cwd: __dirname,
    stdio: 'inherit'
  });
  
  api.on('error', (err) => {
    console.error('Failed to start API:', err);
  });
});
