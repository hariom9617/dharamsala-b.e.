import Staff from "../../model/staff.js";
import Hotel from "../../model/hotel.js";
import { BadRequestError, NotFoundError, ForbiddenError } from "../../utils/errors.js";
import mongoose from "mongoose";

class StaffService {
  /* ================= CREATE ================= */
  async create(data, requester) {
    const { name, phone, email, role = "staff", hotelId, managerId } = data;

    if (!name || !phone) {
      throw new BadRequestError("Name and phone are required");
    }

    if (!["admin", "director", "manager", "staff"].includes(role)) {
      throw new BadRequestError("Invalid staff role");
    }

    if (role !== "admin" && !hotelId) {
      throw new BadRequestError("Hotel ID is required");
    }

    // Hierarchy check: requester can only create roles below them
    if (requester) {
      const requesterRole = requester.effectiveRole;
      const hierarchyOrder = ['admin', 'director', 'manager', 'staff'];
      const requesterLevel = hierarchyOrder.indexOf(requesterRole);
      const targetLevel = hierarchyOrder.indexOf(role);

      if (requesterLevel >= targetLevel) {
        throw new ForbiddenError(`You cannot create a ${role} - insufficient privileges`);
      }

      // Non-admin can only create staff in their own hotel
      if (requesterRole !== 'admin' && hotelId !== requester.hotelId?.toString()) {
        throw new ForbiddenError("You can only create staff in your own hotel");
      }
    }

    if (hotelId) {
      const hotel = await Hotel.findById(hotelId);
      if (!hotel) throw new BadRequestError("Hotel not found");

      if (hotel.status !== "active") {
        throw new BadRequestError(
          "Cannot assign staff to inactive or closed hotel"
        );
      }
    }

    const exists = await Staff.findOne({ phone });
    if (exists) {
      throw new BadRequestError("Staff with this phone already exists");
    }

    const staffData = {
      name,
      phone,
      email,
      role,
      hotelId: role === "admin" ? null : hotelId,
      isActive: true
    };

    // If manager is creating staff, link them
    if (requester?.effectiveRole === 'manager' && role === 'staff') {
      staffData.managerId = requester.id;
    } else if (managerId && mongoose.Types.ObjectId.isValid(managerId)) {
      staffData.managerId = managerId;
    }

    return Staff.create(staffData);
  }

  /* ================= GET ALL ================= */
   
  async getAll(query = {}) {
    let {
      page = 1,
      limit = 10,
      search,
      role,
      hotelId,
      sortBy = "createdAt",
      order = "desc",
      requesterRole,
      requesterId
    } = query;

    page = Math.max(1, parseInt(page));
    limit = Math.min(50, Math.max(1, parseInt(limit)));
    const skip = (page - 1) * limit;

    /* ================= BASE FILTER ================= */

    const filter = { isActive: true };

    /* ================= ROLE HIERARCHY CONTROL ================= */

    const roleHierarchy = {
      admin: ["director", "manager", "staff"],
      director: ["manager", "staff"],
      manager: ["staff"]
    };

    const allowedRoles = roleHierarchy[requesterRole] || [];

    if (!allowedRoles.length) {
      return {
        data: [],
        counts: { director: 0, manager: 0, staff: 0 },
        pagination: { total: 0, page, limit, pages: 0 }
      };
    }

    // Apply role filter from dropdown safely
    if (role && allowedRoles.includes(role)) {
      filter.role = role;
    } else {
      filter.role = { $in: allowedRoles };
    }

    /* ================= HOTEL SCOPE ================= */

    if (requesterRole !== "admin") {
      filter.hotelId = new mongoose.Types.ObjectId(hotelId);
    }

    /* ================= SEARCH ================= */

    if (search) {
      const regex = new RegExp(search, "i");
      filter.$or = [
        { name: regex },
        { phone: regex },
        { email: regex }
      ];
    }

    /* ================= SORTING ================= */

    const allowedSortFields = ["name", "createdAt", "role"];
    const finalSortField = allowedSortFields.includes(sortBy)
      ? sortBy
      : "createdAt";

    const sortDirection = order === "asc" ? 1 : -1;

    const sortOption =
      finalSortField === "name"
        ? { name: sortDirection }
        : { [finalSortField]: sortDirection };

    /* ================= QUERY EXECUTION ================= */

    const [data, total] = await Promise.all([
      Staff.find(filter)
        .sort(sortOption)
        .skip(skip)
        .limit(limit)
        .populate("hotelId", "name city contact")
        .lean(),
      Staff.countDocuments(filter)
    ]);

    /* ================= ROLE COUNTS ================= */

    const roleCountsAgg = await Staff.aggregate([
      { $match: filter },
      {
        $group: {
          _id: "$role",
          count: { $sum: 1 }
        }
      }
    ]);

    const counts = { director: 0, manager: 0, staff: 0 };

    roleCountsAgg.forEach(r => {
      counts[r._id] = r.count;
    });

    /* ================= FINAL RESPONSE ================= */

    return {
      data,
      counts,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /* ================= GET BY HOTEL ID ================= */
  async getByHotelId(hotelId, options = {}) {
    let {
      page = 1,
      limit = 10,
      search,
      role,
      sortBy = "createdAt",
      order = "desc",
      requesterRole,
      requesterId
    } = options;

    // Validate hotelId
    if (!mongoose.Types.ObjectId.isValid(hotelId)) {
      throw new BadRequestError("Invalid hotelId format");
    }

    page = Math.max(1, parseInt(page));
    limit = Math.min(50, Math.max(1, parseInt(limit)));
    const skip = (page - 1) * limit;

    /* ================= BASE FILTER ================= */
    const filter = { 
      hotelId: new mongoose.Types.ObjectId(hotelId),
      isActive: true 
    };

    /* ================= ROLE HIERARCHY CONTROL ================= */
    const roleHierarchy = {
      admin: ["director", "manager", "staff"],
      director: ["manager", "staff"],
      manager: ["staff"]
    };

    const allowedRoles = roleHierarchy[requesterRole] || [];

    if (!allowedRoles.length) {
      return {
        data: [],
        pagination: { total: 0, page, limit, pages: 0 }
      };
    }

    // Apply role filter from dropdown safely
    if (role && allowedRoles.includes(role)) {
      filter.role = role;
    } else {
      filter.role = { $in: allowedRoles };
    }

    /* ================= SEARCH ================= */
    if (search) {
      const regex = new RegExp(search, "i");
      filter.$or = [
        { name: regex },
        { phone: regex },
        { email: regex }
      ];
    }

    /* ================= SORTING ================= */
    const allowedSortFields = ["name", "createdAt", "role"];
    const finalSortField = allowedSortFields.includes(sortBy)
      ? sortBy
      : "createdAt";

    const sortDirection = order === "asc" ? 1 : -1;

    const sortOption =
      finalSortField === "name"
        ? { name: sortDirection }
        : { [finalSortField]: sortDirection };

    /* ================= QUERY EXECUTION ================= */
    const [data, total] = await Promise.all([
      Staff.find(filter)
        .sort(sortOption)
        .skip(skip)
        .limit(limit)
        .lean(),
      Staff.countDocuments(filter)
    ]);

    return {
      data,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    };
  }


  /* ================= GET DIRECTOR INFO (for Manager view) ================= */
  async getDirectorForManager(hotelId) {
    const director = await Staff.findOne({
      hotelId,
      role: 'director',
      isActive: true
    }).select('name').lean();

    return director ? { name: director.name } : null;
  }

  /* ================= GET ONE ================= */
  async getById(id, requester = null) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestError("Invalid staff ID");
    }

    const staff = await Staff.findOne({
      _id: id,
      isActive: true
    })
      .populate("hotelId", "name status")
      .lean();

    if (!staff) {
      throw new NotFoundError("Staff not found");
    }

    // Apply role-based visibility if requester provided
    if (requester) {
      const role = requester.effectiveRole;

      // Admin: full access
      if (role === 'admin') {
        return staff;
      }

      // Director: can view all staff in their hotel
      if (role === 'director') {
        if (staff.hotelId?._id?.toString() !== requester.hotelId?.toString() &&
            staff.hotelId?.toString() !== requester.hotelId?.toString()) {
          throw new ForbiddenError("Cannot view staff from other hotels");
        }
        return staff;
      }

      // Manager: can view staff (full) and director (name only)
      if (role === 'manager') {
        if (staff.hotelId?._id?.toString() !== requester.hotelId?.toString() &&
            staff.hotelId?.toString() !== requester.hotelId?.toString()) {
          throw new ForbiddenError("Cannot view staff from other hotels");
        }

        // Cannot view other managers
        if (staff.role === 'manager' && staff._id.toString() !== requester.id.toString()) {
          throw new ForbiddenError("Cannot view other managers");
        }

        // Director: return only name
        if (staff.role === 'director') {
          return { _id: staff._id, name: staff.name, role: staff.role };
        }

        return staff;
      }

      // Staff: cannot view other staff
      if (role === 'staff') {
        if (staff._id.toString() !== requester.id.toString()) {
          throw new ForbiddenError("Staff cannot view other staff members");
        }
        return staff;
      }

      // Guest: no access
      throw new ForbiddenError("You do not have permission to view staff");
    }

    return staff;
  }

  /* ================= UPDATE ================= */
  async update(id, data, requester = null) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestError("Invalid staff ID");
    }

    const staff = await Staff.findById(id).populate("hotelId", "status");
    if (!staff) throw new NotFoundError("Staff not found");

    // Apply role-based access control if requester provided
    if (requester) {
      const role = requester.effectiveRole;
      const hierarchyOrder = ['admin', 'director', 'manager', 'staff', 'guest'];
      const requesterLevel = hierarchyOrder.indexOf(role);
      const targetLevel = hierarchyOrder.indexOf(staff.role);

      // Admin can update anyone
      if (role !== 'admin') {
        // Can only update roles below you
        if (requesterLevel >= targetLevel) {
          throw new ForbiddenError(`You cannot update a ${staff.role}`);
        }

        // Non-admin can only update staff in their own hotel
        if (staff.hotelId?._id?.toString() !== requester.hotelId?.toString() &&
            staff.hotelId?.toString() !== requester.hotelId?.toString()) {
          throw new ForbiddenError("You can only update staff in your own hotel");
        }

        // Prevent role escalation
        if (data.role) {
          const newRoleLevel = hierarchyOrder.indexOf(data.role);
          if (newRoleLevel <= requesterLevel) {
            throw new ForbiddenError(`You cannot promote someone to ${data.role}`);
          }
        }
      }
    }

    if (data.isActive === true) {
      if (staff.hotelId && staff.hotelId.status !== "active") {
        throw new BadRequestError(
          "Cannot activate staff while hotel is not active"
        );
      }
    }

    const updated = await Staff.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true
    }).lean();

    if (!updated) {
      throw new NotFoundError("Staff not found");
    }

    return updated;
  }

  /* ================= DELETE ================= */
  async remove(id, requester = null) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestError("Invalid staff ID");
    }

    const staff = await Staff.findById(id);
    if (!staff) {
      throw new NotFoundError("Staff not found");
    }

    // Apply role-based access control if requester provided
    if (requester) {
      const role = requester.effectiveRole;
      const hierarchyOrder = ['admin', 'director', 'manager', 'staff', 'guest'];
      const requesterLevel = hierarchyOrder.indexOf(role);
      const targetLevel = hierarchyOrder.indexOf(staff.role);

      // Admin can delete anyone
      if (role !== 'admin') {
        // Can only delete roles below you
        if (requesterLevel >= targetLevel) {
          throw new ForbiddenError(`You cannot delete a ${staff.role}`);
        }

        // Non-admin can only delete staff in their own hotel
        if (staff.hotelId?.toString() !== requester.hotelId?.toString()) {
          throw new ForbiddenError("You can only delete staff in your own hotel");
        }
      }
    }

    await staff.deleteOne();
    return true;
  }
}

export default new StaffService();
