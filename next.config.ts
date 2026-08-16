import type {NextConfig} from "next";

const config:NextConfig={
  outputFileTracingRoot:process.cwd(),
  reactStrictMode:false,
  productionBrowserSourceMaps:false,
  experimental:{optimizePackageImports:["@phosphor-icons/react","react-markdown","rehype-katex","remark-gfm","remark-math"]},
};
export default config;
