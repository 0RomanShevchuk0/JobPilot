import { defineBackground } from "wxt/utils/define-background";
import { registerApplicationFilling } from "../features/applications/background.js";
import { registerSessionSync } from "../features/sessions/background.js";

export default defineBackground(() => {
   registerSessionSync();
   registerApplicationFilling();
});
