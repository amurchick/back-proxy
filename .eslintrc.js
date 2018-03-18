// http://eslint.org/docs/user-guide/configuring

module.exports = {
  root: true,
  parserOptions: {
    sourceType: 'module',
    parser: 'babel-eslint',
    ecmaVersion: 2017,
  },
  env: {
    browser: true,
  },
  // https://github.com/standard/standard/blob/master/docs/RULES-en.md
  extends: ['standard'],
  // add your custom rules here
  rules: {
    // allow paren-less arrow functions
    'arrow-parens': 0,
    // allow async-await
    'generator-star-spacing': 0,
    // allow debugger during development
    'no-debugger': process.env.NODE_ENV === 'production' ? 2 : 0,
    semi: ['error', 'always'],
    'padded-blocks': 0,
    'comma-dangle': [
      "error",
      {
        "arrays": "only-multiline",
        "objects": "only-multiline",
        "imports": "only-multiline",
        "exports": "only-multiline",
        "functions": "only-multiline",
      }
    ],
    "space-in-parens": ["error", "never"],
    'no-multiple-empty-lines': ["error", { "max": 1, "maxBOF": 1 }],
    'no-trailing-spaces': 0,
    'space-before-function-paren': 0,
    'no-return-assign': 0,
    'no-extend-native': 0,
    'brace-style': ['error', 'stroustrup', { allowSingleLine: true }],
  },
};
