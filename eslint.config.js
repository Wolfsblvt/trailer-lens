// Flat ESLint configuration. The restricted globals and properties are not
// style: they are static gates for two product invariants — no network at
// runtime and no HTML rendering of untrusted commit content.
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/', 'artifacts/', 'node_modules/', 'docs/'] },
  ...tseslint.configs.recommended,
  {
    rules: {
      eqeqeq: ['error', 'smart'],
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
  {
    files: ['src/**/*.ts'],
    rules: {
      'no-console': 'error',
      'no-restricted-globals': [
        'error',
        { name: 'fetch', message: 'Trailer Lens makes no network requests — product invariant.' },
        { name: 'XMLHttpRequest', message: 'Trailer Lens makes no network requests — product invariant.' },
        { name: 'WebSocket', message: 'Trailer Lens makes no network requests — product invariant.' },
        { name: 'EventSource', message: 'Trailer Lens makes no network requests — product invariant.' },
      ],
      'no-restricted-properties': [
        'error',
        { property: 'innerHTML', message: 'Text nodes only — never HTML-render untrusted content.' },
        { property: 'outerHTML', message: 'Text nodes only — never HTML-render untrusted content.' },
        { property: 'insertAdjacentHTML', message: 'Text nodes only — never HTML-render untrusted content.' },
      ],
    },
  },
);
