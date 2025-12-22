const Joi = require('joi');

const signupPatientSchema = Joi.object({
  name: Joi.string().min(2).max(100).required().messages({
    'string.empty': 'Name is required',
  }),
  email: Joi.string().email().required().messages({
    'string.empty': 'Email is required',
    'string.email': 'Please provide a valid email address',
  }),
  password: Joi.string().min(8).max(128).required().messages({
    'string.empty': 'Password is required',
    'string.min': 'Password must be at least 8 characters long',
  }),
});

const loginSchema = Joi.object({
  emailOrPhone: Joi.string().min(3).required().messages({
    'string.empty': 'Email or phone is required',
  }),
  password: Joi.string().min(1).required().messages({
    'string.empty': 'Password is required',
  }),
});

module.exports = {
  signupPatientSchema,
  loginSchema,
};
