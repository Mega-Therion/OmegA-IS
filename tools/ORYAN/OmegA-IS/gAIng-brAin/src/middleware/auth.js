const config = require('../config/env');
const { isLocalRequest } = require('../utils/helpers');
const supabase = require('../services/supabase');

async function requireAuth(req, res, next) {
  if (config.DISABLE_AUTH && isLocalRequest(req)) {
    req.authUser = { id: 'dev-user', email: 'dev@local' };
    return next();
  }

  const authHeader = req.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'missing bearer token' });
  }

  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) {
    return res.status(401).json({ error: 'missing bearer token' });
  }

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) {
    return res.status(401).json({ error: 'invalid token' });
  }

  req.authUser = data.user;
  next();
}

module.exports = requireAuth;
