import { exec } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { promisify } from 'util';

const execAsync = promisify(exec);

const installCatalystPluginizr = async () => {
  const catalystRoot = path.resolve(__dirname, '../../../../');

  try {
    console.log('🚀 Starting Catalyst Pluginizr installation...');

    const corePackageJsonPath = path.join(catalystRoot, 'core', 'package.json');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const corePackageJson = JSON.parse(await fs.readFile(corePackageJsonPath, 'utf-8'));

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-member-access
    corePackageJson.dependencies = {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      ...corePackageJson.dependencies,
      '@thebigrick/catalyst-pluginizr': 'workspace:*',
    };

    await fs.writeFile(corePackageJsonPath, JSON.stringify(corePackageJson, null, 2));
    console.log('✓ Updated core/package.json');

    const workspaceYamlPath = path.join(catalystRoot, 'pnpm-workspace.yaml');
    const workspaceYaml = await fs.readFile(workspaceYamlPath, 'utf-8');

    if (!workspaceYaml.includes('plugins/*')) {
      const updatedWorkspaceYaml = workspaceYaml.replace(
        /packages:/,
        'packages:\n  - plugins/* # Added by Catalyst Pluginizr installer',
      );

      await fs.writeFile(workspaceYamlPath, updatedWorkspaceYaml);
    }

    console.log('✓ Updated pnpm-workspace.yaml');

    const nextConfigPath = path.join(catalystRoot, 'core', 'next.config.ts');
    let nextConfig = await fs.readFile(nextConfigPath, 'utf-8');

    if (!nextConfig.includes('@thebigrick/catalyst-pluginizr')) {
      nextConfig = `import { withCatalystPluginizr } from '@thebigrick/catalyst-pluginizr';\n${nextConfig}`;
    }

    if (!nextConfig.includes('withCatalystPluginizr')) {
      nextConfig = nextConfig.replace(
        'nextConfig = withNextIntl(nextConfig);',
        'nextConfig = withNextIntl(nextConfig);\nnextConfig = withCatalystPluginizr(nextConfig);',
      );
    }

    await fs.writeFile(nextConfigPath, nextConfig);
    console.log('✓ Updated next.config.ts');

    const tailwindConfigPath = path.join(catalystRoot, 'core', 'tailwind.config.js');
    let tailwindConfig = await fs.readFile(tailwindConfigPath, 'utf-8');

    const tailwindPluginizrImport =
      "const withPluginizrTailwind = require('@thebigrick/catalyst-pluginizr/pluginizr/with-pluginizr-tailwind');\n";

    if (!tailwindConfig.includes('with-pluginizr-tailwind')) {
      tailwindConfig = tailwindPluginizrImport + tailwindConfig;
    }

    tailwindConfig = tailwindConfig.replace(
      /module\.exports\s*=\s*(\{[\s\S]*?\});?/,
      'const config = $1;\nmodule.exports = withPluginizrTailwind(config);',
    );

    await fs.writeFile(tailwindConfigPath, tailwindConfig);
    console.log('✓ Updated tailwind.config.js');

    await fs.mkdir(path.join(catalystRoot, 'plugins'));
    console.log('✓ Created plugins directory');

    console.log('📦 Installing dependencies...');
    await execAsync('pnpm install', { cwd: catalystRoot });

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

installCatalystPluginizr().catch(() => process.exit(1));
