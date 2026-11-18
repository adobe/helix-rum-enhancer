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
        { "path": "release-manifest.json", "label": "Release manifest (SHA-384 of every served file)" },
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
      "publishCmd": "./tagger.sh ${nextRelease.version} --manifest release-manifest.json package.json package-lock.json release-notes.md --push"
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
