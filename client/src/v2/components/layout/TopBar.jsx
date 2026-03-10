import React from "react";
import { BRANDING } from "../../config/branding";

export default function TopBar({
  postcode,
  onPostcodeChange,
  onPostcodeSubmit,
  error,
}) {
  return (
    <div className="v2-topbar">
      <div className="v2-topbar-left">
        <div className="v2-brand">
          <img className="v2-logo" src={BRANDING.logoSrc} alt="logo" />
          <div className="v2-appname">{BRANDING.appName}</div>
        </div>

        <input
          className="v2-postcode"
          value={postcode}
          placeholder="e.g. SM5 4NZ"
          onChange={(e) => onPostcodeChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onPostcodeSubmit?.(postcode);
            }
          }}
          // ✅ Add home icon without changing layout/CSS build behavior
          style={{
            backgroundImage: 'url("/icons/home_Board_opaque.png")',
            backgroundRepeat: "no-repeat",
            backgroundPosition: "14px center",
            backgroundSize: "16px 16px",
            paddingLeft: 40, // room for the icon (keeps your existing padding feel)
          }}
        />

        {error ? (
          <div style={{ color: "#b91c1c", fontSize: 12, marginLeft: 8 }}>
            {error}
          </div>
        ) : null}
      </div>

      <div className="v2-avatar">🙂</div>
    </div>
  );
}
