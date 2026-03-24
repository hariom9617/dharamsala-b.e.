// middleware/validators/posOrder.js
import { body, query, validationResult } from "express-validator";

const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array().map(err => err.msg)
    });
  }
  next();
};

export const validateCreatePOSOrder = [
  body("hotelId").notEmpty().withMessage("hotelId is required"),
  body("items").isArray({ min: 1 }).withMessage("At least one item is required"),
  body("items.*.name").notEmpty().withMessage("Item name is required"),
  body("items.*.price").isFloat({ min: 0 }).withMessage("Price must be positive"),
  body("items.*.quantity").isInt({ min: 1 }).withMessage("Quantity must be at least 1"),
  body("paymentMethod")
    .isIn(["cash", "card", "upi", "wallet"])
    .withMessage("Invalid payment method"),
  handleValidation
];

export const validateGetPOSOrders = [
  query("hotelId").notEmpty().withMessage("hotelId is required"),
  query("date").optional().isISO8601().withMessage("Invalid date format"),
  query("paymentMethod")
    .optional()
    .isIn(["cash", "card", "upi", "wallet"]),
  query("page").optional().isInt({ min: 1 }).toInt(),
  query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
  handleValidation
];
