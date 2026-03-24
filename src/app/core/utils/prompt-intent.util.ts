export type PromptOperationType = 'create' | 'add' | 'modify' | 'delete';

/**
 * Supprime les accents et normalise le texte pour que \b fonctionne
 * correctement avec les mots français.
 * "créé" → "cree", "déplace" → "deplace", "à" → "a"
 */
function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replaceAll(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

const DELETE_PATTERNS: RegExp[] = [
  /\b(supprime[rsz]?|supprimer|efface[rsz]?|effacer|enleve[rsz]?|enlever)\b/i,
  /\b(retire[rsz]?|retirer|vire[rsz]?|virer|degage[rsz]?|degager)\b/i,
  /\b(delete|remove|erase|drop|wipe)\b/i,
];

const MODIFY_PATTERNS: RegExp[] = [
  /\b(modifie[rsz]?|modifier|change[rsz]?|changer|edite[rsz]?|editer)\b/i,
  /\b(retouche[rsz]?|retoucher|ajuste[rsz]?|ajuster|adapte[rsz]?|adapter)\b/i,
  /\b(transforme[rsz]?|transformer|redimensionne[rsz]?|redimensionner|deplace[rsz]?|deplacer)\b/i,
  /\b(renomme[rsz]?|renommer|recolore[rsz]?|recolorer|remplace[rsz]?|remplacer)\b/i,
  /\b(colorie[rsz]?|colorier|pein[st]?|peindre|colore[rsz]?)\b/i,
  /\bmets?\s+(?:en|la\s+couleur|a\s+jour)\b/i,
  /\bmettre\s+a\s+jour\b/i,
  /\b(agrandis?|agrandir|reduis?|reduire|pivote[rsz]?|pivoter|tourne[rsz]?|tourner)\b/i,
  /\b(update|edit|resize|move|rename|recolor|replace|tweak|restyle|rotate|scale|flip|mirror|align)\b/i,
];

const ADD_PATTERNS: RegExp[] = [
  /\b(ajoute[rsz]?|ajouter|ajoute|rajoute[rsz]?|rajouter|insere[rsz]?|inserer|inclus?|inclure)\b/i,
  /\bmets?\s+(?:en\s+plus|aussi|egalement)\b/i,
  /\bplace[sz]?\s+(?:aussi|en\s+plus)\b/i,
  /\b(egalement|aussi|par[-\s]dessus|par[-\s]dessous|au[-\s]dessus|en[-\s]dessous)\b/i,
  /\b(add|insert|include|append|put\s+(?:also|too|on\s+top))\b/i,
];

const CREATE_PATTERNS: RegExp[] = [
  /\b(cree[rsz]?|creer|genere[rsz]?|generer|genere|concois?|concevoir|realise[rsz]?|realiser)\b/i,
  /\b(dessine[rsz]?|dessiner|construis?|construire|fabrique[rsz]?|fabriquer|produis?|produire)\b/i,
  /\b(fai[st]?\s+(?:moi\s+)?(?:un|une|des|le|la|les))\b/i,
  /\b(create|generate|design|build|make|draw|produce)\b/i,
  /^(?:mets?\s+|pose[sz]?\s+)(?:un|une|des)\b/i,
];

export function detectPromptIntent(prompt: string): PromptOperationType {
  const text = normalize(prompt);

  const has = {
    create: matchesAny(text, CREATE_PATTERNS),
    delete: matchesAny(text, DELETE_PATTERNS),
    modify: matchesAny(text, MODIFY_PATTERNS),
    add: matchesAny(text, ADD_PATTERNS),
  };

  return resolveIntent(has);
}

function resolveIntent(has: Record<PromptOperationType, boolean>): PromptOperationType {
  if (has.create) return 'create';
  if (has.delete && has.add && !has.modify) return 'modify';
  if (has.delete) return 'delete';
  if (has.modify) return 'modify';
  return 'add';
}

function matchesAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((p) => p.test(text));
}
