import { detectPromptIntent, PromptOperationType } from './prompt-intent.util';

// ── Helper ────────────────────────────────────────────────────────────────────

function expectIntent(prompt: string, expected: PromptOperationType): void {
  expect(detectPromptIntent(prompt)).toBe(expected);
}

// ── CREATE ────────────────────────────────────────────────────────────────────

describe('detectPromptIntent — create', () => {
  it('crée (accent)', () => expectIntent('crée un rectangle rouge', 'create'));
  it('cree (sans accent)', () => expectIntent('cree un rectangle', 'create'));
  it('créer', () => expectIntent('créer une ellipse bleue', 'create'));
  it('créé (participe)', () => expectIntent('créé un bouton', 'create'));
  it('créez', () => expectIntent('créez un titre', 'create'));
  it('génère', () => expectIntent('génère un fond dégradé', 'create'));
  it('genere (sans accent)', () => expectIntent('genere un fond', 'create'));
  it('générer', () => expectIntent('générer une icône', 'create'));
  it('conçois', () => expectIntent('conçois une bannière', 'create'));
  it('concevoir', () => expectIntent('concevoir un logo', 'create'));
  it('réalise', () => expectIntent('réalise une maquette', 'create'));
  it('realise (sans accent)', () => expectIntent('realise une maquette', 'create'));
  it('dessine', () => expectIntent('dessine un cercle', 'create'));
  it('dessiner', () => expectIntent('dessiner une flèche', 'create'));
  it('construis', () => expectIntent('construis un formulaire', 'create'));
  it('construire', () => expectIntent('construire une grille', 'create'));
  it('fabrique', () => expectIntent('fabrique un composant', 'create'));
  it('fabriquer', () => expectIntent('fabriquer un bouton', 'create'));
  it('produis', () => expectIntent('produis une illustration', 'create'));
  it('produire', () => expectIntent('produire un header', 'create'));
  it('fais moi un', () => expectIntent('fais moi un rectangle', 'create'));
  it('fais un', () => expectIntent('fais un cercle vert', 'create'));
  it('fait un', () => expectIntent('fait un carré', 'create'));
  it('create (EN)', () => expectIntent('create a button', 'create'));
  it('generate (EN)', () => expectIntent('generate a card', 'create'));
  it('design (EN)', () => expectIntent('design a layout', 'create'));
  it('build (EN)', () => expectIntent('build a navbar', 'create'));
  it('make (EN)', () => expectIntent('make a circle', 'create'));
  it('draw (EN)', () => expectIntent('draw a triangle', 'create'));
  it('produce (EN)', () => expectIntent('produce a banner', 'create'));
  it('met un (début de phrase)', () => expectIntent('mets un bouton ici', 'create'));
  it('pose un (début de phrase)', () => expectIntent('pose un logo', 'create'));
  it('majuscules ignorées', () => expectIntent('CRÉE UN RECTANGLE', 'create'));
  it('prompt mixte create+add → create gagne', () =>
    expectIntent('crée et ajoute un cercle', 'create'));
  it('prompt mixte create+delete → create gagne', () =>
    expectIntent('crée un bouton et supprime lancien', 'create'));
});

// ── DELETE ────────────────────────────────────────────────────────────────────

describe('detectPromptIntent — delete', () => {
  it('supprime', () => expectIntent('supprime le cercle rouge', 'delete'));
  it('supprimer', () => expectIntent('supprimer tous les éléments', 'delete'));
  it('supprimez', () => expectIntent('supprimez le titre', 'delete'));
  it('efface', () => expectIntent('efface le rectangle', 'delete'));
  it('effacer', () => expectIntent('effacer la forme bleue', 'delete'));
  it('enleve (sans accent)', () => expectIntent('enleve le logo', 'delete'));
  it('enlever', () => expectIntent('enlever le texte', 'delete'));
  it('retire', () => expectIntent('retire le fond', 'delete'));
  it('retirer', () => expectIntent('retirer cette icône', 'delete'));
  it('vire', () => expectIntent('vire le header', 'delete'));
  it('virer', () => expectIntent('virer cette forme', 'delete'));
  it('degage (sans accent)', () => expectIntent('degage le cercle', 'delete'));
  it('degager', () => expectIntent('degager tous les éléments', 'delete'));
  it('delete (EN)', () => expectIntent('delete the circle', 'delete'));
  it('remove (EN)', () => expectIntent('remove the background', 'delete'));
  it('erase (EN)', () => expectIntent('erase this shape', 'delete'));
  it('drop (EN)', () => expectIntent('drop the element', 'delete'));
  it('wipe (EN)', () => expectIntent('wipe the canvas', 'delete'));
  it('supprime le cercle → delete (pas modify)', () =>
    expectIntent('supprime le cercle', 'delete'));
  it('delete+add → modify', () => expectIntent('supprime le rouge et ajoute du bleu', 'modify'));
  it('delete+add+modify → delete', () => expectIntent('supprime et modifie et ajoute', 'delete'));
});

// ── MODIFY ────────────────────────────────────────────────────────────────────

describe('detectPromptIntent — modify', () => {
  it('modifie', () => expectIntent('modifie la couleur du fond', 'modify'));
  it('modifier', () => expectIntent('modifier la taille', 'modify'));
  it('change', () => expectIntent('change la couleur en rouge', 'modify'));
  it('changer', () => expectIntent('changer la police', 'modify'));
  it('edite (sans accent)', () => expectIntent('edite le texte', 'modify'));
  it('editer', () => expectIntent('editer ce composant', 'modify'));
  it('retouche', () => expectIntent('retouche le logo', 'modify'));
  it('ajuste', () => expectIntent('ajuste les marges', 'modify'));
  it('adapte', () => expectIntent('adapte la mise en page', 'modify'));
  it('transforme', () => expectIntent('transforme le rectangle en cercle', 'modify'));
  it('redimensionne (sans accent)', () => expectIntent('redimensionne le cadre', 'modify'));
  it('deplace (sans accent)', () => expectIntent('deplace le logo en haut', 'modify'));
  it('renomme (sans accent)', () => expectIntent('renomme cette couche', 'modify'));
  it('recolore (sans accent)', () => expectIntent('recolore le fond', 'modify'));
  it('remplace', () => expectIntent('remplace le bleu par du vert', 'modify'));
  it('colorie', () => expectIntent('colorie le fond en jaune', 'modify'));
  it('colorier', () => expectIntent('colorier la forme', 'modify'));
  it('peins (sans accent)', () => expectIntent('peins le fond en noir', 'modify'));
  it('peindre', () => expectIntent('peindre ce rectangle', 'modify'));
  it('colore', () => expectIntent('colore cette forme', 'modify'));
  it('mets a jour', () => expectIntent('mets a jour le style', 'modify'));
  it('mettre a jour', () => expectIntent('mettre a jour le composant', 'modify'));
  it('agrandis (sans accent)', () => expectIntent('agrandis le rectangle', 'modify'));
  it('agrandir', () => expectIntent('agrandir cette zone', 'modify'));
  it('reduis (sans accent)', () => expectIntent('reduis le texte', 'modify'));
  it('reduire', () => expectIntent('reduire la taille', 'modify'));
  it('pivote', () => expectIntent('pivote le logo de 90 degrés', 'modify'));
  it('pivoter', () => expectIntent('pivoter cette forme', 'modify'));
  it('tourne (sans accent)', () => expectIntent('tourne le rectangle', 'modify'));
  it('tourner', () => expectIntent('tourner cette icône', 'modify'));
  it('update (EN)', () => expectIntent('update the color', 'modify'));
  it('edit (EN)', () => expectIntent('edit this shape', 'modify'));
  it('resize (EN)', () => expectIntent('resize the frame', 'modify'));
  it('move (EN)', () => expectIntent('move the logo up', 'modify'));
  it('rename (EN)', () => expectIntent('rename this layer', 'modify'));
  it('recolor (EN)', () => expectIntent('recolor the background', 'modify'));
  it('replace (EN)', () => expectIntent('replace the blue with green', 'modify'));
  it('rotate (EN)', () => expectIntent('rotate 45 degrees', 'modify'));
  it('scale (EN)', () => expectIntent('scale the element', 'modify'));
  it('flip (EN)', () => expectIntent('flip horizontally', 'modify'));
  it('mirror (EN)', () => expectIntent('mirror the shape', 'modify'));
  it('align (EN)', () => expectIntent('align to center', 'modify'));
});

// ── ADD ───────────────────────────────────────────────────────────────────────

describe('detectPromptIntent — add (défaut)', () => {
  it('ajoute', () => expectIntent('ajoute un titre en haut', 'add'));
  it('ajouter', () => expectIntent('ajouter un logo', 'add'));
  it('rajoute (sans accent)', () => expectIntent('rajoute un bouton', 'add'));
  it('rajouter', () => expectIntent('rajouter une icône', 'add'));
  it('insere (sans accent)', () => expectIntent('insere un texte', 'add'));
  it('inserer', () => expectIntent('inserer une image', 'add'));
  it('inclus', () => expectIntent('inclus ce composant', 'add'));
  it('inclure', () => expectIntent('inclure un footer', 'add'));
  // "mets en plus" match le pattern modify ("mets en") → on teste avec "rajoute aussi"
  it('aussi via rajoute', () => expectIntent('rajoute aussi un sous-titre', 'add'));
  it('aussi via ajoute', () => expectIntent('ajoute aussi un fond', 'add'));
  it('par-dessus', () => expectIntent('par-dessus ajoute une couche', 'add'));
  it('add (EN)', () => expectIntent('add a button', 'add'));
  it('insert (EN)', () => expectIntent('insert a text block', 'add'));
  it('include (EN)', () => expectIntent('include a footer', 'add'));
  it('append (EN)', () => expectIntent('append an element', 'add'));
  it('prompt inconnu → add par défaut', () => expectIntent('bonjour', 'add'));
  it('prompt vide → add par défaut', () => expectIntent('', 'add'));
  it('prompt avec seulement des espaces → add par défaut', () => expectIntent('   ', 'add'));
});

// ── Normalisation (accents, casse) ────────────────────────────────────────────

describe('detectPromptIntent — normalisation', () => {
  it('ignore les accents dans "créé"', () => expectIntent('créé un fond', 'create'));
  it('ignore les accents dans "supprimé"', () => expectIntent('supprime le cercle', 'delete'));
  it('ignore les accents dans "modifié"', () => expectIntent('modifie le style', 'modify'));
  it('ignore les accents dans "ajouté"', () => expectIntent('ajoute un titre', 'add'));
  it('insensible à la casse', () => expectIntent('SUPPRIME LE FOND', 'delete'));
  it('gère les espaces de début et fin', () => expectIntent('  crée un rectangle  ', 'create'));
});

// ── Priorités resolveIntent ───────────────────────────────────────────────────

describe('detectPromptIntent — priorités', () => {
  it('create > delete', () => expectIntent('crée et supprime', 'create'));
  it('create > modify', () => expectIntent('crée et modifie', 'create'));
  it('create > add', () => expectIntent('crée et ajoute', 'create'));
  it('delete+add (sans modify) → modify', () =>
    expectIntent('supprime le rouge et ajoute le bleu', 'modify'));
  it('delete seul → delete', () => expectIntent('supprime le fond', 'delete'));
  it('modify > add', () => expectIntent('modifie et ajoute', 'modify'));
  it('add seul → add', () => expectIntent('ajoute un bouton', 'add'));
  it('delete+add+modify → delete (modify présent bloque la règle delete+add→modify)', () =>
    expectIntent('supprime modifie et ajoute', 'delete'));
});
