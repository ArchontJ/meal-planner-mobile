// Windows: the C++ object paths of react-native-gesture-handler & co. exceed
// 260 characters. The SDK's default CMake 3.22.1 ships ninja 1.10, which cannot
// use long paths; CMake 3.31.6 ships ninja 1.12 (long-path aware, needs the
// Windows "LongPathsEnabled" setting). This points every native module at it
// through android/local.properties. No-op on other systems or when not installed.
const fs = require("fs");
const path = require("path");
const { withDangerousMod } = require("expo/config-plugins");

const CMAKE_VERSION = "3.31.6";

module.exports = function withLongPathCmake(config) {
  return withDangerousMod(config, [
    "android",
    (cfg) => {
      const sdk = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
      if (process.platform !== "win32" || !sdk) return cfg;
      const cmakeDir = path.join(sdk, "cmake", CMAKE_VERSION);
      if (!fs.existsSync(cmakeDir)) return cfg;

      const file = path.join(cfg.modRequest.platformProjectRoot, "local.properties");
      const lines = fs.existsSync(file)
        ? fs.readFileSync(file, "utf8").split(/\r?\n/).filter((l) => l && !l.startsWith("cmake.dir="))
        : [];
      // local.properties is a Java properties file: escape backslashes and the drive colon.
      lines.push(`cmake.dir=${cmakeDir.replace(/\\/g, "\\\\").replace(":", "\\:")}`);
      fs.writeFileSync(file, lines.join("\n") + "\n");
      return cfg;
    },
  ]);
};
