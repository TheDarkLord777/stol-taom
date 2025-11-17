import { createSwaggerSpec } from "next-swagger-doc";

export function getSwaggerSpec() {
  // Basic OpenAPI definition; extend incrementally or via JSDoc blocks in routes
  const spec = createSwaggerSpec({
    apiFolder: "src/app/api",
    definition: {
      openapi: "3.0.3",
      info: {
        title: "BDP API",
        version: "1.0.0",
        description: "API documentation for auth and related endpoints.",
      },
      servers: [{ url: "http://localhost:3000" }],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
          },
          cookieAuth: {
            type: "apiKey",
            in: "cookie",
            name: "access_token",
            description: "HttpOnly access token cookie (name may vary)",
          },
        },
      },
    },
  });

  // Augment the generated spec with explicit reservation-related schemas
  // and helpful path descriptions when they are not present. This makes the
  // `/docs` Swagger UI more informative even when individual route files
  // lack detailed JSDoc annotations.

  spec.components = spec.components ?? {};
  spec.components.schemas = spec.components.schemas ?? {};

  // ReservationRequest schema (client sends `tablesCount`)
  spec.components.schemas.ReservationRequest = spec.components.schemas.ReservationRequest ?? {
    type: "object",
    required: ["restaurantId", "fromDate", "toDate", "partySize", "tablesCount"],
    properties: {
      restaurantId: { type: "string" },
      fromDate: { type: "string", format: "date-time" },
      toDate: { type: "string", format: "date-time" },
      partySize: { type: "integer", minimum: 1 },
      tablesCount: { type: "integer", minimum: 1 },
    },
  };

  // Availability response schema
  spec.components.schemas.AvailabilityResponse = spec.components.schemas.AvailabilityResponse ?? {
    type: "object",
    properties: {
      sizes: {
        type: "object",
        properties: {
          "2": { type: "integer", minimum: 0 },
          "4": { type: "integer", minimum: 0 },
          "6": { type: "integer", minimum: 0 },
          "8": { type: "integer", minimum: 0 },
        },
      },
    },
  };

  spec.paths = spec.paths ?? {};

  // Ensure the availability path is documented
  if (!spec.paths["/api/restaurants/{id}/availability"]) {
    spec.paths["/api/restaurants/{id}/availability"] = {
      get: {
        summary: "Get availability for a restaurant",
        description:
          "Return how many tables of each size are available within the requested window. Query parameters `from` and `to` are required ISO datetimes.",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
          { name: "from", in: "query", required: true, schema: { type: "string", format: "date-time" } },
          { name: "to", in: "query", required: true, schema: { type: "string", format: "date-time" } },
        ],
        responses: {
          "200": {
            description: "Availability response",
            content: { "application/json": { schema: { $ref: "#/components/schemas/AvailabilityResponse" } } },
          },
        },
      },
    };
  }

  // Ensure the reservations path has a request schema
  if (!spec.paths["/api/reservations"] || !spec.paths["/api/reservations"].post) {
    spec.paths["/api/reservations"] = spec.paths["/api/reservations"] ?? {};
    spec.paths["/api/reservations"].post = {
      summary: "Create a reservation",
      requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/ReservationRequest" } } } },
      responses: {
        "201": { description: "Created", content: { "application/json": { schema: { type: "object" } } } },
        "409": { description: "Conflict (no availability)", content: { "application/json": { schema: { type: "object", properties: { error: { type: "string" } } } } } },
      },
    };
  }

  return spec;
}
