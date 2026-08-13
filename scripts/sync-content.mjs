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

// Web-optimized JPG profile assets are kept in public/profiles. Original PNGs
// remain untouched in profiles/images and are only used as source artwork.
