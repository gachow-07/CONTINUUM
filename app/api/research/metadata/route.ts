import { lookup } from "node:dns/promises";
import net from "node:net";

export const maxDuration = 20;

function isPrivate(ip: string) {
  if (net.isIPv6(ip)) return ip === "::1" || ip.startsWith("fc") || ip.startsWith("fd") || ip.startsWith("fe80") || ip.startsWith("::ffff:127.") || ip.startsWith("::ffff:10.") || ip.startsWith("::ffff:192.168.");
  const [a, b] = ip.split(".").map(Number);
  return a === 10 || a === 127 || a === 0 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 169 && b === 254) || a >= 224;
}

const meta = (html: string, names: string[]) => {
  for (const n of names) {
    const re = new RegExp(`<meta[^>]+(?:property|name)=["']${n}["'][^>]*content=["']([^"']*)["']|<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${n}["']`, "i");
    const m = html.match(re);
    const v = m?.[1] ?? m?.[2];
    if (v) return decode(v.trim());
  }
  return null;
};
const decode = (s: string) => s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");

export async function GET(req: Request) {
  const raw = new URL(req.url).searchParams.get("url") ?? "";
  let u: URL;
  try { u = new URL(raw); } catch { return Response.json({ error: "That doesn't look like a valid URL." }, { status: 400 }); }
  if (!/^https?:$/.test(u.protocol)) return Response.json({ error: "Only http(s) URLs are supported." }, { status: 400 });
  try {
    // Basic SSRF protection: refuse hosts that resolve to private / loopback addresses.
    const addrs = await lookup(u.hostname, { all: true });
    if (addrs.some((a) => isPrivate(a.address))) return Response.json({ error: "That address can't be fetched." }, { status: 400 });

    const res = await fetch(u, { redirect: "follow", signal: AbortSignal.timeout(8000), headers: { "user-agent": "ProjectMemoryBot/1.0 (metadata fetch)", accept: "text/html" } });
    if (!res.ok) return Response.json({ error: `The site responded with ${res.status}. You can still fill in the details by hand.`, partial: { url: u.toString(), site_name: u.hostname.replace(/^www\./, "") } }, { status: 200 });
    const type = res.headers.get("content-type") ?? "";
    if (!type.includes("html")) return Response.json({ url: u.toString(), title: u.pathname.split("/").pop() || u.hostname, site_name: u.hostname.replace(/^www\./, ""), description: "", contentType: type });
    const html = (await res.text()).slice(0, 400_000);
    const title = meta(html, ["og:title", "twitter:title"]) ?? decode(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? "");
    return Response.json({
      url: u.toString(), title: title || u.hostname,
      site_name: meta(html, ["og:site_name"]) ?? u.hostname.replace(/^www\./, ""),
      description: meta(html, ["og:description", "description", "twitter:description"]) ?? "",
    });
  } catch {
    return Response.json({ error: "Couldn't reach that page. Fill in the details manually.", partial: { url: u.toString(), site_name: u.hostname.replace(/^www\./, "") } }, { status: 200 });
  }
}
