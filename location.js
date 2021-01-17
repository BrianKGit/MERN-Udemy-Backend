const axios = require('axios');
const HttpError = require('../models/http-error');

const API_KEY = 'AIzaSyDLGlzZ7R9fsbQ2x7xwe_HyNuOD5HULzH0';


async function getCoordsForAddress(address) {
//    return {
//            lat: 40.747956,
//            lng: -73.987369
//        };
    const response = await axios.get(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${API_KEY}`
    );

    const data = response.data;

    if (!data || data.status === 'ZERO_RESULTS') {
        const error = new HttpError('Could not find location for the specified address.', 422);
        throw error;
    }

    const coordinates = data.results[0].geometry.location;

    return coordinates;
}

module.exports = getCoordsForAddress;