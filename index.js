const express = require('express');
const bodyParser = require('body-parser');
const basicAuth = require('basic-auth');
const app = express();
const port = 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

let webUsername = 'admin'; // Change to your desired username
let webPassword = 'password'; // Change to your desired password

let enrollInProgress = false;
let enrollID = 0;
let currentEnrollName = '';
let logIndex = 0;
let logs = [];

// Simulate a fingerprint database using Map (ID -> Name)
let fingerprintDatabase = new Map();

// Basic authentication middleware
function authenticate(req, res, next) {
  const user = basicAuth(req);
  if (user && user.name === webUsername && user.pass === webPassword) {
    return next();
  } else {
    res.set('WWW-Authenticate', 'Basic realm="401"');
    return res.status(401).send('Authentication required');
  }
}

// Handle login request
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (username && password) {
    if (username === webUsername && password === webPassword) {
      res.status(200).send('Login successful');
    } else {
      res.status(401).send('Invalid credentials');
    }
  } else {
    res.status(400).send('Missing username or password');
  }
});

// Serve HTML page (protected by basic auth)
app.get('/', authenticate, (req, res) => {
  res.sendFile(__dirname + '/index.html'); // Serve your index.html
});

// Enroll fingerprint with a name
app.post('/enrollFingerprint', (req, res) => {
  const { name } = req.body;
  if (name && name.trim().length > 0) {
    enrollInProgress = true;
    enrollID = findNextAvailableID(); // Function to find the next available ID

    if (enrollID !== 0xFF) {
      currentEnrollName = name.trim();
      fingerprintDatabase.set(enrollID, currentEnrollName); // Enroll name with ID
      res.status(200).send(`Starting Fingerprint Enrollment for ${currentEnrollName}...`);
    } else {
      res.status(500).send('No available slots for new fingerprints.');
    }
  } else {
    res.status(400).send('Invalid name provided.');
  }
});

// Delete fingerprint by ID
app.post('/delete', (req, res) => {
  const id = parseInt(req.body.id);
  if (!isNaN(id)) {
    if (fingerprintDatabase.has(id)) {
      deleteFingerprint(id); // Function to delete fingerprint by ID
      res.status(200).send('Fingerprint deleted!<br><a href="/">Go back</a>');
    } else {
      res.status(404).send('Fingerprint not found.');
    }
  } else {
    res.status(400).send('Invalid Input');
  }
});

// Serve logs
app.get('/logs', authenticate, (req, res) => {
  let logHtml = `<html><body><h2>Entry/Exit Logs</h2><table border='1'>
                   <tr><th>Name</th><th>Event</th><th>Timestamp</th></tr>`;
  logs.forEach(log => {
    const name = getNameByID(log.fingerprintID); // Function to get name by fingerprint ID
    logHtml += `<tr><td>${name}</td><td>${log.event}</td><td>${log.timestamp}</td></tr>`;
  });
  logHtml += '</table></body></html>';
  res.status(200).send(logHtml);
});

// Delete all fingerprints
app.post('/deleteAll', (req, res) => {
  deleteAllFingerprints(); // Function to delete all fingerprints
  res.status(200).send('All fingerprints deleted!<br><a href="/">Go back</a>');
});

// Utility functions

function findNextAvailableID() {
  // Iterate through possible IDs (0 to 255) and find the first available one
  for (let i = 0; i < 256; i++) {
    if (!fingerprintDatabase.has(i)) return i;
  }
  return 0xFF; // No available slot
}

function deleteFingerprint(id) {
  fingerprintDatabase.delete(id);
}

function deleteAllFingerprints() {
  fingerprintDatabase.clear();
}

function getNameByID(id) {
  return fingerprintDatabase.get(id) || 'Unknown';
}

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});