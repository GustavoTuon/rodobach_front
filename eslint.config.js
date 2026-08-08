import js from "@eslint/js";
import globals from "globals";
export default [{ ignores: ["dist/**", "node_modules/**"] }, js.configs.recommended, {
  files: ["src/**/*.{js,jsx}", "*.js", "*.jsx"],
  languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } }, globals: { ...globals.browser, ...globals.node, React: "readonly", ReactDOM: "readonly" } },
  rules: {
    "no-unused-vars": "off", "no-undef": "off", "no-empty": "off",
    "no-useless-assignment": "warn", "no-unreachable": "warn",
  },
}];
