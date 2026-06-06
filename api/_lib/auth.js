/**
 * Admin authentication helper.
 * Enforces ADMIN_USERNAME and ADMIN_PASSWORD if configured.
 * Falls back to ADMIN_SECRET if configured.
 *
 * @param {object} req - Express/Vercel request object.
 * @returns {boolean} true if authorized, false otherwise.
 */
function verifyAdmin(req) {
  const clientUsername = req.headers['x-admin-username'] || req.query?.adminUsername || req.body?.adminUsername;
  const clientPassword = req.headers['x-admin-password'] || req.query?.adminPassword || req.body?.adminPassword;
  const clientSecret = req.headers['x-admin-secret'] || req.query?.adminSecret || req.body?.adminSecret;

  const envUsername = process.env.ADMIN_USERNAME;
  const envPassword = process.env.ADMIN_PASSWORD;
  const envSecret = process.env.ADMIN_SECRET;

  // Enforce Username & Password if configured in the environment
  if (envUsername && envPassword) {
    return envUsername === clientUsername && envPassword === clientPassword;
  }

  // Fallback to Admin Secret if configured in the environment
  if (envSecret) {
    return envSecret === clientSecret;
  }

  // If no environment security variables are configured, allow access by default.
  return true;
}

module.exports = {
  verifyAdmin
};
