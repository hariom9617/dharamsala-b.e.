// routes/menuItemRoute.js
import express from 'express';
import MenuItemController from '../src/menuItem/menuItem.controller.js';
import auth from '../middleware/auth.js';
import { requirePermission } from '../middleware/permissions.js';
import { errorHandler } from '../utils/errors.js';
import { uploadMenuImage } from '../utils/s3Manager.js';

const router = express.Router();

router.use(auth);

router.get('/', requirePermission('menu.view'), MenuItemController.getMenuItems);
router.get('/:id', requirePermission('menu.view'), MenuItemController.getMenuItemById);

router.post('/', requirePermission('menu.create'), uploadMenuImage, MenuItemController.createMenuItem);
router.put('/:id', requirePermission('menu.update'), uploadMenuImage, MenuItemController.updateMenuItem);

router.patch('/:id/availability', requirePermission('menu.update'), MenuItemController.toggleAvailability);

router.delete('/:id', requirePermission('menu.delete'), MenuItemController.deleteMenuItem);

router.use(errorHandler);

export default router;