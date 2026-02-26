const bcrypt = require("bcrypt");
const { User } = require("../models");

const registerUser = async (name, email, password) => {
  const existingUser = await User.findOne({ where: { email } });
  if (existingUser) {
    throw new Error("User already exists");
  }

  const passwordHash = await bcrypt.hash(password, 10);

  return User.create({
    name,
    email,
    password_hash: passwordHash,
  });
};


module.exports = 
{
  registerUser
};
