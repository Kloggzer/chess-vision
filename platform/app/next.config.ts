import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The phone is a SECOND reader of this UI. `next dev` blocks cross-origin requests to dev-only
  // assets, so a LAN address gets the HTML and none of the JavaScript while the API answers fine.
  // Private ranges, not the current lease — DHCP moves it.
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.16.*.*", "localhost", "127.0.0.1"],

  // `next dev` regenerates AGENTS.md/CLAUDE.md on every start, and a nested CLAUDE.md shadows the
  // project's instructions for agents here. What matters of it is in README.md.
  agentRules: false,
};

export default nextConfig;
