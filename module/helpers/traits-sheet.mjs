import PbtaItemSheet from "../../../../systems/pbta/module/applications/item/item-sheet.js";

// Define data model for trait sheet
export class RootTraitsModel extends foundry.abstract.TypeDataModel {
    static defineSchema() {
      const fields = foundry.data.fields;
      return {
        description: new fields.HTMLField({required: false, blank: true}),
        img: new fields.FilePathField({required: false, categories: ["IMAGE"]}),
        steps: new fields.ArrayField(new fields.StringField({blank: true}))
      };
    }

    prepareDerivedData() {
      this.nSteps = this.steps.length;
    }
}

// Extend PbtA item sheets and change template path
export class RootTraitsSheet extends PbtaItemSheet {

    get template() {
        return `/modules/root/templates/traits-sheet.hbs`;
    }

    async getData(options = {}) {
        const context = await super.getData(options);
        context.description = await TextEditor.enrichHTML(this.object.system.description, {
            async: true,
            secrets: this.object.isOwner,
            relativeTo: this.object
        });
        return context;
    }
}
