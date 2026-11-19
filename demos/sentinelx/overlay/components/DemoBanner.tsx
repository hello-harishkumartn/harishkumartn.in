// Always-visible notice for the static demo build.
export function DemoBanner() {
  return (
    <div
      role="note"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "#2a2110",
        borderBottom: "1px solid #e8b339",
        color: "#f3dfae",
        padding: "8px 16px",
        fontSize: 13,
        display: "flex",
        flexWrap: "wrap",
        gap: "6px 16px",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <span>
        <strong>Sample data.</strong> This demo runs in your browser with recorded responses. No backend or AI model is
        connected.
      </span>
      <a href="https://github.com/hello-harishkumartn/autonomous-incident-response" target="_blank" rel="noopener noreferrer" style={{ color: "#ffd479", textDecoration: "underline" }}>
        Code on GitHub
      </a>
      <a href="/#projects" style={{ color: "#ffd479", textDecoration: "underline" }}>
        Back to harishkumartn.in
      </a>
    </div>
  );
}
