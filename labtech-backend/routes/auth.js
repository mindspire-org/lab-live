// Backwards-compatibility shim: export new authRoutes so any existing
// require('../routes/auth') continues to work.
module.exports = require('../src/routes/authRoutes');
