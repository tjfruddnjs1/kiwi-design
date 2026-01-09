module.exports = {
  // Core formatting
  printWidth: 80,
  tabWidth: 2,
  useTabs: false,
  semi: true,
  singleQuote: true,
  quoteProps: 'as-needed',
  jsxSingleQuote: true,
  trailingComma: 'es5',
  bracketSpacing: true,
  bracketSameLine: false,
  arrowParens: 'avoid',
  endOfLine: 'lf', // Force LF line endings across all platforms

  // File-specific configurations
  overrides: [
    {
      files: ['*.ts', '*.tsx'],
      options: {
        parser: 'typescript',
        // Ensure consistent TypeScript formatting
        semi: true,
        singleQuote: true
      }
    },
    {
      files: ['*.json'],
      options: {
        parser: 'json',
        trailingComma: 'es5'
      }
    }
  ]
};
