# WIF2003 Web Programming  
## Key Performance Indicator (KPI) Management System

### Project Overview
This project is a web-based Key Performance Indicator (KPI) Management System developed for the WIF2003 Web Programming course.

### The system is designed to help organizations manage, assign, track, and evaluate KPIs efficiently. It supports both managers and staff in monitoring performance and ensuring KPI achievement through a centralized platform.
---

### Objectives
- To provide a system for managing and tracking KPIs  
- To allow managers to assign and verify KPIs  
- To enable staff to update KPI progress and submit evidence  
- To visualize KPI performance through a dashboard  
---

### System Features

#### General Module
- User registration  
- User login and session management  

#### Profile Management
- View user details  
- Update user information  
- Delete user account  
- Change password  

#### Manager Functions
- View KPIs  
- Create, update, and delete KPIs  
- Assign KPIs to staff  
- Verify KPI evidence submitted by staff  

#### Staff Functions
- View assigned KPIs  
- Update KPI progress  
- Submit evidence for KPI completion  

#### Shared Features
- KPI progress tracking dashboard  
- Visual representation of KPI performance and achievements  
---

### Technologies Used

#### Front-End (Phase 1)
- HTML5  
- CSS  
- JavaScript  
- Bootstrap  

#### Back-End (Phase 2)
- To be implemented (e.g., Node.js / PHP)  

#### Database
- To be implemented (e.g., MySQL / MongoDB)  
---

### Project Phases

#### Phase 1 (Week 3 – Week 8)
- Develop front-end prototype (UI design)  
- Implement layout, navigation, and content using HTML, CSS, JavaScript, and Bootstrap  
- Prepare report and screenshots of UI  

#### Phase 2 (Week 9 – Week 14)
- Complete full system development (front-end and back-end)  
- Implement database integration  
- Prepare final report and user manual  
---

### Team Contributions
- All team members are required to contribute to both technical and non-technical aspects of the project  
- Contributions include design, development, testing, and documentation  
---

### Testing Requirements
- Unit Testing  
- Integration Testing  
- System Testing  
- Performance Testing  
---

### Evaluation Criteria
- System functionality and quality  
- Web programming skills and technologies  
- UI design, content, and navigation  
- Code quality and documentation  
- Team contribution and presentation  
---

### Notes
- Clean, readable, and well-structured code is required  
- Proper documentation and testing evidence must be included  
- Project submission includes source code, report, and system demonstration  


### Project Structure 
```text
kpi-management-system/
│
├── frontend/                  # HTML frontend
│   ├── components/            # Reusable UI (navbar, sidebar, modal)
│   │   ├── navbar.html
│   │   ├── sidebar.html
│   │   └── modal.html
│   │
│   ├── pages/                 # Full pages (UI)
│   │   ├── login.html
│   │   ├── register.html
│   │   ├── dashboard.html
│   │   ├── profile.html
│   │   ├── kpi-management.html
│   │   ├── assignment.html
│   │   └── progress.html
│   │
│   ├── modules/               # Feature-based JS
│   │   ├── auth/
│   │   │   └── auth.js
│   │   ├── profile/
│   │   │   └── profile.js
│   │   ├── kpi-management/
│   │   │   ├── kpi-management.css
│   │   │   └── kpi-management.js
│   │   ├── assignment/
│   │   │   └── assignment.js
│   │   ├── progress/
│   │   │   └── progress.js
│   │   ├── dashboard/
│   │   │   └── dashboard.js
│   │   ├── navbar/
│   │   │   └── layout.js
│   │   │   └── sidebar.js
│   │
│   ├── services/              # API calls (fetch)
│   │   └── api.js
│   │
│   ├── utils/                 # Helper functions
│   │   └── helpers.js
│   │
│   ├── css/
│   │   └── style.css
│   │
│   └── index.html             # (optional landing page)
│
├── backend/
│   ├── controllers/
│   ├── models/                # Mongoose models (MongoDB)
│   ├── routes/
│   ├── middleware/
│   ├── config/
│   │   └── db.js
│   └── server.js
│
├── uploads/                   # Store KPI evidence files
│
├── docs/
│   ├── ERD.png
│   ├── API_Documentation.md
│   └── System_Design.md
│
├── .env
├── package.json
└── README.md