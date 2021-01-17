const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");

const placesRoutes = require("./routes/places-routes");
const usersRoutes = require("./routes/users-routes");
const HttpError = require("./models/http-error");

const app = express();

app.use(bodyParser.json()); // parse body before routes

// routes
app.use("/api/places", placesRoutes); // => /api/places/...
app.use("/api/users", usersRoutes); // => /api/users/...

//error handling for unsupported routes
app.use((req, res, next) => {
  const error = new HttpError("Could not find this route", 404);
  throw error;
});

// error handling middleware with 4 parameters
app.use((error, req, res, next) => {
  if (res.headerSent) {
    return next(error);
  }
  res.status(error.code || 500);
  res.json({ message: error.message || "An unknown error occured." });
});

mongoose
  .connect(
    "mongodb+srv://BrianK:TodayIsAG00dDay2Die@cluster0.sr7ox.mongodb.net/mern?retryWrites=true&w=majority"
  )
  .then(() => {
    app.listen(5000);
  })
  .catch((err) => {
    console.log(err);
  });
