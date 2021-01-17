const express = require('express');
const { check } = require('express-validator');

const usersControllers = require('../controllers/users-controller');

const router = express.Router();

// get all users route
router.get('/', usersControllers.getUsers);

// create new user and sign in user route
router.post('/signup',
    [
        check('name').not().isEmpty(), 
        check('email').normalizeEmail().isEmail(),
        check('password').isLength({min: 6})
    ], 
    usersControllers.createUser);

// log user in route
router.post('/login', usersControllers.loginUser);

module.exports = router;