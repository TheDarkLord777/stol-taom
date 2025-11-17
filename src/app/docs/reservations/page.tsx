import fs from "fs";
import path from "path";

export const revalidate = 0;

export default function ReservationsDocsPage() {
    const mdPath = path.join(process.cwd(), "docs", "reservations.md");
    let content = "";
    try {
        content = fs.readFileSync(mdPath, "utf8");
    } catch (e) {
        content = "Reservation docs not found. Look for `docs/reservations.md` in the repo.";
    }

    return (
        <main style={{ padding: 24 }}>
            <h1>Reservations — Docs</h1>
            <p>
                This page renders the project-level markdown file <code>docs/reservations.md</code>.
            </p>
            <article style={{ whiteSpace: "pre-wrap", background: "#fff", padding: 16, borderRadius: 8, border: "1px solid #eee" }}>
                {content}
            </article>
        </main>
    );
}
