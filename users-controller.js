const { validationResult } = require("express-validator");

const HttpError = require("../models/http-error");
const User = require("../models/user");

// get all users
const getUsers = async (req, res, next) => {
  let users;
  try {
    users = await User.find({}, "-password");
  } catch (err) {
    const error = new HttpError(
      "Fetching users failed, please try again later.",
      500
    );
    return next(error);
  }

  // getters: true to remove _id and use id instead
  res.json({ users: users.map((user) => user.toObject({ getters: true })) });
};

// create a new user and log in new user
const createUser = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(
      new HttpError("Invalid inputs passed, please check your data.", 422)
    );
  }

  const { name, email, password } = req.body;

  let existingUser;
  try {
    existingUser = await User.findOne({ email: email });
  } catch (err) {
    const error = new HttpError(
      "Signing up failed, please try again later.",
      500
    );
    return next(error);
  }

  if (existingUser) {
    const error = new HttpError(
      "An account already exists for this email. Please login or create a new account using a different email.",
      422
    );
    return next(error);
  }

  const createdUser = new User({
    name,
    email,
    image:
      "https://images.immediate.co.uk/production/volatile/sites/3/2017/11/David_Tennant_as_Dr_Who-d577db5.jpg?quality=90&crop=100px,0px,1096px,730px&resize=620,413",
    password,
    places: [],
  });

  try {
    //handle all the mongodb logic to save a document
    await createdUser.save();
  } catch (err) {
    const error = HttpError("Signing up failed, please try again.", 500);
    return next(error);
  }

  res.status(201).json({ user: createdUser.toObject({ getters: true }) });
};

// log in existing user
const loginUser = async (req, res, next) => {
  const { email, password } = req.body;

  let existingUser;

  try {
    existingUser = await User.findOne({ email: email });
  } catch (err) {
    const error = new HttpError(
      "Loging in failed, please try again later.",
      500
    );
    return next(error);
  }

  if (!existingUser || existingUser.password !== password) {
    const error = new HttpError("Invalid credentials, please try again.", 401);
    return next(error);
  }

  res.json({ message: "Logged in." });
};

exports.getUsers = getUsers;
exports.createUser = createUser;
exports.loginUser = loginUser;
