import type { RawPost } from "./radar";
import type { RateLimitInfo } from "./radar-types";

type MockSeed = {
  id: string;
  text: string;
  ageMinutes: number;
  author: { username: string; name: string };
  metrics: { likes: number; reposts: number; replies: number; quotes: number };
};

/**
 * Realistic-looking fixtures for keyless demos. CVE IDs and handles are
 * fictional. Ages are relative so velocities look live at request time.
 */
const SEEDS: MockSeed[] = [
  {
    id: "1987654321098765001",
    text: "🚨 CVE-2026-31337 is being mass-exploited RIGHT NOW. Pre-auth RCE in Fortress VPN appliances, CVSS 9.8. PoC dropped 3 hours ago, Shodan shows ~48k exposed. Patch or pull the plug. IOCs in thread 🧵",
    ageMinutes: 85,
    author: { username: "threatwire_io", name: "ThreatWire" },
    metrics: { likes: 1843, reposts: 912, replies: 164, quotes: 201 },
  },
  {
    id: "1987654321098765002",
    text: "We're seeing in-the-wild exploitation of CVE-2026-31337 against edge VPN boxes. Ransomware affiliates moved on this within hours of the PoC. If you can't patch today, disable the web management interface.",
    ageMinutes: 142,
    author: { username: "vuln_sentinel", name: "Vuln Sentinel" },
    metrics: { likes: 1204, reposts: 688, replies: 97, quotes: 118 },
  },
  {
    id: "1987654321098765003",
    text: "Wrote up a detection rule for CVE-2026-31337 exploitation attempts. Suricata + Sigma rules in the repo. Expect scanning noise to spike all week.",
    ageMinutes: 47,
    author: { username: "blueteamnotes", name: "Blue Team Notes" },
    metrics: { likes: 486, reposts: 251, replies: 32, quotes: 19 },
  },
  {
    id: "1987654321098765004",
    text: "CVE-2026-24891: use-after-free in Chromium's WebGPU, exploited as an 0day per today's advisory. Chrome 142.0.7312.x fixes it. Update your browsers, this one has a working sandbox escape chain.",
    ageMinutes: 210,
    author: { username: "browser_secwatch", name: "Browser Security Watch" },
    metrics: { likes: 1522, reposts: 734, replies: 88, quotes: 143 },
  },
  {
    id: "1987654321098765005",
    text: "The CVE-2026-24891 exploit chain is beautiful in the worst way: WebGPU UAF → renderer compromise → Mojo sandbox escape. Full technical analysis coming after patch adoption rises. Patch now, seriously.",
    ageMinutes: 95,
    author: { username: "oxdeadbeefre", name: "deadbeef // RE" },
    metrics: { likes: 876, reposts: 302, replies: 61, quotes: 54 },
  },
  {
    id: "1987654321098765006",
    text: "Heads up: CVE-2026-11204 in OpenSSH's agent forwarding is NOT remote-exploitable despite the hype. CVSS 6.8, needs a malicious agent socket. Patch during normal cycles, don't panic.",
    ageMinutes: 300,
    author: { username: "calmsecurity", name: "Calm Security Takes" },
    metrics: { likes: 2210, reposts: 489, replies: 176, quotes: 98 },
  },
  {
    id: "1987654321098765007",
    text: "PoC for CVE-2026-11204 published. It's a neat local privesc primitive on shared dev boxes — pentesters will love it, your SOC can mostly relax. Writeup: linked in bio.",
    ageMinutes: 125,
    author: { username: "packetforge", name: "PacketForge Labs" },
    metrics: { likes: 342, reposts: 155, replies: 23, quotes: 17 },
  },
  {
    id: "1987654321098765008",
    text: "CISA just added CVE-2026-40012 (Rails deserialization RCE) to the KEV catalog. Federal agencies have until Friday to patch. If you run Rails 8.x with ActiveJob + Redis, you're in scope. Advisory: patch to 8.1.4.",
    ageMinutes: 380,
    author: { username: "kev_tracker", name: "KEV Tracker" },
    metrics: { likes: 967, reposts: 541, replies: 44, quotes: 72 },
  },
  {
    id: "1987654321098765009",
    text: "Exploit attempts for CVE-2026-40012 hitting our Rails honeypots from 200+ unique IPs in the last 6 hours. Payloads drop a Monero miner and a reverse shell. Honeypot data + YARA rules in thread.",
    ageMinutes: 55,
    author: { username: "honeynet_live", name: "Honeynet Live" },
    metrics: { likes: 623, reposts: 388, replies: 41, quotes: 46 },
  },
  {
    id: "1987654321098765010",
    text: "New: CVE-2026-50871 — SQL injection in Looker-compatible BI connectors, auth bypass when SAML is misconfigured. Vendor advisory is vague, our analysis suggests exploitation is trivial. Vulnerability details after the embargo.",
    ageMinutes: 25,
    author: { username: "sqlwatchdog", name: "SQL Watchdog" },
    metrics: { likes: 214, reposts: 97, replies: 18, quotes: 12 },
  },
  {
    id: "1987654321098765011",
    text: "Patch Tuesday recap: 3 exploited 0days this month. CVE-2026-20198 (Win32k privesc, exploited), CVE-2026-24891 (Chromium, exploited), CVE-2026-31337 (Fortress VPN, mass exploitation). Prioritize in that order if you're resource-constrained — reversed if you're perimeter-heavy.",
    ageMinutes: 475,
    author: { username: "patchnotes_sec", name: "Patch Notes Security" },
    metrics: { likes: 1388, reposts: 820, replies: 93, quotes: 167 },
  },
  {
    id: "1987654321098765012",
    text: "CVE-2026-20198 exploitation walkthrough: the Win32k race is a 2-line trigger. Microsoft's patch is solid but the gap between advisory and patch adoption is where the damage happens. Deploy today.",
    ageMinutes: 165,
    author: { username: "kernelpanic_rs", name: "kernel panic (rust era)" },
    metrics: { likes: 701, reposts: 264, replies: 49, quotes: 38 },
  },
  {
    id: "1987654321098765013",
    text: "Supply-chain alert: malicious release of a popular npm logging lib backdoors CI runners and exfiltrates cloud creds. Tracked as CVE-2026-61443. Pin your dependencies and rotate any AWS keys that touched affected builds.",
    ageMinutes: 35,
    author: { username: "depsec_alerts", name: "DepSec Alerts" },
    metrics: { likes: 530, reposts: 377, replies: 52, quotes: 61 },
  },
  {
    id: "1987654321098765014",
    text: "Re: CVE-2026-61443 — we reversed the payload. It stages through a typosquatted CDN domain and only activates in CI environments (checks for CI=true). Clever and nasty. Full IOC list published.",
    ageMinutes: 18,
    author: { username: "malforge", name: "Malforge Research" },
    metrics: { likes: 288, reposts: 190, replies: 26, quotes: 31 },
  },
];

export function getMockRawPosts(now: number): RawPost[] {
  return SEEDS.map((seed) => ({
    id: seed.id,
    text: seed.text,
    createdAt: new Date(now - seed.ageMinutes * 60_000).toISOString(),
    author: seed.author,
    metrics: seed.metrics,
  }));
}

export function getMockRateLimit(now: number): RateLimitInfo {
  return {
    limit: 450,
    remaining: 447,
    resetAt: new Date(now + 13 * 60_000).toISOString(),
  };
}
