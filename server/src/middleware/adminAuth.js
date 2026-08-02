export default function adminAuth(req, res, next) {
  const headerToken = req.headers['x-admin-token'] || req.headers['authorization'];
  const headerEmail = req.headers['x-admin-email'];
  let token = req.query.adminToken || req.body?.adminToken || headerToken;
  const email = req.query.adminEmail || req.body?.adminEmail || headerEmail;

  // support Bearer tokens in Authorization header
  if (typeof headerToken === 'string' && headerToken.toLowerCase().startsWith('bearer ')) {
    token = headerToken.slice(7).trim();
  }

  if (!process.env.ADMIN_TOKEN) {
    return res.status(500).json({ message: 'ADMIN_TOKEN is not configured' });
  }

  if (token !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ message: 'Unauthorized admin access' });
  }

  if (process.env.ADMIN_EMAILS) {
    const allowedEmails = process.env.ADMIN_EMAILS.split(',')
      .map((emailAddress) => emailAddress.trim().toLowerCase())
      .filter(Boolean);

    if (!email || typeof email !== 'string' || !allowedEmails.includes(email.toLowerCase())) {
      return res.status(401).json({ message: 'Unauthorized admin email' });
    }
  }

  next();
}
