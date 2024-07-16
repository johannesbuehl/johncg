import { createApp, type Component } from "vue";
import App from "./Bible.vue";

const app = createApp(App as Component);

app.mount("#app");
