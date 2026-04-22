export const errorHandler = (err, req, res, next) => {
  // console.error(err);
console.log(err)
  // Default values
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  // Handle specific errors
  if (err.name === "ReferenceError") {
    return res.status(500).json({
      success: false,
      message: "Something undefined was used in the code",
      name:"ReferenceError"
    });
  }
  if (err?.errorResponse?.code == 11000||err?.code==11000) {
      const field = Object.keys(err.keyPattern)[0];
    const fieldValue = Object.keys(err.keyValue)[0];
    const value = err.keyValue[field];

    return res.status(400).json({
      success: false,
      message: `${field} '${value}' is already registered`,
    });
  }


  // if(err?.length){

  // }
  // If error is operational (created using AppError)
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
  }

  
console.log(err)
  // Programming / unknown errors
  return res.status(500).json({
    success: false,
    message: "Something went wrong",
    errors:err
  });
};
