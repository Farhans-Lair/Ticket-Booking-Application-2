const jwt = require("jsonwebtoken");

const authenticate = (req, res, next) => {
  // ── Read token from HttpOnly cookie (never from Authorization header) ──────
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).json({ error: "Not authenticated. Please log in." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach user info to request
    req.user = decoded;

    next();
  } catch (err) {
    res.clearCookie("token", {
      httpOnly: true,
      secure:   process.env.NODE_ENV === "production",
      sameSite: "lax",
      path:     "/",
    });

    return res.status(401).json({ error: "Session expired. Please log in again." });
  }
};

module.exports = authenticate;
