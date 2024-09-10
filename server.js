const express = require('express');
const path = require('path');

const app = express();
const port = 3000;

// Serve static files from the 'public' directory
app.use(express.static('public'));

// Serve index.html for the root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serve the node_modules directory
app.use('/node_modules', express.static(path.join(__dirname, 'node_modules')));

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});