type DeviceId = "iphone-se" | "iphone-15" | "iphone-15-pro-max" | "galaxy-s24" | "galaxy-s24-ultra";

export type { DeviceId };

type DeviceSpec = {
  label: string;
  brand: "iPhone" | "Samsung";
  width: number;
  height: number;
  radius: number;
};

export const DEVICES: Record<DeviceId, DeviceSpec> = {
  "iphone-se":         { label: "SE",       brand: "iPhone",  width: 320, height: 568, radius: 36 },
  "iphone-15":         { label: "15",        brand: "iPhone",  width: 390, height: 780, radius: 44 },
  "iphone-15-pro-max": { label: "15 Pro Max",brand: "iPhone",  width: 430, height: 860, radius: 48 },
  "galaxy-s24":        { label: "S24",       brand: "Samsung", width: 360, height: 740, radius: 36 },
  "galaxy-s24-ultra":  { label: "S24 Ultra", brand: "Samsung", width: 412, height: 840, radius: 28 },
};

type PhoneFrameProps = {
  children?: React.ReactNode;
  deviceId?: DeviceId;
};

export function PhoneFrame({ children, deviceId = "iphone-15" }: PhoneFrameProps) {
  const device = DEVICES[deviceId];
  const isIphone = device.brand === "iPhone";

  return (
    <div style={{
      width: device.width,
      height: device.height,
      borderRadius: device.radius,
      border: "10px solid #1a1a1f",
      boxShadow: "0 0 0 2px #2a2a32, 0 28px 60px rgba(0,0,0,0.36)",
      background: "#09090e",
      overflow: "hidden",
      position: "relative",
      flexShrink: 0,
    }}>
      {/* Status bar */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: isIphone ? "10px 24px 4px" : "8px 20px 4px",
        fontSize: 11,
        fontWeight: 700,
        color: "#fff",
        background: "#09090e",
      }}>
        <span>9:41</span>
        <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
          <span>▲▲▲</span><span>WiFi</span><span>BAT</span>
        </div>
      </div>
      {/* Content */}
      <div style={{ height: "calc(100% - 34px)", overflow: "auto" }}>
        {children ?? (
          <div style={{
            display: "grid",
            placeItems: "center",
            height: "100%",
            color: "#555",
            fontSize: 14,
            textAlign: "center",
            padding: 24,
          }}>
            Mobile preview loads when the Expo server starts
          </div>
        )}
      </div>
    </div>
  );
}
