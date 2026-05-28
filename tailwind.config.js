const { hairlineWidth } = require("nativewind/theme");

module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],

  presets: [require("nativewind/preset")],

  theme: {
    extend: {
      borderWidth: {
        hairline: hairlineWidth(),
      },
    },
  },

  plugins: [],
};