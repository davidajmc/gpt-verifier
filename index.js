const express = require('express');
const fetch = require('node-fetch');

const app = express();
const port = process.env.PORT || 3000;

app.get('/verify', async (req, res) => {
  const auth = req.headers.authorization;

  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid token' });
  }

  const accessToken = auth.split(' ')[1];

  try {
    const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    const userInfo = await response.json();
    const email = userInfo.email || '';

    if (!email.endsWith('@edu.jmc.ac.il')) {
      return res.status(403).json({ error: 'Access denied: domain mismatch' });
    }

    return res.status(200).json({ email, domainVerified: true });

  } catch (err) {
    return res.status(500).json({ error: 'OAuth validation failed', details: err.message });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
