const fs = require("fs");
const path = require("path");

module.exports = async function(context) {
  // afterPack: don't modify the binary, we'll patch AppRun later
  const { appOutDir } = context;
  const binName = context.packager.executableName;
  const binPath = path.join(appOutDir, binName);

  if (!fs.existsSync(binPath)) {
    console.log(`afterPack: ${binName} not found, skipping`);
    return;
  }

  console.log(`afterPack: ${binName} is at ${binPath} (${fs.statSync(binPath).size} bytes)`);
};
