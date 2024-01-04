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
