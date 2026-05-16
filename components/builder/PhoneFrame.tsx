type PhoneFrameProps = {
  children?: React.ReactNode;
};

export function PhoneFrame({ children }: PhoneFrameProps) {
  return (
    <div style={{ width: 320, height: 620, borderRadius: 44, border: "10px solid #1a1a1f", boxShadow: "0 0 0 2px #2a2a32, 0 28px 60px rgba(0,0,0,0.36)", background: "#09090e", overflow: "hidden", position: "relative", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 20px 4px", fontSize: 12, fontWeight: 700, color: "#fff", background: "#09090e" }}>
        <span>9:41</span>
        <div style={{ display: "flex", gap: 5, alignItems: "center" }}><span>▲▲▲</span><span>WiFi</span><span>BAT</span></div>
      </div>
      <div style={{ height: "calc(100% - 34px)", overflow: "auto" }}>
        {children ?? <div style={{ display: "grid", placeItems: "center", height: "100%", color: "#555", fontSize: 14, textAlign: "center", padding: 24 }}>Mobile preview loads when the Expo server starts</div>}
      </div>
    </div>
  );
}
