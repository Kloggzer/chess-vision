import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The phone is a SECOND reader of this UI, not just an uploader: relabelling by thumb is the
  // point of the bucket/tinder screens. `next dev` blocks cross-origin requests to dev-only assets,
  // so a browser that typed the machine's LAN address gets the HTML and none of the JavaScript —
  // the API answers fine, which makes it look like the page is simply broken. The private ranges
  // are listed rather than the current lease, because DHCP moves it.
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.16.*.*", "localhost", "127.0.0.1"],

  // `next dev` regenerates AGENTS.md/CLAUDE.md on every start; a nested CLAUDE.md shadows the
  // project's instructions for agents working in this directory. The one thing those files
  // said that matters is in README.md instead: Next 16 differs from what agents assume —
  // read node_modules/next/dist/docs before writing code here.
  agentRules: false,
};

export default nextConfig;
