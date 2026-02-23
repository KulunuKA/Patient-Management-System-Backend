# Patient Management System Backend

A Node.js backend for a **Patient Management System**. It provides patient data management and appointment management via a REST API.

## Features

- **Patient Data Management** — Store and manage patients (ID, name, NIC, age, address, previous case history). Supports automatic yearly age updates and address change requests.
- **Appointment Management** — Create and manage appointments (patient ID, date, time, doctor name). Check doctor availability and cancel appointments.

## Run

```bash
npm install
npm start
```

Server runs at `http://localhost:3000`. Use the `/api/patients` and `/api/appointments` endpoints to interact with the system.


const express = require("express");
const bodyParser = require("body-parser");
const { v4: uuidv4 } = require("uuid");
const cron = require("node-cron");

const app = express();
app.use(bodyParser.json());

/* ===========================
   In-Memory Database
=========================== */

let patients = [];
let appointments = [];

/* ===========================
   1. PATIENT MANAGEMENT
=========================== */

// Create Patient
app.post("/patients", (req, res) => {
  const { name, nic, dob, address, history } = req.body;

  if (!name || !nic || !dob) {
    return res.status(400).json({ message: "Name, NIC and DOB required" });
  }

  const age = calculateAge(dob);

  const patient = {
    id: uuidv4(),
    name,
    nic,
    dob,
    age,
    address,
    history,
  };

  patients.push(patient);
  res.status(201).json(patient);
});

// Get All Patients
app.get("/patients", (req, res) => {
  res.json(patients);
});

/* ---------------------------
   a) Auto Update Age Yearly
--------------------------- */

function calculateAge(dob) {
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  return age;
}

// Cron job runs every day at midnight
cron.schedule("0 0 * * *", () => {
  patients.forEach((patient) => {
    patient.age = calculateAge(patient.dob);
  });
  console.log("Ages updated automatically.");
});

/* ---------------------------
   b) Address Change Request
--------------------------- */

app.put("/patients/:id/address", (req, res) => {
  const patient = patients.find((p) => p.id === req.params.id);

  if (!patient) {
    return res.status(404).json({ message: "Patient not found" });
  }

  patient.address = req.body.address;
  res.json({ message: "Address updated successfully", patient });
});

/* ===========================
   2. APPOINTMENT MANAGEMENT
=========================== */

// Create Appointment
app.post("/appointments", (req, res) => {
  const { patientId, date, time, doctorName } = req.body;

  if (!patientId || !date || !time || !doctorName) {
    return res.status(400).json({ message: "All fields required" });
  }

  const appointment = {
    id: uuidv4(),
    patientId,
    date,
    time,
    doctorName,
  };

  appointments.push(appointment);
  res.status(201).json(appointment);
});

/* ---------------------------
   a) Check Doctor Availability
--------------------------- */

app.get("/appointments/check", (req, res) => {
  const { doctorName, date, time } = req.query;

  const exists = appointments.find(
    (a) =>
      a.doctorName === doctorName &&
      a.date === date &&
      a.time === time
  );

  if (exists) {
    return res.json({ available: false });
  }

  res.json({ available: true });
});

/* ---------------------------
   b) Cancel Appointment
--------------------------- */

app.delete("/appointments/:id", (req, res) => {
  const index = appointments.findIndex(
    (a) => a.id === req.params.id
  );

  if (index === -1) {
    return res.status(404).json({ message: "Appointment not found" });
  }

  appointments.splice(index, 1);
  res.json({ message: "Appointment cancelled successfully" });
});

/* ===========================
   SERVER
=========================== */

app.listen(3000, () => {
  console.log("Server running on port 3000");
});