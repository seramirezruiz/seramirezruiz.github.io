import { mountStory } from "../../engine/story.js";
import { initNav } from "../../engine/nav.js";
import createGraphic from "./vaa.js";
initNav();
mountStory(createGraphic, { effects: "data/effects.json", rerun: "data/rerun.json", moderators: "data/moderators.json", numbers: "numbers.json" });
