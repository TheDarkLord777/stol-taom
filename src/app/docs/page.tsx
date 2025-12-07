"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import "swagger-ui-react/swagger-ui.css";

const SwaggerUI = dynamic(
  () => import("swagger-ui-react").then((m) => m.default),
  { ssr: false },
);

export default function ApiDocsPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#fff" }}>
      <header
        style={{
          padding: 16,
          borderBottom: "1px solid #eee",
          display: "flex",
          gap: 12,
          alignItems: "center",
        }}
      >
        <h1 style={{ margin: 0, fontSize: 18 }}>API Documentation</h1>
        <nav style={{ marginLeft: 12 }}>
          <Link href="/docs" style={{ marginRight: 12 }}>
            Swagger UI
          </Link>
          <Link href="/docs/reservations">Reservations (human docs)</Link>
        </nav>
      </header>

      <div style={{ padding: 8 }}>
        <SwaggerUI
          url="/api/openapi"
          docExpansion="list"
          defaultModelsExpandDepth={1}
          requestInterceptor={(req: {
            credentials?: string;
            [k: string]: unknown;
          }) => {
            req.credentials = "include";
            return req;
          }}
        />
      </div>
    </div>
  );
}
