const jwt = require("jsonwebtoken");

const authenticate = (req, res, next) => {
//console.log("JWT SECRET (VERIFY):", process.env.JWT_SECRET);
//console.log("AUTH HEADER:", req.headers.authorization);

  console.log("RAW AUTH HEADER >>>", JSON.stringify(req.headers.authorization));


  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: "Authorization header missing" });
  }

  const token = authHeader.split(" ")[1];

    console.log("TOKEN LENGTH >>>", token ? token.length : "NO TOKEN");


  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    console.error("JWT VERIFY ERROR >>>", err.message);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};

module.exports = authenticate;
