import js from '@eslint/js'
import { defineConfig } from 'eslint/config'
import prettierRecommended from 'eslint-plugin-prettier/recommended'
import tseslint from 'typescript-eslint'

export default defineConfig([
  {
    // `npm run lint` passes `src` explicitly, so this only matters to someone
    // who runs `eslint .` by hand - which otherwise reports errors in compiled
    // output they cannot fix in a source file.
    ignores: ['dist/**', 'example-project/**'],
  },
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
      // Silently discarding a caught error is nearly always a bug here (the
      // menu serialization catches were exactly that), so unused catch
      // bindings are an error. Where discarding really is correct - e.g. the
      // `fs.accessSync` executable probe in find_parse_builds.ts, where a
      // failed check just means "not executable" - name the binding `_err`.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { caughtErrors: 'all', caughtErrorsIgnorePattern: '^_' },
      ],
    },
  },
])
