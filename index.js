const express = require('express');
const fetch = require('node-fetch');

const app = express();
const port = process.env.PORT || 3000;

// === שים כאן את הפרטים שלך מ-Google Cloud Console ===
const CLIENT_ID = 'AAAAAA';
const CLIENT_SECRET = 'AAAAAA';
const REDIRECT_URI = 'https://gpt-verifier.onrender.com/oauth/callback';

const OAUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo';

// נקודת התחלה — מפנה את המשתמש לכניסה דרך גוגל
app.get('/auth', (req, res) => {
  const redirectUrl = `${OAUTH_URL}?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&scope=openid%20email&access_type=offline&prompt=consent`;
  res.redirect(redirectUrl);
});

// קבלת callback מגוגל עם הקוד — ואז שליפת הטוקן ובדיקת הדומיין
app.get('/oauth/callback', async (req, res) => {
  const code = req.query.code;
  if (!code) return res.status(400).send('Missing code');

  try {
    const tokenRes = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code'
      })
    });

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    const userInfoRes = await fetch(USERINFO_URL, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    const user = await userInfoRes.json();
    const email = user.email || '';

    if (!email.endsWith('@edu.jmc.ac.il')) {
      return res.status(403).send(`<h1>❌ Access Denied</h1><p>${email} is not allowed</p>`);
    }

    // גישה מאושרת
    res.send(`<h1>✅ Access Granted</h1><p>Welcome ${email}</p>`);

  } catch (err) {
    console.error(err);
    res.status(500).send('OAuth flow failed');
  }
});
app.get('/verify', async (req, res) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '');

  if (!token) return res.status(401).json({ error: 'Missing token' });

  try {
    const userInfoRes = await fetch(USERINFO_URL, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const user = await userInfoRes.json();
    const email = user.email || '';

    if (!email.endsWith('@edu.kmc.ac.il')) {
      return res.status(403).json({ error: 'Unauthorized domain', email, domainVerified: false });
    }

    res.json({ email, domainVerified: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to verify token' });
  }
});

app.listen(port, () => {
  console.log(`OAuth verifier running at http://localhost:${port}`);
});
