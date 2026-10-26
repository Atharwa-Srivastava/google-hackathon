/** Avoid exposing HTML/provider bodies or crashing with 'Unexpected token I'. */
export async function readApiJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  let data: unknown;
  try { data = JSON.parse(text); } catch {
    throw new Error(`The frontend server returned a non-JSON response (HTTP ${response.status}). Check its server logs and backend connection.`);
  }
  if (!response.ok) {
    const message = data && typeof data === "object" && "error" in data && typeof data.error === "string" ? data.error : `Request failed (HTTP ${response.status}).`;
    throw new Error(message);
  }
  return data as T;
}
