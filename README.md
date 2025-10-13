# Anotter Tagger - TF-IDF Tagging for Obsidian

This is an Obsidian plugin that brings intelligent, otter-inspired automated tagging to your notes using TF-IDF (Term Frequency-Inverse Document Frequency) analysis. This plugin helps you maintain a consistent and meaningful tagging system by suggesting relevant tags based on the content of your notes.

## Features

-   Automated tag suggestions using TF-IDF analysis
-   Smart tag recommendations based on note content
-   Customizable tagging preferences
-   Otter-inspired UI elements for a playful experience
-   Multi-language support for stopwords filtering

## First time developing plugins?

Quick starting guide for new plugin devs:

-   Check if [someone already developed a plugin for what you want](https://obsidian.md/plugins)! There might be an existing plugin similar enough that you can partner up with.
-   Make a copy of this repo as a template with the "Use this template" button (login to GitHub if you don't see it).
-   Clone your repo to a local development folder. For convenience, you can place this folder in your `.obsidian/plugins/your-plugin-name` folder.
-   Install NodeJS, then run `npm i` in the command line under your repo folder.
-   Run `npm run dev` to compile your plugin from `main.ts` to `main.js`.
-   Make changes to `main.ts` (or create new `.ts` files). Those changes should be automatically compiled into `main.js`.
-   Reload Obsidian to load the new version of your plugin.
-   Enable plugin in settings window.
-   For updates to the Obsidian API run `npm update` in the command line under your repo folder.

## Releasing new releases

-   Update your `manifest.json` with your new version number, such as `1.0.1`, and the minimum Obsidian version required for your latest release.
-   Update your `versions.json` file with `"new-plugin-version": "minimum-obsidian-version"` so older versions of Obsidian can download an older version of your plugin that's compatible.
-   Create new GitHub release using your new version number as the "Tag version". Use the exact version number, don't include a prefix `v`. See here for an example: https://github.com/obsidianmd/obsidian-sample-plugin/releases
-   Upload the files `manifest.json`, `main.js`, `styles.css` as binary attachments. Note: The manifest.json file must be in two places, first the root path of your repository and also in the release.
-   Publish the release.

> You can simplify the version bump process by running `npm version patch`, `npm version minor` or `npm version major` after updating `minAppVersion` manually in `manifest.json`.
> The command will bump version in `manifest.json` and `package.json`, and add the entry for the new version to `versions.json`

## Adding your plugin to the community plugin list

-   Check the [plugin guidelines](https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines).
-   Publish an initial version.
-   Make sure you have a `README.md` file in the root of your repo.
-   Make a pull request at https://github.com/obsidianmd/obsidian-releases to add your plugin.

## How to use

1. Install the plugin from Obsidian's Community Plugins
2. Enable the plugin in Settings → Community Plugins
3. Open any note you want to tag
4. Edit your note, once obsidian saves your file, you'll find a few new tags added to it.

## Configuration

You can customize the plugin's behavior in the settings tab:

-   Adjust the minimum word frequency threshold
-   Set maximum number of tags per document
-   Customize tag prefix/suffix
-   Enable/disable automatic tagging

## Acknowledgments

This plugin uses the stopwords list from [stopwords-iso](https://github.com/stopwords-iso/stopwords-iso), a comprehensive collection of stopwords for multiple languages. We appreciate their work in maintaining this valuable resource.

-   `npm i` or `yarn` to install dependencies.
-   `npm run dev` to start compilation in watch mode.
