import { mountStory } from "../../engine/story.js";
import { initNav } from "../../engine/nav.js";
import createGraphic from "./graphic.js";
initNav();
mountStory(createGraphic, { respondents: "data/respondents.json", items: "data/items.json", estimates: "data/estimates.json", polls: "data/polls.json", numbers: "numbers.json" });
