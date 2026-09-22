import js from "@eslint/js";
export default [
  js.configs.recommended,
  {
    files:["**/*.js"],
    languageOptions:{ecmaVersion:2022,sourceType:"module",globals:{window:"readonly",document:"readonly",localStorage:"readonly",fetch:"readonly",FormData:"readonly",URLSearchParams:"readonly",location:"readonly",crypto:"readonly",alert:"readonly",HTMLInputElement:"readonly",HTMLSelectElement:"readonly"}},
    rules:{"no-unused-vars":["error",{"argsIgnorePattern":"^_"}]}
  }
];
