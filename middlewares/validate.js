import { validationResult } from "express-validator";

const validate = (req, res, next) => {

  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((err) => ({
      field: err.path,
      message: err.msg,
    }));
    // console.log(formattedErrors);
    
    // Pass error to error handler and STOP execution
    return next(new Error(JSON.stringify(formattedErrors)));
  }
  
  // Only call next() if no errors
  next();
};

export default validate;