import { configSheet } from "./helpers/config-sheet.mjs";
import { PbtaRolls } from "../../../systems/pbta/module/rolls.js";
import { PbtaUtility } from "../../../systems/pbta/module/utility.js";

// once the game has initialized, set up the module
Hooks.once('init', () => {

  // register Root settings
  game.settings.register('root', 'masteries', {
    name: game.i18n.localize("Root.Masteries.Title"),
    default: false,
    type: Boolean,
    scope: 'world',
    config: true,
    hint: game.i18n.localize("Root.Masteries.Hint"),
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
                templateData.resultLabel = "Triumph!";
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