const authService = require("../services/auth.services");

const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        error: "Missing required fields",
      });
    }

    await authService.registerUser(name, email, password);

    res.status(201).json({
      message: "User registered successfully",
    });
  } catch (err) {
    next (err);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const token = await authService.loginUser(email, password);

    res.json({ token, role:User.role });
  } catch (err) {
    next (err);
  }
};

module.exports = {
  register,
  login,
};
