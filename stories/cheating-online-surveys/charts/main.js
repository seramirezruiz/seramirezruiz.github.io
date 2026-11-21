import { mountStory } from "../../engine/story.js";
import { initNav } from "../../engine/nav.js";
import createGraphic from "./graphic.js";
initNav();
mountStory(createGraphic, { respondents: "data/respondents.json", items: "data/items.json", model: "data/model.json", ztests: "data/ztests.json", times: "data/times.json", numbers: "numbers.json" });
