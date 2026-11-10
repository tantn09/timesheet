import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const config: NextConfig = {
  // Standalone tracing needs real symlinks; only enabled for the Linux Docker build
  // (set DOCKER_BUILD=1 there) since it fails with EPERM on Windows without Developer Mode.
  output: process.env.DOCKER_BUILD ? 'standalone' : undefined,
  async rewrites() {
    const apiOrigin = process.env.API_ORIGIN ?? 'http://localhost:4000';
    return [{ source: '/backend/:path*', destination: `${apiOrigin}/:path*` }];
  },
};
export default createNextIntlPlugin('./src/i18n/request.ts')(config);
