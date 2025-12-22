const express = require('express');
const router = express.Router();

const { signupPatient, login } = require('../controllers/authController');
const validate = require('../middleware/validate');
const { signupPatientSchema, loginSchema } = require('../validation/authValidation');

router.post('/signup-patient', validate(signupPatientSchema), signupPatient);
router.post('/login', validate(loginSchema), login);

module.exports = router;
