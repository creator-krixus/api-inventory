import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

import User from "../../users/models/user.model.js";
import Organization from "../../organizations/models/organizations.model.js";

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      organizationId: user.organizationId,
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN,
    }
  );
};

const signup = async ({ organizationName, name, email, password }) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const existingUser = await User.findOne({ email }).session(session);

    if (existingUser) {
      throw new Error("Email already exists.");
    }

    const organization = await Organization.create(
      [
        {
          name: organizationName,
        },
      ],
      { session }
    );

    const hashedPassword = await bcrypt.hash(
      password,
      Number(process.env.BCRYPT_SALT_ROUNDS)
    );

    const user = await User.create(
      [
        {
          organizationId: organization[0]._id,
          name,
          email,
          password: hashedPassword,
          role: "admin",
        },
      ],
      { session }
    );

    await session.commitTransaction();

    const token = generateToken(user[0]);

    return {
      message: "User registered successfully.",
      token,
      user: {
        id: user[0]._id,
        organizationId: user[0].organizationId,
        name: user[0].name,
        email: user[0].email,
        role: user[0].role,
      },
    };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

const login = async ({ email, password }) => {
  const user = await User.findOne({ email }).select("+password");

  if (!user) {
    throw new Error("Invalid email or password.");
  }

  if (user.status === "inactive") {
    throw new Error("User is inactive.");
  }

  const passwordMatch = await bcrypt.compare(password, user.password);

  if (!passwordMatch) {
    throw new Error("Invalid email or password.");
  }

  const token = generateToken(user);

  return {
    token,
    user: {
      id: user._id,
      organizationId: user.organizationId,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
};

const getMe = async (userId) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new Error("User not found.");
  }

  return {
    id: user._id,
    organizationId: user.organizationId,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
};

export default {
  signup,
  login,
  getMe,
};