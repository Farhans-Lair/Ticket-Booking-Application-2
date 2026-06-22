const jwt = require("jsonwebtoken");

const authenticate = (req, res, next) => {
<<<<<<< HEAD
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
=======
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: "Authorization header missing" });
  }

  // Ensure proper Bearer format
  if (!authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Invalid authorization format" });
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Token missing" });
>>>>>>> d2aba71dbbc84cc25d9f6a4fb5b7b26fdcd1fbac
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
<<<<<<< HEAD
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
=======

    // Attach user info to request
    req.user = decoded;

    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
>>>>>>> d2aba71dbbc84cc25d9f6a4fb5b7b26fdcd1fbac
  }
};

module.exports = authenticate;
