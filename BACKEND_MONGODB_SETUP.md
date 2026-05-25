# Backend and MongoDB Atlas Setup Guide

## Current Completed Features

- MongoDB Atlas is connected successfully to the backend.
- User registration and login are connected to MongoDB.
- Login redirects correctly to `shell.html`.
- KPI CRUD is connected to MongoDB:
  - Create KPI
  - View KPI
  - Update KPI
  - Delete KPI
- KPI assignment updates assigned staff in MongoDB.
- Staff Dashboard and KPI Progress load assigned KPIs from MongoDB.
- Evidence submission and progress updates are stored in MongoDB.
- Uploaded evidence files are stored in `backend/uploads`.
- Manager can approve or reject KPI submissions.
- Dashboard, KPI list, and Report page use MongoDB data.

## Current Backend APIs

- `/api/auth`
- `/api/kpis`
- `/api/evidence`

## MongoDB Atlas Access

The group leader will invite each teammate's email into the MongoDB Atlas project.

Steps:

1. Open the MongoDB Atlas invitation email.
2. Login or create a MongoDB Atlas account.
3. Accept the invitation.
4. Open the shared project: `KPI Management System`.

Network Access is already configured with `0.0.0.0/0` for group development, so teammates do not need to add their own IP address.

## Backend Setup

### 1. Pull the latest project

If this is the first time setting up the project:

```bash
git clone https://github.com/elysiayunggg/WIF2003-KPI-Management-System.git
cd WIF2003-KPI-Management-System
git switch elysia
```

If the project already exists locally:

```bash
cd WIF2003-KPI-Management-System
git switch elysia
git pull origin elysia
```

### 2. Open project in VS Code

```bash
code .
```

Project path may vary depending on local setup.

Example:

```text
C:\Projects\WIF2003-KPI-Management-System
```

### 3. Create `backend/.env`

Copy `backend/.env.example` and rename the copy to `.env`.

The final `backend/.env` file should use this format:

```env
PORT=5050
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=trackifysecretkey
```

Important:

- Do not push `backend/.env` to GitHub.
- Do not expose the MongoDB username, password, or connection string publicly.
- The group leader should share the real `MONGO_URI` privately.

### 4. Install backend dependencies

```bash
cd backend
npm install
```

### 5. Start backend

```bash
npm run dev
```

Expected output:

```text
Server running on port 5050
MongoDB Connected
```

### 6. Test backend

Open this URL in the browser:

```text
http://127.0.0.1:5050
```

Expected result:

```text
Trackify KPI Backend Running
```

## Frontend Setup

Open the frontend using Live Server.

In VS Code:

1. Open `frontend/pages/login.html`.
2. Right click the file.
3. Select `Open with Live Server`.

Example URL:

```text
http://127.0.0.1:5500/frontend/pages/login.html
```

Do not open the HTML file by double-clicking it directly, because that may use a `file:///` URL.

## Test Accounts

### Manager Account

```text
Email: manager@trackify.com
Password: Password@123
Role: Manager
```

### Staff Account

```text
Email: staff@trackify.com
Password: Password@123
Role: Staff
```

Teammates may also register their own manager or staff accounts through the Register page.

## Demo Flow To Test

### Manager Flow

1. Login as manager.
2. Create a KPI.
3. Assign KPI to staff.
4. Review submitted evidence.
5. Approve or reject the submission.
6. Check dashboard and report updates.

### Staff Flow

1. Login as staff.
2. Open KPI Progress.
3. View assigned KPI.
4. Submit evidence and update progress.


