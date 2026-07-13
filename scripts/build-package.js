const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('==================================================');
console.log('📦 CCETS STANDALONE DEPLOYMENT PACKAGER');
console.log('==================================================\n');

const os = require('os');
const rootDir = path.join(__dirname, '..');
const releaseDir = path.join(os.tmpdir(), `ccets_release_${Date.now()}`);
const zipFile = path.join(rootDir, 'release.zip');

try {
    // 1. Verify and clean output folders
    if (fs.existsSync(releaseDir)) {
        console.log('🗑️  Cleaning old release directory...');
        fs.rmSync(releaseDir, { recursive: true, force: true });
    }
    if (fs.existsSync(zipFile)) {
        console.log('🗑️  Cleaning old release ZIP file...');
        fs.rmSync(zipFile, { force: true });
    }

    // 2. Validate Frontend build
    console.log('🔨 Building frontend assets...');
    execSync('npm run build', { cwd: rootDir, stdio: 'inherit' });
    
    const buildPath = path.join(rootDir, 'build');
    if (!fs.existsSync(buildPath) || fs.readdirSync(buildPath).length === 0) {
        throw new Error('Frontend build directory is empty or missing.');
    }
    console.log('✅ Frontend built successfully.\n');

    // 3. Verify Backend Javascript Syntax
    console.log('🔍 Checking backend files syntax...');
    const backendSrcDir = path.join(rootDir, 'backend/src');
    
    function checkDir(dir) {
        const files = fs.readdirSync(dir);
        for (const file of files) {
            const fullPath = path.join(dir, file);
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory()) {
                checkDir(fullPath);
            } else if (file.endsWith('.js')) {
                try {
                    execSync(`node --check "${fullPath}"`);
                } catch (e) {
                    throw new Error(`Syntax error in backend file: ${fullPath}`);
                }
            }
        }
    }
    checkDir(backendSrcDir);
    console.log('✅ Backend syntax checks passed.\n');

    // 4. Assemble release files
    console.log('📂 Assembling production-ready package...');
    fs.mkdirSync(releaseDir);

    // List of directories and files to copy
    const filesToCopy = [
        { src: 'backend', dest: 'backend', isDir: true, exclude: ['node_modules', '.env', '.git'] },
        { src: 'build', dest: 'build', isDir: true },
        { src: 'docker-compose.yml', dest: 'docker-compose.yml', isDir: false },
        { src: 'init.sql', dest: 'init.sql', isDir: false },
        { src: 'package.json', dest: 'package.json', isDir: false },
        { src: 'DEPLOYMENT_RUNBOOK.md', dest: 'DEPLOYMENT_RUNBOOK.md', isDir: false }
    ];

    function copyRecursive(src, dest, excludeList = []) {
        const stat = fs.statSync(src);
        if (stat.isDirectory()) {
            if (!fs.existsSync(dest)) fs.mkdirSync(dest);
            const children = fs.readdirSync(src);
            for (const child of children) {
                if (excludeList.includes(child)) continue;
                copyRecursive(path.join(src, child), path.join(dest, child), excludeList);
            }
        } else {
            fs.copyFileSync(src, dest);
        }
    }

    for (const item of filesToCopy) {
        const srcPath = path.join(rootDir, item.src);
        const destPath = path.join(releaseDir, item.dest);
        
        if (fs.existsSync(srcPath)) {
            console.log(`   Copying ${item.src} -> release/${item.dest}...`);
            if (item.isDir) {
                copyRecursive(srcPath, destPath, item.exclude || []);
            } else {
                fs.copyFileSync(srcPath, destPath);
            }
        }
    }
    console.log('✅ Assembled release folder.\n');

    // 5. Compress into ZIP (using PowerShell Compress-Archive for native Windows packaging)
    console.log('🗜️  Compressing package to release.zip...');
    // We resolve absolute path for PowerShell execution
    execSync(`powershell -Command "Compress-Archive -Path '${releaseDir}/*' -DestinationPath '${zipFile}' -Force"`);
    console.log('✅ Compressed release.zip successfully!\n');

    // Clean up temporary release folder
    console.log('🗑️  Cleaning temporary files...');
    fs.rmSync(releaseDir, { recursive: true, force: true });
    
    console.log('==================================================');
    console.log('🚀 STANDALONE PACKAGING COMPLETED SUCCESSFULLY!');
    console.log(`Package Location: ${zipFile}`);
    console.log('==================================================\n');

} catch (err) {
    console.error('❌ Standalone packaging failed:', err.message);
    process.exit(1);
}
