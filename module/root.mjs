import { configSheet } from "./helpers/config-sheet.mjs";
import { RootTraitsModel, RootTraitsSheet } from "./helpers/traits-sheet.mjs";
import { RootUtility } from "./helpers/utility.mjs";

// Once the game has initialized, set up the Root module.
Hooks.once('init', () => {

  // Register Root settings.
  game.settings.register('root', 'automate', {
    name: game.i18n.localize("Root.Settings.Automate.Title"),
    default: true,
    type: Boolean,
    scope: 'world',
    config: true,
    hint: game.i18n.localize("Root.Settings.Automate.Hint"),
    requiresReload: true
  });

  game.settings.register('root', 'load', {
    name: game.i18n.localize("Root.Settings.Load.Title"),
    default: true,
    type: Boolean,
    scope: 'world',
    config: true,
    hint: game.i18n.localize("Root.Settings.Load.Hint"),
    requiresReload: true
  });

  game.settings.register('root', 'masteries', {
    name: game.i18n.localize("Root.Settings.Masteries.Title"),
    default: false,
    type: Boolean,
    scope: 'world',
    config: true,
    hint: game.i18n.localize("Root.Settings.Masteries.Hint"),
    requiresReload: true
  });

  game.settings.register('root', 'advantage', {
    name: game.i18n.localize("Root.Settings.Advantage.Title"),
    default: false,
    type: Boolean,
    scope: 'world',
    config: true,
    hint: game.i18n.localize("Root.Settings.Advantage.Hint"),
    requiresReload: true
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
  
  // Replace the game.pbta.sheetConfig with Root version.
  configSheet();

});

/* -------------------------------------------- */
/*  Actor Updates                               */
/* -------------------------------------------- */

// Change starting actor image.
Hooks.on("preCreateActor", async function (actor) {
  if (actor.img == "icons/svg/mystery-man.svg") {
    function random_icon(icons) {
      return icons[Math.floor(Math.random()*icons.length)];
    }
    const icons = ["badger", "bird", "boar", "fox", "hyena", "lynx", "mole", "monkey", "raccoon"];
    let img = random_icon(icons);
    actor.updateSource({ "img": `modules/root/styles/img/icons/${img}.svg` })
  }
});

Hooks.on("preCreateItem", async function (item) {
  if (item.img == "icons/svg/item-bag.svg") {
    if (item.type == "equipment") item.updateSource({ "img": `icons/svg/combat.svg` })
    if (item.type == "root.traits") item.updateSource({ "img": `icons/svg/pawprint.svg` })
  }
});

// Load moves and details.
Hooks.on('createActor', async (actor, options, id) => {

  // Prepare updates object.
  let updates = {};

  if (actor.type == 'character') {

    // Get the item moves as the priority.
    let moves = game.items.filter(i => i.type === 'move' && ['weapon-basic', 'other'].includes(i.system.moveType));
    const compendium = await RootUtility.loadCompendia(['weapon-basic', 'other']);
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
    updates['system.details.biography'] = game.i18n.localize('Root.Background.CustomTemplate');

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
      let automationValue = await item.getFlag('root', 'automationValue') || 0;
      let automationStat = await item.getFlag('root', 'automationStat') || 'none';
      let charmLabel = game.i18n.localize("Root.Sheet.Stats.Charm");
      let cunningLabel = game.i18n.localize("Root.Sheet.Stats.Cunning");
      let finesseLabel = game.i18n.localize("Root.Sheet.Stats.Finesse");
      let luckLabel = game.i18n.localize("Root.Sheet.Stats.Luck");
      let mightLabel = game.i18n.localize("Root.Sheet.Stats.Might");
      let injuryLabel = game.i18n.localize("Root.Sheet.NPC.Injury");
      let exhaustionLabel = game.i18n.localize("Root.Sheet.NPC.Exhaustion");
      let depletionLabel = game.i18n.localize("Root.Sheet.NPC.Depletion");
      let automationLabel = game.i18n.localize("Root.Sheet.Traits.Automation");

    let automateHTML= `
    <div class="resource">
        <label>${automationLabel}</label>
        <p><i class="fa-solid fa-plus"></i><input type="text" name="flags.root.automationValue" value="${automationValue}" data-dtype="Number" style="text-align: center; width: 30px;"> 
        <select name="flags.root.automationStat" id="flags.root.automationStat" data-dType="String">
            <option value="none"${automationStat === 'none' ? ' selected' : ''}>---</option>
            <option value="charm"${automationStat === 'charm' ? ' selected' : ''}>${charmLabel}</option>
            <option value="cunning"${automationStat === 'cunning' ? ' selected' : ''}>${cunningLabel}</option>
            <option value="finesse"${automationStat === 'finesse' ? ' selected' : ''}>${finesseLabel}</option>
            <option value="luck"${automationStat === 'luck' ? ' selected' : ''}>${luckLabel}</option>
            <option value="might"${automationStat === 'might' ? ' selected' : ''}>${mightLabel}</option>
            <option value="injury"${automationStat === 'injury' ? ' selected' : ''}>${injuryLabel}</option>
            <option value="exhaustion"${automationStat === 'exhaustion' ? ' selected' : ''}>${exhaustionLabel}</option>
            <option value="depletion"${automationStat === 'depletion' ? ' selected' : ''}>${depletionLabel}</option>
        </select>
        </p>
    </div>
`;

    if (automate) {
      resource.after(automateHTML);
    }
  };

  // Find if item is move
  if (item.type == 'equipment') {

    // HANDLE TAGS
    try {
      // Find tags and sort ranges first
      const tagsJson = item.system.tags;
      const tagsData = JSON.parse(tagsJson);
      const desiredValues = ["intimate", "close", "far"];
      function customSort(a, b) {
        const indexA = desiredValues.indexOf(a.value);
        const indexB = desiredValues.indexOf(b.value);
        if (indexA !== -1 && indexB !== -1) {
          return indexA - indexB;
        }
        if (indexA !== -1) {
          return -1;
        } else if (indexB !== -1) {
          return 1;
        }
        return 0;
      }
      const sortedData = tagsData.sort(customSort);
      const updatedTagsJson = JSON.stringify(sortedData);
      // Update new tags order
      await item.update({ [`system.tags`]: updatedTagsJson });
    } catch (error) {
      console.log("No tags yet", error)
    }

    // Render tag when clicked on item sheet
    let tag = html.find('tags tag')

      tag.click(async function (e) {
        let name = e.target.innerText;
        // Retrieve tags in game and then in compendium
        let tagItems = game.items.filter(i => i.type == 'tag');
        let pack = game.packs.get("root.tags")
        let items = pack ? await pack.getDocuments() : [];
        tagItems = tagItems.concat(items.filter(i => i.type == 'tag'));
        // Remove tag repeats by matching names in new array.
        let tagNames = [];
        for (let t of tagItems) {
          let tagName = t.name;
          if (tagNames.includes(tagName) !== false) {
            tagItems = tagItems.filter(item => item.id != t.id);
          } else {
            tagNames.push(tagName)
          }
        }
        // Render tag
        for (let tagItem of tagItems) {
          if (tagItem.name.toLowerCase() == name) {
            tagItem.sheet.render(true);
          };
        };
      });

    // Include item wear
    let uses = html.find('input[name="system.uses"]');
    let usesDiv = uses.closest('div.resource');
    let addWearOne = await item.getFlag('root', 'itemWear.addBox1') || false;
    let wearOne = await item.getFlag('root', 'itemWear.box1') || false;
    let addWearTwo = await item.getFlag('root', 'itemWear.addBox2') || false;
    let wearTwo = await item.getFlag('root', 'itemWear.box2') || false;
    let addWearThree = await item.getFlag('root', 'itemWear.addBox3') || false;
    let wearThree = await item.getFlag('root', 'itemWear.box3') || false;
    let addWearFour = await item.getFlag('root', 'itemWear.addBox4') || false;
    let wearFour = await item.getFlag('root', 'itemWear.box4') || false;
    let addWearFive = await item.getFlag('root', 'itemWear.addBox5') || false;
    let wearFive = await item.getFlag('root', 'itemWear.box5') || false;
    let addWearSix = await item.getFlag('root', 'itemWear.addBox6') || false;
    let wearSix = await item.getFlag('root', 'itemWear.box6') || false;
    let addWearSeven = await item.getFlag('root', 'itemWear.addBox7') || false;
    let wearSeven = await item.getFlag('root', 'itemWear.box7') || false;
    let addWearEight = await item.getFlag('root', 'itemWear.addBox8') || false;
    let wearEight = await item.getFlag('root', 'itemWear.box8') || false;
    let wearLabel = game.i18n.localize("Root.Sheet.Items.Wear");
    let depletionLabel = game.i18n.localize("Root.Sheet.Items.Depletion");

    let wearBoxes = `<label>${wearLabel}</label> <i class="wear far fa-plus-square"></i> <i class="wear far fa-minus-square"></i>
    <br><input type="checkbox" name="flags.root.itemWear.addBox1" data-dtype="Boolean" ${addWearOne ? 'checked' : ''}><input type="checkbox" name="flags.root.itemWear.box1" data-dtype="Boolean" ${wearOne ? 'checked' : ''}><input type="checkbox" name="flags.root.itemWear.addBox2" data-dtype="Boolean" ${addWearTwo ? 'checked' : ''}><input type="checkbox" name="flags.root.itemWear.box2" data-dtype="Boolean" ${wearTwo ? 'checked' : ''}><input type="checkbox" name="flags.root.itemWear.addBox3" data-dtype="Boolean" ${addWearThree ? 'checked' : ''}><input type="checkbox" name="flags.root.itemWear.box3" data-dtype="Boolean" ${wearThree ? 'checked' : ''}><input type="checkbox" name="flags.root.itemWear.addBox4" data-dtype="Boolean" ${addWearFour ? 'checked' : ''}><input type="checkbox" name="flags.root.itemWear.box4" data-dtype="Boolean" ${wearFour ? 'checked' : ''}><input type="checkbox" name="flags.root.itemWear.addBox5" data-dtype="Boolean" ${addWearFive ? 'checked' : ''}><input type="checkbox" name="flags.root.itemWear.box5" data-dtype="Boolean" ${wearFive ? 'checked' : ''}><input type="checkbox" name="flags.root.itemWear.addBox6" data-dtype="Boolean" ${addWearSix ? 'checked' : ''}><input type="checkbox" name="flags.root.itemWear.box6" data-dtype="Boolean" ${wearSix ? 'checked' : ''}><input type="checkbox" name="flags.root.itemWear.addBox7" data-dtype="Boolean" ${addWearSeven ? 'checked' : ''}><input type="checkbox" name="flags.root.itemWear.box7" data-dtype="Boolean" ${wearSeven ? 'checked' : ''}><input type="checkbox" name="flags.root.itemWear.addBox8" data-dtype="Boolean" ${addWearEight ? 'checked' : ''}><input type="checkbox" name="flags.root.itemWear.box8" data-dtype="Boolean" ${wearEight ? 'checked' : ''}>`
    usesDiv[0].innerHTML = wearBoxes
    let itemFaPlus = html.find('.wear.fa-plus-square');
    let itemFaMinus = html.find('.wear.fa-minus-square');
    
    itemFaPlus.click(async function(event) {
      if (addWearOne == false) {
        addWearOne = await item.setFlag('root', 'itemWear.addBox1', true);
      } else if (addWearTwo == false) {
        addWearTwo = await item.setFlag('root', 'itemWear.addBox2', true);
      } else if (addWearThree == false) {
        addWearThree = await item.setFlag('root', 'itemWear.addBox3', true);
      } else if (addWearFour == false) {
        addWearFour = await item.setFlag('root', 'itemWear.addBox4', true);
      } else if (addWearFive == false) {
        addWearFive = await item.setFlag('root', 'itemWear.addBox5', true);
      } else if (addWearSix == false) {
        addWearSix = await item.setFlag('root', 'itemWear.addBox6', true);
      } else if (addWearSeven == false) {
        addWearSeven = await item.setFlag('root', 'itemWear.addBox7', true);
      } else if (addWearEight == false) {
        addWearEight = await item.setFlag('root', 'itemWear.addBox8', true);
      }
    });

    itemFaMinus.click(async function(event) {
       if (addWearEight == true) {
        addWearEight = await item.setFlag('root', 'itemWear.addBox8', false);
      } else if (addWearSeven == true) {
        addWearSeven = await item.setFlag('root', 'itemWear.addBox7', false);
      } else if (addWearSix == true) {
        addWearSix = await item.setFlag('root', 'itemWear.addBox6', false);
      } else if (addWearFive == true) {
        addWearFive = await item.setFlag('root', 'itemWear.addBox5', false);
      } else if (addWearFour == true) {
        addWearFour = await item.setFlag('root', 'itemWear.addBox4', false);
      } else if (addWearThree == true) {
        addWearThree = await item.setFlag('root', 'itemWear.addBox3', false);
      } else if (addWearTwo == true) {
        addWearTwo = await item.setFlag('root', 'itemWear.addBox2', false);
      } else if (addWearOne == true) {
        addWearOne = await item.setFlag('root', 'itemWear.addBox1', false);
      }
    });

    if (item.system.playbook == 'The Pirate' && item.system.tags.includes('stocked')) {
      let depletionOne = await item.getFlag('root', 'itemDepletion.box1') || false;
      let depletionTwo = await item.getFlag('root', 'itemDepletion.box2') || false;
      let depletionBoxes = `<hr><div class="resources"><label>${depletionLabel}</label>
      <br><input type="checkbox" name="flags.root.itemDepletion.box1" data-dtype="Boolean" ${depletionOne ? 'checked' : ''}><input type="checkbox" name="flags.root.itemDepletion.box2" data-dtype="Boolean" ${depletionTwo ? 'checked' : ''}>`
      usesDiv[0].insertAdjacentHTML('beforeend', depletionBoxes)
    };
    
  };

});

// Handle dropped items in actor sheet
Hooks.on('dropActorSheetData', async (actor, html, item) => {
  let droppedEntity = await fromUuid(item.uuid);
  let itemName = droppedEntity.name;
  let uuid = item.uuid;
  let newTrait = `<p>@UUID[${uuid}]{${itemName}}</p>`;
  let traits = actor.system.attrLeft;

  // Add dropped trait item to correct description in actor sheet
  if (droppedEntity.type === "root.traits") {
    const traitType = droppedEntity.flags.root.traitType;
  
    if (traitType in traits) {
      const currentValue = traits[traitType].value;
      const traitHTML = `${currentValue}${newTrait}`;
      const updateKey = `system.attrLeft.${traitType}.value`;
      await actor.update({ [updateKey]: traitHTML });
    }
  }

  // Add points/boxes to stats/resources if automatic stat increment = true
  let automate = await game.settings.get('root', 'automate');

  if (automate && droppedEntity.type === 'move') {
    const autoValue = await droppedEntity.getFlag('root', 'automationValue') || "0";
    const stat = await droppedEntity.getFlag('root', 'automationStat') || "none";

    if (stat in actor.system.stats) {
      const currentVal = actor.system.stats[stat].value;
      const newVal = parseInt(currentVal) + parseInt(autoValue);
      await actor.update({ [`system.stats.${stat}.value`]: newVal });
    } else if (stat === "injury" || stat === "exhaustion" || stat === "depletion") {
      const parsedVal = parseInt(autoValue);
      const resourceOptions = actor.system.attrLeft.resource.options;
      const indicesToReview = [4, 6, 8, 10];
      const optionIndex = stat === "injury" ? '0' : stat === "exhaustion" ? '1' : '2';

      let count = 0;
      for (let index of indicesToReview) {
        const checkbox = resourceOptions[optionIndex].values[index];

        if (checkbox.value === false) {
          const updateKey = `system.attrLeft.resource.options.${optionIndex}.values.${index}.value`;
          await actor.update({ [updateKey]: true });
          count++;
        }

        if (count === parsedVal) {
          break;
        }
      }
    }

    setTimeout(() => {
      actor.sheet.render(true);
    }, 100);
  }
});

// Remove points/boxes to stats/resources if automatic stat increment = true
Hooks.on('deleteItem', async (item, options, userId, ...args) => {
  const automate = await game.settings.get('root', 'automate');
  const actor = await item.parent;

  if (automate && item.type === 'move') {

    try {
      const autoValue = await item.getFlag('root', 'automationValue') || "0";
      const stat = await item.getFlag('root', 'automationStat') || "none";
      const systemStats = actor.system.stats;
  
      if (stat in systemStats) {
        const currentVal = systemStats[stat].value;
        const newVal = parseInt(currentVal) - parseInt(autoValue);
        const updateKey = `system.stats.${stat}.value`;
        await actor.update({ [updateKey]: newVal });
      } else if (stat === "injury" || stat === "exhaustion" || stat === "depletion") {
        let count = 0;
        const parsedVal = parseInt(autoValue);
        const resourceOptions = actor.system.attrLeft.resource.options;
        const indicesToReview = [4, 6, 8, 10];
  
        for (let index of indicesToReview) {
          const checkbox = resourceOptions[stat === "injury" ? '0' : stat === "exhaustion" ? '1' : '2'].values[index];
  
          if (checkbox.value === true) {
            const updateKey = `system.attrLeft.resource.options.${stat === "injury" ? '0' : stat === "exhaustion" ? '1' : '2'}.values.${index}.value`;
            await actor.update({ [updateKey]: false });
            count++;
          }
  
          if (count === parsedVal) {
            break;
          }
        }
      }
  
      setTimeout(() => {
        actor.sheet.render(true);
      }, 200);
      
    } catch (error) {
      console.log("Item not in actor", error)
    }
  }
});

// Add event listeners when actor sheet is rendered.
Hooks.on("renderActorSheet", async function (app, html, data) {

  let actor = app.actor;

  // Remove checking when clicking on label
  let labels = html.find('.cell.cell--reputation.cell--attr-reputation.cell--ListMany ul label, .cell.cell--resource.cell--attr-resource.cell--ListMany ul label, .pbta.sheet.npc .cell.cell--attributes-top ul label');

  labels.click(function(event) {
    if ($(event.target).is('input')) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
  });

  // Make checkbox increments behave like clocks
  function handleCheckboxIncrements(checkboxArrays) {
    checkboxArrays.forEach((checkbox, index) => {
      checkbox.change(function() {
        const isChecked = $(this).is(':checked');
        
        if (isChecked) {
          // Check all the following checkboxes
          checkboxArrays.slice(index + 1).forEach((followingCheckbox) => {
            followingCheckbox.prop('checked', true);
          });
        } else {
          // Uncheck all the preceding checkboxes
          checkboxArrays.slice(0, index).forEach((precedingCheckbox) => {
            precedingCheckbox.prop('checked', false);
          });
        }
      });
    });
  };

  // Render tag when clicked on actor sheet
  let tag = html.find('div.tags div.tag')

  tag.click(async function (e) {
    let name = e.target.innerText;
    // Retrieve tags in game and then in compendium
    let tagItems = game.items.filter(i => i.type == 'tag');
    let pack = game.packs.get("root.tags")
    let items = pack ? await pack.getDocuments() : [];
    tagItems = tagItems.concat(items.filter(i => i.type == 'tag'));
    // Remove tag repeats by matching names in new array.
    let tagNames = [];
    for (let t of tagItems) {
      let tagName = t.name;
      if (tagNames.includes(tagName) !== false) {
        tagItems = tagItems.filter(item => item.id != t.id);
      } else {
        tagNames.push(tagName)
      }
    }
    // Render tag
    for (let tagItem of tagItems) {
      if (tagItem.name == name) {
        tagItem.sheet.render(true);
      };
    };
  });

  if (actor.type == 'character') {

    // Add fa-book and click it to open playbook
    let charPlaybook = html.find('.charplaybook');
    let faBook = '<i class="fa-solid fa-book"></i>';
    charPlaybook.before(faBook);
    const faBookIcon = html.find('.sheet-header__fields .fa-book');
    faBookIcon.css('filter', 'opacity(0.4)');
    let name = charPlaybook[0].value;

    if (name != '') {
      faBookIcon.css('filter', 'opacity(1)');
      faBookIcon.mouseover(() => {
        faBookIcon.css('cursor', 'pointer'); // Change 'pointer' to the desired cursor style
      });
      
      // Reset the cursor style when the mouse leaves the element
      faBookIcon.mouseout(() => {
        faBookIcon.css('cursor', 'default'); // Change 'default' to the default cursor style you want
      });
      faBookIcon.click(async function (e) {
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
      });
    };

    // Prepend hold flag before forward and ongoing
    let holdValue = actor.getFlag('root', 'hold') || "0";
    let holdLabel = game.i18n.localize('Root.Sheet.AttrLeft.Hold');
    let holdHTML = `<div class="cell cell--hold">
    <label for="flags.root.hold" class="cell__title">${holdLabel}</label>
    <input type="text" name="flags.root.hold" value="${holdValue}" data-dtype="Number">
    </div>
    `
    let resourcesSection = html.find('div.moves section.sheet-resources');
    resourcesSection.prepend(holdHTML);

    // Calculate load, burdened and max
    let loadCalculate = await game.settings.get('root', 'load');
    
    if (loadCalculate) {
      const carryingInput = html.find('input[name="system.attrLeft.carrying.value"]');
      carryingInput.attr('readonly', 'readonly');
      let carryingLoad
      let calculateLoad = () => {
        let equipment = actor.items;
        let itemsLoad = equipment.reduce((acc,item) => {
          if (item.type === "equipment") {
            return acc + item.system.weight;
          }
          return acc;
        }, 0);  
        carryingLoad = itemsLoad;
      };
      calculateLoad();
      await actor.update({"system.attrLeft.carrying.value": carryingLoad});
      const burdenedInput = html.find('input[name="system.attrLeft.burdened.value"]');
      burdenedInput.attr('readonly', 'readonly');
      let migthValue = actor.system.stats.might.value;
      let burdenedLoad = 4 + migthValue;
      await actor.update({"system.attrLeft.burdened.value": burdenedLoad});
      const maxInput = html.find('input[name="system.attrLeft.max.value"]');
      maxInput.attr('readonly', 'readonly');
      let maxLoad = burdenedLoad * 2;
      await actor.update({"system.attrLeft.max.value": maxLoad})
      if (maxInput[0].value != actor.system.attrLeft.max.value) {
        setTimeout(() => {
          actor.sheet.render(true);
        }, 10);
      };
    };

    /* ----------------------- */
    /*      BACKGROUND         */
    /* ----------------------- */
    // Add background and details
    let backgroundLabel = html.find('div.tab.description label');
    let descriptionEditor = html.find('div.tab.description div.editor');
    let species = await actor.getFlag('root', 'species') || '';
    let pronouns = await actor.getFlag('root', 'pronouns') || '';
    let looks = await actor.getFlag('root', 'looks') || '';
    let oddities = await actor.getFlag('root', 'oddities') || '';
    let demeanor = await actor.getFlag('root', 'demeanor') || '';
    let home = await actor.getFlag('root', 'home') || '';
    let whyVagabond = await actor.getFlag('root', 'whyVagabond') || '';
    let leftBehind = await actor.getFlag('root', 'leftBehind') || '';
    let lastMaster = await actor.getFlag('root', 'lastMaster') || '';
    let loveHistory = await actor.getFlag('root', 'loveHistory') || '';
    let captain = await actor.getFlag('root', 'captain') || '';
    let fallCause = await actor.getFlag('root', 'fallCause') || '';
    let whyExiled = await actor.getFlag('root', 'whyExiled') || '';
    let factionExiled = await actor.getFlag('root', 'factionExiled') || '';
    let factionLoyalty = await actor.getFlag('root', 'factionLoyalty') || '';
    let fundamentalTenets = await actor.getFlag('root', 'fundamentalTenets') || '';
    let factionHate = await actor.getFlag('root', 'factionHate') || '';
    let factionHarbor = await actor.getFlag('root', 'factionHarbor') || '';
    let parentsVagabond = await actor.getFlag('root', 'parentsVagabond') || '';
    let parentsHappened = await actor.getFlag('root', 'parentsHappened') || '';
    let parentsFactionServed = await actor.getFlag('root', 'parentsFactionServed') || '';
    let parentsFactionOppose = await actor.getFlag('root', 'parentsFactionOppose') || '';
    let whomWronged = await actor.getFlag('root', 'whoWronged') || '';
    let factionServed = await actor.getFlag('root', 'factionServed') || '';
    let factionEnmity = await actor.getFlag('root', 'factionEnmity') || '';
    let vagabondBackground = await actor.getFlag('root', 'vagabondBackground') || 'default';
    let defaultLabel = game.i18n.localize('Root.Background.Default');
    let roninLabel = game.i18n.localize('Root.Background.Ronin');
    let chroniclerLabel = game.i18n.localize('Root.Background.Chronicler');
    let exileLabel = game.i18n.localize('Root.Background.Exile');
    let hereticLabel = game.i18n.localize('Root.Background.Heretic');
    let pirateLabel = game.i18n.localize('Root.Background.Pirate');
    let princeLabel = game.i18n.localize('Root.Background.Prince');
    let raconteurLabel = game.i18n.localize('Root.Background.Raconteur');
    let customLabel = game.i18n.localize('Root.Background.Custom');
    let detailsHeading = game.i18n.localize('Root.Background.Details');
    let speciesHeading = game.i18n.localize('Root.Background.Species');
    let pronounsPlaceholder = game.i18n.localize('Root.Background.Pronouns');
    let looksPlaceholder = game.i18n.localize('Root.Background.Looks');
    let odditiesPlaceholder = game.i18n.localize('Root.Background.Oddities');
    let demeanorHeading = game.i18n.localize('Root.Background.Demeanor');
    let backgroundHeading = game.i18n.localize('Root.Background.Background');
    let factionPlaceholder = game.i18n.localize('Root.Background.Faction');
    let whereIsHomeText = game.i18n.localize('Root.Background.WhereIsHome');
    let whyVagabondText = game.i18n.localize('Root.Background.WhyVagabond');
    let leftBehindText = game.i18n.localize('Root.Background.LeftBehind');
    let lastMasterText = game.i18n.localize('Root.Background.LastMaster');
    let loveHistoryText = game.i18n.localize('Root.Background.LoveHistory');
    let captainText = game.i18n.localize('Root.Background.Captain');
    let fallCauseText = game.i18n.localize('Root.Background.FallCause');
    let whyExiledText = game.i18n.localize('Root.Background.WhyExiled');
    let factionExiledText = game.i18n.localize('Root.Background.FactionExiled');
    let minus2RepText = game.i18n.localize('Root.Background.Minus2Reputation');
    let factionLoyaltyText = game.i18n.localize('Root.Background.FactionLoyalty');
    let plus1RepText = game.i18n.localize('Root.Background.Plus1Reputation');
    let fundamentalTenetsText = game.i18n.localize('Root.Background.FuntamentalTenets');
    let factionHateText = game.i18n.localize('Root.Background.FactionHate');
    let minus1RepText = game.i18n.localize('Root.Background.Minus1Reputation');
    let factionHarborText = game.i18n.localize('Root.Background.FactionHarbor');
    let parentsVagabondText = game.i18n.localize('Root.Background.ParentsVagabond');
    let parentsHappenedText = game.i18n.localize('Root.Background.ParentsHappened');
    let parentsFactionServedText = game.i18n.localize('Root.Background.ParentsFactionServed');
    let parentsFactionOpposeText = game.i18n.localize('Root.Background.ParentsFactionOppose');
    let whomWrongedText = game.i18n.localize('Root.Background.WhomWronged');
    let factionServedText = game.i18n.localize('Root.Background.FactionServed');
    let markPrestigeText = game.i18n.localize('Root.Background.MarkPrestige');
    let factionEnmityText = game.i18n.localize('Root.Background.FactionEnmity');
    let markNotorietyText = game.i18n.localize('Root.Background.MarkNotoriety');

    let vagabondSelect = `<select name="flags.root.vagabondBackground" id="flags.root.vagabondBackground" data-dType="String">
    <option value="default"${vagabondBackground === 'default' ? ' selected' : ''}>${defaultLabel}</option>
    <option value="chronicler"${vagabondBackground === 'chronicler' ? ' selected' : ''}>${chroniclerLabel}</option>
    <option value="exile"${vagabondBackground === 'exile' ? ' selected' : ''}>${exileLabel}</option>
    <option value="heretic"${vagabondBackground === 'heretic' ? ' selected' : ''}>${hereticLabel}</option>
    <option value="pirate"${vagabondBackground === 'pirate' ? ' selected' : ''}>${pirateLabel}</option>
    <option value="prince"${vagabondBackground === 'prince' ? ' selected' : ''}>${princeLabel}</option>
    <option value="raconteur"${vagabondBackground === 'raconteur' ? ' selected' : ''}>${raconteurLabel}</option>
    <option value="ronin"${vagabondBackground === 'ronin' ? ' selected' : ''}>${roninLabel}</option>
    <option value="custom"${vagabondBackground === 'custom' ? ' selected' : ''}>${customLabel}</option>
    </select>
    `;

    let detailsHTML = `<h3 style='border: none;'>${speciesHeading}</h3>
    <input style="margin: 0 0 2px; text-align: left; width: 50%;" type="text" name="flags.root.species" value="${species}">
    <hr><h3 style='border: none;'>${detailsHeading}</h3>
    <input style="margin: 0 0 2px; text-align: left; width: 50%;" type="text" name="flags.root.pronouns" value="${pronouns}" placeholder="${pronounsPlaceholder}">
    <input style="margin: 0 0 2px; text-align: left; width: 50%;" type="text" name="flags.root.looks" value="${looks}" placeholder="${looksPlaceholder}">
    <input style="margin: 0 0 2px; text-align: left; width: 50%;" type="text" name="flags.root.oddities" value="${oddities}" placeholder="${odditiesPlaceholder}">
    <hr><h3 style='border: none;'>${demeanorHeading}</h3>
    <input style="margin: 0 0 2px; text-align: left; width: 50%;" type="text" name="flags.root.demeanor" value="${demeanor}">
    <hr><h3 style='border: none;'>${backgroundHeading}</h3>
    `;

    let whereIsHomeQuestion = `<h4 style="margin: 8px 0 4px;">${whereIsHomeText}</h4>
    <input style="margin: 0 0 2px; text-align: left; width: 90%;" type="text" name="flags.root.home" value="${home}">
    `
    let whyVagabondQuestion = `<h4 style="margin: 8px 0 4px;">${whyVagabondText}</h4>
    <input style="margin: 0 0 2px; text-align: left; width: 90%;" type="text" name="flags.root.whyVagabond" value="${whyVagabond}">
    `
    let leftBehindQuestion = `<h4 style="margin: 8px 0 4px;">${leftBehindText}</h4>
    <input style="margin: 0 0 2px; text-align: left; width: 90%;" type="text" name="flags.root.leftBehind" value="${leftBehind}">
    `
    let lastMasterQuestion = `<h4 style="margin: 8px 0 4px;">${lastMasterText}</h4>
    <input style="margin: 0 0 2px; text-align: left; width: 90%;" type="text" name="flags.root.lastMaster" value="${lastMaster}">
    `
    let loveHistoryQuestion = `<h4 style="margin: 8px 0 4px;">${loveHistoryText}</h4>
    <input style="margin: 0 0 2px; text-align: left; width: 90%;" type="text" name="flags.root.loveHistory" value="${loveHistory}">
    `
    let captainQuestion = `<h4 style="margin: 8px 0 4px;">${captainText}</h4>
    <input style="margin: 0 0 2px; text-align: left; width: 90%;" type="text" name="flags.root.captain" value="${captain}">
    `
    let fallCauseQuestion = `<h4 style="margin: 8px 0 4px;">${fallCauseText}</h4>
    <input style="margin: 0 0 2px; text-align: left; width: 90%;" type="text" name="flags.root.fallCause" value="${fallCause}">
    `
    let whyExiledQuestion = `<h4 style="margin: 8px 0 4px;">${whyExiledText}</h4>
    <input style="margin: 0 0 2px; text-align: left; width: 90%;" type="text" name="flags.root.whyExiled" value="${whyExiled}">
    `
    let exileFactionsQuestions = `<h4 style="margin: 8px 0 4px;">${factionExiledText}</h4>
    <input style="margin: 0 0 2px; text-align: left; width: 40%;" type="text" name="flags.root.factionExiled" value="${factionExiled}" placeholder="${factionPlaceholder}">${minus2RepText}</em>
    <h4 style="margin: 8px 0 4px;">${factionLoyaltyText}</h4>
    <input style="margin: 0 0 2px; text-align: left; width: 40%;" type="text" name="flags.root.factionLoyalty" value="${factionLoyalty}" placeholder="${factionPlaceholder}">${plus1RepText}</em>
    `
    let fundamentalTenetsQuestion = `<h4 style="margin: 8px 0 4px;">${fundamentalTenetsText}</h4>
    <input style="margin: 0 0 2px; text-align: left; width: 90%;" type="text" name="flags.root.fundamentalTenets" value="${fundamentalTenets}">
    `
    let hereticFactionsQuestions = `<h4 style="margin: 8px 0 4px;">${factionHateText}</h4>
    <input style="margin: 0 0 2px; text-align: left; width: 40%;" type="text" name="flags.root.factionHate" value="${factionHate}" placeholder="${factionPlaceholder}">${minus1RepText}</em>
    <h4 style="margin: 8px 0 4px;">${factionHarborText}</h4>
    <input style="margin: 0 0 2px; text-align: left; width: 40%;" type="text" name="flags.root.factionHarbor" value="${factionHarbor}" placeholder="${factionPlaceholder}">${plus1RepText}</em>
    `
    let whonWrongQuestion = `<h4 style="margin: 8px 0 4px;">${whomWrongedText}</h4>
    <input style="margin: 0 0 2px; text-align: left; width: 90%;" type="text" name="flags.root.whomWronged" value="${whomWronged}">
    `
    let factionsQuestions = `<h4 style="margin: 8px 0 4px;">${factionServedText}</h4>
    <input style="margin: 0 0 2px; text-align: left; width: 40%;" type="text" name="flags.root.factionServed" value="${factionServed}" placeholder="${factionPlaceholder}">${markPrestigeText}</em>
    <h4 style="margin: 8px 0 4px;">${factionEnmityText}</h4>
    <input style="margin: 0 0 2px; text-align: left; width: 40%;" type="text" name="flags.root.factionEnmity" value="${factionEnmity}" placeholder="${factionPlaceholder}">${markNotorietyText}</em>
    `
    let princeBackgroundQuestions = `<h4 style="margin: 8px 0 4px;">${parentsVagabondText}</h4>
    <input style="margin: 0 0 2px; text-align: left; width: 90%;" type="text" name="flags.root.parentsVagabond" value="${parentsVagabond}">
    <h4 style="margin: 8px 0 4px;">${parentsHappenedText}</h4>
    <input style="margin: 0 0 2px; text-align: left; width: 90%;" type="text" name="flags.root.parentsHappened" value="${parentsHappened}">
    <h4 style="margin: 8px 0 4px;">${parentsFactionServedText}</h4>
    <input style="margin: 0 0 2px; text-align: left; width: 40%;" type="text" name="flags.root.parentsFactionServed" value="${parentsFactionServed}" placeholder="${factionPlaceholder}">${markPrestigeText}</em>
    <h4 style="margin: 8px 0 4px;">${parentsFactionOpposeText}</h4>
    <input style="margin: 0 0 2px; text-align: left; width: 40%;" type="text" name="flags.root.parentsFactionOppose" value="${parentsFactionOppose}" placeholder="${factionPlaceholder}">${markNotorietyText}</em>
    `

    backgroundLabel.append(vagabondSelect);

    if (vagabondBackground != 'custom') {
      descriptionEditor[0].innerHTML = `${detailsHTML}`
    }
    if (vagabondBackground == 'default') {
      descriptionEditor[0].innerHTML += `${whereIsHomeQuestion}${whyVagabondQuestion}${leftBehindQuestion}${factionsQuestions}`
    } else if (vagabondBackground == 'chronicler') {
      descriptionEditor[0].innerHTML += `${whereIsHomeQuestion}${whyVagabondQuestion}${loveHistoryQuestion}${factionsQuestions}`
    } else if (vagabondBackground == 'exile') {
      descriptionEditor[0].innerHTML += `${whereIsHomeQuestion}${fallCauseQuestion}${whyExiledQuestion}${whyVagabondQuestion}${exileFactionsQuestions}`
    } else if (vagabondBackground == 'heretic') {
      descriptionEditor[0].innerHTML += `${whereIsHomeQuestion}${fundamentalTenetsQuestion}${whyVagabondQuestion}${leftBehindQuestion}${hereticFactionsQuestions}`
    } else if (vagabondBackground == 'pirate') {
      descriptionEditor[0].innerHTML += `${whereIsHomeQuestion}${whyVagabondQuestion}${captainQuestion}${factionsQuestions}`
    } else if (vagabondBackground == 'prince') {
      descriptionEditor[0].innerHTML += `${princeBackgroundQuestions}`
    } else if (vagabondBackground == 'raconteur') {
      descriptionEditor[0].innerHTML += `${whereIsHomeQuestion}${whyVagabondQuestion}${whonWrongQuestion}${factionsQuestions}`
    } else if (vagabondBackground == 'ronin') {
      descriptionEditor[0].innerHTML += `${whereIsHomeQuestion}${whyVagabondQuestion}${lastMasterQuestion}${factionsQuestions}`
    }

    /* ----------------------- */
    /*      REPUTATION         */
    /* ----------------------- */
    // Handle reputations' bonuses (only one can be selected per faction)
    
    function handleReputationBonus(factionsArrays) {
      factionsArrays.forEach(factionArray => {
        factionArray.forEach((checkbox, index) => {
          checkbox.change(function() {
            if ($(this).is(':checked')) {
              factionArray.forEach((otherCheckbox, otherIndex) => {
                if (otherIndex !== index) {
                  otherCheckbox.prop('checked', false);
                }
              });
            }
          });
        });
      });
    }
    
    const factionsReputations = [
      [
        html.find('input[name="system.attrTop.reputation.options.1.values.3.value"]'),
        html.find('input[name="system.attrTop.reputation.options.2.values.3.value"]'),
        html.find('input[name="system.attrTop.reputation.options.3.values.3.value"]'),
        html.find('input[name="system.attrTop.reputation.options.4.values.0.value"]'),
        html.find('input[name="system.attrTop.reputation.options.5.values.5.value"]'),
        html.find('input[name="system.attrTop.reputation.options.6.values.5.value"]'),
        html.find('input[name="system.attrTop.reputation.options.7.values.5.value"]')
      ],
      [
        html.find('input[name="system.attrTop.reputation.options.9.values.3.value"]'),
        html.find('input[name="system.attrTop.reputation.options.10.values.3.value"]'),
        html.find('input[name="system.attrTop.reputation.options.11.values.3.value"]'),
        html.find('input[name="system.attrTop.reputation.options.12.values.0.value"]'),
        html.find('input[name="system.attrTop.reputation.options.13.values.5.value"]'),
        html.find('input[name="system.attrTop.reputation.options.14.values.5.value"]'),
        html.find('input[name="system.attrTop.reputation.options.15.values.5.value"]')
      ],
      [
        html.find('input[name="system.attrTop.reputation.options.17.values.3.value"]'),
        html.find('input[name="system.attrTop.reputation.options.18.values.3.value"]'),
        html.find('input[name="system.attrTop.reputation.options.19.values.3.value"]'),
        html.find('input[name="system.attrTop.reputation.options.20.values.0.value"]'),
        html.find('input[name="system.attrTop.reputation.options.21.values.5.value"]'),
        html.find('input[name="system.attrTop.reputation.options.22.values.5.value"]'),
        html.find('input[name="system.attrTop.reputation.options.23.values.5.value"]')
      ],
      [
        html.find('input[name="system.attrTop.reputation.options.25.values.3.value"]'),
        html.find('input[name="system.attrTop.reputation.options.26.values.3.value"]'),
        html.find('input[name="system.attrTop.reputation.options.27.values.3.value"]'),
        html.find('input[name="system.attrTop.reputation.options.28.values.0.value"]'),
        html.find('input[name="system.attrTop.reputation.options.29.values.5.value"]'),
        html.find('input[name="system.attrTop.reputation.options.30.values.5.value"]'),
        html.find('input[name="system.attrTop.reputation.options.31.values.5.value"]')
      ],
      [
        html.find('input[name="system.attrTop.reputation.options.33.values.3.value"]'),
        html.find('input[name="system.attrTop.reputation.options.34.values.3.value"]'),
        html.find('input[name="system.attrTop.reputation.options.35.values.3.value"]'),
        html.find('input[name="system.attrTop.reputation.options.36.values.0.value"]'),
        html.find('input[name="system.attrTop.reputation.options.37.values.5.value"]'),
        html.find('input[name="system.attrTop.reputation.options.38.values.5.value"]'),
        html.find('input[name="system.attrTop.reputation.options.39.values.5.value"]')
      ]
    ];
    
    handleReputationBonus(factionsReputations);
    
    // Handle reputation increments
    const firstFactionNotoriety = [
      html.find('input[name="system.attrTop.reputation.options.1.values.2.value"]'),
      html.find('input[name="system.attrTop.reputation.options.1.values.1.value"]'),
      html.find('input[name="system.attrTop.reputation.options.1.values.0.value"]'),
      html.find('input[name="system.attrTop.reputation.options.2.values.2.value"]'),
      html.find('input[name="system.attrTop.reputation.options.2.values.1.value"]'),
      html.find('input[name="system.attrTop.reputation.options.2.values.0.value"]'),
      html.find('input[name="system.attrTop.reputation.options.3.values.2.value"]'),
      html.find('input[name="system.attrTop.reputation.options.3.values.1.value"]'),
      html.find('input[name="system.attrTop.reputation.options.3.values.0.value"]')
    ];

    const firstFactionPrestige = [
      html.find('input[name="system.attrTop.reputation.options.7.values.4.value"]'),
      html.find('input[name="system.attrTop.reputation.options.7.values.3.value"]'),
      html.find('input[name="system.attrTop.reputation.options.7.values.2.value"]'),
      html.find('input[name="system.attrTop.reputation.options.7.values.1.value"]'),
      html.find('input[name="system.attrTop.reputation.options.7.values.0.value"]'),
      html.find('input[name="system.attrTop.reputation.options.6.values.4.value"]'),
      html.find('input[name="system.attrTop.reputation.options.6.values.3.value"]'),
      html.find('input[name="system.attrTop.reputation.options.6.values.2.value"]'),
      html.find('input[name="system.attrTop.reputation.options.6.values.1.value"]'),
      html.find('input[name="system.attrTop.reputation.options.6.values.0.value"]'),
      html.find('input[name="system.attrTop.reputation.options.5.values.4.value"]'),
      html.find('input[name="system.attrTop.reputation.options.5.values.3.value"]'),
      html.find('input[name="system.attrTop.reputation.options.5.values.2.value"]'),
      html.find('input[name="system.attrTop.reputation.options.5.values.1.value"]'),
      html.find('input[name="system.attrTop.reputation.options.5.values.0.value"]')
    ];
    
    const secondFactionNotoriety = [
      html.find('input[name="system.attrTop.reputation.options.9.values.2.value"]'),
      html.find('input[name="system.attrTop.reputation.options.9.values.1.value"]'),
      html.find('input[name="system.attrTop.reputation.options.9.values.0.value"]'),
      html.find('input[name="system.attrTop.reputation.options.10.values.2.value"]'),
      html.find('input[name="system.attrTop.reputation.options.10.values.1.value"]'),
      html.find('input[name="system.attrTop.reputation.options.10.values.0.value"]'),
      html.find('input[name="system.attrTop.reputation.options.11.values.2.value"]'),
      html.find('input[name="system.attrTop.reputation.options.11.values.1.value"]'),
      html.find('input[name="system.attrTop.reputation.options.11.values.0.value"]')
    ];
    
    const secondFactionPrestige = [
      html.find('input[name="system.attrTop.reputation.options.15.values.4.value"]'),
      html.find('input[name="system.attrTop.reputation.options.15.values.3.value"]'),
      html.find('input[name="system.attrTop.reputation.options.15.values.2.value"]'),
      html.find('input[name="system.attrTop.reputation.options.15.values.1.value"]'),
      html.find('input[name="system.attrTop.reputation.options.15.values.0.value"]'),
      html.find('input[name="system.attrTop.reputation.options.14.values.4.value"]'),
      html.find('input[name="system.attrTop.reputation.options.14.values.3.value"]'),
      html.find('input[name="system.attrTop.reputation.options.14.values.2.value"]'),
      html.find('input[name="system.attrTop.reputation.options.14.values.1.value"]'),
      html.find('input[name="system.attrTop.reputation.options.14.values.0.value"]'),
      html.find('input[name="system.attrTop.reputation.options.13.values.4.value"]'),
      html.find('input[name="system.attrTop.reputation.options.13.values.3.value"]'),
      html.find('input[name="system.attrTop.reputation.options.13.values.2.value"]'),
      html.find('input[name="system.attrTop.reputation.options.13.values.1.value"]'),
      html.find('input[name="system.attrTop.reputation.options.13.values.0.value"]')
    ];

    const thirdFactionNotoriety = [
      html.find('input[name="system.attrTop.reputation.options.17.values.2.value"]'),
      html.find('input[name="system.attrTop.reputation.options.17.values.1.value"]'),
      html.find('input[name="system.attrTop.reputation.options.17.values.0.value"]'),
      html.find('input[name="system.attrTop.reputation.options.18.values.2.value"]'),
      html.find('input[name="system.attrTop.reputation.options.18.values.1.value"]'),
      html.find('input[name="system.attrTop.reputation.options.18.values.0.value"]'),
      html.find('input[name="system.attrTop.reputation.options.19.values.2.value"]'),
      html.find('input[name="system.attrTop.reputation.options.19.values.1.value"]'),
      html.find('input[name="system.attrTop.reputation.options.19.values.0.value"]')
    ];
    
    const thirdFactionPrestige = [
      html.find('input[name="system.attrTop.reputation.options.23.values.4.value"]'),
      html.find('input[name="system.attrTop.reputation.options.23.values.3.value"]'),
      html.find('input[name="system.attrTop.reputation.options.23.values.2.value"]'),
      html.find('input[name="system.attrTop.reputation.options.23.values.1.value"]'),
      html.find('input[name="system.attrTop.reputation.options.23.values.0.value"]'),
      html.find('input[name="system.attrTop.reputation.options.22.values.4.value"]'),
      html.find('input[name="system.attrTop.reputation.options.22.values.3.value"]'),
      html.find('input[name="system.attrTop.reputation.options.22.values.2.value"]'),
      html.find('input[name="system.attrTop.reputation.options.22.values.1.value"]'),
      html.find('input[name="system.attrTop.reputation.options.22.values.0.value"]'),
      html.find('input[name="system.attrTop.reputation.options.21.values.4.value"]'),
      html.find('input[name="system.attrTop.reputation.options.21.values.3.value"]'),
      html.find('input[name="system.attrTop.reputation.options.21.values.2.value"]'),
      html.find('input[name="system.attrTop.reputation.options.21.values.1.value"]'),
      html.find('input[name="system.attrTop.reputation.options.21.values.0.value"]')
    ];

    const fourthFactionNotoriety = [
      html.find('input[name="system.attrTop.reputation.options.25.values.2.value"]'),
      html.find('input[name="system.attrTop.reputation.options.25.values.1.value"]'),
      html.find('input[name="system.attrTop.reputation.options.25.values.0.value"]'),
      html.find('input[name="system.attrTop.reputation.options.26.values.2.value"]'),
      html.find('input[name="system.attrTop.reputation.options.26.values.1.value"]'),
      html.find('input[name="system.attrTop.reputation.options.26.values.0.value"]'),
      html.find('input[name="system.attrTop.reputation.options.27.values.2.value"]'),
      html.find('input[name="system.attrTop.reputation.options.27.values.1.value"]'),
      html.find('input[name="system.attrTop.reputation.options.27.values.0.value"]')
    ];

    const fourthFactionPrestige = [
      html.find('input[name="system.attrTop.reputation.options.31.values.4.value"]'),
      html.find('input[name="system.attrTop.reputation.options.31.values.3.value"]'),
      html.find('input[name="system.attrTop.reputation.options.31.values.2.value"]'),
      html.find('input[name="system.attrTop.reputation.options.31.values.1.value"]'),
      html.find('input[name="system.attrTop.reputation.options.31.values.0.value"]'),
      html.find('input[name="system.attrTop.reputation.options.30.values.4.value"]'),
      html.find('input[name="system.attrTop.reputation.options.30.values.3.value"]'),
      html.find('input[name="system.attrTop.reputation.options.30.values.2.value"]'),
      html.find('input[name="system.attrTop.reputation.options.30.values.1.value"]'),
      html.find('input[name="system.attrTop.reputation.options.30.values.0.value"]'),
      html.find('input[name="system.attrTop.reputation.options.29.values.4.value"]'),
      html.find('input[name="system.attrTop.reputation.options.29.values.3.value"]'),
      html.find('input[name="system.attrTop.reputation.options.29.values.2.value"]'),
      html.find('input[name="system.attrTop.reputation.options.29.values.1.value"]'),
      html.find('input[name="system.attrTop.reputation.options.29.values.0.value"]')
    ];
    
    const fifthFactionNotoriety = [
      html.find('input[name="system.attrTop.reputation.options.33.values.2.value"]'),
      html.find('input[name="system.attrTop.reputation.options.33.values.1.value"]'),
      html.find('input[name="system.attrTop.reputation.options.33.values.0.value"]'),
      html.find('input[name="system.attrTop.reputation.options.34.values.2.value"]'),
      html.find('input[name="system.attrTop.reputation.options.34.values.1.value"]'),
      html.find('input[name="system.attrTop.reputation.options.34.values.0.value"]'),
      html.find('input[name="system.attrTop.reputation.options.35.values.2.value"]'),
      html.find('input[name="system.attrTop.reputation.options.35.values.1.value"]'),
      html.find('input[name="system.attrTop.reputation.options.35.values.0.value"]')
    ];

    const fifthFactionPrestige = [
      html.find('input[name="system.attrTop.reputation.options.39.values.4.value"]'),
      html.find('input[name="system.attrTop.reputation.options.39.values.3.value"]'),
      html.find('input[name="system.attrTop.reputation.options.39.values.2.value"]'),
      html.find('input[name="system.attrTop.reputation.options.39.values.1.value"]'),
      html.find('input[name="system.attrTop.reputation.options.39.values.0.value"]'),
      html.find('input[name="system.attrTop.reputation.options.38.values.4.value"]'),
      html.find('input[name="system.attrTop.reputation.options.38.values.3.value"]'),
      html.find('input[name="system.attrTop.reputation.options.38.values.2.value"]'),
      html.find('input[name="system.attrTop.reputation.options.38.values.1.value"]'),
      html.find('input[name="system.attrTop.reputation.options.38.values.0.value"]'),
      html.find('input[name="system.attrTop.reputation.options.37.values.4.value"]'),
      html.find('input[name="system.attrTop.reputation.options.37.values.3.value"]'),
      html.find('input[name="system.attrTop.reputation.options.37.values.2.value"]'),
      html.find('input[name="system.attrTop.reputation.options.37.values.1.value"]'),
      html.find('input[name="system.attrTop.reputation.options.37.values.0.value"]')
    ];
    
    handleCheckboxIncrements(firstFactionNotoriety);
    handleCheckboxIncrements(firstFactionPrestige);
    handleCheckboxIncrements(secondFactionNotoriety);
    handleCheckboxIncrements(secondFactionPrestige);
    handleCheckboxIncrements(thirdFactionNotoriety);
    handleCheckboxIncrements(thirdFactionPrestige);
    handleCheckboxIncrements(fourthFactionNotoriety);
    handleCheckboxIncrements(fourthFactionPrestige);
    handleCheckboxIncrements(fifthFactionNotoriety);
    handleCheckboxIncrements(fifthFactionPrestige);

    // RESOURCES (injury, exhaustion, depletion)
    let resourceLabels = html.find('.cell.cell--resource .cell__checkboxes label.flexrow');

    resourceLabels.each(function(index) {
      var label = $(this);
      var textNode = label.contents().filter(function() {
        return this.nodeType === Node.TEXT_NODE && $(this).text().trim() !== '';
      }).first();
  
      if (textNode.length > 0) {
        var text = textNode.text().trim();
        textNode.remove();
  
        var textWrapper = $('<div>').text(text);
  
        var plusIcon = $('<i>').addClass('far fa-plus-square');
        var minusIcon = $('<i>').addClass('far fa-minus-square');
  
        textWrapper.append(document.createTextNode(' '));
        textWrapper.append(plusIcon);
        textWrapper.append(document.createTextNode(' '));
        textWrapper.append(minusIcon);
  
        if (index === 0) {
          textWrapper.addClass('injury');
        } else if (index === 1) {
          textWrapper.addClass('exhaustion');
        } else if (index === 2) {
          textWrapper.addClass('depletion');
        }
  
        label.prepend(textWrapper);
      }
    });  
    
    let addInjuryFive = actor.system.attrLeft.resource.options['0'].values['4'].value
    let addInjurySix = actor.system.attrLeft.resource.options['0'].values['6'].value
    let addInjurySeven = actor.system.attrLeft.resource.options['0'].values['8'].value
    let addInjuryEight = actor.system.attrLeft.resource.options['0'].values['10'].value

    let injuryFaPlus = html.find('.injury .fa-plus-square');
    let injuryFaMinus = html.find('.injury .fa-minus-square');
    
    injuryFaPlus.click(async function(event) {
      if (addInjuryFive == false) {
        await actor.update({"system.attrLeft.resource.options.0.values.4.value": true});
      } else if (addInjurySix == false) {
        await actor.update({"system.attrLeft.resource.options.0.values.6.value": true});
      } else if (addInjurySeven == false) {
        await actor.update({"system.attrLeft.resource.options.0.values.8.value": true});
      } else if (addInjuryEight == false) {
        await actor.update({"system.attrLeft.resource.options.0.values.10.value": true});
      }
    });

    injuryFaMinus.click(async function(event) {
      if (addInjuryEight == true) {
        await actor.update({"system.attrLeft.resource.options.0.values.10.value": false});
      } else if (addInjurySeven == true) {
        await actor.update({"system.attrLeft.resource.options.0.values.8.value": false});
      } else if (addInjurySix == true) {
        await actor.update({"system.attrLeft.resource.options.0.values.6.value": false});
      } else if (addInjuryFive == true) {
        await actor.update({"system.attrLeft.resource.options.0.values.4.value": false});
      } 
    });

    let addExhaustionFive = actor.system.attrLeft.resource.options['1'].values['4'].value
    let addExhaustionSix = actor.system.attrLeft.resource.options['1'].values['6'].value
    let addExhaustionSeven = actor.system.attrLeft.resource.options['1'].values['8'].value
    let addExhaustionEight = actor.system.attrLeft.resource.options['1'].values['10'].value

    let exhaustionFaPlus = html.find('.exhaustion .fa-plus-square');
    let exhaustionFaMinus = html.find('.exhaustion .fa-minus-square');
    
    exhaustionFaPlus.click(async function(event) {
      if (addExhaustionFive == false) {
        await actor.update({"system.attrLeft.resource.options.1.values.4.value": true});
      } else if (addExhaustionSix == false) {
        await actor.update({"system.attrLeft.resource.options.1.values.6.value": true});
      } else if (addExhaustionSeven == false) {
        await actor.update({"system.attrLeft.resource.options.1.values.8.value": true});
      } else if (addExhaustionEight == false) {
        await actor.update({"system.attrLeft.resource.options.1.values.10.value": true});
      }
    });

    exhaustionFaMinus.click(async function(event) {
      if (addExhaustionEight == true) {
        await actor.update({"system.attrLeft.resource.options.1.values.10.value": false});
      } else if (addExhaustionSeven == true) {
        await actor.update({"system.attrLeft.resource.options.1.values.8.value": false});
      } else if (addExhaustionSix == true) {
        await actor.update({"system.attrLeft.resource.options.1.values.6.value": false});
      } else if (addExhaustionFive == true) {
        await actor.update({"system.attrLeft.resource.options.1.values.4.value": false});
      } 
    });

    let addDepletionFive = actor.system.attrLeft.resource.options['2'].values['4'].value
    let addDepletionSix = actor.system.attrLeft.resource.options['2'].values['6'].value
    let addDepletionSeven = actor.system.attrLeft.resource.options['2'].values['8'].value
    let addDepletionEight = actor.system.attrLeft.resource.options['2'].values['10'].value

    let depletionFaPlus = html.find('.depletion .fa-plus-square');
    let depletionFaMinus = html.find('.depletion .fa-minus-square');
    
    depletionFaPlus.click(async function(event) {
      if (addDepletionFive == false) {
        await actor.update({"system.attrLeft.resource.options.2.values.4.value": true});
      } else if (addDepletionSix == false) {
        await actor.update({"system.attrLeft.resource.options.2.values.6.value": true});
      } else if (addDepletionSeven == false) {
        await actor.update({"system.attrLeft.resource.options.2.values.8.value": true});
      } else if (addDepletionEight == false) {
        await actor.update({"system.attrLeft.resource.options.2.values.10.value": true});
      }
    });

    depletionFaMinus.click(async function(event) {
      if (addDepletionEight == true) {
        await actor.update({"system.attrLeft.resource.options.2.values.10.value": false});
      } else if (addDepletionSeven == true) {
        await actor.update({"system.attrLeft.resource.options.2.values.8.value": false});
      } else if (addDepletionSix == true) {
        await actor.update({"system.attrLeft.resource.options.2.values.6.value": false});
      } else if (addDepletionFive == true) {
        await actor.update({"system.attrLeft.resource.options.2.values.4.value": false});
      } 
    });
    
    // Handle resouce increments
    const injuryResource = [
      html.find('input[name="system.attrLeft.resource.options.0.values.11.value"]'),
      html.find('input[name="system.attrLeft.resource.options.0.values.9.value"]'),
      html.find('input[name="system.attrLeft.resource.options.0.values.7.value"]'),
      html.find('input[name="system.attrLeft.resource.options.0.values.5.value"]'),
      html.find('input[name="system.attrLeft.resource.options.0.values.3.value"]'),
      html.find('input[name="system.attrLeft.resource.options.0.values.2.value"]'),
      html.find('input[name="system.attrLeft.resource.options.0.values.1.value"]'),
      html.find('input[name="system.attrLeft.resource.options.0.values.0.value"]')
    ];

    const exhaustionResource = [
      html.find('input[name="system.attrLeft.resource.options.1.values.11.value"]'),
      html.find('input[name="system.attrLeft.resource.options.1.values.9.value"]'),
      html.find('input[name="system.attrLeft.resource.options.1.values.7.value"]'),
      html.find('input[name="system.attrLeft.resource.options.1.values.5.value"]'),
      html.find('input[name="system.attrLeft.resource.options.1.values.3.value"]'),
      html.find('input[name="system.attrLeft.resource.options.1.values.2.value"]'),
      html.find('input[name="system.attrLeft.resource.options.1.values.1.value"]'),
      html.find('input[name="system.attrLeft.resource.options.1.values.0.value"]')
    ];

    const depletionResource = [
      html.find('input[name="system.attrLeft.resource.options.2.values.11.value"]'),
      html.find('input[name="system.attrLeft.resource.options.2.values.9.value"]'),
      html.find('input[name="system.attrLeft.resource.options.2.values.7.value"]'),
      html.find('input[name="system.attrLeft.resource.options.2.values.5.value"]'),
      html.find('input[name="system.attrLeft.resource.options.2.values.3.value"]'),
      html.find('input[name="system.attrLeft.resource.options.2.values.2.value"]'),
      html.find('input[name="system.attrLeft.resource.options.2.values.1.value"]'),
      html.find('input[name="system.attrLeft.resource.options.2.values.0.value"]')
    ];

    handleCheckboxIncrements(injuryResource);
    handleCheckboxIncrements(exhaustionResource);
    handleCheckboxIncrements(depletionResource);

    // Add Mastery tag to actor sheet if move has Triumph description.
    let masteries = await game.settings.get('root', 'masteries');
    let metaTags = html.find('.item-meta.tags');
    let items = metaTags.parent('li.item');
    for (let item of items) {
      let critical = item.querySelector('div.result--critical');
      if (critical) {
        if (masteries) {
          let formulaTag = item.querySelector('.tag.tag--formula');
          let mastery = `<span class="tag tag--mastery">Mastery</span>`;
          formulaTag.insertAdjacentHTML('beforebegin', mastery)
        } else {
          critical.style.display = 'none';
        };
      };
    };

  };

  if (actor.type == 'npc') {
    let resourcesTitlesNPC = html.find('.cell.cell--attributes-top label.cell__title');

    let faPlusMinus = `<i class="npc far fa-plus-square"></i><i class="npc far fa-minus-square"></i>`
    resourcesTitlesNPC.each(function() {
      $(this).append(faPlusMinus);
    });

    // Get the initial value of injury
    let addNPCInjuryTwo = actor.system.attrTop.injury.options['0'].values['1'].value;
    let addNPCInjuryThree = actor.system.attrTop.injury.options['0'].values['3'].value;
    let addNPCInjuryFour = actor.system.attrTop.injury.options['0'].values['5'].value;
    let addNPCInjuryFive = actor.system.attrTop.injury.options['0'].values['7'].value;
    let addNPCInjurySix = actor.system.attrTop.injury.options['0'].values['9'].value;
    let addNPCInjurySeven = actor.system.attrTop.injury.options['0'].values['11'].value;
    let addNPCInjuryEight = actor.system.attrTop.injury.options['0'].values['13'].value;
    let addNPCInjuryNine = actor.system.attrTop.injury.options['0'].values['15'].value;
    let addNPCInjuryTen = actor.system.attrTop.injury.options['0'].values['17'].value;
    let addNPCInjuryEleven = actor.system.attrTop.injury.options['0'].values['19'].value;
    let addNPCInjuryTwelve = actor.system.attrTop.injury.options['0'].values['21'].value;

    // Set the event listeners
    let injuryNPCFaPlus = html.find('.cell--injury .fa-plus-square');
    let injuryNPCFaMinus = html.find('.cell--injury .fa-minus-square');

    injuryNPCFaPlus.click(async function(event) {
      if (addNPCInjuryTwo == false) {
        await actor.update({"system.attrTop.injury.options.0.values.1.value": true});
      } else if (addNPCInjuryThree == false) {
        await actor.update({"system.attrTop.injury.options.0.values.3.value": true});
      } else if (addNPCInjuryFour == false) {
        await actor.update({"system.attrTop.injury.options.0.values.5.value": true});
      } else if (addNPCInjuryFive == false) {
        await actor.update({"system.attrTop.injury.options.0.values.7.value": true});
      } else if (addNPCInjurySix == false) {
        await actor.update({"system.attrTop.injury.options.0.values.9.value": true});
      } else if (addNPCInjurySeven == false) {
        await actor.update({"system.attrTop.injury.options.0.values.11.value": true});
      } else if (addNPCInjuryEight == false) {
        await actor.update({"system.attrTop.injury.options.0.values.13.value": true});
      } else if (addNPCInjuryNine == false) {
        await actor.update({"system.attrTop.injury.options.0.values.15.value": true});
      } else if (addNPCInjuryTen == false) {
        await actor.update({"system.attrTop.injury.options.0.values.17.value": true});
      } else if (addNPCInjuryEleven == false) {
        await actor.update({"system.attrTop.injury.options.0.values.19.value": true});
      } else if (addNPCInjuryTwelve == false) {
        await actor.update({"system.attrTop.injury.options.0.values.21.value": true});
      }
    });

    injuryNPCFaMinus.click(async function(event) {
      if (addNPCInjuryTwelve == true) {
        await actor.update({"system.attrTop.injury.options.0.values.21.value": false});
      } else if (addNPCInjuryEleven == true) {
        await actor.update({"system.attrTop.injury.options.0.values.19.value": false});
      } else if (addNPCInjuryTen == true) {
        await actor.update({"system.attrTop.injury.options.0.values.17.value": false});
      } else if (addNPCInjuryNine == true) {
        await actor.update({"system.attrTop.injury.options.0.values.15.value": false});
      } else if (addNPCInjuryEight == true) {
        await actor.update({"system.attrTop.injury.options.0.values.13.value": false});
      } else if (addNPCInjurySeven == true) {
        await actor.update({"system.attrTop.injury.options.0.values.11.value": false});
      } else if (addNPCInjurySix == true) {
        await actor.update({"system.attrTop.injury.options.0.values.9.value": false});
      } else if (addNPCInjuryFive == true) {
        await actor.update({"system.attrTop.injury.options.0.values.7.value": false});
      } else if (addNPCInjuryFour == true) {
        await actor.update({"system.attrTop.injury.options.0.values.5.value": false});
      } else if (addNPCInjuryThree == true) {
        await actor.update({"system.attrTop.injury.options.0.values.3.value": false});
      } else if (addNPCInjuryTwo == true) {
        await actor.update({"system.attrTop.injury.options.0.values.1.value": false});
      }
    });

    // Get the initial value of the exhaustion and other variables
    let addNPCExhaustionTwo = actor.system.attrTop.exhaustion.options['0'].values['1'].value;
    let addNPCExhaustionThree = actor.system.attrTop.exhaustion.options['0'].values['3'].value;
    let addNPCExhaustionFour = actor.system.attrTop.exhaustion.options['0'].values['5'].value;
    let addNPCExhaustionFive = actor.system.attrTop.exhaustion.options['0'].values['7'].value;
    let addNPCExhaustionSix = actor.system.attrTop.exhaustion.options['0'].values['9'].value;
    let addNPCExhaustionSeven = actor.system.attrTop.exhaustion.options['0'].values['11'].value;
    let addNPCExhaustionEight = actor.system.attrTop.exhaustion.options['0'].values['13'].value;
    let addNPCExhaustionNine = actor.system.attrTop.exhaustion.options['0'].values['15'].value;
    let addNPCExhaustionTen = actor.system.attrTop.exhaustion.options['0'].values['17'].value;
    let addNPCExhaustionEleven = actor.system.attrTop.exhaustion.options['0'].values['19'].value;
    let addNPCExhaustionTwelve = actor.system.attrTop.exhaustion.options['0'].values['21'].value;

    // Set the event listeners for Exhaustion
    let exhaustionNPCFaPlus = html.find('.cell--exhaustion .fa-plus-square');
    let exhaustionNPCFaMinus = html.find('.cell--exhaustion .fa-minus-square');

    exhaustionNPCFaPlus.click(async function(event) {
      if (addNPCExhaustionTwo == false) {
        await actor.update({"system.attrTop.exhaustion.options.0.values.1.value": true});
      } else if (addNPCExhaustionThree == false) {
        await actor.update({"system.attrTop.exhaustion.options.0.values.3.value": true});
      } else if (addNPCExhaustionFour == false) {
        await actor.update({"system.attrTop.exhaustion.options.0.values.5.value": true});
      } else if (addNPCExhaustionFive == false) {
        await actor.update({"system.attrTop.exhaustion.options.0.values.7.value": true});
      } else if (addNPCExhaustionSix == false) {
        await actor.update({"system.attrTop.exhaustion.options.0.values.9.value": true});
      } else if (addNPCExhaustionSeven == false) {
        await actor.update({"system.attrTop.exhaustion.options.0.values.11.value": true});
      } else if (addNPCExhaustionEight == false) {
        await actor.update({"system.attrTop.exhaustion.options.0.values.13.value": true});
      } else if (addNPCExhaustionNine == false) {
        await actor.update({"system.attrTop.exhaustion.options.0.values.15.value": true});
      } else if (addNPCExhaustionTen == false) {
        await actor.update({"system.attrTop.exhaustion.options.0.values.17.value": true});
      } else if (addNPCExhaustionEleven == false) {
        await actor.update({"system.attrTop.exhaustion.options.0.values.19.value": true});
      } else if (addNPCExhaustionTwelve == false) {
        await actor.update({"system.attrTop.exhaustion.options.0.values.21.value": true});
      }
    });

    exhaustionNPCFaMinus.click(async function(event) {
      if (addNPCExhaustionTwelve == true) {
        await actor.update({"system.attrTop.exhaustion.options.0.values.21.value": false});
      } else if (addNPCExhaustionEleven == true) {
        await actor.update({"system.attrTop.exhaustion.options.0.values.19.value": false});
      } else if (addNPCExhaustionTen == true) {
        await actor.update({"system.attrTop.exhaustion.options.0.values.17.value": false});
      } else if (addNPCExhaustionNine == true) {
        await actor.update({"system.attrTop.exhaustion.options.0.values.15.value": false});
      } else if (addNPCExhaustionEight == true) {
        await actor.update({"system.attrTop.exhaustion.options.0.values.13.value": false});
      } else if (addNPCExhaustionSeven == true) {
        await actor.update({"system.attrTop.exhaustion.options.0.values.11.value": false});
      } else if (addNPCExhaustionSix == true) {
        await actor.update({"system.attrTop.exhaustion.options.0.values.9.value": false});
      } else if (addNPCExhaustionFive == true) {
        await actor.update({"system.attrTop.exhaustion.options.0.values.7.value": false});
      } else if (addNPCExhaustionFour == true) {
        await actor.update({"system.attrTop.exhaustion.options.0.values.5.value": false});
      } else if (addNPCExhaustionThree == true) {
        await actor.update({"system.attrTop.exhaustion.options.0.values.3.value": false});
      } else if (addNPCExhaustionTwo == true) {
        await actor.update({"system.attrTop.exhaustion.options.0.values.1.value": false});
      }
    });

    // Get the initial value of wear and other variables
    let addNPCWearOne = await actor.getFlag('root', 'npcWear.addBox1') || false;
    let addNPCWearTwo = actor.system.attrTop.wear.options['0'].values['1'].value;
    let addNPCWearThree = actor.system.attrTop.wear.options['0'].values['3'].value;
    let addNPCWearFour = actor.system.attrTop.wear.options['0'].values['5'].value;
    let addNPCWearFive = actor.system.attrTop.wear.options['0'].values['7'].value;
    let addNPCWearSix = actor.system.attrTop.wear.options['0'].values['9'].value;
    let addNPCWearSeven = actor.system.attrTop.wear.options['0'].values['11'].value;
    let addNPCWearEight = actor.system.attrTop.wear.options['0'].values['13'].value;
    let addNPCWearNine = actor.system.attrTop.wear.options['0'].values['15'].value;
    let addNPCWearTen = actor.system.attrTop.wear.options['0'].values['17'].value;
    let addNPCWearEleven = actor.system.attrTop.wear.options['0'].values['19'].value;
    let addNPCWearTwelve = actor.system.attrTop.wear.options['0'].values['21'].value;

    // Prepend addBox1
    let npcAddWear1 = `<input type="checkbox" name="flags.root.npcWear.addBox1" data-dtype="Boolean" ${addNPCWearOne ? 'checked' : ''}></input>`
    let npcWear1 = html.find('input[name="system.attrTop.wear.options.0.values.0.value"]');
    npcWear1.before(npcAddWear1);
    // Set the event listeners for Wear
    let wearNPCFaPlus = html.find('.cell--wear .fa-plus-square');
    let wearNPCFaMinus = html.find('.cell--wear .fa-minus-square');

    wearNPCFaPlus.click(async function(event) {
      if (addNPCWearOne == false) {
        await actor.update({"flags.root.npcWear.addBox1": true});
      } else if (addNPCWearTwo == false) {
        await actor.update({"system.attrTop.wear.options.0.values.1.value": true});
      } else if (addNPCWearThree == false) {
        await actor.update({"system.attrTop.wear.options.0.values.3.value": true});
      } else if (addNPCWearFour == false) {
        await actor.update({"system.attrTop.wear.options.0.values.5.value": true});
      } else if (addNPCWearFive == false) {
        await actor.update({"system.attrTop.wear.options.0.values.7.value": true});
      } else if (addNPCWearSix == false) {
        await actor.update({"system.attrTop.wear.options.0.values.9.value": true});
      } else if (addNPCWearSeven == false) {
        await actor.update({"system.attrTop.wear.options.0.values.11.value": true});
      } else if (addNPCWearEight == false) {
        await actor.update({"system.attrTop.wear.options.0.values.13.value": true});
      } else if (addNPCWearNine == false) {
        await actor.update({"system.attrTop.wear.options.0.values.15.value": true});
      } else if (addNPCWearTen == false) {
        await actor.update({"system.attrTop.wear.options.0.values.17.value": true});
      } else if (addNPCWearEleven == false) {
        await actor.update({"system.attrTop.wear.options.0.values.19.value": true});
      } else if (addNPCWearTwelve == false) {
        await actor.update({"system.attrTop.wear.options.0.values.21.value": true});
      }
    });

    wearNPCFaMinus.click(async function(event) {
      if (addNPCWearTwelve == true) {
        await actor.update({"system.attrTop.wear.options.0.values.21.value": false});
      } else if (addNPCWearEleven == true) {
        await actor.update({"system.attrTop.wear.options.0.values.19.value": false});
      } else if (addNPCWearTen == true) {
        await actor.update({"system.attrTop.wear.options.0.values.17.value": false});
      } else if (addNPCWearNine == true) {
        await actor.update({"system.attrTop.wear.options.0.values.15.value": false});
      } else if (addNPCWearEight == true) {
        await actor.update({"system.attrTop.wear.options.0.values.13.value": false});
      } else if (addNPCWearSeven == true) {
        await actor.update({"system.attrTop.wear.options.0.values.11.value": false});
      } else if (addNPCWearSix == true) {
        await actor.update({"system.attrTop.wear.options.0.values.9.value": false});
      } else if (addNPCWearFive == true) {
        await actor.update({"system.attrTop.wear.options.0.values.7.value": false});
      } else if (addNPCWearFour == true) {
        await actor.update({"system.attrTop.wear.options.0.values.5.value": false});
      } else if (addNPCWearThree == true) {
        await actor.update({"system.attrTop.wear.options.0.values.3.value": false});
      } else if (addNPCWearTwo == true) {
        await actor.update({"system.attrTop.wear.options.0.values.1.value": false});
      } else if (addNPCWearOne == true) {
        await actor.update({"flags.root.npcWear.addBox1": false});
      }
    });

    // Get the initial value of morale and other variables
    let addNPCMoraleTwo = actor.system.attrTop.morale.options['0'].values['1'].value;
    let addNPCMoraleThree = actor.system.attrTop.morale.options['0'].values['3'].value;
    let addNPCMoraleFour = actor.system.attrTop.morale.options['0'].values['5'].value;
    let addNPCMoraleFive = actor.system.attrTop.morale.options['0'].values['7'].value;
    let addNPCMoraleSix = actor.system.attrTop.morale.options['0'].values['9'].value;
    let addNPCMoraleSeven = actor.system.attrTop.morale.options['0'].values['11'].value;
    let addNPCMoraleEight = actor.system.attrTop.morale.options['0'].values['13'].value;
    let addNPCMoraleNine = actor.system.attrTop.morale.options['0'].values['15'].value;
    let addNPCMoraleTen = actor.system.attrTop.morale.options['0'].values['17'].value;
    let addNPCMoraleEleven = actor.system.attrTop.morale.options['0'].values['19'].value;
    let addNPCMoraleTwelve = actor.system.attrTop.morale.options['0'].values['21'].value;

    // Set the event listeners for Morale
    let moraleNPCFaPlus = html.find('.cell--morale .fa-plus-square');
    let moraleNPCFaMinus = html.find('.cell--morale .fa-minus-square');

    moraleNPCFaPlus.click(async function(event) {
      if (addNPCMoraleTwo == false) {
        await actor.update({"system.attrTop.morale.options.0.values.1.value": true});
      } else if (addNPCMoraleThree == false) {
        await actor.update({"system.attrTop.morale.options.0.values.3.value": true});
      } else if (addNPCMoraleFour == false) {
        await actor.update({"system.attrTop.morale.options.0.values.5.value": true});
      } else if (addNPCMoraleFive == false) {
        await actor.update({"system.attrTop.morale.options.0.values.7.value": true});
      } else if (addNPCMoraleSix == false) {
        await actor.update({"system.attrTop.morale.options.0.values.9.value": true});
      } else if (addNPCMoraleSeven == false) {
        await actor.update({"system.attrTop.morale.options.0.values.11.value": true});
      } else if (addNPCMoraleEight == false) {
        await actor.update({"system.attrTop.morale.options.0.values.13.value": true});
      } else if (addNPCMoraleNine == false) {
        await actor.update({"system.attrTop.morale.options.0.values.15.value": true});
      } else if (addNPCMoraleTen == false) {
        await actor.update({"system.attrTop.morale.options.0.values.17.value": true});
      } else if (addNPCMoraleEleven == false) {
        await actor.update({"system.attrTop.morale.options.0.values.19.value": true});
      } else if (addNPCMoraleTwelve == false) {
        await actor.update({"system.attrTop.morale.options.0.values.21.value": true});
      }
    });

    moraleNPCFaMinus.click(async function(event) {
      if (addNPCMoraleTwelve == true) {
        await actor.update({"system.attrTop.morale.options.0.values.21.value": false});
      } else if (addNPCMoraleEleven == true) {
        await actor.update({"system.attrTop.morale.options.0.values.19.value": false});
      } else if (addNPCMoraleTen == true) {
        await actor.update({"system.attrTop.morale.options.0.values.17.value": false});
      } else if (addNPCMoraleNine == true) {
        await actor.update({"system.attrTop.morale.options.0.values.15.value": false});
      } else if (addNPCMoraleEight == true) {
        await actor.update({"system.attrTop.morale.options.0.values.13.value": false});
      } else if (addNPCMoraleSeven == true) {
        await actor.update({"system.attrTop.morale.options.0.values.11.value": false});
      } else if (addNPCMoraleSix == true) {
        await actor.update({"system.attrTop.morale.options.0.values.9.value": false});
      } else if (addNPCMoraleFive == true) {
        await actor.update({"system.attrTop.morale.options.0.values.7.value": false});
      } else if (addNPCMoraleFour == true) {
        await actor.update({"system.attrTop.morale.options.0.values.5.value": false});
      } else if (addNPCMoraleThree == true) {
        await actor.update({"system.attrTop.morale.options.0.values.3.value": false});
      } else if (addNPCMoraleTwo == true) {
        await actor.update({"system.attrTop.morale.options.0.values.1.value": false});
      }
    });

    // Handle NPC resource increments
    const injuryNPCResource = [
      html.find('input[name="system.attrTop.injury.options.0.values.22.value"]'),
      html.find('input[name="system.attrTop.injury.options.0.values.20.value"]'),
      html.find('input[name="system.attrTop.injury.options.0.values.18.value"]'),
      html.find('input[name="system.attrTop.injury.options.0.values.16.value"]'),
      html.find('input[name="system.attrTop.injury.options.0.values.14.value"]'),
      html.find('input[name="system.attrTop.injury.options.0.values.12.value"]'),
      html.find('input[name="system.attrTop.injury.options.0.values.10.value"]'),
      html.find('input[name="system.attrTop.injury.options.0.values.8.value"]'),
      html.find('input[name="system.attrTop.injury.options.0.values.6.value"]'),
      html.find('input[name="system.attrTop.injury.options.0.values.4.value"]'),
      html.find('input[name="system.attrTop.injury.options.0.values.2.value"]'),
      html.find('input[name="system.attrTop.injury.options.0.values.0.value"]')
    ];    

    const exhaustionNPCResource = [
      html.find('input[name="system.attrTop.exhaustion.options.0.values.22.value"]'),
      html.find('input[name="system.attrTop.exhaustion.options.0.values.20.value"]'),
      html.find('input[name="system.attrTop.exhaustion.options.0.values.18.value"]'),
      html.find('input[name="system.attrTop.exhaustion.options.0.values.16.value"]'),
      html.find('input[name="system.attrTop.exhaustion.options.0.values.14.value"]'),
      html.find('input[name="system.attrTop.exhaustion.options.0.values.12.value"]'),
      html.find('input[name="system.attrTop.exhaustion.options.0.values.10.value"]'),
      html.find('input[name="system.attrTop.exhaustion.options.0.values.8.value"]'),
      html.find('input[name="system.attrTop.exhaustion.options.0.values.6.value"]'),
      html.find('input[name="system.attrTop.exhaustion.options.0.values.4.value"]'),
      html.find('input[name="system.attrTop.exhaustion.options.0.values.2.value"]'),
      html.find('input[name="system.attrTop.exhaustion.options.0.values.0.value"]')
    ];    

    const wearNPCResource = [
      html.find('input[name="system.attrTop.wear.options.0.values.22.value"]'),
      html.find('input[name="system.attrTop.wear.options.0.values.20.value"]'),
      html.find('input[name="system.attrTop.wear.options.0.values.18.value"]'),
      html.find('input[name="system.attrTop.wear.options.0.values.16.value"]'),
      html.find('input[name="system.attrTop.wear.options.0.values.14.value"]'),
      html.find('input[name="system.attrTop.wear.options.0.values.12.value"]'),
      html.find('input[name="system.attrTop.wear.options.0.values.10.value"]'),
      html.find('input[name="system.attrTop.wear.options.0.values.8.value"]'),
      html.find('input[name="system.attrTop.wear.options.0.values.6.value"]'),
      html.find('input[name="system.attrTop.wear.options.0.values.4.value"]'),
      html.find('input[name="system.attrTop.wear.options.0.values.2.value"]'),
      html.find('input[name="system.attrTop.wear.options.0.values.0.value"]')
    ];
    
    const moraleNPCResource = [
      html.find('input[name="system.attrTop.morale.options.0.values.22.value"]'),
      html.find('input[name="system.attrTop.morale.options.0.values.20.value"]'),
      html.find('input[name="system.attrTop.morale.options.0.values.18.value"]'),
      html.find('input[name="system.attrTop.morale.options.0.values.16.value"]'),
      html.find('input[name="system.attrTop.morale.options.0.values.14.value"]'),
      html.find('input[name="system.attrTop.morale.options.0.values.12.value"]'),
      html.find('input[name="system.attrTop.morale.options.0.values.10.value"]'),
      html.find('input[name="system.attrTop.morale.options.0.values.8.value"]'),
      html.find('input[name="system.attrTop.morale.options.0.values.6.value"]'),
      html.find('input[name="system.attrTop.morale.options.0.values.4.value"]'),
      html.find('input[name="system.attrTop.morale.options.0.values.2.value"]'),
      html.find('input[name="system.attrTop.morale.options.0.values.0.value"]')
    ];    

    handleCheckboxIncrements(injuryNPCResource);
    handleCheckboxIncrements(exhaustionNPCResource);
    handleCheckboxIncrements(wearNPCResource);
    handleCheckboxIncrements(moraleNPCResource);
  };

  });