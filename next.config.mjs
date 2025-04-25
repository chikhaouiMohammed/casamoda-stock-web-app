// next.config.mjs
import withFlowbiteReact from "flowbite-react/plugin/nextjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: false, // Completely disable all Next.js dev indicators
  reactStrictMode: true,
};

export default withFlowbiteReact(nextConfig);