module.exports = {
  plugins: [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    ["@semantic-release/changelog", {
      "changelogFile": "CHANGELOG.md",
    }],
    "@semantic-release/npm",
    ["@semantic-release/exec", {
      "publishCmd": "./tagger.sh ${nextRelease.version} src/index.js src/plugins/cwv.js src/plugins/form.js src/plugins/martech.js src/plugins/onetrust.js src/plugins/video.js --push"
    }],
    ["@semantic-release/git", {
      "assets": ["package.json", "package-lock.json", "CHANGELOG.md"],
      "message": "chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}"
    }],
    ["@semantic-release/github", {
      "assets": [
        {
          "path": "src/index.js",
          "label": "RUM Enhancer JS"
        },
        {
          "path": "src/index.md5",
          "label": "RUM Enhancer Hash"
        }
      ]
    }],
    ["semantic-release-slack-bot", {
      notifyOnSuccess: true,
      notifyOnFail: true,
      markdownReleaseNotes: true,
      slackChannel: "rum-explorers",
    }],
  ],
  branches: ['main'],
};
