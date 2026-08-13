import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import AitiApp from "../app/AitiApp";
import profilesData from "../app/data/profiles.json";
import testSpecData from "../app/data/test-spec.json";
import "../app/globals.css";
import type { Profile, TestSpec } from "../app/types";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AitiApp profiles={profilesData as Profile[]} spec={testSpecData as TestSpec} />
  </StrictMode>,
);
