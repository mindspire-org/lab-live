const Joi = require('joi');

const createAppointmentSchema = Joi.object({
  selectedTest: Joi.string().min(2).required(),
  fullName: Joi.string().min(3).required(),
  email: Joi.string().min(3).required(), // already validated as email/phone on frontend
  cnic: Joi.string().min(5).required(),
  selectedGuardian: Joi.string().allow('', null),
  guardianName: Joi.string().allow('', null),
  referringDoctor: Joi.string().allow('', null),
  address: Joi.string().allow('', null),
  priority: Joi.string().valid('normal', 'urgent').allow('', null),
  testPriority: Joi.string().valid('normal', 'urgent').allow('', null),
  homeSamplingPriority: Joi.string().valid('normal', 'urgent').allow('', null),
  gender: Joi.string().required(),
  age: Joi.number().integer().min(1).max(120).required(),
  date: Joi.string().required(),
  time: Joi.string().required(),
  paymentMethod: Joi.string().allow('', null),
  paymentStatus: Joi.string().valid('Pending', 'Online', 'Pay at Lab', 'Paid', 'Not paid').allow(null),
  testFee: Joi.number().integer().min(0).allow(null),
});

const updateAppointmentStatusSchema = Joi.object({
  status: Joi.string()
    .valid('Pending', 'Confirmed', 'Cancelled')
    .required(),
});

const updateAppointmentSchema = Joi.object({
  selectedTest: Joi.string().min(2).allow('', null),
  fullName: Joi.string().min(3).allow('', null),
  email: Joi.string().min(3).allow('', null),
  cnic: Joi.string().min(5).allow('', null),
  selectedGuardian: Joi.string().allow('', null),
  guardianName: Joi.string().allow('', null),
  referringDoctor: Joi.string().allow('', null),
  address: Joi.string().allow('', null),
  priority: Joi.string().valid('normal', 'urgent').allow('', null),
  testPriority: Joi.string().valid('normal', 'urgent').allow('', null),
  homeSamplingPriority: Joi.string().valid('normal', 'urgent').allow('', null),
  gender: Joi.string().allow('', null),
  age: Joi.number().integer().min(1).max(120).allow(null),
  date: Joi.string().allow('', null),
  time: Joi.string().allow('', null),
  paymentMethod: Joi.string().allow('', null),
  paymentStatus: Joi.string().valid('Pending', 'Online', 'Pay at Lab', 'Paid', 'Not paid').allow(null),
  testFee: Joi.number().min(0).allow(null),
}).min(1);

module.exports = {
  createAppointmentSchema,
  updateAppointmentStatusSchema,
  updateAppointmentSchema,
};
