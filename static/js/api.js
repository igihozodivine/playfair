/*
 * api.js - Talks to the Flask server (app.py).
 */

/**
 * Send JSON to the server and return its JSON answer.
 * Throws an Error with a readable message if anything goes wrong.
 */
export async function postJson(path, body) {
  let response;
  try {
    response = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error('Cannot reach the server. Make sure the Flask app is running.');
  }

  let data = null;
  try {
    data = await response.json();
  } catch {
    // The server did not send JSON; handled below.
  }

  if (!response.ok || !data || !data.ok) {
    throw new Error(data?.error || `Request failed (HTTP ${response.status}).`);
  }
  return data;
}
