export interface AnnounceServiceType {
  id: string;
  label: string;
  style: string; // catégorie principale
}

export const AnnounceCategories: AnnounceServiceType[] = [
  // 🏠 Aide à domicile & vie quotidienne
  { id: "menage", label: "Ménage et entretien du logement", style: "Aide à domicile" },
  { id: "repassage", label: "Repassage et entretien du linge", style: "Aide à domicile" },
  { id: "courses", label: "Courses et livraison à domicile", style: "Aide à domicile" },
  { id: "repas", label: "Préparation de repas à domicile", style: "Aide à domicile" },
  { id: "bricolage", label: "Petits travaux de bricolage", style: "Aide à domicile" },
  { id: "jardinage", label: "Entretien du jardin", style: "Aide à domicile" },
  { id: "vigilance", label: "Surveillance temporaire du domicile", style: "Aide à domicile" },

  // 👵 Aide aux personnes âgées
  { id: "toilette", label: "Aide à la toilette et à l’habillage", style: "Aide aux personnes âgées" },
  { id: "mobilite", label: "Aide à la mobilité et aux déplacements", style: "Aide aux personnes âgées" },
  { id: "repas-aides", label: "Aide à la prise des repas", style: "Aide aux personnes âgées" },
  { id: "rendezvous", label: "Accompagnement aux rendez-vous médicaux", style: "Aide aux personnes âgées" },
  { id: "presence", label: "Présence de nuit / garde malade", style: "Aide aux personnes âgées" },
  { id: "stimulation", label: "Stimulation et activités adaptées", style: "Aide aux personnes âgées" },
  { id: "teleassistance", label: "Téléassistance et sécurité à domicile", style: "Aide aux personnes âgées" },

  // ♿ Aide aux personnes handicapées
  { id: "quotidien-handicap", label: "Assistance dans les gestes du quotidien", style: "Aide aux personnes handicapées" },
  { id: "communication-handicap", label: "Aide à la communication", style: "Aide aux personnes handicapées" },
  { id: "accompagnement-scolaire", label: "Accompagnement scolaire ou professionnel", style: "Aide aux personnes handicapées" },
  { id: "adaptation-logement", label: "Adaptation du logement et du matériel", style: "Aide aux personnes handicapées" },
  { id: "transport-handicap", label: "Transport accompagné", style: "Aide aux personnes handicapées" },

  // 👶 Enfance et famille
  { id: "garde-enfant", label: "Garde d’enfants à domicile", style: "Enfance et famille" },
  { id: "soutien-scolaire", label: "Soutien scolaire et aide aux devoirs", style: "Enfance et famille" },
  { id: "babysitting", label: "Baby-sitting ponctuel", style: "Enfance et famille" },
  { id: "accompagnement-activites", label: "Accompagnement aux activités extra-scolaires", style: "Enfance et famille" },
  { id: "soutien-parental", label: "Soutien parental et aide à l’organisation", style: "Enfance et famille" },

  // 🚗 Mobilité & accompagnement
  { id: "transport", label: "Transport accompagné", style: "Mobilité" },
  { id: "conduite", label: "Conduite du véhicule personnel", style: "Mobilité" },
  { id: "livraison", label: "Livraison de courses, médicaments, repas", style: "Mobilité" },

  // 💻 Services administratifs & numériques
  { id: "aide-admin", label: "Aide à la gestion administrative", style: "Services administratifs" },
  { id: "assistance-info", label: "Assistance informatique et internet", style: "Services administratifs" },
  { id: "formation-numerique", label: "Formation aux outils numériques", style: "Services administratifs" },

  // 🐶 Animaux domestiques
  { id: "promenade-animaux", label: "Promenade d’animaux", style: "Animaux domestiques" },
  { id: "garde-animaux", label: "Garde d’animaux à domicile", style: "Animaux domestiques" },
  { id: "soins-animaux", label: "Soins courants aux animaux", style: "Animaux domestiques" },

  // ✳️ Autres services
  { id: "coaching", label: "Coaching bien-être ou insertion", style: "Autres services" },
  { id: "vie-sociale", label: "Accompagnement à la vie sociale", style: "Autres services" },
  { id: "conciergerie", label: "Conciergerie personnelle", style: "Autres services" },
  { id: "assistance-absence", label: "Assistance en cas d’absence (plantes, courrier…)", style: "Autres services" },
];
