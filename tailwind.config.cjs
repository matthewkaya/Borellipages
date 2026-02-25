/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{astro,html,js,jsx,ts,tsx,md,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Manrope", "Avenir Next", "Segoe UI", "sans-serif"],
        display: ["Fraunces", "Iowan Old Style", "serif"]
      },
      colors: {
        ink: "#111827",
        sand: "#f6f3ef",
        brand: "#8e5b3a",
        pine: "#1f3a32",
        slate: "#4b5563"
      },
      boxShadow: {
        panel: "0 20px 50px -32px rgba(15, 23, 42, 0.55)",
        soft: "0 12px 30px -18px rgba(17, 24, 39, 0.45)"
      },
      keyframes: {
        rise: {
          "0%": { opacity: "0", transform: "translateY(18px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        sheen: {
          "0%": { transform: "translateX(-130%)" },
          "100%": { transform: "translateX(130%)" }
        }
      },
      animation: {
        rise: "rise 0.65s cubic-bezier(0.2, 0.7, 0.2, 1) both",
        sheen: "sheen 1.2s ease"
      }
    }
  },
  plugins: []
};
