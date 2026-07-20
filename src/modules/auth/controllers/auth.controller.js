import authService from "../services/auth.service.js";

const signup = async (req, res, next) => {
  try {
    const result = await authService.signup(req.body);

    return res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const result = await authService.login(req.body);

    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const getMe = async (req, res, next) => {
  try {
    const result = await authService.getMe(req.user.id);

    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export default {
  signup,
  login,
  getMe,
};