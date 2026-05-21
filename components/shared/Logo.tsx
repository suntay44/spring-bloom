import Image from "next/image";

export function Logo() {
  return (
    <span className="logo" aria-label="SpringBloom">
      <span className="logo-mark" style={{ background: "transparent", padding: 0 }}>
        <Image src="/logos/SpringBloom-Icon-1x1.png" alt="SpringBloom icon" width={24} height={24} priority />
      </span>
      <span style={{ fontWeight: 600, letterSpacing: "-0.02em", fontSize: "1.05rem" }}>
        <span style={{ color: "#ffffff" }}>Spring</span><span style={{ color: "#A78BFA" }}>Bloom</span>
      </span>
    </span>
  );
}
