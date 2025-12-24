const express = require('express');
const cors = require('cors');

const { PORT } = require('./src/config/env');
const { connectDB } = require('./src/config/db');
const authRoutes = require('./src/routes/authRoutes');
const appointmentRoutes = require('./src/routes/appointmentRoutes');
const notificationRoutes = require('./src/routes/notificationRoutes');
const profileRoutes = require('./src/routes/profileRoutes');
const testRoutes = require('./src/routes/testRoutes');
const settingsRoutes = require('./src/routes/settingsRoutes');
const sampleRoutes = require('./src/routes/sampleRoutes');
const dashboardRoutes = require('./src/routes/dashboardRoutes');
const userAdminRoutes = require('./src/routes/userAdminRoutes');
const inventoryRoutes = require('./src/routes/inventoryRoutes');
const supplierRoutes = require('./src/routes/supplierRoutes');
const staffRoutes = require('./src/routes/staffRoutes');
const attendanceRoutes = require('./src/routes/attendanceRoutes');
const staffSettingsRoutes = require('./src/routes/staffSettingsRoutes');
const profilingRoutes = require('./src/routes/profilingRoutes');
const patientRoutes = require('./src/routes/patientRoutes');
const financeRoutes = require('./src/routes/financeRoutes');
const ipdFinanceRoutes = require('./src/routes/ipdFinanceRoutes');

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

connectDB();

app.use('/api/auth', authRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/tests', testRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/labtech/samples', sampleRoutes);
app.use('/api/lab/dashboard', dashboardRoutes);
app.use('/api/admin', userAdminRoutes);
app.use('/api/lab/inventory', inventoryRoutes);
app.use('/api/lab/suppliers', supplierRoutes);
app.use('/api/lab/profiling', profilingRoutes);
app.use('/api/lab/staff', staffRoutes);
app.use('/api/lab/attendance', attendanceRoutes);
app.use('/api/lab/staff-settings', staffSettingsRoutes);
app.use('/api/lab/patients', patientRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/ipd/finance', ipdFinanceRoutes);

app.listen(PORT, () => console.log(`API running on port ${PORT}`));
