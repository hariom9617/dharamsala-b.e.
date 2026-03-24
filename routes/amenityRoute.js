import express from 'express';
import amenityController from '../src/amenity/amenity.controller.js';
import auth from '../middleware/auth.js';
import { errorHandler } from '../utils/errors.js';

const router = express.Router();

router.use(auth);

router.get('/', amenityController.getAmenities.bind(amenityController));
router.get('/:id', amenityController.getAmenityById.bind(amenityController));

router.use(errorHandler);
export default router;
