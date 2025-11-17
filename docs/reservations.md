**Reservation Feature — Client + API**

Overview
- **What:** Adds a usable reservation UI (time picker, duration, table-size selection, table quantity) and documents the related backend APIs.
- **Where:** Client implementation lives in `src/app/reservation/ReservationClient.tsx`.
- **Why:** Convert static "12:00" placeholder into a real time picker, compute `fromDate`/`toDate` (ISO) including time, and include `tablesCount` in the reservation POST payload.

Client behaviour
- **Component:** `ReservationClient` — client component (uses `"use client"`).
- **Inputs:**
  - Date (single) via `DatePicker` or date range via `DateRangePicker`.
  - Time via `<input type="time">` (HH:MM).
  - Duration (select: 30, 60, 90, 120 minutes).
  - Size selection: choose table size (2, 4, 6, 8-person tables) — values driven from availability endpoint.
  - Table quantity: how many tables of the chosen size to reserve (bounded by availability).
- **Computed values:**
  - `fromDate` = apply selected time to the chosen start date (ISO string).
  - `toDate` = if a range `to` is present, apply the selected time to `range.to`; otherwise `toDate = fromDate + durationMinutes`.
- **Submit payload:**
  - `POST /api/reservations` body (JSON):

    {
      "restaurantId": "<id>",
      "fromDate": "2025-11-18T12:00:00.000Z",
      "toDate": "2025-11-18T13:00:00.000Z",
      "partySize": 4,
      "tablesCount": 1
    }

  - `tablesCount` is sent so server can (eventually) persist or use it in allocation logic.

API endpoints (used by the client)
- `GET /api/restaurants`
  - Response shape: { items: [{ id, name, logoUrl? }, ...] }
  - Used to populate the combobox / list of restaurants.

- `GET /api/restaurants/:id/availability?from=<ISO>&to=<ISO>`
  - Query params: `from` and `to` (ISO strings)
  - Expected response (example):

    {
      "sizes": {
        "2": 5,
        "4": 3,
        "6": 1,
        "8": 0
      }
    }

  - Numbers indicate how many tables of each size are available in the requested window.

- `POST /api/reservations`
  - Request body: see Submit payload above.
  - Returns 201 on success. 409 can indicate a conflict (no availability).

Examples
- Example curl to check availability:

  curl -s "http://localhost:3000/api/restaurants/<id>/availability?from=2025-11-18T12:00:00.000Z&to=2025-11-18T13:00:00.000Z"

- Example curl to create a reservation:

  curl -X POST "http://localhost:3000/api/reservations" \
    -H "Content-Type: application/json" \
    -d '{"restaurantId":"r_123","fromDate":"2025-11-18T12:00:00.000Z","toDate":"2025-11-18T13:00:00.000Z","partySize":4,"tablesCount":1}'

Integration notes & dev guidance
- The client sends `credentials: 'same-origin'` with the POST so cookie-based sessions work in dev.
- The server currently accepts `tablesCount` in the POST but may not yet persist it to the DB; add migration/handlers if persistence is required.
- When changing date/time UI, ensure `applyTime(date, time)` is used so the timezone/seconds are normalized; the component sets seconds to 0.
- Limit `tableQty` to the availability number returned by the availability endpoint for the chosen size.

Clean-up tasks
- Remove `src/app/reservation/ReservationClient2.tsx` when `ReservationClient.tsx` is confirmed working and all imports updated.
- Run TypeScript checks and fix any minor prop-type mismatches (some `DatePicker` props accept `Date | undefined`).

OpenAPI / Swagger
- A minimal OpenAPI spec for these endpoints is available at `docs/openapi.yaml` in the repository. Use it with Redoc, Swagger UI, or other tools for interactive docs.

Questions / Next steps
- Do you want me to also open a tiny API spec file (`docs/api_responses.md`) with exact JSON schemas? Or is this single `docs/reservations.md` enough?
