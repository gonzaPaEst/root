export class RootUtility {
  
  static async loadCompendia(slug) {

    const compendium = []

    const pack_id = `root.${slug}`;
    const pack = game.packs.get(pack_id);
    compendium.push(...(pack ? await pack.getDocuments() : []));

    return compendium

  }
}
