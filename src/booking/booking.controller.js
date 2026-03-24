// src/booking/booking.service.js

import BookingService from "./booking.service.js";
import { ForbiddenError, NotFoundError } from "../../utils/errors.js";
import Room from "../../model/room.js";

class BookingController {

  static async create(req, res, next) {
    try {
      const role = req.user.effectiveRole;

      if (req.body.roomId?.startsWith("room_")) {
        const room = await Room.findOne({ id: req.body.roomId });
        if (!room) throw new NotFoundError("Room not found");
        req.body.roomId = room._id;
      }

      let booking;

      if (role === "guest") {
        booking = await BookingService.createGuestBooking(req.body, req.user);
      } else {
        booking = await BookingService.create(req.body, req.user.userId);
      }

      res.status(201).json({
        success: true,
        data: booking
      });

    } catch (err) {
      next(err);
    }
  }

  static async getMyBookings(req, res, next) {
    try {
      if (req.user.effectiveRole !== "guest")
        throw new ForbiddenError("Guests only");

      const result = await BookingService.getGuestBookings(
        req.user.userId,
        req.query
      );

      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  static async getMyBookingHistory(req, res, next) {
    return this.getMyBookings(req, res, next);
  }

  static async checkInOwn(req, res, next) {
    try {
      const booking = await BookingService.checkInWithRoomUpdate(
        req.params.id,
        req.user.userId
      );
      res.json({ success: true, data: booking });
    } catch (err) {
      next(err);
    }
  }

  static async checkOutOwn(req, res, next) {
    try {
      const booking = await BookingService.checkOutWithCalculation(
        req.params.id,
        req.user.userId
      );
      res.json({ success: true, data: booking });
    } catch (err) {
      next(err);
    }
  }

  static async list(req, res, next) {
    try {
      const result = await BookingService.getAll(req.query);
      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  static async getById(req, res, next) {
    try {
      const booking = await BookingService.getById(req.params.id);
      res.json({ success: true, data: booking });
    } catch (err) {
      next(err);
    }
  }

  static async update(req, res, next) {
    try {
      const booking = await BookingService.update(
        req.params.id,
        req.body,
        req.user.userId
      );
      res.json({ success: true, data: booking });
    } catch (err) {
      next(err);
    }
  }

  static async checkIn(req, res, next) {
    return this.checkInOwn(req, res, next);
  }

  static async checkOut(req, res, next) {
    return this.checkOutOwn(req, res, next);
  }

  static async cancel(req, res, next) {
    try {
      const booking = await BookingService.cancel(
        req.params.id,
        req.body,
        req.user.userId
      );
      res.json({ success: true, data: booking });
    } catch (err) {
      next(err);
    }
  }
}

export default BookingController;