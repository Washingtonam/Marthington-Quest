export default function adminAuth(req, res, next) {
  const token = req.headers['x-admin-token'] || req.query.adminToken || req.body?.adminToken;

  if (!process.env.ADMIN_TOKEN) {
    return res.status(500).json({ message: 'ADMIN_TOKEN is not configured' });
  }

  if (token !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ message: 'Unauthorized admin access' });
  }

  next();
}
