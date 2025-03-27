/* eslint-disable @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-member-access */
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';

const installCatalystPluginizr = () => {
  const catalystRoot = path.resolve(__dirname, '../../../../');
  const selfRoot = path.resolve(__dirname, '../../');

  try {
    console.log('🚀 Starting Catalyst Pluginizr installation...');

    const corePackageJsonPath = path.join(catalystRoot, 'core', 'package.json');
    const corePackageJson = JSON.parse(fs.readFileSync(corePackageJsonPath, 'utf-8'));

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const hasPluginizrDependency = Object.keys(corePackageJson.dependencies).some(
      (dependency) => dependency === '@thebigrick/catalyst-pluginizr',
    );

    if (!hasPluginizrDependency) {
      corePackageJson.dependencies = {
        ...corePackageJson.dependencies,
        '@thebigrick/catalyst-pluginizr': 'workspace:*',
      };

      fs.writeFileSync(corePackageJsonPath, JSON.stringify(corePackageJson, null, 2));
      console.log('✓ Updated core/package.json');
    } else {
      console.log('✓ Pluginizr dependency already exists in core/package.json');
    }

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

    if (!nextConfig.includes('@thebigrick/catalyst-pluginizr/with-catalyst-pluginizr')) {
      nextConfig = `import withCatalystPluginizr from '@thebigrick/catalyst-pluginizr/with-catalyst-pluginizr';\n${nextConfig}`;

      nextConfig = nextConfig.replace(
        'nextConfig = withNextIntl(nextConfig);',
        '// @ts-expect-error: This must be fixed\n' +
          '  nextConfig = withCatalystPluginizr(withNextIntl(nextConfig));',
      );
    }

    fs.writeFileSync(nextConfigPath, nextConfig);
    console.log('✓ Updated next.config.ts');

    const tailwindConfigPath = path.join(catalystRoot, 'core', 'tailwind.config.js');
    let tailwindConfig = fs.readFileSync(tailwindConfigPath, 'utf-8');

    if (!tailwindConfig.includes('@thebigrick/catalyst-pluginizr/with-tailwind-pluginizr')) {
      const tailwindPluginizrImport =
        "const withTailwindPluginizr = require('@thebigrick/catalyst-pluginizr/with-tailwind-pluginizr');\n";

      tailwindConfig = tailwindPluginizrImport + tailwindConfig;

      tailwindConfig = tailwindConfig.replace(
        'module.exports = config;',
        'module.exports = withTailwindPluginizr(config);',
      );

      fs.writeFileSync(tailwindConfigPath, tailwindConfig);
      console.log('✓ Updated tailwind.config.js');
    }

    // const tsconfigPath = path.join(catalystRoot, 'core', 'tsconfig.json');
    // const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf-8'));
    //
    // tsconfig.compilerOptions = tsconfig.compilerOptions || {};
    // tsconfig.compilerOptions.paths = tsconfig.compilerOptions.paths || {};
    //
    // if (!tsconfig.compilerOptions.paths['@thebigrick/catalyst-pluginizr/*']) {
    //   tsconfig.compilerOptions.paths['@thebigrick/catalyst-pluginizr/*'] = [
    //     '../packages/catalyst-pluginizr/src/*',
    //   ];
    // }
    //
    // fs.writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2));
    // console.log('✓ Updated core tsconfig.json');

    // Copy ./tsconfig.source.json to ./tsconfig.json
    const tsconfigSourcePath = path.join(selfRoot, 'tsconfig.source.json');
    const tsconfigDestPath = path.join(selfRoot, 'tsconfig.json');

    fs.copyFileSync(tsconfigSourcePath, tsconfigDestPath);
    console.log('✓ Copied tsconfig.source.json to tsconfig.json');

    if (!fs.existsSync(path.join(catalystRoot, 'plugins'))) {
      fs.mkdirSync(path.join(catalystRoot, 'plugins'));
      console.log('✓ Created plugins directory');
    } else {
      console.log('✓ Plugins directory already exists');
    }

    if (!hasPluginizrDependency) {
      console.log('📦 Installing dependencies...');
      exec('pnpm install', { cwd: catalystRoot });
    }

    console.log('✅ Catalyst Pluginizr installation completed successfully!');
  } catch (error) {
    console.error('❌ Installation failed:', error);
    throw error;
  }
};

installCatalystPluginizr();
