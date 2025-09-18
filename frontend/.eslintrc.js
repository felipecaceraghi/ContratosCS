module.exports = {
  extends: ["next", "next/core-web-vitals", "plugin:@typescript-eslint/recommended"],
  rules: {
    // Permite o uso de 'any' sem erro
    "@typescript-eslint/no-explicit-any": "warn",
    // Permite variáveis não usadas como warning
    "@typescript-eslint/no-unused-vars": "warn",
    // Permite warnings de hooks como warning
    "react-hooks/exhaustive-deps": "warn",
  },
};
