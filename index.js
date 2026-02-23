const express = require('express');
const cron = require('node-cron');

const app = express();
app.use(express.json());

// ============== IN-MEMORY DATA STORES ==============

/** Patients: patientId, name, NIC, age, address, previousCaseHistory */
const patients = new Map();

/** Appointments: id, patientId, date, time, doctorName, cancelled */
const appointments = new Map();
let nextAppointmentId = 1;
let nextPatientId = 1;

// ============== PATIENT DATA MANAGEMENT ==============

/**
 * Update every patient's age by 1 year. Run automatically once per year (e.g. Jan 1).
 * Use a cron job instead of manual update.
 */
function updateAgeAutomaticallyEveryYear() {
  for (const [id, patient] of patients) {
    patient.age = (patient.age || 0) + 1;
  }
  return { updated: patients.size };
}

/**
 * Handle address change request for a patient.
 * @param {string} patientId - Patient ID
 * @param {string} newAddress - New address
 * @returns {object} Updated patient or error
 */
function handleAddressChangeRequest(patientId, newAddress) {
  const patient = patients.get(String(patientId));
  if (!patient) {
    return { success: false, error: 'Patient not found' };
  }
  const oldAddress = patient.address;
  patient.address = newAddress;
  return {
    success: true,
    patient,
    previousAddress: oldAddress,
    message: 'Address updated successfully',
  };
}

// ============== APPOINTMENT MANAGEMENT ==============

/**
 * Check if the doctor is available at the given date and time.
 * @param {string} doctorName - Doctor's name
 * @param {string} date - Date (YYYY-MM-DD)
 * @param {string} time - Time (e.g. "09:00")
 * @returns {object} { available: boolean, conflictingAppointment?: object }
 */
function checkDoctorAvailability(doctorName, date, time) {
  const conflict = [...appointments.values()].find(
    (apt) =>
      !apt.cancelled &&
      apt.doctorName === doctorName &&
      apt.date === date &&
      apt.time === time
  );
  return {
    available: !conflict,
    ...(conflict && { conflictingAppointmentId: conflict.id }),
  };
}

/**
 * Cancel an appointment by ID.
 * @param {number|string} appointmentId - Appointment ID
 * @returns {object} Result
 */
function cancelAppointment(appointmentId) {
  const apt = appointments.get(String(appointmentId));
  if (!apt) {
    return { success: false, error: 'Appointment not found' };
  }
  if (apt.cancelled) {
    return { success: false, error: 'Appointment is already cancelled' };
  }
  apt.cancelled = true;
  return {
    success: true,
    appointment: apt,
    message: 'Appointment cancelled successfully',
  };
}

// ============== CRON: AUTO UPDATE AGE EVERY YEAR ==============
// Runs at 00:00 on 1st January every year
cron.schedule('0 0 1 1 *', () => {
  const result = updateAgeAutomaticallyEveryYear();
  console.log(`[Cron] Age updated for ${result.updated} patients.`);
});

// ============== REST API ROUTES ==============

// --- Patients ---
app.get('/api/patients', (req, res) => {
  res.json([...patients.values()]);
});

app.get('/api/patients/:id', (req, res) => {
  const p = patients.get(req.params.id);
  if (!p) return res.status(404).json({ error: 'Patient not found' });
  res.json(p);
});

app.post('/api/patients', (req, res) => {
  const { name, NIC, age, address, previousCaseHistory } = req.body;
  const id = String(nextPatientId++);
  const patient = {
    patientId: id,
    name: name || '',
    NIC: NIC || '',
    age: age != null ? Number(age) : 0,
    address: address || '',
    previousCaseHistory: previousCaseHistory || '',
  };
  patients.set(id, patient);
  res.status(201).json(patient);
});

/** POST /api/patients/:id/address-change — handle address change request */
app.post('/api/patients/:id/address-change', (req, res) => {
  const result = handleAddressChangeRequest(req.params.id, req.body.newAddress);
  if (!result.success) return res.status(404).json(result);
  res.json(result);
});

/** POST /api/patients/update-ages — manually trigger yearly age update (for testing) */
app.post('/api/patients/update-ages', (req, res) => {
  const result = updateAgeAutomaticallyEveryYear();
  res.json({ message: 'Ages updated', ...result });
});

// --- Appointments ---
app.get('/api/appointments', (req, res) => {
  const list = [...appointments.values()];
  res.json(req.query.includeCancelled === 'true' ? list : list.filter((a) => !a.cancelled));
});

app.post('/api/appointments', (req, res) => {
  const { patientId, date, time, doctorName } = req.body;
  const check = checkDoctorAvailability(doctorName, date, time);
  if (!check.available) {
    return res.status(409).json({
      error: 'Doctor is not available at this slot',
      ...check,
    });
  }
  const id = String(nextAppointmentId++);
  const appointment = {
    id,
    patientId: String(patientId),
    date,
    time,
    doctorName,
    cancelled: false,
  };
  appointments.set(id, appointment);
  res.status(201).json(appointment);
});

/** GET /api/appointments/doctor-availability?doctorName=...&date=...&time=... */
app.get('/api/appointments/doctor-availability', (req, res) => {
  const { doctorName, date, time } = req.query;
  if (!doctorName || !date || !time) {
    return res.status(400).json({ error: 'doctorName, date, and time are required' });
  }
  res.json(checkDoctorAvailability(doctorName, date, time));
});

/** POST /api/appointments/:id/cancel — cancel appointment */
app.post('/api/appointments/:id/cancel', (req, res) => {
  const result = cancelAppointment(req.params.id);
  if (!result.success) return res.status(result.error === 'Appointment not found' ? 404 : 400).json(result);
  res.json(result);
});

// --- Health ---
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'Patient Management System' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Patient Management System backend running on http://localhost:${PORT}`);
});

// Export for tests if needed
module.exports = {
  app,
  patients,
  appointments,
  updateAgeAutomaticallyEveryYear,
  handleAddressChangeRequest,
  checkDoctorAvailability,
  cancelAppointment,
};
