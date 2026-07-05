/** @type {import('@cucumber/cucumber').IConfiguration} */
export default {
  paths: ['tests/features/**/*.feature'],
  import: ['tests/step-definitions/**/*.ts'],
  format: ['progress'],
  publishQuiet: true,
};
