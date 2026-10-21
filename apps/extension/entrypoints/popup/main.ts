import { browser } from "wxt/browser";
import { mountApplicationTabsSection } from "../../features/applications/popup.js";
import { mountSessionsSection } from "../../features/sessions/popup.js";
import { WEB_URL } from "../../shared/api.js";

const OPEN_WEB_SELECTOR = "#open-web";

document.querySelector<HTMLAnchorElement>(OPEN_WEB_SELECTOR)!.href = WEB_URL;

const sections = [mountApplicationTabsSection(), mountSessionsSection()];
const renderAll = () => Promise.all(sections.map((render) => render()));

// the background writes everything down: sessions sent (storage.local), applications' tabs
// (storage.session). Shown as it comes, whatever started it
browser.storage.onChanged.addListener(() => void renderAll());
await renderAll();
