/* eslint-disable @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-member-access */
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';

const installCatalystPluginizr = () => {
  const catalystRoot = path.resolve(__dirname, '../../../../');

  try {
    console.log('🚀 Starting Catalyst Pluginizr installation...');

    const corePackageJsonPath = path.join(catalystRoot, 'core', 'package.json');
    const corePackageJson = JSON.parse(fs.readFileSync(corePackageJsonPath, 'utf-8'));

    corePackageJson.dependencies = {
      ...corePackageJson.dependencies,
      '@thebigrick/catalyst-pluginizr': 'workspace:*',
    };

    fs.writeFileSync(corePackageJsonPath, JSON.stringify(corePackageJson, null, 2));
    console.log('✓ Updated core/package.json');

    const workspaceYamlPath = path.join(catalystRoot, 'pnpm-workspace.yaml');
    const workspaceYaml = fs.readFileSync(workspaceYamlPath, 'utf-8');

    if (!workspaceYaml.includes('plugins/*')) {
      const updatedWorkspaceYaml = workspaceYaml.replace(
        /packages:/,
        'packages:\n  - plugins/* # Added by Catalyst Pluginizr installer',
      );

      fs.writeFileSync(workspaceYamlPath, updatedWorkspaceYaml);
    }

    console.log('✓ Updated pnpm-workspace.yaml');

    const nextConfigPath = path.join(catalystRoot, 'core', 'next.config.ts');
    let nextConfig = fs.readFileSync(nextConfigPath, 'utf-8');

    if (!nextConfig.includes('withCatalystPluginizr')) {
      nextConfig = `import withCatalystPluginizr from '@thebigrick/catalyst-pluginizr/with-catalyst-pluginizr';\n${nextConfig}`;

      nextConfig = nextConfig.replace(
        'nextConfig = withNextIntl(nextConfig);',
        'nextConfig = withCatalystPluginizr(withNextIntl(nextConfig));',
      );
    }

    fs.writeFileSync(nextConfigPath, nextConfig);
    console.log('✓ Updated next.config.ts');

    const tailwindConfigPath = path.join(catalystRoot, 'core', 'tailwind.config.js');
    let tailwindConfig = fs.readFileSync(tailwindConfigPath, 'utf-8');

    const tailwindPluginizrImport =
      "const withPluginizrTailwind = require('@thebigrick/catalyst-pluginizr/pluginizr/with-pluginizr-tailwind');\n";

    if (!tailwindConfig.includes('with-pluginizr-tailwind')) {
      tailwindConfig = tailwindPluginizrImport + tailwindConfig;
    }

    tailwindConfig = tailwindConfig.replace(
      /module\.exports\s*=\s*(\{[\s\S]*?\});?/,
      'const config = $1;\nmodule.exports = withPluginizrTailwind(config);',
    );

    fs.writeFileSync(tailwindConfigPath, tailwindConfig);
    console.log('✓ Updated tailwind.config.js');

    const tsconfigPath = path.join(catalystRoot, 'core', 'tsconfig.json');
    const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf-8'));

    tsconfig.compilerOptions = tsconfig.compilerOptions || {};
    tsconfig.compilerOptions.paths = tsconfig.compilerOptions.paths || {};

    if (!tsconfig.compilerOptions.paths['@thebigrick/catalyst-pluginizr/*']) {
      tsconfig.compilerOptions.paths['@thebigrick/catalyst-pluginizr/*'] = [
        '../packages/catalyst-pluginizr/src/*',
      ];
    }

    fs.writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2));
    console.log('✓ Updated tsconfig.json');

    if (!fs.existsSync(path.join(catalystRoot, 'plugins'))) {
      fs.mkdirSync(path.join(catalystRoot, 'plugins'));
      console.log('✓ Created plugins directory');
    } else {
      console.log('✓ Plugins directory already exists');
    }

    console.log('📦 Installing dependencies...');
    exec('pnpm install', { cwd: catalystRoot });

    console.log('✅ Catalyst Pluginizr installation completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Create your first plugin in the plugins directory');
    console.log('2. Register your plugin in src/register-plugins.ts');
    console.log('3. Start developing!');
  } catch (error) {
    console.error('❌ Installation failed:', error);
    throw error;
  }
};

installCatalystPluginizr();
