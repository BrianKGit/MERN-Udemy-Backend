const express = require('express');
const { check } = require('express-validator');

const placesControllers = require('../controllers/places-controller');

const router = express.Router();

// get place by place ID route
router.get('/:pid', placesControllers.getPlaceById);

// get place by creater's user ID route
router.get('/user/:uid', placesControllers.getPlacesByUserId);

// post place route
router.post(
    '/', 
    [
        check('title').not().isEmpty(),
        check('description').isLength({min: 5}),
        check('address').not().isEmpty()
    ], 
    placesControllers.createPlace
);

// patch place by ID (update) route
router.patch('/:pid', 
[
    check('title').not().isEmpty(),
    check('description').isLength({min: 5}),
], placesControllers.updatePlace);

// delete place by ID route
router.delete('/:pid', placesControllers.deletePlace);

module.exports = router;