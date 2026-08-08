import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `next dev` regenerates AGENTS.md/CLAUDE.md on every start; a nested CLAUDE.md shadows the
  // project's instructions for agents working in this directory. The one thing those files
  // said that matters is in README.md instead: Next 16 differs from what agents assume —
  // read node_modules/next/dist/docs before writing code here.
  agentRules: false,
};

export default nextConfig;
