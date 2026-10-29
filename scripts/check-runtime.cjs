const [major, minor, patch] = process.versions.node.split('.').map(Number);
if (major !== 24 || minor < 22 || (minor === 22 && patch < 1)) {
  throw new Error(`Use patched Node 24 LTS (24.22.1 or newer); running ${process.version}. Run nvm install && nvm use.`);
}
console.log(`Build runtime: ${process.version}`);
