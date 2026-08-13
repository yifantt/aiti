import AitiApp from "./AitiApp";
import profilesData from "./data/profiles.json";
import testSpecData from "./data/test-spec.json";
import type { Profile, TestSpec } from "./types";

export default function Home() {
  return <AitiApp profiles={profilesData as Profile[]} spec={testSpecData as TestSpec} />;
}
