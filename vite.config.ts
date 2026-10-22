import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
    plugins: [react()],
    // Relative asset URLs, so the build works under any path (e.g. GitHub Pages' /<repo>/).
    base: "./",
});
