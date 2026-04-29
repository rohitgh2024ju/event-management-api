# Event Management API

## Overview

This project is a full-featured backend API for managing events, registrations, teams, attendance, and certificate generation.

It simulates a real-world event system with role-based access, scalable architecture, and production-oriented workflows—from authentication to post-event certification.

---

## Live Demo

[https://event-management-api-95f8.onrender.com]


> Note: The server may take ~10–20 seconds to wake up due to free hosting cold starts.

---

## 🚧 New Feature (In Progress)

### QR Attendance Web Page

A lightweight static frontend is currently being developed for QR-based attendance scanning.
GitHub repo: (https://github.com/rohitgh2024ju/event-scanner-client)
Live Site: (https://event-scanner-client.onrender.com/)

**Purpose:**

* Allow admins/organizers to scan QR codes directly via browser
* Remove dependency on Postman/manual API calls
* Provide real-time attendance marking UI

**Planned Features:**

* Camera-based QR scanner
* JWT-based admin authentication
* Scan result feedback (success/failure)
* Attendance logs preview

**Status:**
⚙️ In Development (basic scanning working, UI + auth integration pending)

---

## Features

### Authentication

* User signup & login
* JWT-based authentication (cookie + header support)
* Protected routes via middleware

---

### Event Management

* Create, update, delete events (Admin only)
* Fetch all events
* Fetch event by ID

---

### Registration System

* Event registration for users
* Duplicate registration prevention
* Event capacity validation
* View personal registrations

---

### Admin Dashboard

* View all registrations (filter by status, event, attendance)
* Approve / reject registrations
* Export registrations as CSV
* Event analytics

---

### Attendance System

* QR token-based verification
* Only approved users can be marked present
* Duplicate attendance prevention

---

### Teams System

* Create teams for events
* Join via team code
* Leader controls (remove members)
* Team size validation

---

### Certificates

* Generate participation certificates
* PDF certificates sent via email

---

### Notifications

Automated email notifications:

* Registration confirmation
* Approval / rejection updates
* Attendance confirmation
* Certificate delivery

---

## Tech Stack

* Node.js
* Express.js
* MongoDB (Mongoose)
* JSON Web Tokens (JWT)
* Nodemailer
* PDFKit
* QRCode
* json2csv

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
│   ├── attendanceRoutes.js
│   └── teamRoutes.js
│
├── models/
├── middlewares/
├── config/
├── app.js
├── .env
```

---

## API Base URL

```
https://event-management-api-95f8.onrender.com/api
```

---

## Key Endpoints

### Authentication

```
POST   /api/auth/signup
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me
```

---

### Events

```
POST   /api/events              (admin)
GET    /api/events
GET    /api/events/:id
PATCH  /api/events/:id          (admin)
DELETE /api/events/:id          (admin)
```

---

### Registration

```
POST   /api/events/:id/register
GET    /api/my/registrations
```

---

### Admin

```
GET    /api/admin/registrations
PATCH  /api/admin/registrations/:id
GET    /api/admin/registrations/export
POST   /api/admin/events/:eventId/certificates
GET    /api/admin/events/:eventId/analytics
```

---

### Attendance

```
POST   /api/attendance/scan
```

---

### Teams

```
POST   /api/events/:eventId/team
POST   /api/team/join
GET    /api/team/my
DELETE /api/team/:teamId/members/:userId
```

---

## 🔐 Demo Admin Access (For Recruiters)

Use the following credentials to explore admin features:

```
Email: admin.demo@eventflow.com
Password: Admin@123
```

**Capabilities:**

* Create & manage events
* Approve/reject registrations
* Access analytics
* Export CSV
* Trigger certificate generation

> Note: This is a demo account with limited dataset and may be reset periodically.

---

## Environment Variables

Create a `.env` file in the root:

```
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
EMAIL_USER=your_email
EMAIL_PASS=your_app_password
PORT=3000
NODE_ENV=development
```

---

## Installation

1. Clone the repository
2. Install dependencies:

```
npm install
```

3. Configure environment variables
4. Start server:

```
node app.js
```

---

## Usage Flow

1. User signs up & logs in
2. Admin creates an event
3. User registers
4. Admin approves/rejects
5. Approved users attend
6. QR scan marks attendance
7. Certificates are generated & emailed

---

## Testing

* Postman collection included
* Execute requests sequentially to simulate full workflow

---

## Notes

* Role-based access control enforced
* Admin-only routes protected via middleware
* Email failures do NOT block API responses
* Validation handled at schema + controller level

---

## AI Usage Disclosure

AI tools were used for:

* Debugging module issues
* Structuring controllers
* Improving error handling

All core architecture and logic were implemented and verified manually.

---

## License

This project is for educational and demonstration purposes.

---
