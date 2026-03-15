import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
    appId: "com.sammy.napolionic",
    appName: "Napolionic",
    webDir: "dist",
    server: { androidScheme: "https" },
};

export default config;
