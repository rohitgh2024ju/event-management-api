# Event Management API

## Overview

This project is a backend API for managing events, registrations, and attendance. It provides a complete workflow from user authentication to event participation, admin approval, attendance tracking, and certificate generation.

The system is designed with a modular structure, role-based access control, and practical features that reflect real-world event management requirements.

---

## Features

### Authentication

* User signup and login
* JWT-based authentication using cookies
* Protected routes using middleware

### Event Management

* Create, update, delete events (admin only)
* View all events
* View event by ID

### Registration System

* Users can register for events
* Prevent duplicate registrations
* Capacity validation for events
* View personal registrations

### Admin Dashboard

* View all registrations with filtering
* Approve or reject registrations
* Export registrations as CSV

### Attendance System

* QR-based attendance verification
* Only approved users can be marked present
* Admin-controlled attendance scanning

### Certificates

* Generate participation certificates for attendees
* Certificates are sent via email as PDF attachments

### Notifications

* Email notifications for approval and rejection
* Certificate delivery via email

---

## Tech Stack

* Node.js
* Express.js
* MongoDB (Mongoose)
* JWT Authentication
* Nodemailer (Email)
* PDFKit (Certificate generation)
* json2csv (Data export)

---

## Project Structure

```
project/
│
├── controllers/
├── routes/
│   ├── authRoutes.js
│   ├── eventRoutes.js
│   ├── regRoutes.js
│   └── attendanceRoutes.js
│
├── models/
├── middlewares/
├── app.js
├── .env
```

---

## API Base URL

```
http://localhost:3000/api
```

---

## Key Endpoints

### Authentication

POST   /api/auth/signup
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me


### Events

POST   /api/events                (admin)
GET    /api/events
GET    /api/events/:id
PATCH  /api/events/:id            (admin)
DELETE /api/events/:id            (admin)


### Registration

POST   /api/events/:id/register
GET    /api/my/registrations


### Admin

GET    /api/admin/registrations
PATCH  /api/admin/registrations/:id
GET    /api/admin/registrations/export
POST   /api/admin/events/:eventId/certificates
GET    /api/admin/events/:eventId/analytics


### Attendance

POST   /api/attendance/scan


### Teams

POST   /api/events/:eventId/team
POST   /api/team/join
GET    /api/team/my
DELETE /api/team/:teamId/members/:userId
---

## Environment Variables

Create a `.env` file in the root directory:

```
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
EMAIL_USER=your_email
EMAIL_PASS=your_app_password
PORT=3000
```

---

## Installation

1. Clone the repository
2. Install dependencies

```
npm install
```

3. Add environment variables

4. Start the server

```
node app.js
```

---

## Usage Flow

1. User signs up and logs in
2. Admin creates an event
3. User registers for the event
4. Admin approves or rejects registration
5. Approved users attend the event
6. Admin marks attendance using QR token
7. Certificates are generated and emailed to attendees

---

## Documentation

A Postman collection is included for testing all endpoints. Import the collection and execute requests in sequence to simulate the full workflow.

---

## Notes

* Role-based access is enforced using middleware
* Sensitive operations are restricted to admin users
* Email sending failures do not block API responses
* Data validation is handled at both controller and schema levels

---

## License

This project is for educational and demonstration purposes.
