const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors: Object.values(err.errors).map(e => e.message)
    });
  }

  if (err.name === 'MongoError' && err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    
    // Handle compound unique index for roomNumber + hotelId
    if (err.keyPattern && err.keyPattern.hotelId && err.keyPattern.roomNumber) {
      return res.status(409).json({
        success: false,
        message: 'Room number already exists in this hotel'
      });
    }
    
    return res.status(409).json({
      success: false,
      message: `${field} already exists`
    });
  }

  // Handle MongoDB duplicate key error (newer versions use MongoServerError)
  if (err.name === 'MongoServerError' && err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    
    // Handle compound unique index for roomNumber + hotelId
    if (err.keyPattern && err.keyPattern.hotelId && err.keyPattern.roomNumber) {
      return res.status(409).json({
        success: false,
        message: 'Room number already exists in this hotel'
      });
    }
    
    return res.status(409).json({
      success: false,
      message: `${field} already exists`
    });
  }

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorHandler;