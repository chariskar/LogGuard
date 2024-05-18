module.exports = {
    ignores: [
        'node_modules/',
        'dist/'
    ],
    env: {
        es2021: true,
        node: true
    },
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:jsdoc/recommended'
    ],
    parser: '@typescript-eslint/parser',
    parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module'
    },
    plugins: [
        '@typescript-eslint',
        'jsdoc'
    ],
    rules: {
        indent: ['error', 'tab'],
        'linebreak-style': ['error', 'windows'],
        quotes: ['error', 'single'],
        semi: ['error', 'never'],
        'jsdoc/check-alignment': 'error',
        'jsdoc/check-param-names': 'error',
        'jsdoc/check-tag-names': 'error',
        'jsdoc/check-types': 'error',
        'jsdoc/implements-on-classes': 'error',
        'jsdoc/newline-after-description': 'error',
        'jsdoc/no-undefined-types': 'error',
        'jsdoc/require-description': 'error',
        'jsdoc/require-jsdoc': 'error',
        'jsdoc/require-param': 'error',
        'jsdoc/require-param-description': 'error',
        'jsdoc/require-param-type': 'error',
        'jsdoc/require-returns': 'error',
        'jsdoc/require-returns-check': 'error',
        'jsdoc/require-returns-description': 'error',
        'jsdoc/require-returns-type': 'error'
    }
}
