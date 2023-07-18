import { configSheet } from "./helpers/config-sheet.mjs";
import { PbtaRolls } from "../../../systems/pbta/module/rolls.js";
import { PbtaUtility } from "../../../systems/pbta/module/utility.js";
import { RootUtility } from "./helpers/utility.mjs";
import { RootTraitsSheet, RootTraitsModel } from "./helpers/traits-sheet.mjs";

// Once the game has initialized, set up the Root module.
Hooks.once('init', () => {

  // Register Root settings.
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

  game.settings.register('root', 'automate', {
    name: game.i18n.localize("Root.Settings.Automate.Title"),
    default: false,
    type: Boolean,
    scope: 'world',
    config: true,
    hint: game.i18n.localize("Root.Settings.Automate.Hint"),
    onChange: () => setTimeout(() => {
        location.reload();
      }, 500)
  });

});

// Add Traits sheet and data model
Hooks.on("init", () => {

  Object.assign(CONFIG.Item.dataModels, {
    "root.traits": RootTraitsModel
  });

  Items.registerSheet("root", RootTraitsSheet, {
    types: ["root.traits"],
    makeDefault: true
  });
});

// Override sheetConfig with Root sheet (TOML).
Hooks.once('pbtaSheetConfig', () => {
  
  // Disable the sheet config form.
  game.settings.set('pbta', 'sheetConfigOverride', true);
  
  // Replace the game.pbta.sheetConfig with WoDu version.
  configSheet();

});

/* -------------------------------------------- */
/*  Actor Updates                               */
/* -------------------------------------------- */

// Change starting actor image.
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

// Load moves and details.
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

    // Add template for background.
    updates['system.details.biography'] = game.i18n.localize('Root.BackgroundTemplate');

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
      // Sort moves alphabetically
      let sortedMoves = [];
      for(let itemType of Object.values(actor.itemTypes)){
        sortedMoves = sortedMoves.concat(itemType.sort((a,b) => {
          return a.name.localeCompare(b.name)
        }).map((item, i)=> ({_id:item.id, sort: 100000 + i * 100000})));
      }
      await actor.updateEmbeddedDocuments("Item", sortedMoves);
    }
  }

  // Perform updates, if any.
  if (updates && Object.keys(updates).length > 0) {
    await actor.update(updates);
  }

});

// Make changes to item sheets
Hooks.on("renderItemSheet", async function (app, html, data) {

  let item = app.object;

  // Find if item is move
  if (item.type == 'move') {

    // Show Triumph description in move sheet if Masteries Rule enabled.
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

    // Show automate options
    let automate = await game.settings.get('root', 'automate');
      let moveGroup = html.find('input[name="system.moveGroup"]');
      let resource = moveGroup.closest('div.resource')
      let automationValue = await item.getFlag('root', 'automationValue') || "0";
      let automationStat = await item.getFlag('root', 'automationStat') || "none";
      let charmLabel = game.i18n.localize("Root.Sheet.Stats.Charm");
      let cunningLabel = game.i18n.localize("Root.Sheet.Stats.Cunning");
      let finesseLabel = game.i18n.localize("Root.Sheet.Stats.Finesse");
      let luckLabel = game.i18n.localize("Root.Sheet.Stats.Luck");
      let mightLabel = game.i18n.localize("Root.Sheet.Stats.Might");
      let injuryLabel = game.i18n.localize("Root.Sheet.NPC.Injury");
      let exhaustionLabel = game.i18n.localize("Root.Sheet.NPC.Exhaustion");
      let depletionLabel = game.i18n.localize("Root.Sheet.NPC.Depletion");
      let valueHTML = `<div class="resource">
      <label>Automation</label>
      <p>Add <select name="flags.root.automationValue" id="flags.root.automationValue" data-dType="String">`
      switch(automationValue) {
        case "0": valueHTML += `<option value="0" selected="selected">0</option>
        <option value="1">1</option>
        <option value="2">2</option>
        </select> to`
				break;
        case "1": valueHTML += `<option value="0">0</option>
        <option value="1" selected="selected">1</option>
        <option value="2">2</option>
        </select> to`
				break;
				case "2": valueHTML += `<option value="0">0</option>
        <option value="1">1</option>
        <option value="2" selected="selected">2</option>
        </select> to`
				break;
      }

      let statHTML = ` <select name="flags.root.automationStat" id="flags.root.automationStat" data-dType="String">`
      switch(automationStat) {
        case "none": statHTML += `<option value="none" selected="selected">---</option>
        <option value="charm">${charmLabel}</option>
        <option value="cunning">${cunningLabel}</option>
        <option value="finesse">${finesseLabel}</option>
        <option value="luck">${luckLabel}</option>
        <option value="might">${mightLabel}</option>
        <option value="injury">${injuryLabel}</option>
        <option value="exhaustion">${exhaustionLabel}</option>
        <option value="depletion">${depletionLabel}</option>
        </select>
        </div>`
				break;
        case "charm": statHTML += `<option value="none">---</option>
        <option value="charm" selected="selected">${charmLabel}</option>
        <option value="cunning">${cunningLabel}</option>
        <option value="finesse">${finesseLabel}</option>
        <option value="luck">${luckLabel}</option>
        <option value="might">${mightLabel}</option>
        <option value="injury">${injuryLabel}</option>
        <option value="exhaustion">${exhaustionLabel}</option>
        <option value="depletion">${depletionLabel}</option>
        </select>
        </div>`
				break;
				case "cunning": statHTML += `<option value="none">---</option>
        <option value="charm">${charmLabel}</option>
        <option value="cunning" selected="selected">${cunningLabel}</option>
        <option value="finesse">${finesseLabel}</option>
        <option value="luck">${luckLabel}</option>
        <option value="might">${mightLabel}</option>
        <option value="injury">${injuryLabel}</option>
        <option value="exhaustion">${exhaustionLabel}</option>
        <option value="depletion">${depletionLabel}</option>
        </select>
        </div>`
				break;
				case "finesse": statHTML += `<option value="none">---</option>
        <option value="charm">${charmLabel}</option>
        <option value="cunning">${cunningLabel}</option>
        <option value="finesse" selected="selected">${finesseLabel}</option>
        <option value="luck">${luckLabel}</option>
        <option value="might">${mightLabel}</option>
        <option value="injury">${injuryLabel}</option>
        <option value="exhaustion">${exhaustionLabel}</option>
        <option value="depletion">${depletionLabel}</option>
        </select>
        </div>`
				break;
        case "luck": statHTML += `<option value="none">---</option>
        <option value="charm">${charmLabel}</option>
        <option value="cunning">${cunningLabel}</option>
        <option value="finesse">${finesseLabel}</option>
        <option value="luck" selected="selected">${luckLabel}</option>
        <option value="might">${mightLabel}</option>
        <option value="injury">${injuryLabel}</option>
        <option value="exhaustion">${exhaustionLabel}</option>
        <option value="depletion">${depletionLabel}</option>
        </select>
        </div>`
				break;
        case "might": statHTML += `<option value="none">---</option>
        <option value="charm">${charmLabel}</option>
        <option value="cunning">${cunningLabel}</option>
        <option value="finesse">${finesseLabel}</option>
        <option value="luck">${luckLabel}</option>
        <option value="might" selected="selected">${mightLabel}</option>
        <option value="injury">${injuryLabel}</option>
        <option value="exhaustion">${exhaustionLabel}</option>
        <option value="depletion">${depletionLabel}</option>
        </select>
        </div>`
				break;
        case "injury": statHTML += `<option value="none">---</option>
        <option value="charm">${charmLabel}</option>
        <option value="cunning">${cunningLabel}</option>
        <option value="finesse">${finesseLabel}</option>
        <option value="luck">${luckLabel}</option>
        <option value="might">${mightLabel}</option>
        <option value="injury" selected="selected">${injuryLabel}</option>
        <option value="exhaustion">${exhaustionLabel}</option>
        <option value="depletion">${depletionLabel}</option>
        </select>
        </div>`
				break;
        case "exhaustion": statHTML += `<option value="none">---</option>
        <option value="charm">${charmLabel}</option>
        <option value="cunning">${cunningLabel}</option>
        <option value="finesse">${finesseLabel}</option>
        <option value="luck">${luckLabel}</option>
        <option value="might">${mightLabel}</option>
        <option value="injury">${injuryLabel}</option>
        <option value="exhaustion" selected="selected">${exhaustionLabel}</option>
        <option value="depletion">${depletionLabel}</option>
        </select>
        </div>`
				break;
        case "depletion": statHTML += `<option value="none">none</option>
        <option value="charm">${charmLabel}</option>
        <option value="cunning">${cunningLabel}</option>
        <option value="finesse">${finesseLabel}</option>
        <option value="luck">${luckLabel}</option>
        <option value="might">${mightLabel}</option>
        <option value="injury">${injuryLabel}</option>
        <option value="exhaustion">${exhaustionLabel}</option>
        <option value="depletion" selected="selected">${depletionLabel}</option>
        </select>
        </div>`
				break;
      }

    let automateHTML = `${valueHTML}${statHTML}`

    if (automate) {
      resource.after(automateHTML);
    }
  };  

  // Update flags in trait sheet
  if (item.type == 'root.traits') {

    let traitDescription = await item.getFlag('root', 'traitDescription') || "";
    let description = item.system.description;
    if (description != traitDescription) {
      await item.system.updateSource({ 'description': traitDescription })
      item.render(true)
    }
    // TODO en.json
    let traitType = await item.getFlag('root', 'traitType') || "nature";
    let traitTypeHTML = `<div class="trait-type"> <label class="resource-label">Type:</label> <select name="flags.root.traitType" id="flags.root.traitType" data-dType="String">`
      switch(traitType) {
        case "nature": traitTypeHTML += `<option value="nature" selected="selected">Nature</option>
        <option value="drive">Drive</option>
        <option value="connection">Connection</option>
        <option value="feat">Roguish Feat</option>
        </select>
        </div>`
				break;
				case "drive": traitTypeHTML += `<option value="nature">Nature</option>
        <option value="drive" selected="selected">Drive</option>
        <option value="connection">Connection</option>
        <option value="feat">Roguish Feat</option>
        </select>
        </div>`
				break;
				case "connection": traitTypeHTML += `<option value="nature">Nature</option>
        <option value="drive">Drive</option>
        <option value="connection" selected="selected">Connection</option>
        <option value="feat">Roguish Feat</option>
        </select>
        </div>`
				break;	
        case "feat": traitTypeHTML += `<option value="nature">Nature</option>
        <option value="drive">Drive</option>
        <option value="connection">Connection</option>
        <option value="feat" selected="selected">Roguish Feat</option>
        </select>
        </div>`
				break;	
      }
    let traitsFind = html.find('.traits')
    traitsFind.after(traitTypeHTML);
  }

});

// Add dropped trait item to correct description in actor sheet
Hooks.on('dropActorSheetData', async (actor, html, item) => {
  let droppedEntity = await fromUuid(item.uuid);
  let itemName = droppedEntity.name;
  let uuid = item.uuid;
  let newTrait = `<p>@UUID[${uuid}]{${itemName}}</p>`;
  let traits = actor.system.attrLeft;

  if (droppedEntity.type == "root.traits") {
    let traitType = droppedEntity.flags.root.traitType;

    if (traitType == "nature") {
      let currentNature = traits.nature.value;
      let traitHTML = `${currentNature}${newTrait}`;
      await actor.update({"system.attrLeft.nature.value": traitHTML});
    } else if (traitType == "drive") {
      let currentDrives = traits.drives.value;
      let traitHTML = `${currentDrives}${newTrait}`;
      await actor.update({"system.attrLeft.drives.value": traitHTML});
    } else if (traitType == "connection") {
      let currentConnections = traits.connections.value;
      let traitHTML = `${currentConnections}${newTrait}`;
      await actor.update({"system.attrLeft.connections.value": traitHTML});
    } else if (traitType == "feat") {
      let currentFeats = traits.feats.value;
      let traitHTML = `${currentFeats}${newTrait}`;
      await actor.update({"system.attrLeft.feats.value": traitHTML});
    }
  }

  let automate = await game.settings.get('root', 'automate');

  if (automate && droppedEntity.type == 'move') {
    let autoValue = await droppedEntity.getFlag('root', 'automationValue') || "0";
    let stat = await droppedEntity.getFlag('root', 'automationStat') || "none";
    if (stat == "charm") {
      let currentVal = actor.system.stats.charm.value;
      let newVal = parseInt(currentVal) + parseInt(autoValue);
      await actor.update({"system.stats.charm.value": newVal});
    } else if (stat == "cunning") {
      let currentVal = actor.system.stats.cunning.value;
      let newVal = parseInt(currentVal) + parseInt(autoValue);
      await actor.update({"system.stats.cunning.value": newVal});
    } else if (stat == "finesse") {
      let currentVal = actor.system.stats.finesse.value;
      let newVal = parseInt(currentVal) + parseInt(autoValue);
      await actor.update({"system.stats.finesse.value": newVal});
    } else if (stat == "luck") {
      let currentVal = actor.system.stats.luck.value;
      let newVal = parseInt(currentVal) + parseInt(autoValue);
      await actor.update({"system.stats.luck.value": newVal});
    } else if (stat == "might") {
      let currentVal = actor.system.stats.might.value;
      let newVal = parseInt(currentVal) + parseInt(autoValue);
      await actor.update({"system.stats.might.value": newVal});
    } else if (stat == "injury") {
      let count = 0;
      let parsedVal = parseInt(autoValue)
      const indicesToReview = [0, 2, 4, 6];
      for (let index of indicesToReview) {
        const checkbox = actor.system.attrLeft.resource.options['2'].values[index];
        if (checkbox.value === false) {
          let updateKey = `system.attrLeft.resource.options.2.values.${index}.value`;
          await actor.update({ [updateKey]: true });
          count++;
        }
        if (count === parsedVal) {
          break;
        }
      }
    } else if (stat == "exhaustion") {
      let count = 0;
      let parsedVal = parseInt(autoValue)
      const indicesToReview = [0, 2, 4, 6];
      for (let index of indicesToReview) {
        const checkbox = actor.system.attrLeft.resource.options['5'].values[index];
        if (checkbox.value === false) {
          let updateKey = `system.attrLeft.resource.options.5.values.${index}.value`;
          await actor.update({ [updateKey]: true });
          count++;
        }
        if (count === parsedVal) {
          break;
        }
      }
    } else if (stat == "depletion") {
      let count = 0;
      let parsedVal = parseInt(autoValue)
      const indicesToReview = [0, 2, 4, 6];
      for (let index of indicesToReview) {
        const checkbox = actor.system.attrLeft.resource.options['8'].values[index];
        if (checkbox.value === false) {
          let updateKey = `system.attrLeft.resource.options.8.values.${index}.value`;
          await actor.update({ [updateKey]: true });
          count++;
        }
        if (count === parsedVal) {
          break;
        }
      }
    };

    setTimeout(() => {
      actor.sheet.render(true);
    }, 100);
  }
});

Hooks.on('deleteItem', async (item, options, userId, ...args) => {
  let automate = await game.settings.get('root', 'automate');
  let actor = await item.parent;

  if (automate && item.type == 'move') {
    let autoValue = await item.getFlag('root', 'automationValue') || "0";
    let stat = await item.getFlag('root', 'automationStat') || "none";
    if (stat == "charm") {
      let currentVal = actor.system.stats.charm.value;
      let newVal = parseInt(currentVal) - parseInt(autoValue);
      await actor.update({"system.stats.charm.value": newVal});
    } else if (stat == "cunning") {
      let currentVal = actor.system.stats.cunning.value;
      let newVal = parseInt(currentVal) - parseInt(autoValue);
      await actor.update({"system.stats.cunning.value": newVal});
    } else if (stat == "finesse") {
      let currentVal = actor.system.stats.finesse.value;
      let newVal = parseInt(currentVal) - parseInt(autoValue);
      await actor.update({"system.stats.finesse.value": newVal});
    } else if (stat == "luck") {
      let currentVal = actor.system.stats.luck.value;
      let newVal = parseInt(currentVal) - parseInt(autoValue);
      await actor.update({"system.stats.luck.value": newVal});
    } else if (stat == "might") {
      let currentVal = actor.system.stats.might.value;
      let newVal = parseInt(currentVal) - parseInt(autoValue);
      await actor.update({"system.stats.might.value": newVal});
    } else if (stat == "injury") {
      let count = 0;
      let parsedVal = parseInt(autoValue)
      const indicesToReview = [6, 4, 2, 0];
      for (let index of indicesToReview) {
        const checkbox = actor.system.attrLeft.resource.options['2'].values[index];
        if (checkbox.value === true) {
          let updateKey = `system.attrLeft.resource.options.2.values.${index}.value`;
          await actor.update({ [updateKey]: false });
          count++;
        }
        if (count === parsedVal) {
          break;
        }
      }
    } else if (stat == "exhaustion") {
      let count = 0;
      let parsedVal = parseInt(autoValue)
      const indicesToReview = [6, 4, 2, 0];
      for (let index of indicesToReview) {
        const checkbox = actor.system.attrLeft.resource.options['5'].values[index];
        if (checkbox.value === true) {
          let updateKey = `system.attrLeft.resource.options.5.values.${index}.value`;
          await actor.update({ [updateKey]: false });
          count++;
        }
        if (count === parsedVal) {
          break;
        }
      }
    } else if (stat == "depletion") {
      let count = 0;
      let parsedVal = parseInt(autoValue)
      const indicesToReview = [6, 4, 2, 0];
      for (let index of indicesToReview) {
        const checkbox = actor.system.attrLeft.resource.options['8'].values[index];
        if (checkbox.value === true) {
          let updateKey = `system.attrLeft.resource.options.8.values.${index}.value`;
          await actor.update({ [updateKey]: false });
          count++;
        }
        if (count === parsedVal) {
          break;
        }
      }
    };

    setTimeout(() => {
      actor.sheet.render(true);
    }, 200);
  }
});


// Add event listeners when actor sheet is rendered.
Hooks.on("renderActorSheet", async function (app, html, data) {

  // Alt+Click to render playbook
  let charPlaybook = document.querySelector('.charplaybook');
  let name = charPlaybook.defaultValue;
  // TODO en.json
  charPlaybook.title = "Press Alt or Option + Click to open playbook.";
  if (name != '') {
    charPlaybook.addEventListener("click", openPlaybook);
    async function openPlaybook(e) {
      if (e.altKey){
        // Retrieve playbooks in game and then in compendium
        let playbooks = game.items.filter(i => i.type == 'playbook');
        let pack = game.packs.get("root.playbooks")
        let items = pack ? await pack.getDocuments() : [];
        playbooks = playbooks.concat(items.filter(i => i.type == 'playbook'));
        // Remove playbook repeats by matching names in new array.
        let playbookNames = [];
        for (let p of playbooks) {
          let playbookName = p.name;
          if (playbookNames.includes(playbookName) !== false) {
            playbooks = playbooks.filter(item => item.id != p.id);
          } else {
            playbookNames.push(playbookName)
          }
        }
        // Render current playbook
        for (let playbook of playbooks) {
          if (playbook.name == name) {
            playbook.sheet.render(true);
          };
        };
      };
    };
  };

  // Prepend hold flag before forward and ongoing
  let actor = app.actor;
  let holdValue = actor.getFlag('root', 'hold') || "0";
  let holdHTML = `<div class="cell cell--hold">
  <label for="flags.root.hold" class="cell__title">Hold</label>
  <input type="text" name="flags.root.hold" value="${holdValue}" data-dtype="Number">
  </div>
  `
  let resourcesSection = html.find('div.moves section.sheet-resources');
  resourcesSection.prepend(holdHTML)

  // Add Mastery tag to actor sheet if move has Triumph description.
  let masteries = await game.settings.get('root', 'masteries');
  let metaTags = html.find('.item-meta.tags');
  let items = metaTags.parent('li.item');
  for (let item of items) {
      let critical = item.querySelector('div.result--critical');
      if (critical) {
        if (masteries) {
          let metaTag = item.querySelector('.item-meta.tags');
          let mastery = `<span class="tag tag--formula mastery">Mastery</span>`;
          let stat = metaTag.innerHTML;
        metaTag.innerHTML = `${mastery}${stat}`;
        } else {
          critical.style.display = 'none';
        };
      };
    };

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