import React from "react";
import { BRANDING } from "../../config/branding";

export default function TopBar({
  postcode,
  defaultPostcode,
  onPostcodeChange,
  onChangePostcode,
  onPostcodeSubmit,
  onSubmitPostcode,
  error,
  /** Phone layout: toggles slide-over school list */
  onToggleSchoolList,
  schoolListOpen = false,
}) {
  const handleChange = onPostcodeChange ?? onChangePostcode ?? (() => {});
  const handleSubmit = onPostcodeSubmit ?? onSubmitPostcode ?? (() => {});
  const isDefault = defaultPostcode && postcode === defaultPostcode;

  const handleFocus = () => {
    if (isDefault) handleChange("");
  };

  const handleBlur = () => {
    if (postcode.trim() === "") handleChange(defaultPostcode ?? "");
  };

  return (
    <div className="v2-topbar">
      <div className="v2-topbar-left">
        <div className="v2-brand">
          <img className="v2-logo" src={BRANDING.logoSrc} alt="logo" />
          <div className="v2-appname">{BRANDING.appName}</div>
        </div>

        <form
          className="v2-topbar-postcode-form"
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit?.(postcode);
          }}
        >
          <div className="v2-postcode-field">
            <input
              className={`v2-postcode ${isDefault ? "v2-postcode--default" : ""}`}
              value={postcode}
              placeholder="e.g. SM5 4NZ"
              enterKeyHint="go"
              onChange={(e) => handleChange?.(e.target.value)}
              onFocus={handleFocus}
              onBlur={handleBlur}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSubmit?.(postcode);
                }
              }}
              style={{
                backgroundImage: 'url("/icons/home_Board_opaque.png")',
                backgroundRepeat: "no-repeat",
                backgroundPosition: "14px center",
                backgroundSize: "16px 16px",
                paddingLeft: 40,
              }}
            />
            <button type="submit" className="v2-postcode-go" aria-label="Apply postcode">
              Go
            </button>
          </div>
        </form>

        {error ? (
          <div className="v2-topbar-error" style={{ color: "#b91c1c", fontSize: 12, marginLeft: 8 }}>
            {error}
          </div>
        ) : null}
      </div>

      {onToggleSchoolList ? (
        <button
          type="button"
          className={`v2-topbar-schools-btn${schoolListOpen ? " v2-topbar-schools-btn--open" : ""}`}
          onClick={() => onToggleSchoolList()}
          aria-expanded={schoolListOpen}
          aria-controls="v2-school-list-panel"
          id="v2-topbar-schools-trigger"
        >
          Schools
        </button>
      ) : null}

      <div className="v2-avatar">🙂</div>
    </div>
  );
}
