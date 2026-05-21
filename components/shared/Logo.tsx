import Image from "next/image";

export function Logo() {
  return (
    <span className="logo" aria-label="SpringBloom">
      <span className="logo-mark" style={{ background: "transparent", padding: 0 }}>
        <Image src="/logos/SpringBloom-Icon-1x1.png" alt="SpringBloom icon" width={24} height={24} priority />
      </span>
      <span>SpringBloom</span>
    </span>
  );
}
