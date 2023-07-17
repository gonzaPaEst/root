// Utility to load compendia (takes array)

export class RootUtility {

  static async loadCompendia(slugs) {

    const compendium = [];

    for (const slug of slugs) {
      const pack_id = `root.${slug}`;
      const pack = game.packs.get(pack_id);
      compendium.push(...(pack ? await pack.getDocuments() : []));
    }

    return compendium;

  }
}
