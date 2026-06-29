import eslintConfigPrettier from 'eslint-config-prettier';
import astro from 'eslint-plugin-astro';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['dist/', '.astro/', 'node_modules/'],
  },
  ...tseslint.configs.recommended,
  ...astro.configs.recommended,
  eslintConfigPrettier
);
