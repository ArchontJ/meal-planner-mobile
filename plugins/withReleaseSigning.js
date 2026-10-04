// Signs release builds with our own key when credentials/keystore.properties exists
// (local builds; the folder is git-ignored). Without it, release builds keep the
// debug key, as in the generated template.
const { withAppBuildGradle } = require("expo/config-plugins");

const MARKER = "// withReleaseSigning";

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    let gradle = cfg.modResults.contents;
    if (gradle.includes(MARKER)) return cfg;

    gradle = gradle.replace(
      /signingConfigs \{\n(\s+)debug \{/,
      (match, indent) =>
        `signingConfigs {
${indent}${MARKER}
${indent}def releaseProps = new Properties()
${indent}def releasePropsFile = rootProject.file("../credentials/keystore.properties")
${indent}if (releasePropsFile.exists()) releasePropsFile.withInputStream { releaseProps.load(it) }
${indent}release {
${indent}    if (releaseProps["storeFile"]) {
${indent}        storeFile file(releaseProps["storeFile"])
${indent}        storePassword releaseProps["storePassword"]
${indent}        keyAlias releaseProps["keyAlias"]
${indent}        keyPassword releaseProps["keyPassword"]
${indent}    }
${indent}}
${indent}debug {`,
    );
    gradle = gradle.replace(
      /(release \{\n\s+\/\/ Caution![^\n]*\n[^\n]*\n\s+)signingConfig signingConfigs\.debug/,
      `$1signingConfig rootProject.file("../credentials/keystore.properties").exists() ? signingConfigs.release : signingConfigs.debug`,
    );
    cfg.modResults.contents = gradle;
    return cfg;
  });
};
