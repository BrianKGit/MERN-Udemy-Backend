// import library tool for validating input
const { validationResult } = require("express-validator");
const mongoose = require("mongoose");

// import my HttpError code found in the models folder
const HttpError = require("../models/http-error");
// import the function to get coordinates from an address found in the Google Maps API
const getCoordsForAddress = require("../util/location");
// import Place model
const Place = require("../models/place");
// import User model
const User = require("../models/user");

// funciton to return Place info in json format when located using a correct Place ID
const getPlaceById = async (req, res, next) => {
  const placeId = req.params.pid;

  let place;
  try {
    // search the database to find a place with the placeId entered, if found save as 'place'
    place = await Place.findById(placeId);
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not find a place.",
      500
    );
    return next(error);
  }

  // if there is not place found because the ID is not found in the data, throw an error
  if (!place) {
    const error = new HttpError(
      "Could not find a place for the provided ID",
      404
    );
    return next(error);
  }

  // respond with the place json data if found
  res.json({ place: place.toObject({ getters: true }) });
};

// funciton to return Place info in json format when located using a correct User ID attached to the Place
const getPlacesByUserId = async (req, res, next) => {
  const userId = req.params.uid;

  // search the database to find an array of places with the entered userId
  let userWithPlaces;

  try {
    userWithPlaces = await User.findById(userId).populate("places");
  } catch (err) {
    const error = new HttpError(
      "Fetching places failed, please try again later.",
      500
    );
    return next(error);
  }

  // if there is no places array found because the ID is not found in the data, throw an error
  if (!userWithPlaces || userWithPlaces.places.length === 0) {
    return next(
      new HttpError("Could not find places for the provided user ID", 404)
    );
  }

  // respond with the places json data if found
  res.json({
    places: userWithPlaces.places.map((place) =>
      place.toObject({ getters: true })
    ),
  });
};

// function to validate user input then create a new place
const createPlace = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // return here because we are not throwing an error, we don't want more code to execute if the error is found. Next function will not stop code automatically.
    return next(
      new HttpError("Invalid inputs passed, please check your data.", 422)
    );
  }

  const { title, description, address, creator } = req.body;

  let coordinates;
  try {
    coordinates = await getCoordsForAddress(address);
  } catch (error) {
    return next(error);
  }

  // const title = req.body.title
  const createdPlace = new Place({
    title,
    description,
    address,
    location: coordinates,
    image:
      "https://www.google.com/maps/uv?pb=!1s0x89c259a9b3117469%3A0xd134e199a405a163!3m1!7e115!4shttps%3A%2F%2Flh5.googleusercontent.com%2Fp%2FAF1QipPIrG3vAqzaWjf8qlrSq4wqQpmP1g1f1MeF3kEW%3Dw480-h320-k-no!5sempire%20state%20building%20-%20Google%20Search!15sCgIgAQ&imagekey=!1e10!2sAF1QipOgu_gwbPWJXg6OjmVXFHPr7wV1QyiOweOiaTbZ&hl=en&sa=X&ved=2ahUKEwilsf_XjYPtAhUMFlkFHVIsAc8QoiowJnoECBsQAw",
    creator,
  });

  let user;

  // check to see if the user already exists
  try {
    user = await User.findById(creator);
  } catch (err) {
    const error = new HttpError(
      "Creating place failed, please try again.",
      500
    );
    return next(error);
  }

  // if the user doesn't exist, error
  if (!user) {
    const error = new HttpError(
      "Could not find a user for the provided id.",
      404
    );
    return next(error);
  }

  console.log(user);

  // we need to execute multiple operations. If either creating the place fails or storing the user id fails, we want to throw the error without changing anything. Do this by using sessions and transactions.
  try {
    // part 1: store the place
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await createdPlace.save({ session: sess });

    // part 2: make sure the placeId is added to the user
    user.places.push(createdPlace);
    await user.save({ session: sess });

    // seesion commits transaction
    await sess.commitTransaction();
  } catch (err) {
    const error = HttpError("Creating place failed, please try again.", 500);
    return next(error);
  }

  res.status(201).json({ place: createdPlace });
};

const updatePlace = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(
      new HttpError("Invalid inputs passed, please check your data.", 422)
    );
  }

  const { title, description } = req.body;
  const placeId = req.params.pid; // { pid: 'p1'}

  let place;

  // find the place to update by the ID
  try {
    place = await Place.findById(placeId);
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not update place.",
      500
    );
    return next(error);
  }

  place.title = title;
  place.description = description;

  // save updated place to the DB
  try {
    await place.save();
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not update place.",
      500
    );
    return next(error);
  }

  // getters: true to get an id without the underscore ex: _id
  res.status(200).json({ place: place.toObject({ getters: true }) });
};

const deletePlace = async (req, res, next) => {
  const placeId = req.params.pid;

  let place;

  // find the place to delete by the ID
  try {
    place = await Place.findById(placeId).populate("creator");
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not delete place.",
      500
    );
    return next(error);
  }

  // check if the place exists
  if (!place) {
    const error = new HttpError(
      "Could not find a place for the provided placeId.",
      404
    );
    return next(error);
  }

  // delete place from the DB
  try {
    // part 1: start seesion and remove the place.
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await place.remove({ session: sess });

    // part 2: make sure the place is removed from the user document it is stored in as well.
    place.creator.places.pull(place);
    await place.creator.save({ session: sess });

    // seesion commits transaction.
    await sess.commitTransaction();
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not delete place.",
      500
    );
    return next(error);
  }

  res.status(200).json({ message: "Deleted place." });
};

exports.getPlaceById = getPlaceById;
exports.getPlacesByUserId = getPlacesByUserId;
exports.createPlace = createPlace;
exports.updatePlace = updatePlace;
exports.deletePlace = deletePlace;
