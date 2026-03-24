// src/inventory/service.js
import Inventory from '../../model/inventory.js';
import { NotFoundError, BadRequestError } from '../../utils/errors.js';

export const getInventoryItems = async (filters = {}, pagination = {}) => {
  const { page = 1, limit = 50, search, ...queryFilters } = filters;
  const skip = (page - 1) * limit;

  const query = { ...queryFilters };

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { category: { $regex: search, $options: 'i' } }
    ];
  }

  const [items, total] = await Promise.all([
    Inventory.find(query)
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Inventory.countDocuments(query)
  ]);

  return {
    data: items,
    total,
    page: Number(page),
    limit: Number(limit)
  };
};

export const getInventoryItemById = async (id) => {
  const item = await Inventory.findById(id).lean();
  if (!item) {
    throw new NotFoundError('Inventory item not found');
  }
  return item;
};

export const createInventoryItem = async (data) => {
  const item = new Inventory(data);
  await item.save();
  return item;
};

export const updateInventoryItem = async (id, updates) => {
  const item = await Inventory.findByIdAndUpdate(
    id,
    { $set: updates },
    { new: true, runValidators: true }
  ).lean();

  if (!item) {
    throw new NotFoundError('Inventory item not found');
  }

  return item;
};

export const restockInventoryItem = async (id, { quantity, notes, invoiceNumber }) => {
  if (!quantity || quantity <= 0) {
    throw new BadRequestError('Quantity must be greater than 0');
  }

  const item = await Inventory.findById(id);
  if (!item) {
    throw new NotFoundError('Inventory item not found');
  }

  item.quantity += quantity;
  item.lastRestocked = new Date();
  if (notes) item.notes = notes;
  
  await item.save();
  return item.toObject();
};

export const deleteInventoryItem = async (id) => {
  const item = await Inventory.findByIdAndDelete(id);
  if (!item) {
    throw new NotFoundError('Inventory item not found');
  }
  return { success: true };
};