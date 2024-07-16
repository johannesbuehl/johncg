import { createApp, type Component } from "vue";
import App from "./Text.vue";

const app = createApp(App as Component);

app.mount("#app");
