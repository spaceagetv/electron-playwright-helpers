import js from '@eslint/js'
import { defineConfig } from 'eslint/config'
import prettierRecommended from 'eslint-plugin-prettier/recommended'
import tseslint from 'typescript-eslint'

export default defineConfig([
  {
    // same scope the old `eslint src/**/*.ts` script had
    files: ['src/**/*.ts'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      prettierRecommended,
    ],
    rules: {
      // these are disabled on purpose: the `evaluate()` boundary needs `any`
      // and `@ts-ignore` (see CLAUDE.md)
      '@typescript-eslint/no-explicit-any': 0,
      '@typescript-eslint/ban-ts-comment': 0,
      '@typescript-eslint/explicit-function-return-type': 0,
      '@typescript-eslint/no-non-null-assertion': 0,
      '@typescript-eslint/no-use-before-define': 0,
      '@typescript-eslint/no-empty-object-type': 0,
      '@typescript-eslint/no-inferrable-types': 0,
      // ESLint 9 flipped the `caughtErrors` default to 'all'; keep the old
      // behaviour so unused `catch (err)` bindings stay legal
      '@typescript-eslint/no-unused-vars': ['error', { caughtErrors: 'none' }],
      // New in eslint:recommended as of ESLint 10. It fires once, at
      // find_parse_builds.ts:383, which rethrows without `{ cause: err }`.
      // The proper fix needs `lib: ES2022` for `ErrorOptions`, and tsconfig
      // still targets ES2019 - so this stays off until the target moves.
      'preserve-caught-error': 0,
    },
  },
])
