import { useState, useEffect } from "react";

/**
 * UI-only Home Postcode Input
 *
 * Props:
 * - defaultPostcode
 * - onSubmit(postcode)
 * - errorMessage (string | null)
 */
export default function HomePostcodeInput({
  defaultPostcode = "",
  onSubmit,
  errorMessage,
}) {
  const [postcode, setPostcode] = useState(defaultPostcode);
  const [localError, setLocalError] = useState("");

  useEffect(() => {
    setPostcode(defaultPostcode);
  }, [defaultPostcode]);

  const isValidUkPostcode = (value) => {
    const cleaned = value.replace(/\s+/g, "").toUpperCase();
    return /^[A-Z]{1,2}\d[A-Z\d]?\d[A-Z]{2}$/.test(cleaned);
  };

  const handleGo = () => {
    const trimmed = postcode.trim().toUpperCase();

    if (!isValidUkPostcode(trimmed)) {
      setLocalError("Enter a valid UK postcode format");
      return;
    }

    setLocalError("");

    if (onSubmit) {
      onSubmit(trimmed);
    }
  };

  return (
    <div style={{ marginBottom: 16 }}>
      <strong>Home postcode</strong>

      <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
        <input
          type="text"
          value={postcode}
          onChange={(e) => {
            setPostcode(e.target.value.toUpperCase());
            setLocalError("");
          }}
          placeholder="e.g. SM5 4NZ"
          style={{
            width: "50%",
            padding: "6px 8px",
            fontSize: 14,
          }}
        />

        <button
          onClick={handleGo}
          style={{
            padding: "6px 12px",
            fontSize: 14,
            cursor: "pointer",
          }}
        >
          Go
        </button>
      </div>

      {/* Validation error */}
      {localError && (
        <div style={{ color: "red", fontSize: 12, marginTop: 4 }}>
          {localError}
        </div>
      )}

      {/* API error */}
      {!localError && errorMessage && (
        <div style={{ color: "red", fontSize: 12, marginTop: 4 }}>
          {errorMessage}
        </div>
      )}
    </div>
  );
}
