# Event Management API

## Overview

This project is a backend API for managing events, registrations, teams, and attendance. It implements a complete workflow from user authentication to event participation, admin approval, attendance tracking, and certificate generation.

The system is designed with a modular architecture, role-based access control, and production-style features aligned with real-world event management systems.

---

## Live Demo

https://event-management-api-95f8.onrender.com

Note: The server may take a few seconds to respond initially due to free hosting cold starts.

---

## Features

### Authentication

- User signup and login
- JWT-based authentication (cookie/header supported)
- Protected routes using middleware

### Event Management

- Create, update, delete events (admin only)
- View all events
- View event by ID

### Registration System

- Users can register for events
- Duplicate registration prevention
- Capacity validation (max participants)
- View personal registrations

### Admin Dashboard

- View all registrations with filters (status, attended, event)
- Approve or reject registrations
- Export registrations as CSV

### Attendance System

- QR token-based attendance verification
- Only approved users can be marked present
- Prevent duplicate attendance marking

### Teams System

- Create teams for team-based events
- Join teams using a team code
- Remove team members (leader only)
- Enforce team size limits

### Certificates

- Generate participation certificates for attendees
- Certificates sent via email as PDF attachments

### Notifications

- Email notifications for:
  - Registration success
  - Approval / rejection
  - Attendance confirmation
  - Certificate delivery

---

## Tech Stack

- Node.js
- Express.js
- MongoDB (Mongoose)
- JSON Web Tokens (JWT)
- Nodemailer
- PDFKit
- QRCode
- json2csv

---

## Project Structure
project/
│
├── controllers/
├── routes/
│ ├── authRoutes.js
│ ├── eventRoutes.js
│ ├── regRoutes.js
│ ├── attendanceRoutes.js
│ └── teamRoutes.js
│
├── models/
├── middlewares/
├── config/
├── app.js
├── .env


---

## API Base URL


https://event-management-api-95f8.onrender.com/api


---

## Key Endpoints

### Authentication


POST /api/auth/signup
POST /api/auth/login
POST /api/auth/logout
GET /api/auth/me


---

### Events


POST /api/events (admin)
GET /api/events
GET /api/events/:id
PATCH /api/events/:id (admin)
DELETE /api/events/:id (admin)


---

### Registration


POST /api/events/:id/register
GET /api/my/registrations


---

### Admin


GET /api/admin/registrations
PATCH /api/admin/registrations/:id
GET /api/admin/registrations/export
POST /api/admin/events/:eventId/certificates
GET /api/admin/events/:eventId/analytics


---

### Attendance


POST /api/attendance/scan


---

### Teams


POST /api/events/:eventId/team
POST /api/team/join
GET /api/team/my
DELETE /api/team/:teamId/members/:userId


---

## Environment Variables

Create a `.env` file in the root directory:


MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
EMAIL_USER=your_email
EMAIL_PASS=your_app_password
PORT=3000
NODE_ENV=development


---

## Installation

1. Clone the repository
2. Install dependencies


npm install


3. Configure environment variables

4. Start the server


node app.js


---

## Usage Flow

1. User signs up and logs in
2. Admin creates an event
3. User registers for the event
4. Admin approves or rejects registration
5. Approved users attend the event
6. Attendance is marked via QR token
7. Certificates are generated and sent via email

---

## Testing

A Postman collection is included for testing all endpoints. Import the collection and execute requests sequentially to simulate the full workflow.

---

## Notes

- Role-based access control is enforced via middleware
- Sensitive operations are restricted to admin users
- Email failures do not block API responses
- Input validation is handled at both controller and schema levels

---

## AI Usage Disclosure

AI tools were used during development for:
- Debugging module import/export issues
- Structuring controller logic
- Improving error handling patterns

All core logic and architecture decisions were implemented and verified manually.

---

## License

This project is intended for educational and demonstration purposes.