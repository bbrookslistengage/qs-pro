module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
    ecmaFeatures: { jsx: true },
  },
  plugins: ["@typescript-eslint"],
  ignorePatterns: ["dist/", "node_modules/"],
  rules: {
    "no-restricted-imports": [
      "error",
      {
        paths: [
          {
            name: "lucide-react",
            message: "Use @solar-icons/react for icons in @qs-pro/web.",
          },
          {
            name: "solar-icon-react",
            message: "Use @solar-icons/react for Solar icons in @qs-pro/web.",
          },
        ],
      },
    ],
  },
}
