import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { pluginTailwindcss } from '@rsbuild/plugin-tailwindcss';
import { tanstackStart } from '@tanstack/react-start/plugin/rsbuild';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const betterAuthEntry = require.resolve('better-auth');
const betterAuthPackageDir = path.dirname(path.dirname(betterAuthEntry));
const betterAuthAsyncHooks = require.resolve('@better-auth/core/async_hooks', {
  paths: [betterAuthPackageDir],
});
const betterAuthPureAsyncHooks = path.join(path.dirname(betterAuthAsyncHooks), 'pure.index.mjs');

export default defineConfig({
  plugins: [pluginReact(), pluginTailwindcss(), tanstackStart()],
  tools: {
    rspack: (config, { rspack }) => {
      // `pg` lazily `require('pg-native')` only when `pg.native` is accessed,
      // which never happens here (we use the @prisma/adapter-pg Pool). Tell
      // Rspack to ignore this optional, uninstalled native binding so it stops
      // emitting "Can't resolve 'pg-native'" warnings.
      config.resolve ??= {};
      config.resolve.alias = {
        ...(config.resolve.alias ?? {}),
        '@better-auth/core/async_hooks$': betterAuthPureAsyncHooks,
      };

      config.plugins ??= [];
      config.plugins.push(new rspack.IgnorePlugin({ resourceRegExp: /^pg-native$/ }));
    },
  },
});
