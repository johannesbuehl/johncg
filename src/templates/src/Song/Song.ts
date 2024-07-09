import { createApp, type Component } from "vue";
import App from "./Song.vue";

const app = createApp(App as Component);

app.mount("#app");
