import { configSheet } from "./helpers/config-sheet.mjs"

// once the game has initialized, set up the module
Hooks.once('init', () => {

  // register Root settings
  game.settings.register('root', 'settings-override', {
    name: game.i18n.localize("Root.Settings.Title"),
    default: false,
    type: Boolean,
    scope: 'world',
    config: true,
    hint: game.i18n.localize("Root.Settings.Hint"),
    onChange: () => setTimeout(() => {
        location.reload();
      }, 500)
  });

})

Hooks.once('pbtaSheetConfig', () => {
  
  // Disable the sheet config form.
  game.settings.set('pbta', 'sheetConfigOverride', true);
  
  // Replace the game.pbta.sheetConfig with WoDu version.
  configSheet();

});

Hooks.on("preCreateActor", async function (actor) {
  if (actor.data.img == "icons/svg/mystery-man.svg") {
    function random_icon(icons) {  
      return icons[Math.floor(Math.random()*icons.length)];
    }
    const icons = ["badger", "bird", "boar", "fox", "hyena", "lynx", "mole", "monkey", "raccoon"];
    let img = random_icon(icons);
    actor.data.update({ "img": `modules/root/styles/img/icons/${img}.svg` })
  }
});