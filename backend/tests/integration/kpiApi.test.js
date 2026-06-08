const request = require("supertest");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { MongoMemoryServer } = require("mongodb-memory-server");

const User = require("../../models/User");
const KpiAssignment = require("../../models/KpiAssignment");
const Milestone = require("../../models/Milestone");
const Notification = require("../../models/Notification");

let app;
let mongoServer;
let managerToken;
let staffToken;
let staffUser;

async function login(email, password) {
  const response = await request(app)
    .post("/api/auth/login")
    .send({ email, password });

  expect(response.status).toBe(200);
  return response.body.token;
}

beforeAll(async () => {
  process.env.JWT_SECRET = "integration-test-secret";
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  app = require("../../app");

  const password = await bcrypt.hash("Password123!", 10);
  await User.create({
    name: "Test Manager",
    email: "manager.integration@trackify.test",
    password,
    role: "manager",
    department: "Software Development"
  });
  staffUser = await User.create({
    name: "Aina Rahman",
    email: "staff.integration@trackify.test",
    password,
    role: "staff",
    department: "Software Development"
  });

  managerToken = await login("manager.integration@trackify.test", "Password123!");
  staffToken = await login("staff.integration@trackify.test", "Password123!");
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe("KPI API integration", () => {
  test("rejects KPI requests without an authentication token", async () => {
    const response = await request(app).get("/api/kpis");

    expect(response.status).toBe(401);
    expect(response.body.message).toBe("Authentication token is required");
  });

  test("prevents staff users from creating KPIs", async () => {
    const response = await request(app)
      .post("/api/kpis")
      .set("Authorization", `Bearer ${staffToken}`)
      .send({
        title: "Blocked Staff KPI",
        targetValue: 90,
        dueDate: "2026-12-31"
      });

    expect(response.status).toBe(403);
    expect(response.body.message).toBe("Manager access is required");
  });

  test("creates a connected KPI, assignment, notification, and milestone", async () => {
    const response = await request(app)
      .post("/api/kpis")
      .set("Authorization", `Bearer ${managerToken}`)
      .send({
        title: "Increase Automated Regression Coverage",
        description: "Expand automated regression coverage for critical workflows.",
        category: "Quality Engineering",
        department: "Software Development",
        targetValue: 90,
        currentValue: 0,
        unit: "%",
        priority: "high",
        startDate: "2026-07-01",
        dueDate: "2026-12-31",
        assignedTo: [staffUser._id.toString()]
      });

    expect(response.status).toBe(201);
    expect(response.body.kpi.title).toBe("Increase Automated Regression Coverage");
    expect(response.body.milestones).toHaveLength(1);

    const kpiId = response.body.kpi._id;
    const [assignment, notification, milestone] = await Promise.all([
      KpiAssignment.findOne({ kpiId, assignedTo: staffUser._id }),
      Notification.findOne({ relatedKpiId: kpiId, userId: staffUser._id }),
      Milestone.findOne({ kpiId })
    ]);

    expect(assignment).not.toBeNull();
    expect(assignment.status).toBe("assigned");
    expect(notification).not.toBeNull();
    expect(notification.type).toBe("assignment");
    expect(milestone).not.toBeNull();

    const listResponse = await request(app)
      .get("/api/kpis")
      .set("Authorization", `Bearer ${managerToken}`);

    expect(listResponse.status).toBe(200);
    expect(listResponse.body).toHaveLength(1);
    expect(listResponse.body[0].assignedTo[0].name).toBe("Aina Rahman");

    const notificationResponse = await request(app)
      .get("/api/notifications")
      .set("Authorization", `Bearer ${staffToken}`);

    expect(notificationResponse.status).toBe(200);
    expect(notificationResponse.body).toHaveLength(1);
    expect(notificationResponse.body[0].relatedKpiId).toBe(kpiId);
  });

  test("assigns an existing unassigned KPI to a staff member", async () => {
    const createResponse = await request(app)
      .post("/api/kpis")
      .set("Authorization", `Bearer ${managerToken}`)
      .send({
        title: "Reduce Pull Request Review Time",
        targetValue: 4,
        unit: "hours",
        dueDate: "2026-11-30",
        assignedTo: []
      });

    const kpiId = createResponse.body.kpi._id;
    const updateResponse = await request(app)
      .put(`/api/kpis/${kpiId}`)
      .set("Authorization", `Bearer ${managerToken}`)
      .send({
        assignedTo: [staffUser._id.toString()],
        status: "in progress"
      });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.kpi.assignedTo.map(String)).toContain(
      staffUser._id.toString()
    );

    const assignment = await KpiAssignment.findOne({
      kpiId,
      assignedTo: staffUser._id
    });
    expect(assignment).not.toBeNull();
  });
});
