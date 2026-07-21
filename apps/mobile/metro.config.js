// Config Metro par défaut d'Expo — gère le monorepo pnpm (symlinks) depuis SDK 52.
const { getDefaultConfig } = require("expo/metro-config");

module.exports = getDefaultConfig(__dirname);
