import { tokenSays } from './token-quips.js';
import { TokenSaysSettingsConfig } from './apps/say-list-form.js';

/*
 * Token Quips header controls for Foundry V13
 *
 * This script registers header buttons for the TokenConfig and
 * PrototypeTokenConfig sheets in Foundry V13.  When using
 * DocumentSheetV2, header buttons are stored in a dropdown menu
 * accessed via the three-dot icon.  We push our control onto the
 * controls array via the getHeaderControls hooks.
 */

Hooks.once("init", () => {
  // Only apply the header controls for Foundry V13 and later
  const version = game.version ?? game.release?.version;
  if (!version) return;
  // Apply for any version >= 13 (covers V13, V14, and beyond)
  const majorVersion = parseInt(version.split(".")[0], 10);
  if (majorVersion < 13) return;

  /**
   * Determine the actor associated with a TokenConfig or PrototypeTokenConfig.
   *
   * @param {Object} app The application instance
   * @returns {Actor|null}
   */
  function getActorFromApp(app) {
    // TokenConfig uses `object` for the TokenDocument
    const token = app.token ?? app.object ?? app.document ?? null;
    return token ? token.actor ?? null : null;
  }

  /**
   * Create and register a header control for the Token Quips module.
   *
   * @param {Object} app The application instance
   * @param {Array} controls The array of ApplicationHeaderControlsEntry objects
   */
  function addTokenSaysControl(app, controls) {
    controls.push({
      icon: "fa-solid fa-comment-dots",
      label: "Token Quips",
      name: "token-quips",
      visible: () => true,
      onClick: () => {
        const actor = getActorFromApp(app);
        const tokenName = actor?.name ?? app.token?.name ?? null;
        // Use the currently-open instance if it exists, otherwise create one.
        // TokenSaysSettingsConfig is a live binding set after Hooks.once('init').
        const form = tokenSays.TokenSaysSettingsConfig ?? new TokenSaysSettingsConfig();
        if (tokenName && typeof form.setLastSearch === 'function') {
          form.setLastSearch(String(tokenName).trim());
        }
        form.render({ force: true });
      }
    });
  }

  // Add controls for TokenConfig (placeable tokens)
  Hooks.on("getHeaderControlsTokenConfig", (app, controls) => {
    addTokenSaysControl(app, controls);
  });
  // Add controls for PrototypeTokenConfig (prototype tokens on actors)
  Hooks.on("getHeaderControlsPrototypeTokenConfig", (app, controls) => {
    addTokenSaysControl(app, controls);
  });
});