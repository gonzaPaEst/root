import { configSheet } from "./helpers/config-sheet.mjs";
import { PbtaRolls } from "../../../systems/pbta/module/rolls.js";
import { PbtaUtility } from "../../../systems/pbta/module/utility.js";
import { RootUtility } from "./helpers/utility.mjs";

// once the game has initialized, set up the module
Hooks.once('init', () => {

  // register Root settings
  game.settings.register('root', 'masteries', {
    name: game.i18n.localize("Root.Settings.Masteries.Title"),
    default: false,
    type: Boolean,
    scope: 'world',
    config: true,
    hint: game.i18n.localize("Root.Settings.Masteries.Hint"),
    onChange: () => setTimeout(() => {
        location.reload();
      }, 500)
  });

})

// Override sheetConfig with Root sheet (TOML)
Hooks.once('pbtaSheetConfig', () => {
  
  // Disable the sheet config form.
  game.settings.set('pbta', 'sheetConfigOverride', true);
  
  // Replace the game.pbta.sheetConfig with WoDu version.
  configSheet();

});

// Hide or add instructions for Triumph, depending on Masteries Rule settings
Hooks.on("renderItemSheet", async function (app, html, data) {

  if (app.object.type == 'move') {
    let masteries = await game.settings.get('root', 'masteries');
    let resources = html.find('div[data-tab="description"] div.resource');
    let triumph = resources[1];
    let triumphLabel = triumph.querySelector('label');
    let triumphInstructions = game.i18n.localize("Root.Sheet.Instructions.Triumph");
    let strongHit = resources[2];
    let strongHitLabel = strongHit.querySelector('label');
    let strongHitInstructions = game.i18n.localize("Root.Sheet.Instructions.StrongHit");
    if (!masteries) {
      triumph.style.display = 'none';
    } else {
      triumphLabel.innerHTML += `<br> <span style="font-weight: normal; font-style: italic; font-size: 13px;">${triumphInstructions}</span>`;
      strongHitLabel.innerHTML += `<br> <span style="font-weight: normal; font-style: italic; font-size: 13px;">${strongHitInstructions}</span>`;
    }
  };  

});

/* -------------------------------------------- */
/*  Actor Updates                               */
/* -------------------------------------------- */

// Change starting image
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

// Load moves and details
Hooks.on('createActor', async (actor, options, id) => {

  // Prepare updates object.
  let updates = {};

  if (actor.type == 'character') {

    // Get the item moves as the priority.
    let moves = game.items.filter(i => i.type === 'move' && ['basic', 'weapon-basic', 'reputation', 'travel', 'other'].includes(i.system.moveType));
    const compendium = await RootUtility.loadCompendia(['basic', 'weapon-basic', 'reputation', 'travel', 'other']);
    let actorMoves = [];

    actorMoves = actor.items.filter(i => i.type == 'move');

    // Get the compendium moves next.
    let moves_compendium = compendium.filter(m => {
      const notTaken = actorMoves.filter(i => i.name == m.name);
      return notTaken.length < 1;
    });
    // Append compendium moves to the item moves.
    let moves_list = moves.map(m => {
      return m.name;
    })
    for (let move of moves_compendium) {
      if (!moves_list.includes(move.name)) {
        moves.push(move);
        moves_list.push(move.name);
      }
    }

    // Sort the moves and build our groups.
    moves.sort((a, b) => {
      const aSort = a.name.toLowerCase();
      const bSort = b.name.toLowerCase();
      if (aSort < bSort) {
        return -1;
      }
      if (aSort > bSort) {
        return 1;
      }
      return 0;
    });

    // Add templates for background, nature, drives, and connections.
    updates['system.details.biography'] = game.i18n.localize('Root.BackgroundTemplate');
    updates['system.attrLeft.nature.value'] = game.i18n.localize('Root.NatureTemplate');
    updates['system.attrLeft.drives.value'] = game.i18n.localize('Root.DrivesTemplate');
    updates['system.attrLeft.connections.value'] = game.i18n.localize('Root.ConnectionsTemplate');

    // Add to the actor.
    const movesToAdd = moves.map(m => duplicate(m));

    // Only execute the function once.
    const owners = [];
    Object.entries(actor.permission).forEach(([uid, role]) => {
      // @todo unhardcode this role ID (owner).
      if (role == 3) owners.push(uid);
    });
    const isOwner = owners.includes(game.user.id);
    // @todo improve this to better handle multiple GMs/owers.
    const allowMoveAdd = game.user.isGM || (isOwner && game.users.filter(u => u.role == CONST.USER_ROLES.GAMEMASTER && u.document.active).length < 1);

    // If there are moves and we haven't already add them, add them.
    if (movesToAdd.length > 0 && allowMoveAdd) {
      await actor.createEmbeddedDocuments('Item', movesToAdd, {});
      console.log(movesToAdd);
    }
  }

  if (updates && Object.keys(updates).length > 0) {
    await actor.update(updates);
  }
});

// Change Class method to override Triumph outcome in Mastery moves.
Hooks.on('ready', ()=>{

  PbtaRolls.rollMoveExecute = async function(roll, dataset, templateData, form = null) {
    // Render the roll.
    let template = 'systems/pbta/templates/chat/chat-move.html';
    let dice = await this.getRollFormula('2d6', this.actor);
    let forwardUsed = false;
    let rollModeUsed = false;
    let resultRangeNeeded = templateData.resultRangeNeeded ?? false;
    let rollData = this.actor.getRollData();
    let conditions = [];

    // GM rolls.
    let chatData = {
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: this.actor })
    };
    let rollMode = game.settings.get("core", "rollMode");
    if (["gmroll", "blindroll"].includes(rollMode)) chatData["whisper"] = ChatMessage.getWhisperRecipients("GM");
    if (rollMode === "selfroll") chatData["whisper"] = [game.user.id];
    if (rollMode === "blindroll") chatData["blind"] = true;

    // Handle dice rolls.
    if (!PbtaUtility.isEmpty(roll)) {
      // Test if the roll is a formula.
      let validRoll = false;
      try {
        validRoll = await new Roll(roll.trim(), rollData).evaluate({async: true});
      } catch (error) {
        validRoll = false;
      }

      // Roll can be either a formula like `2d6+3` or a raw stat like `str`.
      let formula = validRoll ? roll.trim() : '';
      // Handle prompt (user input).
      if (!validRoll || dataset?.rollType == 'formula') {

        // Determine the formula if this is a PROMPT roll.
        if (roll.toLowerCase() == 'prompt') {
          formula = form.prompt?.value ? `${dice}+${form.prompt.value}` : dice;
          if (dataset.value && dataset.value != 0) {
            formula += `+${dataset.value}`;
          }
        }
        // Determine the formula if it's a custom formula.
        else if (dataset?.rollType == 'formula') {
          formula = roll;
        }
        // Handle raw ability scores (no input).
        else if (roll.match(/(\d*)d\d+/g)) {
          formula = roll;
        }
        // Handle moves.
        else {
          // Determine if the stat toggle is in effect.
          let hasToggle = game.pbta.sheetConfig.statToggle;
          let toggleModifier = 0;
          templateData.stat = roll;
          if (hasToggle) {
            const statToggle = this.actor.system.stats[roll].toggle;
            toggleModifier = statToggle ? game.pbta.sheetConfig.statToggle.modifier : 0;
          }
          // Set the formula based on the stat.
          formula = `${dice}+${this.actorData.stats[roll].value}${toggleModifier ? '+' + toggleModifier : ''}`;
          if (dataset.value && dataset.value != 0) {
            formula += `+${dataset.value}`;
          }
        }

        // Handle modifiers on the move.
        if (dataset.mod) formula += Number(dataset.mod) >= 0 ? ` + ${dataset.mod}` : ` ${dataset.mod}`;

        // Handle conditions, if any.
        if (form?.condition) {
          if (form.condition?.length > 0) {
            for (let i = 0; i < form.condition.length; i++) {
              if (form.condition[i].checked) {
                let input = form.condition[i];
                let dataAttr = input.dataset;
                formula += dataAttr.mod >= 0 ? ` + ${dataAttr.mod}` : ` ${dataAttr.mod}`;
                conditions.push(dataAttr.content);
              }
            }
          }
          else if (form.condition.checked) {
            let input = form.condition;
            let dataAttr = input.dataset;
            formula += dataAttr.mod >= 0 ? ` + ${dataAttr.mod}` : ` ${dataAttr.mod}`;
            conditions.push(dataAttr.content);
          }
        }

        // Handle adv/dis. This works by finding the first die in the formula,
        // increasing its quantity by 1, and then appending kl or kh with the
        // original quantity.
        let rollMode = this.actor.flags?.pbta?.rollMode ?? 'def';
        switch (rollMode) {
          // Advantage.
          case 'adv':
            rollModeUsed = true;
            if (formula.includes('2d6')) {
              formula = formula.replace('2d6', '3d6kh2');
            }
            else if (formula.includes('d')) {
              // Match the first d6 as (n)d6.
              formula = formula.replace(/(\d*)(d)(\d+)/i, (match, p1, p2, p3, offset, string) => {
                let keep = p1 ? Number(p1) : 1;
                let count = keep + 1;
                return `${count}${p2}${p3}kh${keep}`; // Ex: 2d6 -> 3d6kh2
              });
            }
            conditions.push(game.i18n.localize("PBTA.Advantage"));
            break;

          // Disadvantage.
          case 'dis':
            rollModeUsed = true;
            if (formula.includes('2d6')) {
              formula = formula.replace('2d6', '3d6kl2');
            }
            else if (formula.includes('d')) {
              // Match the first d6 as (n)d6.
              formula = formula.replace(/(\d*)(d)(\d+)/i, (match, p1, p2, p3, offset, string) => {
                let keep = p1 ? Number(p1) : 1;
                let count = keep + 1;
                return `${count}${p2}${p3}kl${keep}`; // Ex: 2d6 -> 3d6kh2
              });
            }
            conditions.push(game.i18n.localize("PBTA.Disadvantage"));
            break;
        }

        // Handle forward and ongoing.
        if (this.actor.system?.resources?.forward?.value || this.actor.system?.resources?.ongoing?.value) {
          let modifiers = PbtaRolls.getModifiers(this.actor);
          formula = `${formula}${modifiers}`;
          if (this.actor.system?.resources?.forward?.value) {
            forwardUsed = Number(this.actor.system.resources.forward.value) != 0;
          }

          // Add labels for chat output.
          if (this.actor.system.resources.forward?.value) {
            let forward = Number(this.actor.system.resources.forward.value) ?? 0;
            conditions.push(`${game.i18n.localize('PBTA.Forward')} (${forward >= 0 ? '+' + forward : forward})`);
          }
          if (this.actor.system.resources.ongoing?.value) {
            let ongoing = Number(this.actor.system.resources.ongoing.value) ?? 0;
            conditions.push(`${game.i18n.localize('PBTA.Ongoing')} (${ongoing >= 0 ? '+' + ongoing : ongoing})`);
          }
        }

        // Establish that this roll is for a move or stat, so we need a result range.
        resultRangeNeeded = true;
      }

      if (formula != null) {
        // Catch wonky operators like "4 + - 3".
        formula = formula.replace(/\+\s*\-/g, '-');
        // Do the roll.
        let roll = new Roll(`${formula}`, rollData);
        await roll.evaluate({async: true});
        let rollType = templateData.rollType ?? 'move';
        // Handle moves that need result ranges but were missed.
        if (!resultRangeNeeded && templateData?.moveResults && typeof templateData.moveResults == 'object') {
          let tempResultRanges = Object.entries(templateData.moveResults);
          for (let [resultKey, resultRange] of tempResultRanges) {
            if (resultRange.value) {
              resultRangeNeeded = true;
              break;
            }
          }
        }

        // If a result range is needed, add the result range template.
        if (resultRangeNeeded && rollType == 'move') {
          // Retrieve the result ranges.
          let resultRanges = game.pbta.sheetConfig.rollResults;
          let resultType = null;
          // Iterate through each result range until we find a match.
          for (let [resultKey, resultRange] of Object.entries(resultRanges)) {
            // Grab the start and end.
            let start = resultRange.start;
            let end = resultRange.end;
            // If both are present, roll must be between them.
            if (start && end) {
              if (roll.total >= start && roll.total <= end) {
                resultType = resultKey;
                break;
              }
            }
            // If start only, treat it as greater than or equal to.
            else if (start) {
              if (roll.total >= start) {
                resultType = resultKey;
                break;
              }
            }
            // If end only, treat it as less than or equal to.
            else if (end) {
              if (roll.total <= end) {
                resultType = resultKey;
                break;
              }
            }
          }

          // Update the templateData.
          templateData.resultLabel = resultRanges[resultType]?.label ?? resultType;
          templateData.result = resultType;
          templateData.resultDetails = null;
          if (templateData?.moveResults && templateData.moveResults[resultType]?.value) {
            templateData.resultDetails = templateData.moveResults[resultType].value;
          }

          // Triumph override for Mastery moves.
          let masteries = await game.settings.get('root', 'masteries');
          if (masteries) {
            try {
              if (templateData.moveResults.critical.value != '' && roll.total >= '12') {
                templateData.result = 'critical';
                templateData.resultLabel = game.i18n.localize("Root.Sheet.Results.Critical");
                templateData.resultDetails = templateData.moveResults['critical'].value;
              }
            } catch (error) {
                console.log("Stat roll was used and it has no Triumph description.", error);
            }
          }

          // Add the stat label.
          if (templateData.stat && templateData.sheetType && this.actor.system.stats[templateData.stat]) {
            templateData.statMod = this.actor.system.stats[templateData.stat].value;
            templateData.stat = game.pbta.sheetConfig.actorTypes[templateData.sheetType]?.stats[templateData.stat]?.label ?? templateData.stat;
          }
        }

        // Remove stats if needed.
        if (!resultRangeNeeded) delete templateData.stat;

        // Add conditions for reference.
        if (conditions.length > 0) templateData.conditions = conditions;

        // Render it.
        roll.render().then(r => {
          templateData.rollPbta = r;
          renderTemplate(template, templateData).then(content => {
            chatData.content = content;
            if (game.dice3d) {
              game.dice3d.showForRoll(roll, game.user, true, chatData.whisper, chatData.blind).then(displayed => ChatMessage.create(chatData));
            }
            else {
              chatData.sound = CONFIG.sounds.dice;
              ChatMessage.create(chatData);
            }
          });
        });
      }
    }
    // If this isn't a roll, handle outputing the item description to chat.
    else {
      renderTemplate(template, templateData).then(content => {
        chatData.content = content;
        ChatMessage.create(chatData);
      });
    }

    // Update the combat flags.
    if (game.combat && game.combat.combatants) {
      let combatant = game.combat.combatants.find(c => c.actor.id == this.actor.id);
      if (combatant) {
        let flags = combatant.flags;
        let moveCount = flags.pbta ? flags.pbta.moveCount : 0;
        moveCount = moveCount ? Number(moveCount) + 1 : 1;
        let combatantUpdate = {
          _id: combatant.id,
          'flags.pbta.moveCount': moveCount
        };
        // Emit a socket for the GM client.
        if (!game.user.isGM) {
          game.socket.emit('system.pbta', {
            combatantUpdate: combatantUpdate
          });
        }
        else {
          let combatantUpdates = [];
          combatantUpdates.push(combatantUpdate);
          await game.combat.updateEmbeddedDocuments('Combatant', combatantUpdates);
          ui.combat.render();
        }
      }
    }

    // Update forward.
    if (forwardUsed || rollModeUsed) {
      let updates = {};
      if (forwardUsed) updates['system.resources.forward.value'] = 0;
      if (rollModeUsed && game.settings.get('pbta', 'advForward')) {
        updates['flags.pbta.rollMode'] = 'def';
      }
      await this.actor.update(updates);
    }
  };
})