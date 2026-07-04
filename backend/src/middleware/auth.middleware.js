const jwt = require("jsonwebtoken");

const authenticate = (req, res, next) => {
  // ── Token resolution: Authorization header wins over cookie ──────────────
  //
  // Why: The browser shares ONE cookie per origin across all tabs. When two
  // different users (e.g. admin + regular user) are logged in simultaneously
  // on different tabs, the second login overwrites the cookie — breaking the
  // first user's API calls.
  //
  // Fix: On login, the frontend stores the JWT in sessionStorage (per-tab)
  // and sends it as  Authorization: Bearer <token>  on every apiRequest call.
  // The middleware reads the header first. Each tab always sends its own token
  // regardless of what the shared cookie currently holds.
  //
  // The cookie is kept as a fallback for requests that do not send the header
  // (e.g. direct fetch calls on older pages, or external integrations).
  let token =
    (req.headers.authorization || "").startsWith("Bearer ")
      ? req.headers.authorization.slice(7)
      : req.cookies?.token;

  if (!token) {
    return res.status(401).json({ error: "Not authenticated. Please log in." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.clearCookie("token", {
      httpOnly: true,
      secure:   process.env.COOKIE_SECURE === "true",
      sameSite: "lax",
      path:     "/",
    });
    return res.status(401).json({ error: "Session expired. Please log in again." });
  }
};

module.exports = authenticate;
