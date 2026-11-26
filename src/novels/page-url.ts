export function publicPageUrl(value: string): URL | null {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (url.username !== "" || url.password !== "") return null;
  if (isBlockedHost(url.hostname)) return null;
  return url;
}

function bareHost(hostname: string): string {
  let host = hostname.toLowerCase();
  // This Node keeps the brackets on an IPv6 URL.hostname.
  if (host.startsWith("[") && host.endsWith("]")) host = host.slice(1, -1);
  // A trailing dot is the DNS root, so localhost. is still localhost.
  return host.replace(/\.+$/, "");
}

function isBlockedHost(hostname: string): boolean {
  const host = bareHost(hostname);
  if (host === "localhost" || host.endsWith(".localhost") || host === "metadata.google.internal") return true;
  if (host.includes(":")) {
    const groups = parseIpv6(host);
    return groups === null || isBlockedIpv6(groups);
  }
  const ipv4 = parseIpv4(host);
  return ipv4 !== null && isBlockedIpv4(ipv4);
}

function parseIpv4(host: string): number[] | null {
  const parts = host.split(".");
  if (parts.length !== 4) return null;
  const octets: number[] = [];
  for (const part of parts) {
    if (!/^[0-9]{1,3}$/.test(part)) return null;
    const value = Number(part);
    if (value > 255) return null;
    octets.push(value);
  }
  return octets;
}

function isBlockedIpv4(octets: number[]): boolean {
  const [a, b, c, d] = octets;
  if (a === 0 && b === 0 && c === 0 && d === 0) return true;
  if (a === 10 || a === 127) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 169 && b === 254) return true;
  return false;
}

function parseGroups(side: string): number[] | null {
  if (side === "") return [];
  const groups: number[] = [];
  for (const part of side.split(":")) {
    if (!/^[0-9a-f]{1,4}$/.test(part)) return null;
    groups.push(parseInt(part, 16));
  }
  return groups;
}

function parseIpv6(host: string): number[] | null {
  let hex = host.toLowerCase();
  const embedded: number[] = [];
  const dotted = hex.match(/^(.*?)(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (dotted) {
    const octets = parseIpv4(dotted[2]);
    if (!octets) return null;
    embedded.push((octets[0] << 8) | octets[1], (octets[2] << 8) | octets[3]);
    hex = dotted[1];
    if (hex.endsWith(":") && !hex.endsWith("::")) hex = hex.slice(0, -1);
  }
  if (hex.includes(":::")) return null;
  const halves = hex.split("::");
  if (halves.length > 2) return null;
  const left = parseGroups(halves[0]);
  if (!left) return null;
  if (halves.length === 1) {
    const all = [...left, ...embedded];
    return all.length === 8 ? all : null;
  }
  const right = parseGroups(halves[1]);
  if (!right) return null;
  const fill = 8 - left.length - right.length - embedded.length;
  if (fill < 1) return null;
  return [...left, ...new Array<number>(fill).fill(0), ...right, ...embedded];
}

function isBlockedIpv6(groups: number[]): boolean {
  const mapped =
    groups[0] === 0 &&
    groups[1] === 0 &&
    groups[2] === 0 &&
    groups[3] === 0 &&
    groups[4] === 0 &&
    groups[5] === 0xffff;
  if (mapped) {
    return isBlockedIpv4([groups[6] >> 8, groups[6] & 0xff, groups[7] >> 8, groups[7] & 0xff]);
  }
  if (groups.every((group) => group === 0)) return true;
  if (groups[7] === 1 && groups.slice(0, 7).every((group) => group === 0)) return true;
  const first = groups[0];
  if (first >= 0xfe80 && first <= 0xfebf) return true;
  if (first >= 0xfc00 && first <= 0xfdff) return true;
  return false;
}
