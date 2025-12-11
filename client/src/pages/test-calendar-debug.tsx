// Debug script to test calendar filtering logic
const testAppointment = {
  id: 1,
  appointmentDate: "2025-12-01",
  startTime: "14:00:00",
  endTime: "15:00:00",
  status: "confirmed",
  customerId: 1,
  employeeId: 1
};

// Test date matching logic
const date = new Date("2025-12-01");
const dateStr = date.toISOString().split("T")[0];
console.log("Test date string:", dateStr);

// Test appointment date conversion
const aptDate = new Date(testAppointment.appointmentDate);
const aptDateStr = `${aptDate.getUTCFullYear()}-${String(aptDate.getUTCMonth() + 1).padStart(2, '0')}-${String(aptDate.getUTCDate()).padStart(2, '0')}`;
console.log("Appointment date string:", aptDateStr);

// Test time extraction
const aptTime = testAppointment.startTime.substring(0, 5);
console.log("Appointment time:", aptTime);

// Test matching
console.log("Date match:", aptDateStr === dateStr);
console.log("Time match:", aptTime === "14:00");
