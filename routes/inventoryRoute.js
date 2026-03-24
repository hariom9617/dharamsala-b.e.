import express from 'express';
import InventoryController from '../src/inventory/inventory.controller.js';
import auth from '../middleware/auth.js';
import { requirePermission } from '../middleware/permissions.js';
import { errorHandler } from '../utils/errors.js';

const router = express.Router();
router.use(auth);

router.get('/',    requirePermission('inventory.view'),   InventoryController.getInventoryItems);
router.get('/:id', requirePermission('inventory.view'),   InventoryController.getInventoryItem);

router.post('/',   requirePermission('inventory.create'), InventoryController.createInventoryItem);
router.put('/:id', requirePermission('inventory.update'), InventoryController.updateInventoryItem);

/* restock – same as update permission; only admin/director/manager reach here */
router.post('/:id/restock', requirePermission('inventory.update'), InventoryController.restockInventoryItem);

/* delete – only admin has inventory.delete (via *) */
router.delete('/:id', requirePermission('inventory.delete'), InventoryController.deleteInventoryItem);

router.use(errorHandler);
export default router;
