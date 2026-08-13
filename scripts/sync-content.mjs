import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const appData = path.resolve(here, "../app/data");
const publicProfiles = path.resolve(here, "../public/profiles");

fs.mkdirSync(appData, { recursive: true });
fs.mkdirSync(publicProfiles, { recursive: true });
fs.copyFileSync(path.join(root, "profiles/profiles.json"), path.join(appData, "profiles.json"));
fs.copyFileSync(path.join(root, "test/test-spec.json"), path.join(appData, "test-spec.json"));

for (const file of fs.readdirSync(path.join(root, "profiles/images"))) {
  if (file.endsWith(".png")) {
    const target = path.join(publicProfiles, file);
    if (!fs.existsSync(target)) {
      fs.copyFileSync(path.join(root, "profiles/images", file), target);
    }
  }
}
