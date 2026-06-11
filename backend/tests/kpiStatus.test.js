const {
  computeProgressPercent,
  isPastDue,
  resolveKpiWorkflowStatus
} = require("../utils/kpiStatus");

describe("KPI status utilities", () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-06-06T12:00:00.000Z"));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  describe("computeProgressPercent", () => {
    test("calculates and rounds KPI progress", () => {
      expect(computeProgressPercent({
        targetValue: 90,
        currentValue: 45
      })).toBe(50);
    });

    test("returns zero when the KPI or target is missing", () => {
      expect(computeProgressPercent(null)).toBe(0);
      expect(computeProgressPercent({ currentValue: 20 })).toBe(0);
    });
  });

  describe("isPastDue", () => {
    test("identifies past and future deadlines", () => {
      expect(isPastDue("2026-06-05T12:00:00.000Z")).toBe(true);
      expect(isPastDue("2026-06-07T12:00:00.000Z")).toBe(false);
    });

    test("returns false for missing or invalid dates", () => {
      expect(isPastDue()).toBe(false);
      expect(isPastDue("invalid-date")).toBe(false);
    });
  });

describe("resolveKpiWorkflowStatus", () => {
  const futureDueDate = "2026-12-31T00:00:00.000Z";

  test("honors explicitly set in progress status even when progress is zero", () => {
    expect(resolveKpiWorkflowStatus({
      status: "in progress",
      dueDate: futureDueDate,
      progressPercent: 0
    })).toBe("in progress");
  });

    test("maps approved and completed KPIs to completed", () => {
      expect(resolveKpiWorkflowStatus({
        status: "approved",
        dueDate: futureDueDate,
        progressPercent: 100
      })).toBe("completed");

      expect(resolveKpiWorkflowStatus({
        status: "completed",
        dueDate: futureDueDate,
        progressPercent: 100
      })).toBe("completed");
    });

    test("keeps rejected status only for a 100 percent submission", () => {
      expect(resolveKpiWorkflowStatus({
        status: "rejected",
        dueDate: futureDueDate,
        progressPercent: 100
      })).toBe("rejected");

      expect(resolveKpiWorkflowStatus({
        status: "rejected",
        dueDate: futureDueDate,
        progressPercent: 80
      })).toBe("in progress");
    });

    test("marks a 100 percent unreviewed KPI as pending verification", () => {
      expect(resolveKpiWorkflowStatus({
        status: "in progress",
        dueDate: futureDueDate,
        progressPercent: 100
      })).toBe("pending verification");
    });

    test("marks unfinished KPIs past their deadline as overdue", () => {
      expect(resolveKpiWorkflowStatus({
        status: "in progress",
        dueDate: "2026-06-01T00:00:00.000Z",
        progressPercent: 70
      })).toBe("overdue");
    });

    test("honors explicitly set overdue status before the deadline", () => {
      expect(resolveKpiWorkflowStatus({
        status: "overdue",
        dueDate: futureDueDate,
        progressPercent: 0
      })).toBe("overdue");

      expect(resolveKpiWorkflowStatus({
        status: "overdue",
        dueDate: futureDueDate,
        progressPercent: 45
      })).toBe("overdue");
    });

    test("preserves not started before the deadline", () => {
      expect(resolveKpiWorkflowStatus({
        status: "not started",
        dueDate: futureDueDate,
        progressPercent: 0
      })).toBe("not started");
    });
  });
});
