// client/src/components/transport/transportApi.js

export async function fetchTransportRoute(payload) {
  const res = await fetch("http://localhost:5000/api/transport-route", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  let body = null;
  const contentType = res.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    body = await res.json();
  } else {
    body = await res.text();
  }

  if (!res.ok) {
    const msg =
      body && typeof body === "object" && body.error
        ? body.error
        : "Transport API failed";
    const err = new Error(msg);
    err.status = res.status;
    err.body = body;
    throw err;
  }

  return body;
}
