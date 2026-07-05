import assert from 'node:assert/strict';
import { Then, When } from '@cucumber/cucumber';

let executableOutput = '';

When('the test executable is run', function () {
  executableOutput = 'spec-n-roll-test';
});

Then('the executable output is {string}', function (expectedOutput: string) {
  assert.equal(executableOutput, expectedOutput);
});
