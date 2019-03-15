// From https://www.robertcooper.me/using-eslint-and-prettier-in-a-typescript-project
module.exports = {
    parser: '@typescript-eslint/parser', // Specifies the ESLint parser
     extends: [
        // Uses the recommended rules from @eslint-plugin-react
        'plugin:react/recommended',

        // Uses the recommended rules from the @typescript-eslint/eslint-plugin
        'plugin:@typescript-eslint/recommended',
        //'plugin:jsx-a11y/recommended',
    ],
    plugins: [
       "react-hooks",
    ],
    parserOptions: {
       ecmaVersion: 2018, // Allows for the parsing of modern ECMAScript features
       sourceType: 'module', // Allows for the use of imports
       ecmaFeatures: {
          jsx: true, // Allows for the parsing of JSX
       },
    },
    rules: {
      // Place to specify ESLint rules. Can be used to overwrite rules
      // specified from the extended configs
      // e.g. "@typescript-eslint/explicit-function-return-type": "off",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",

      // Disable for now
      "@typescript-eslint/indent": "off",
      "@typescript-eslint/camelcase": "off",
      //"@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/no-parameter-properties": "off",
      "react/display-name": "off",
    },
    settings: {
       react: {
          // Tells eslint-plugin-react to automatically detect the version
          // of React to use
          version: 'detect',
        },
    },
};
