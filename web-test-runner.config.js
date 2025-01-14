/*
 * Copyright 2023 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

// eslint-disable-next-line import/no-extraneous-dependencies
import { defaultReporter } from '@web/test-runner';
import fs from 'fs';

function myReporter() {
  let startTime;

  return {
    start() {
      startTime = Date.now();
      console.log('Test run started at:', new Date(startTime).toISOString());
    },

    stop({ sessions }) {
      console.log('\nTest run finished. Processing results...');
      console.log('Number of sessions:', sessions.length);
      sessions.forEach((session, idx) => {
        console.log(`\nSession ${idx + 1}:`, {
          browser: session.browser?.name,
          testFile: session.testFile,
          passed: session.passed,
          failed: session.failed,
          skipped: session.skipped,
          error: !!session.error,
        });
      });

      const endTime = Date.now();
      const results = {
        stats: {
          suites: sessions.length,
          tests: 0,
          passes: 0,
          pending: 0,
          failures: 0,
          start: new Date(startTime).toISOString(),
          end: new Date(endTime).toISOString(),
          duration: endTime - startTime,
        },
        tests: [],
      };

      sessions.forEach((session) => {
        // Each session represents a test file
        results.stats.tests += 1;

        if (session.passed) {
          results.stats.passes += 1;
        } else if (session.skipped) {
          results.stats.pending += 1;
        } else {
          // If not passed and not skipped, it's a failure
          results.stats.failures += 1;
        }

        // Add the test result
        const testName = session.testFile.split('/').pop().replace('.test.html', '').replace('.test.js', '');
        const error = session.error || (session.passed === false ? {
          message: `Test failed in ${testName}`,
          stack: `No stack trace available for ${testName}`,
        } : null);

        results.tests.push({
          title: testName,
          fullTitle: session.testFile,
          file: session.testFile,
          duration: session.duration || 0,
          currentRetry: 0,
          browser: session.browser?.name || 'unknown',
          err: error,
          skipped: session.skipped || false,
          pending: session.skipped || false,
          passed: session.passed || false,
        });
      });

      console.log('\nFinal stats:', results.stats);
      console.log('Total test results:', results.tests.length);

      try {
        if (!fs.existsSync('test-results')) {
          console.log('Creating test-results directory...');
          fs.mkdirSync('test-results', { recursive: true });
        }

        const outputPath = 'test-results/test-results.json';
        fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
        console.log(`\nTest results written to ${outputPath}`);

        // Verify the file was created
        if (fs.existsSync(outputPath)) {
          const stats = fs.statSync(outputPath);
          console.log(`File size: ${stats.size} bytes`);
        } else {
          console.error('Failed to create output file!');
        }
      } catch (error) {
        console.error('Error writing test results:', error);
      }
    },

    onTestRunStarted() { },
    onTestRunFinished() { },
    reportTestFileResults() { },
    getTestProgress() { return ''; },
  };
}

export default {
  nodeResolve: true,
  coverage: true,
  reporters: [
    defaultReporter(),
    myReporter(),
  ],
  testFramework: {
    type: 'mocha',
    config: {
      timeout: 10000,
    },
  },
  coverageConfig: {
    report: true,
    reportDir: 'coverage',
    exclude: [
      'test/fixtures/**',
      'node_modules/**',
      '.rum/**',
      'src/**',
    ],
  },
  files: [
    'test/**/*.test.{html,js}',
    'test/*.test.{html,js}',
  ],
  middleware: [
    async function emulateRUM(context, next) {
      if (context.url.startsWith('/src/index.map.js')) {
        await next();
        context.body = context.body
          .replace(/navigator\.sendBeacon/g, 'fakeSendBeacon');
        return true;
      } else if (context.url.startsWith('/.rum')) {
        if (context.url.startsWith('/.rum/@adobe/helix-rum-js@%5E2/dist/')
          || context.url.startsWith('/.rum/@adobe/helix-rum-js@^2/dist/')
        ) {
          context.url = '/node_modules/@adobe/helix-rum-js/dist/rum-standalone.js';
          await next();
          context.body = context.body
            .replace(/const weight =/, 'const weight = 1 ||')
            .replace(/navigator\.sendBeacon/g, 'fakeSendBeacon')
            // eslint-disable-next-line no-template-curly-in-string
            .replace('.rum/@adobe/helix-rum-enhancer@${enhancerVersion || \'^2\'}/src/index.js', 'src/index.map.js');
          return true;
        } else if (context.url.startsWith('/.rum/web-vitals')) {
          context.url = '/node_modules/web-vitals/dist/web-vitals.iife.js';
          await next();
          return true;
        } else if (context.url === '/.rum/1') {
          // return a 201 response and do nothing
          context.status = 201;
          return true;
        }
      }
      return next();
    },
  ],
};
