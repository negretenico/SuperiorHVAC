/** SHA-256(salt + ip) as lowercase hex. Lets us spot repeat abuse without storing raw IPs. */
export async function hashIp(salt: string, ip: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(salt + ip));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
