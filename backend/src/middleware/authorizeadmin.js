const isAdmin = (req, res, next) => {
<<<<<<< HEAD
  if (req.user.role !== 'admin') {
=======
  if (req.user.role !== "admin") {
>>>>>>> d2aba71dbbc84cc25d9f6a4fb5b7b26fdcd1fbac
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
};

module.exports = isAdmin;
