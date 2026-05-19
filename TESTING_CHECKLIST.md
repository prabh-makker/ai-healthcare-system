# Testing Checklist — All Changes

Test each item below **one-by-one** in the UI. After each test, report if it works ✅ or not ❌.

---

## 1️⃣ Patient Names Show on Dashboard

**Doctor View:**
- Login: `dr.sharma@healthai.com` / `Doctor@1234`
- Navigate to Dashboard → Look at "Today's Appointments" widget
- **Expected:** Shows `Aarav Kumar` (patient first + last name), NOT email
- **Test:** ✅ or ❌?

---

## 2️⃣ Patient Names Show in Calendar

**Doctor View:**
- Still logged in as Dr. Sharma
- Navigate to Appointments → Click "My Calendar" tab
- Look at the appointment cards in the calendar
- **Expected:** Shows patient name like `Aarav Kumar` + appointment time
- **Test:** ✅ or ❌?

---

## 3️⃣ Doctor Calendar Weekly Strip

**Doctor View:**
- Still in Appointments → My Calendar
- Look at the top of the calendar (week strip)
- **Expected:** Shows Mon-Sun with appointment count badges per day
  - Click on different days → calendar changes to that day's schedule
  - Shows "Week total: X appointments" at bottom
- **Test:** ✅ or ❌?

---

## 4️⃣ Emergency Absent Option in Attendance

**Doctor View:**
- Navigate back to Dashboard
- Look at the "Today's Attendance" widget (center of header)
- Click the attendance button
- **Expected:** Dropdown shows 4 options:
  1. Present (green)
  2. Absent (red)
  3. On Leave (orange/amber)
  4. **Emergency Absent** (red, new option)
- Click "Emergency Absent" → should mark status
- **Test:** ✅ or ❌?

---

## 5️⃣ Doctor Absence Blocks Appointments

**Setup:**
- Still as Dr. Sharma, mark yourself as "Absent" or "Emergency Absent"
- Open a different browser/incognito tab
- Login as patient: `aarav.kumar@example.com` / `Patient@1234`

**Patient View:**
- Navigate to Appointments → Book Appointment
- Try to select Dr. Sharma's slot for today's date
- **Expected:** Shows message like "Doctor unavailable (Absent)" or "Doctor unavailable (Emergency)"
- Cannot select any time slots for Dr. Sharma
- **Test:** ✅ or ❌?

---

## 6️⃣ Search for Patients

**Any Role View:**
- Navigate to Search page (left sidebar → Search)
- Look for "Patients" filter tab
- **Expected:** Tab "Patients" appears (cyan color)
- Type "myra nair" in search box
- **Expected:** If Myra Nair exists in DB, shows result with:
  - Name: "Myra Nair"
  - Subtitle: email
  - Badge: "active" or "inactive"
- **Test:** ✅ or ❌?

---

## 7️⃣ Search Across All Categories

**Any Role View:**
- Still on Search page
- Type a search term (e.g., "aarav" or "cardiology")
- **Expected:** Shows results grouped by type:
  - Patients (if applicable)
  - Records (if applicable)
  - Appointments (if applicable)
  - Prescriptions (if doctor/admin)
  - Users (if admin)
- **Test:** ✅ or ❌?

---

## 8️⃣ Appointment Slots Not Shown When Doctor Booked

**Patient View:**
- Book an appointment for Dr. Gupta at 10:00 AM on a specific date
- Try to book another appointment at the same time for Dr. Gupta
- **Expected:** 10:00 AM slot is NOT available (grayed out or hidden)
- Next available slot is 10:30 AM
- **Test:** ✅ or ❌?

---

## Summary Table

| # | Feature | Status |
|---|---------|--------|
| 1 | Patient names on dashboard | ✅/❌ |
| 2 | Patient names in calendar | ✅/❌ |
| 3 | Weekly calendar strip | ✅/❌ |
| 4 | Emergency absent option | ✅/❌ |
| 5 | Doctor absence blocks bookings | ✅/❌ |
| 6 | Search for patients | ✅/❌ |
| 7 | Multi-category search | ✅/❌ |
| 8 | Booked slots not shown | ✅/❌ |

---

**When complete, report any ❌ items and I'll fix them!**
