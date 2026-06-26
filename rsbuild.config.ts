import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { pluginTailwindcss } from '@rsbuild/plugin-tailwindcss';
import { tanstackStart } from '@tanstack/react-start/plugin/rsbuild';

export default defineConfig({
  plugins: [pluginReact(), pluginTailwindcss(), tanstackStart()],
  tools: {
    rspack: (config, { rspack }) => {
      // `pg` lazily `require('pg-native')` only when `pg.native` is accessed,
      // which never happens here (we use the @prisma/adapter-pg Pool). Tell
      // Rspack to ignore this optional, uninstalled native binding so it stops
      // emitting "Can't resolve 'pg-native'" warnings.
      config.plugins ??= [];
      config.plugins.push(new rspack.IgnorePlugin({ resourceRegExp: /^pg-native$/ }));
    },
  },
});
