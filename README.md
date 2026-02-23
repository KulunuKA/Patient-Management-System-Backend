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
