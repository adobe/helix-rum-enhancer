module.exports = {
  plugins: [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    ["@semantic-release/changelog", {
      "changelogFile": "release-notes.md",
    }],
    "@semantic-release/npm",
    ["@semantic-release/github", {
      "assets": [
        { "path": "release-notes.md", "label": "Release notes" },
        {
          "path": "src/index.js",
          "label": "RUM Enhancer JS"
        },
        {
          "path": "src/index.md5",
          "label": "RUM Enhancer Hash"
        },
        {
          "path": "src/index.sri",
          "label": "RUM Enhancer SRI Hash"
        }
      ]
    }],
    ["@semantic-release/exec", {
      "publishCmd": "./tagger.sh ${nextRelease.version} src/index.js src/plugins/cwv.js src/plugins/form.js src/plugins/martech.js src/plugins/onetrust.js src/plugins/video.js src/plugins/webcomponent.js package.json package-lock.json release-notes.md --push"
    }],
    ["semantic-release-slack-bot", {
      notifyOnSuccess: true,
      notifyOnFail: true,
      markdownReleaseNotes: true,
      slackChannel: "optel-explorers",
    }],
  ],
  branches: ['main'],
};
