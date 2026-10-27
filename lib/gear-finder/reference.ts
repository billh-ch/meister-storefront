// Approved Gear Finder Site v2 (99516e3), 26 October 2026. Questions and model guidance are unchanged.
import type { Bilingual, Question, SuitModel, FinModel } from './types'

export const PRODUCTS: SuitModel[] = [
  {
    "id": "lined",
    "name": {
      "en": "Meister Double Lined",
      "el": "Meister Φόδρα / Φόδρα"
    },
    "outer": "lined",
    "inner": "lined",
    "uses": [
      "spear",
      "free",
      "scuba"
    ],
    "price": [
      300,
      440
    ],
    "thickness": [
      3,
      3.5,
      5,
      5.5,
      7,
      8,
      9
    ],
    "description": {
      "en": "A fabric lining inside and out makes this the practical choice for easy dressing and regular use.",
      "el": "Με φόδρα μέσα και έξω, είναι πρακτική επιλογή για εύκολο φόρεμα και συχνή χρήση."
    },
    "advantage": {
      "en": "Fabric on both sides protects the neoprene from everyday handling.",
      "el": "Η φόδρα και στις δύο πλευρές προστατεύει το νεοπρέν στην καθημερινή χρήση."
    },
    "care": {
      "en": "No donning lubricant needed. Rinse with fresh water and dry in the shade.",
      "el": "Φοριέται χωρίς λιπαντικό. Ξέπλυνε με γλυκό νερό και στέγνωσε στη σκιά."
    },
    "url": "https://dive-meister.com/shop/stoles-katadysis/fodra_fodra/%cf%83%cf%84%ce%bf%ce%bb%ce%ae-%ce%ba%ce%b1%cf%84%ce%ac%ce%b4%cf%85%cf%83%ce%b7%cf%82-%cf%86%cf%8c%ce%b4%cf%81%ce%b1-%cf%86%cf%8c%ce%b4%cf%81%ce%b1-meister/"
  },
  {
    "id": "camo",
    "name": {
      "en": "Meister Camo Green",
      "el": "Meister Camo Green"
    },
    "outer": "lined",
    "inner": "open",
    "uses": [
      "spear",
      "free"
    ],
    "price": [
      290,
      440
    ],
    "thickness": [
      3,
      3.5,
      5,
      5.5,
      7,
      8,
      9
    ],
    "description": {
      "en": "A fabric exterior for more resistance to handling, with an unlined open-cell interior that sits close to the skin.",
      "el": "Ανθεκτική εξωτερική φόδρα και ξυρισμένο εσωτερικό που εφαρμόζει κοντά στο δέρμα."
    },
    "advantage": {
      "en": "A useful balance of outer durability and a close-fitting open-cell interior.",
      "el": "Συνδυάζει ανθεκτική εξωτερική φόδρα με εφαρμοστό ξυρισμένο εσωτερικό."
    },
    "care": {
      "en": "Wet the inside with suitable wetsuit lubricant before dressing. Use finger pads, never fingernails.",
      "el": "Βρέξε το εσωτερικό με κατάλληλο λιπαντικό στολής πριν το φόρεμα. Χρησιμοποίησε τις άκρες των δαχτύλων, χωρίς νύχια."
    },
    "url": "https://dive-meister.com/shop/stoles-katadysis/fodra_ksyrismeno/%cf%83%cf%84%ce%bf%ce%bb%ce%ae-%ce%ba%ce%b1%cf%84%ce%ac%ce%b4%cf%85%cf%83%ce%b7%cf%82-%cf%86%cf%8c%ce%b4%cf%81%ce%b1-%ce%be%cf%85%cf%81%ce%b9%cf%83%ce%bc%ce%ad%ce%bd%ce%b7-meister/"
  },
  {
    "id": "fire",
    "name": {
      "en": "Meister Fire Camo 3mm",
      "el": "Meister Fire Camo 3mm"
    },
    "outer": "lined",
    "inner": "open",
    "uses": [
      "spear",
      "free"
    ],
    "price": [
      320,
      320
    ],
    "thickness": [
      3
    ],
    "description": {
      "en": "The fabric-outside, open-cell-inside construction in a fixed 3mm version. An option for warm-water diving.",
      "el": "Φόδρα εξωτερικά και ξυρισμένο εσωτερικά, σε έκδοση μόνο 3mm. Μια επιλογή για ζεστά νερά."
    },
    "advantage": {
      "en": "A 3mm option with a protective fabric exterior.",
      "el": "Επιλογή 3mm με προστατευτική εξωτερική φόδρα."
    },
    "care": {
      "en": "Use suitable wetsuit lubricant and handle the open-cell interior gently.",
      "el": "Χρησιμοποίησε κατάλληλο λιπαντικό στολής και πρόσεχε το ξυρισμένο εσωτερικό."
    },
    "url": "https://dive-meister.com/shop/stoles-katadysis/fodra_ksyrismeno/%cf%83%cf%84%ce%bf%ce%bb%ce%ae-%ce%ba%ce%b1%cf%84%ce%ac%ce%b4%cf%85%cf%83%ce%b7%cf%82-%cf%86%cf%8c%ce%b4%cf%81%ce%b1-%ce%be%cf%85%cf%81%ce%b9%cf%83%ce%bc%ce%ad%ce%bd%ce%b7-meister-fire-camo-3mm/"
  },
  {
    "id": "sheico",
    "name": {
      "en": "Meister Sheico",
      "el": "Meister Sheico"
    },
    "outer": "smooth",
    "inner": "lined",
    "uses": [
      "pool",
      "free"
    ],
    "price": [
      395,
      510
    ],
    "thickness": [
      2,
      3,
      3.5,
      5,
      5.5,
      7
    ],
    "description": {
      "en": "A smooth exterior for glide and a fabric interior for easier dressing. Meister positions it for freediving competition and pool training.",
      "el": "Λεία εξωτερική επιφάνεια για υδρολίσθηση και εσωτερική φόδρα για εύκολο φόρεμα. Η Meister την προτείνει για αγωνιστική ελεύθερη κατάδυση και πισίνα."
    },
    "advantage": {
      "en": "Combines a smooth outer surface with a fabric lining inside.",
      "el": "Συνδυάζει λεία εξωτερική επιφάνεια με φόδρα εσωτερικά."
    },
    "care": {
      "en": "No open-cell lubricant routine. Protect the smooth exterior from nails, rocks and sharp edges.",
      "el": "Δεν απαιτεί τη διαδικασία λίπανσης ξυρισμένης στολής. Προστάτευσε τη λεία επιφάνεια από νύχια, βράχια και αιχμές."
    },
    "url": "https://dive-meister.com/shop/stoles-katadysis/leio_ksyrismeno/%cf%83%cf%84%ce%bf%ce%bb%ce%ae-%ce%ba%ce%b1%cf%84%ce%ac%ce%b4%cf%85%cf%83%ce%b7%cf%82-%cf%86%cf%8c%ce%b4%cf%81%ce%b1-%ce%bb%ce%b5%ce%af%ce%b1-meister-sheico/"
  },
  {
    "id": "daiwabo",
    "name": {
      "en": "Meister Daiwabo",
      "el": "Meister Daiwabo"
    },
    "outer": "smooth",
    "inner": "open",
    "uses": [
      "spear",
      "free"
    ],
    "price": [
      360,
      570
    ],
    "thickness": [
      3.5,
      4.5,
      5.5,
      6.5,
      7.5,
      8.5
    ],
    "description": {
      "en": "Flexible smoothskin with an open-cell interior. Meister describes its smaller-cell neoprene as more resistant to compression at depth, but with somewhat less insulation than its winter-focused options.",
      "el": "Ελαστικό λείο νεοπρέν με ξυρισμένο εσωτερικό. Η Meister περιγράφει τη μικρή φυσσαλίδα ως πιο ανθεκτική στη συμπίεση στο βάθος, με λίγο χαμηλότερη θερμομόνωση από τις χειμερινές επιλογές της."
    },
    "advantage": {
      "en": "Worth considering when compression resistance is a material priority.",
      "el": "Αξίζει να εξεταστεί όταν προτεραιότητα είναι η αντοχή του υλικού στη συμπίεση."
    },
    "care": {
      "en": "Lubricate the interior before dressing. Both exposed surfaces need gentle handling.",
      "el": "Χρησιμοποίησε λιπαντικό εσωτερικά πριν το φόρεμα. Και οι δύο εκτεθειμένες επιφάνειες χρειάζονται προσοχή."
    },
    "url": "https://dive-meister.com/shop/stoles-katadysis/leio_ksyrismeno/%cf%83%cf%84%ce%bf%ce%bb%ce%ae-%ce%ba%ce%b1%cf%84%ce%ac%ce%b4%cf%85%cf%83%ce%b7%cf%82-%ce%bb%ce%b5%ce%af%ce%b1-%ce%be%cf%85%cf%81%ce%b9%cf%83%ce%bc%ce%ad%ce%bd%ce%b7-meister-daiwabo/"
  },
  {
    "id": "pro",
    "name": {
      "en": "Meister Yamamoto #45 PRO",
      "el": "Meister Yamamoto #45 PRO"
    },
    "outer": "smooth",
    "inner": "open",
    "uses": [
      "spear",
      "free"
    ],
    "price": [
      350,
      485
    ],
    "thickness": [
      4,
      5,
      6,
      7,
      8,
      9,
      10
    ],
    "description": {
      "en": "Very elastic smoothskin with an open-cell interior. Meister highlights warmth and flexibility, particularly for winter use.",
      "el": "Πολύ ελαστικό λείο νεοπρέν με ξυρισμένο εσωτερικό. Η Meister δίνει έμφαση στη θερμομόνωση και την ελαστικότητα, ιδιαίτερα για χειμερινή χρήση."
    },
    "advantage": {
      "en": "A warmth-focused smoothskin option in a wide range of thicknesses.",
      "el": "Λεία επιλογή με έμφαση στη ζεστασιά και μεγάλη ποικιλία πάχους."
    },
    "care": {
      "en": "Lubricate before dressing and handle gently. Meister notes greater buoyancy in the thicker versions: recheck weighting with an instructor.",
      "el": "Χρειάζεται λιπαντικό και προσεκτικό χειρισμό. Η Meister σημειώνει αυξημένη πλευστότητα στα μεγάλα πάχη: έλεγξε τα βάρη με εκπαιδευτή."
    },
    "url": "https://dive-meister.com/shop/stoles-katadysis/leio_ksyrismeno/%cf%83%cf%84%ce%bf%ce%bb%ce%ae-meister-%ce%bb%ce%b5%ce%af%ce%b1-%ce%be%cf%85%cf%81%ce%b9%cf%83%ce%bc%ce%ad%ce%bd%ce%b7-yamamoto-45-pro/"
  },
  {
    "id": "scs",
    "name": {
      "en": "Meister Yamamoto #45 SCS",
      "el": "Meister Yamamoto #45 SCS"
    },
    "outer": "smooth",
    "inner": "open",
    "uses": [
      "spear",
      "free"
    ],
    "price": [
      440,
      645
    ],
    "thickness": [
      4,
      5,
      6,
      7,
      8,
      9,
      10
    ],
    "description": {
      "en": "A Yamamoto #45 suit with an SCS coating on its smooth exterior. Meister describes the coating as adding insulation and durability.",
      "el": "Στολή Yamamoto #45 με επίστρωση SCS στη λεία εξωτερική επιφάνεια. Η Meister αναφέρει πρόσθετη θερμομόνωση και αντοχή από την επίστρωση."
    },
    "advantage": {
      "en": "An SCS-coated alternative if you specifically want the upgraded exterior.",
      "el": "Εναλλακτική με SCS, αν αναζητάς συγκεκριμένα την αναβαθμισμένη εξωτερική επιφάνεια."
    },
    "care": {
      "en": "Still needs careful smoothskin handling and lubricant inside. Recheck weighting when changing thickness.",
      "el": "Χρειάζεται προσοχή στη λεία επιφάνεια και λιπαντικό εσωτερικά. Έλεγξε τα βάρη όταν αλλάζεις πάχος."
    },
    "url": "https://dive-meister.com/shop/stoles-katadysis/leio_ksyrismeno/%cf%83%cf%84%ce%bf%ce%bb%ce%ae-meister-%ce%bb%ce%b5%ce%af%ce%b1-%ce%be%cf%85%cf%81%ce%b9%cf%83%ce%bc%ce%ad%ce%bd%ce%b7-yamamoto-45-scs/"
  }
]

export const QUESTIONS: Question[] = [
  {
    "id": "use",
    "short": {
      "en": "Your diving",
      "el": "Η κατάδυσή σου"
    },
    "title": {
      "en": "What will you use your wetsuit for?",
      "el": "Για ποια δραστηριότητα θέλεις τη στολή;"
    },
    "hint": {
      "en": "Choose what you do most often. We’ll match the construction to your diving.",
      "el": "Διάλεξε τη συχνότερη χρήση. Θα ταιριάξουμε τον τύπο στολής με τη δραστηριότητά σου."
    },
    "options": [
      [
        "spear",
        "fish",
        {
          "en": "Spearfishing",
          "el": "Ψαροτούφεκο"
        },
        {
          "en": "Sea sessions, shore entries and time on the surface.",
          "el": "Θάλασσα, είσοδος από ακτή και χρόνος στην επιφάνεια."
        }
      ],
      [
        "free",
        "wave",
        {
          "en": "Freediving in the sea",
          "el": "Ελεύθερη κατάδυση"
        },
        {
          "en": "Line diving, exploring and moving freely underwater.",
          "el": "Σχοινί, εξερεύνηση και άνετη κίνηση στο νερό."
        }
      ],
      [
        "pool",
        "pool",
        {
          "en": "Pool training",
          "el": "Προπόνηση σε πισίνα"
        },
        {
          "en": "Freediving technique, laps and pool disciplines.",
          "el": "Τεχνική ελεύθερης κατάδυσης και αγωνίσματα πισίνας."
        }
      ],
      [
        "scuba",
        "tank",
        {
          "en": "Scuba diving",
          "el": "Αυτόνομη κατάδυση"
        },
        {
          "en": "Diving with a tank. Start with a lined, practical suit.",
          "el": "Κατάδυση με φιάλη και πρακτική στολή με φόδρα."
        }
      ]
    ]
  },
  {
    "id": "temp",
    "short": {
      "en": "Water temperature",
      "el": "Θερμοκρασία νερού"
    },
    "title": {
      "en": "How cold is the water?",
      "el": "Τι θερμοκρασία έχει το νερό;"
    },
    "hint": {
      "en": "Use the coldest water you expect at diving depth, not the air temperature.",
      "el": "Σκέψου το πιο κρύο νερό που περιμένεις στο βάθος κατάδυσης, όχι τη θερμοκρασία αέρα."
    },
    "options": [
      [
        "warm",
        "sun",
        {
          "en": "Warm · 24°C and above",
          "el": "Ζεστό · από 24°C"
        },
        {
          "en": "Typically summer conditions or a warm pool.",
          "el": "Συνήθως καλοκαιρινές συνθήκες ή ζεστή πισίνα."
        }
      ],
      [
        "mild",
        "wave",
        {
          "en": "Mild · 19–23°C",
          "el": "Ήπιο · 19–23°C"
        },
        {
          "en": "Noticeably cool after a while in the water.",
          "el": "Αισθητά δροσερό μετά από λίγη ώρα."
        }
      ],
      [
        "cool",
        "snow",
        {
          "en": "Cool · 15–18°C",
          "el": "Δροσερό · 15–18°C"
        },
        {
          "en": "More insulation becomes a priority.",
          "el": "Η περισσότερη θερμομόνωση αποκτά προτεραιότητα."
        }
      ],
      [
        "cold",
        "snow",
        {
          "en": "Cold · below 15°C",
          "el": "Κρύο · κάτω από 15°C"
        },
        {
          "en": "Get local advice on the right exposure protection.",
          "el": "Χρειάζεται τοπική συμβουλή για κατάλληλη θερμική προστασία."
        }
      ],
      [
        "unknown",
        "help",
        {
          "en": "I’m not sure yet",
          "el": "Δεν γνωρίζω ακόμα"
        },
        {
          "en": "Find a suit type now; confirm thickness later.",
          "el": "Βρες τώρα τον τύπο στολής και επιβεβαίωσε το πάχος αργότερα."
        }
      ]
    ]
  },
  {
    "id": "duration",
    "short": {
      "en": "Time in the water",
      "el": "Χρόνος στο νερό"
    },
    "title": {
      "en": "How long are your sessions?",
      "el": "Πόση ώρα μένεις στο νερό;"
    },
    "hint": {
      "en": "Count the whole session, including time at the surface and repeated dives.",
      "el": "Υπολόγισε όλη την εξόρμηση, μαζί με χρόνο στην επιφάνεια και επαναλαμβανόμενες βουτιές."
    },
    "options": [
      [
        "short",
        "clock",
        {
          "en": "Up to 1 hour",
          "el": "Έως 1 ώρα"
        },
        {
          "en": "A shorter swim, dive or training session.",
          "el": "Σύντομη κολύμβηση, κατάδυση ή προπόνηση."
        }
      ],
      [
        "medium",
        "clock",
        {
          "en": "1–2 hours",
          "el": "1–2 ώρες"
        },
        {
          "en": "A regular sea session or longer pool practice.",
          "el": "Μια συνηθισμένη εξόρμηση ή μεγαλύτερη προπόνηση."
        }
      ],
      [
        "long",
        "clock",
        {
          "en": "More than 2 hours",
          "el": "Πάνω από 2 ώρες"
        },
        {
          "en": "Long sessions or several dives close together.",
          "el": "Μεγάλη διάρκεια ή πολλές συνεχόμενες καταδύσεις."
        }
      ]
    ]
  },
  {
    "id": "cold",
    "short": {
      "en": "Your comfort",
      "el": "Η άνεσή σου"
    },
    "title": {
      "en": "Do you tend to feel the cold?",
      "el": "Κρυώνεις εύκολα στο νερό;"
    },
    "hint": {
      "en": "Your own experience matters more than a generic temperature chart.",
      "el": "Η δική σου εμπειρία μετρά περισσότερο από έναν γενικό πίνακα θερμοκρασίας."
    },
    "options": [
      [
        "normal",
        "sun",
        {
          "en": "Usually comfortable",
          "el": "Συνήθως νιώθω άνετα"
        },
        {
          "en": "I don’t normally need extra warmth.",
          "el": "Συνήθως δεν χρειάζομαι επιπλέον ζεστασιά."
        }
      ],
      [
        "yes",
        "snow",
        {
          "en": "Yes, I get cold easily",
          "el": "Ναι, κρυώνω εύκολα"
        },
        {
          "en": "I prefer a little more insulation.",
          "el": "Προτιμώ λίγη περισσότερη θερμομόνωση."
        }
      ],
      [
        "unsure",
        "help",
        {
          "en": "I’m still figuring that out",
          "el": "Δεν έχω ακόμα εμπειρία"
        },
        {
          "en": "Give me a sensible starting point to discuss.",
          "el": "Θέλω ένα πρακτικό σημείο εκκίνησης για συζήτηση."
        }
      ]
    ]
  },
  {
    "id": "care",
    "short": {
      "en": "Care & dressing",
      "el": "Φροντίδα & φόρεμα"
    },
    "title": {
      "en": "What matters most day to day?",
      "el": "Τι σε ενδιαφέρει στην καθημερινή χρήση;"
    },
    "hint": {
      "en": "Open-cell interiors need lubricant. Smooth exteriors need extra care around nails and rocks.",
      "el": "Το ξυρισμένο εσωτερικό χρειάζεται λιπαντικό. Η λεία εξωτερική επιφάνεια θέλει προσοχή σε νύχια και βράχια."
    },
    "options": [
      [
        "easy",
        "feather",
        {
          "en": "Easy to put on",
          "el": "Εύκολο φόρεμα"
        },
        {
          "en": "I want a lined interior, without lubricant.",
          "el": "Θέλω εσωτερική φόδρα, χωρίς λιπαντικό."
        }
      ],
      [
        "rugged",
        "shield",
        {
          "en": "A tougher outside",
          "el": "Ανθεκτική εξωτερική επιφάνεια"
        },
        {
          "en": "Fabric outside; I’m happy to use lubricant inside.",
          "el": "Φόδρα έξω· δεν με πειράζει το λιπαντικό μέσα."
        }
      ],
      [
        "smooth",
        "wave",
        {
          "en": "A smooth performance feel",
          "el": "Λεία αίσθηση και υδρολίσθηση"
        },
        {
          "en": "I’ll take care of the surface and use lubricant if needed.",
          "el": "Θα προσέχω την επιφάνεια και θα βάζω λιπαντικό αν χρειάζεται."
        }
      ],
      [
        "unsure",
        "help",
        {
          "en": "Help me choose",
          "el": "Βοήθησέ με να διαλέξω"
        },
        {
          "en": "Keep it practical for my activity.",
          "el": "Μια πρακτική επιλογή για τη χρήση μου."
        }
      ]
    ]
  },
  {
    "id": "budget",
    "short": {
      "en": "Your budget",
      "el": "Ο προϋπολογισμός σου"
    },
    "title": {
      "en": "What’s your budget for the suit?",
      "el": "Ποιος είναι ο προϋπολογισμός σου;"
    },
    "hint": {
      "en": "We filter by the shop’s listed starting price. Thickness, sizing and extras can raise the final total.",
      "el": "Φιλτράρουμε με την αρχική τιμή καταστήματος. Το πάχος, το μέγεθος και οι επιλογές μπορεί να αυξήσουν το τελικό ποσό."
    },
    "options": [
      [
        "350",
        "coin",
        {
          "en": "Up to €350 to start",
          "el": "Έως €350 αρχική τιμή"
        },
        {
          "en": "Show the lower starting-price options.",
          "el": "Εμφάνισε τις πιο οικονομικές αρχικές τιμές."
        }
      ],
      [
        "450",
        "coin",
        {
          "en": "Up to €450 to start",
          "el": "Έως €450 αρχική τιμή"
        },
        {
          "en": "A wider choice of materials and construction.",
          "el": "Μεγαλύτερη επιλογή υλικών και κατασκευής."
        }
      ],
      [
        "any",
        "spark",
        {
          "en": "Flexible — focus on suitability",
          "el": "Ευέλικτος — προέχει η καταλληλότητα"
        },
        {
          "en": "Show the most suitable options across the range.",
          "el": "Δείξε τις καταλληλότερες επιλογές της σειράς."
        }
      ]
    ]
  }
]

export const UI: Record<string, Bilingual> = {
  "guide": {
    "en": "WETSUIT FINDER",
    "el": "ΕΠΙΛΟΓΕΑΣ ΣΤΟΛΗΣ"
  },
  "shop": {
    "en": "Explore the range ↗",
    "el": "Δες τη συλλογή ↗"
  },
  "eyebrow": {
    "en": "A little guidance. A better dive.",
    "el": "Λίγη καθοδήγηση. Καλύτερη βουτιά."
  },
  "hero": {
    "en": "Your dive.<br><em>Your perfect wetsuit.</em>",
    "el": "Η βουτιά σου.<br><em>Η σωστή στολή.</em>"
  },
  "intro": {
    "en": "Warmth, comfort, and the right material. Answer a few simple questions to find the Meister wetsuit that makes sense for you.",
    "el": "Ζεστασιά, άνεση και το σωστό υλικό. Απάντησε σε λίγες απλές ερωτήσεις για να βρεις τη στολή Meister που σου ταιριάζει."
  },
  "minutes": {
    "en": "About 2 minutes",
    "el": "Περίπου 2 λεπτά"
  },
  "questions": {
    "en": "6 simple questions",
    "el": "6 απλές ερωτήσεις"
  },
  "noSignup": {
    "en": "No sign-up",
    "el": "Χωρίς εγγραφή"
  },
  "yourGuide": {
    "en": "YOUR DIVE, STEP BY STEP",
    "el": "Η ΒΟΥΤΙΑ ΣΟΥ, ΒΗΜΑ ΒΗΜΑ"
  },
  "railNote": {
    "en": "No need to know neoprene names. We’ll explain what matters along the way.",
    "el": "Δεν χρειάζεται να γνωρίζεις ονόματα νεοπρέν. Θα εξηγήσουμε όσα έχουν σημασία."
  },
  "step": {
    "en": "Question",
    "el": "Ερώτηση"
  },
  "of": {
    "en": "of",
    "el": "από"
  },
  "back": {
    "en": "Back",
    "el": "Πίσω"
  },
  "next": {
    "en": "Continue",
    "el": "Συνέχεια"
  },
  "finish": {
    "en": "Find my wetsuit",
    "el": "Βρες τη στολή μου"
  },
  "quizNote": {
    "en": "A thoughtful starting point. Final fit and thickness are best confirmed with Meister.",
    "el": "Ένα χρήσιμο σημείο εκκίνησης. Επιβεβαίωσε την τελική εφαρμογή και το πάχος με τη Meister."
  },
  "art": {
    "en": "MADE FOR YOUR BLUE",
    "el": "ΓΙΑ ΤΟ ΔΙΚΟ ΣΟΥ ΜΠΛΕ"
  },
  "learn": {
    "en": "A little wetsuit knowledge",
    "el": "Λίγα λόγια για τις στολές"
  },
  "learnSub": {
    "en": "The details, made simple.",
    "el": "Οι λεπτομέρειες, με απλά λόγια."
  },
  "linedTitle": {
    "en": "What does “lined” mean?",
    "el": "Τι σημαίνει «φόδρα»;"
  },
  "linedText": {
    "en": "A thin fabric layer covers the neoprene. Outside, it adds resistance to everyday handling. Inside, it helps the suit slide on without lubricant. A double-lined suit has fabric on both sides.",
    "el": "Ένα λεπτό ύφασμα καλύπτει το νεοπρέν. Εξωτερικά προσφέρει αντοχή στην καθημερινή χρήση. Εσωτερικά βοηθά τη στολή να φορεθεί χωρίς λιπαντικό. Η φόδρα / φόδρα έχει ύφασμα και στις δύο πλευρές."
  },
  "openTitle": {
    "en": "What is open cell?",
    "el": "Τι σημαίνει «ξυρισμένο»;"
  },
  "openText": {
    "en": "The inner neoprene is left without a fabric lining and sits close to your skin. It needs a suitable wetsuit lubricant for dressing, and careful handling to avoid tears.",
    "el": "Το εσωτερικό νεοπρέν δεν έχει φόδρα και εφαρμόζει κοντά στο δέρμα. Χρειάζεται κατάλληλο λιπαντικό για το φόρεμα και προσεκτικό χειρισμό για να μη σκιστεί."
  },
  "smoothTitle": {
    "en": "Why choose smoothskin?",
    "el": "Γιατί να επιλέξω λείο;"
  },
  "smoothText": {
    "en": "A smooth exterior offers glide through the water. It is more vulnerable to fingernails, rocks and pulling than a fabric exterior. Smoothskin describes the outside; the inside can be lined or open cell.",
    "el": "Η λεία εξωτερική επιφάνεια προσφέρει υδρολίσθηση. Είναι πιο ευαίσθητη σε νύχια, βράχια και τραβήγματα από τη φόδρα. Το «λείο» περιγράφει το εξωτερικό· μέσα μπορεί να έχει φόδρα ή ξυρισμένο."
  },
  "checked": {
    "en": "Shop information checked 26 October 2026",
    "el": "Στοιχεία καταστήματος: 26 Οκτωβρίου 2026"
  },
  "independent": {
    "en": "Independent selection guide · EN / EL",
    "el": "Ανεξάρτητος οδηγός επιλογής · EN / EL"
  },
  "resultEyebrow": {
    "en": "YOUR MEISTER MATCH",
    "el": "Η ΠΡΟΤΑΣΗ MEISTER ΓΙΑ ΣΕΝΑ"
  },
  "resultTitle": {
    "en": "A good place to start.",
    "el": "Μια καλή αρχή για σένα."
  },
  "edit": {
    "en": "Edit answers",
    "el": "Αλλαγή απαντήσεων"
  },
  "best": {
    "en": "RECOMMENDED FOR YOUR ANSWERS",
    "el": "ΠΡΟΤΑΣΗ ΜΕ ΒΑΣΗ ΤΙΣ ΑΠΑΝΤΗΣΕΙΣ"
  },
  "view": {
    "en": "View suit at Meister ↗",
    "el": "Δες τη στολή στη Meister ↗"
  },
  "priceNote": {
    "en": "Listed range · final configuration may cost more",
    "el": "Εύρος τιμής · η τελική διαμόρφωση μπορεί να κοστίζει περισσότερο"
  },
  "thicknessTitle": {
    "en": "Thickness to discuss",
    "el": "Πάχος για συζήτηση"
  },
  "pending": {
    "en": "Confirm the water temperature first",
    "el": "Επιβεβαίωσε πρώτα τη θερμοκρασία"
  },
  "thicknessNote": {
    "en": "An editorial starting point, not a Meister temperature rating. Fit, depth and conditions can change what you need.",
    "el": "Ενδεικτική συμβουλή του οδηγού, όχι θερμική πιστοποίηση Meister. Εφαρμογή, βάθος και συνθήκες επηρεάζουν την επιλογή."
  },
  "adjusted": {
    "en": "We moved the starting point one warmth level up for your long sessions or cold sensitivity.",
    "el": "Αυξήσαμε το ενδεικτικό πάχος κατά ένα επίπεδο για τη μεγάλη διάρκεια ή την ευαισθησία σου στο κρύο."
  },
  "unknown": {
    "en": "We can suggest the construction, but won’t guess the thickness. Ask about the coldest water at your dive site first.",
    "el": "Μπορούμε να προτείνουμε τύπο στολής, αλλά όχι να μαντέψουμε πάχος. Μάθε πρώτα την πιο χαμηλή θερμοκρασία του σημείου κατάδυσης."
  },
  "careTitle": {
    "en": "What living with this suit is like",
    "el": "Η καθημερινότητα με αυτή τη στολή"
  },
  "fitTitle": {
    "en": "Get the fit right",
    "el": "Βρες τη σωστή εφαρμογή"
  },
  "fit": {
    "en": "Meister lists seven ready-made sizes and made-to-measure options for its main range. A suit should sit close without restricting breathing or movement. Confirm measurements with Meister; this quiz does not assign a size.",
    "el": "Η Meister διαθέτει επτά έτοιμα μεγέθη και επιλογή επί μέτρω στη βασική σειρά. Η στολή πρέπει να εφαρμόζει χωρίς να περιορίζει αναπνοή ή κίνηση. Επιβεβαίωσε τις μετρήσεις με τη Meister· ο οδηγός δεν ορίζει μέγεθος."
  },
  "contact": {
    "en": "Talk to Meister ↗",
    "el": "Μίλησε με τη Meister ↗"
  },
  "alternatives": {
    "en": "Also worth considering",
    "el": "Αξίζει επίσης να δεις"
  },
  "noAlt": {
    "en": "Your choices narrow this to one suitable construction in our guide.",
    "el": "Οι επιλογές σου οδηγούν σε μία κατάλληλη κατασκευή στον οδηγό μας."
  },
  "restart": {
    "en": "Start again",
    "el": "Από την αρχή"
  },
  "print": {
    "en": "Save / print results",
    "el": "Αποθήκευση / εκτύπωση"
  },
  "sources": {
    "en": "Sources & how we choose",
    "el": "Πηγές & τρόπος επιλογής"
  },
  "method": {
    "en": "We first filter by stated use, care preference, starting-price budget and available thickness. We then rank the remaining suits by activity and material preference. These are editorial recommendations, not manufacturer-approved matches or test scores. We cover seven diving suits from Meister’s official shop; accessories and triathlon suits are excluded.",
    "el": "Πρώτα φιλτράρουμε με βάση τη χρήση, τη φροντίδα, την αρχική τιμή και το διαθέσιμο πάχος. Μετά ταξινομούμε με βάση τη δραστηριότητα και την προτίμηση υλικού. Οι προτάσεις είναι συντακτικές, όχι εγκεκριμένες από τον κατασκευαστή ή βαθμολογίες δοκιμών. Καλύπτουμε επτά καταδυτικές στολές του επίσημου καταστήματος, χωρίς αξεσουάρ και στολές τριάθλου."
  },
  "thermalSource": {
    "en": "PADI · general wetsuit guidance",
    "el": "PADI · γενικές συμβουλές για στολές"
  },
  "disclosure": {
    "en": "Prices are the shop’s displayed ranges, not quotes for your selected thickness or size. Confirm availability, options and total before ordering. Product photos belong to Meister.",
    "el": "Οι τιμές είναι τα εμφανιζόμενα εύρη του καταστήματος, όχι προσφορές για συγκεκριμένο πάχος ή μέγεθος. Επιβεβαίωσε διαθεσιμότητα, επιλογές και σύνολο πριν την παραγγελία. Οι φωτογραφίες προϊόντων ανήκουν στη Meister."
  },
  "noMatchTitle": {
    "en": "Let’s get a specialist’s view.",
    "el": "Ας το δούμε με έναν ειδικό."
  },
  "noMatch": {
    "en": "No suit in this guide meets all of your choices. We won’t silently change your care needs, budget or thickness to show a match. Review your answers or ask Meister about a suitable configuration.",
    "el": "Καμία στολή του οδηγού δεν καλύπτει όλες τις επιλογές σου. Δεν αλλάζουμε αυτόματα τη φροντίδα, τον προϋπολογισμό ή το πάχος για να εμφανίσουμε πρόταση. Άλλαξε απαντήσεις ή ρώτησε τη Meister για κατάλληλη διαμόρφωση."
  },
  "coldNotice": {
    "en": "Below 15°C, discuss exposure protection with Meister and a local instructor before choosing a wetsuit. We do not give an automatic thickness recommendation for these conditions.",
    "el": "Κάτω από 15°C, συζήτησε τη θερμική προστασία με τη Meister και τοπικό εκπαιδευτή πριν διαλέξεις στολή. Δεν δίνουμε αυτόματη πρόταση πάχους σε αυτές τις συνθήκες."
  },
  "scubaNotice": {
    "en": "For scuba, confirm the suit’s suitability for your planned depth and conditions with your instructor. Neoprene compresses at depth and changes insulation and buoyancy.",
    "el": "Για αυτόνομη κατάδυση, επιβεβαίωσε την καταλληλότητα στο βάθος και τις συνθήκες σου με εκπαιδευτή. Το νεοπρέν συμπιέζεται στο βάθος, αλλάζοντας θερμομόνωση και πλευστότητα."
  },
  "all": {
    "en": "Browse all 7 suits",
    "el": "Δες και τις 7 στολές"
  },
  "hide": {
    "en": "Hide full range",
    "el": "Κλείσιμο συλλογής"
  },
  "allNotice": {
    "en": "Full range · these suits are not all matches for your answers.",
    "el": "Πλήρης συλλογή · δεν ταιριάζουν όλες οι στολές στις απαντήσεις σου."
  },
  "available": {
    "en": "Listed thicknesses",
    "el": "Διαθέσιμα πάχη"
  },
  "budgetCaveat": {
    "en": "Your budget is a starting-price filter. Confirm the cost of the recommended thickness before ordering.",
    "el": "Ο προϋπολογισμός φιλτράρει την αρχική τιμή. Επιβεβαίωσε το κόστος του προτεινόμενου πάχους πριν παραγγείλεις."
  }
}

export const FIN_PRODUCTS: FinModel[] = [
  {
    "id": "evo",
    "name": {
      "en": "Meister Carbon EVO",
      "el": "Λεπίδες Carbon Meister EVO"
    },
    "family": "evo",
    "material": "carbon-fiber",
    "angle": null,
    "long": false,
    "price": [
      360,
      488
    ],
    "stock": "listed",
    "description": {
      "en": "Balanced carbon blade for mixed shallow and deep use, swimming, boat trips and varied spearfishing. Meister describes EVO as its all-round carbon option.",
      "el": "Ισορροπημένη carbon λεπίδα για μικτή χρήση σε ρηχά και βαθιά, κολύμπι, σκάφος και διαφορετικά είδη ψαρέματος. Η Meister περιγράφει το EVO ως ισορροπημένη επιλογή carbon."
    },
    "url": "https://dive-meister.com/shop/pedila/pterygia/%cf%80%cf%84%ce%b5%cf%81%cf%8d%ce%b3%ce%b9%ce%b1-carbon-%cf%85%ce%b1%ce%bb%ce%bf%ce%bd%ce%b7%ce%bc%ce%b1/%cf%80%ce%ad%ce%b4%ce%b9%ce%bb%ce%b1-carbon-meister-evo/",
    "stiffness": [
      "S",
      "MS",
      "M",
      "MH",
      "H"
    ],
    "sizes": null
  },
  {
    "id": "evo-long",
    "name": {
      "en": "Meister Carbon EVO Long",
      "el": "Λεπίδες Carbon Meister EVO Long"
    },
    "family": "evo",
    "material": "carbon-fiber",
    "angle": null,
    "long": true,
    "price": [
      360,
      488
    ],
    "stock": "listed",
    "description": {
      "en": "Long version of EVO; the same mixed-use, shallow/deep, swimming and boat-use positioning.",
      "el": "Μακριά έκδοση EVO· με την ίδια τοποθέτηση για μικτή χρήση, ρηχά/βαθιά, κολύμπι και σκάφος."
    },
    "url": "https://dive-meister.com/shop/pedila/pterygia/%cf%80%cf%84%ce%b5%cf%81%cf%8d%ce%b3%ce%b9%ce%b1-carbon-%cf%85%ce%b1%ce%bb%ce%bf%ce%bd%ce%b7%ce%bc%ce%b1/%cf%80%ce%ad%ce%b4%ce%b9%ce%bb%ce%b1-carbon-meister-evo-long/",
    "stiffness": [
      "S",
      "MS",
      "M",
      "MH",
      "H"
    ],
    "sizes": null
  },
  {
    "id": "f1",
    "name": {
      "en": "Meister Carbon F1",
      "el": "Λεπίδες Carbon Meister F1"
    },
    "family": "f1",
    "material": "carbon-fiber",
    "angle": null,
    "long": false,
    "price": [
      370,
      498
    ],
    "stock": "listed",
    "description": {
      "en": "Progressive multi-layer carbon layup. Meister lists the F1 line for fixed-weight spearfishing and deep freediving.",
      "el": "Προοδευτική διάταξη πολλαπλών στρώσεων ανθρακονημάτων. Η Meister προτείνει τη σειρά F1 για ψάρεμα με σταθερά βάρη και βαθιά ελεύθερη κατάδυση."
    },
    "url": "https://dive-meister.com/shop/pedila/pterygia/%cf%80%cf%84%ce%b5%cf%81%cf%8d%ce%b3%ce%b9%ce%b1-carbon-%cf%85%ce%b1%ce%bb%ce%bf%ce%bd%ce%b7%ce%bc%ce%b1/%cf%80%ce%ad%ce%b4%ce%b9%ce%bb%ce%b1-carbon-meister-f1/",
    "stiffness": [
      "S",
      "MS",
      "M",
      "MH",
      "H"
    ],
    "sizes": null
  },
  {
    "id": "f1-30",
    "name": {
      "en": "Meister Carbon F1 30°",
      "el": "Λεπίδες Carbon Meister F1 30°"
    },
    "family": "f1-30",
    "material": "carbon-fiber",
    "angle": 30,
    "long": false,
    "price": [
      420,
      548
    ],
    "stock": "listed",
    "description": {
      "en": "Progressive multi-layer carbon layup with a listed 30° blade angle. Meister lists it for fixed-weight spearfishing and deep freediving.",
      "el": "Προοδευτική διάταξη πολλαπλών στρώσεων ανθρακονημάτων με δηλωμένη γωνία λεπίδας 30°. Η Meister το προτείνει για ψάρεμα με σταθερά βάρη και βαθιά ελεύθερη κατάδυση."
    },
    "url": "https://dive-meister.com/shop/pedila/pterygia/%cf%80%cf%84%ce%b5%cf%81%cf%8d%ce%b3%ce%b9%ce%b1-carbon-%cf%85%ce%b1%ce%bb%ce%bf%ce%bd%ce%b7%ce%bc%ce%b1/%cf%80%ce%ad%ce%b4%ce%b9%ce%bb%ce%bf-carbon-meister-f1-30-2/",
    "stiffness": [
      "S",
      "MS",
      "M",
      "MH",
      "H"
    ],
    "sizes": null
  },
  {
    "id": "f1-30-color-skin",
    "name": {
      "en": "Meister Carbon F1 30° Color Skin",
      "el": "Λεπίδες Carbon Meister F1 30° Color Skin"
    },
    "family": "f1-30",
    "material": "carbon-fiber",
    "angle": 30,
    "long": false,
    "price": [
      480,
      608
    ],
    "stock": "out",
    "description": {
      "en": "F1 30° carbon construction with a decorative Color Skin finish. Check current colour and order availability with Meister.",
      "el": "Κατασκευή carbon F1 30° με διακοσμητική εμφάνιση Color Skin. Επιβεβαίωσε χρώματα και δυνατότητα παραγγελίας με τη Meister."
    },
    "url": "https://dive-meister.com/shop/pedila/pterygia/%cf%80%cf%84%ce%b5%cf%81%cf%8d%ce%b3%ce%b9%ce%b1-carbon-%cf%85%ce%b1%ce%bb%ce%bf%ce%bd%ce%b7%ce%bc%ce%b1/%cf%80%ce%ad%ce%b4%ce%b9%ce%bb%ce%b1-carbon-meister-f1-30-color-skin/",
    "stiffness": [
      "S",
      "MS",
      "M",
      "MH",
      "H"
    ],
    "sizes": null
  },
  {
    "id": "f1-30-long",
    "name": {
      "en": "Meister Carbon F1 30° Long",
      "el": "Λεπίδες Carbon Meister F1 30° Long"
    },
    "family": "f1-30",
    "material": "carbon-fiber",
    "angle": 30,
    "long": true,
    "price": [
      450,
      578
    ],
    "stock": "backorder",
    "description": {
      "en": "Long version of the F1 30° carbon blade; listed for fixed-weight spearfishing and deep freediving.",
      "el": "Μακριά έκδοση της carbon λεπίδας F1 30°· προτείνεται για ψάρεμα με σταθερά βάρη και βαθιά ελεύθερη κατάδυση."
    },
    "url": "https://dive-meister.com/shop/pedila/pterygia/%cf%80%cf%84%ce%b5%cf%81%cf%8d%ce%b3%ce%b9%ce%b1-carbon-%cf%85%ce%b1%ce%bb%ce%bf%ce%bd%ce%b7%ce%bc%ce%b1/%cf%80%ce%ad%ce%b4%ce%b9%ce%bb%ce%bf-carbon-meister-f1-30-long/",
    "stiffness": [
      "S",
      "MS",
      "M",
      "MH",
      "H"
    ],
    "sizes": null
  },
  {
    "id": "x",
    "name": {
      "en": "Meister Carbon X",
      "el": "Λεπίδες Carbon Meister X"
    },
    "family": "x",
    "material": "carbon-fiber",
    "angle": null,
    "long": false,
    "price": [
      360,
      488
    ],
    "stock": "listed",
    "description": {
      "en": "Progressive multi-layer carbon layup. Meister markets the X line as a more relaxed-feeling performance fin; its page also lists deep freediving and fixed-weight fishing.",
      "el": "Προοδευτική διάταξη πολλαπλών στρώσεων ανθρακονημάτων. Η Meister παρουσιάζει τη σειρά X ως πιο ξεκούραστο πέδιλο επιδόσεων· η σελίδα αναφέρει επίσης βαθιά ελεύθερη κατάδυση και ψάρεμα με σταθερά βάρη."
    },
    "url": "https://dive-meister.com/shop/pedila/pterygia/%cf%80%cf%84%ce%b5%cf%81%cf%8d%ce%b3%ce%b9%ce%b1-carbon-%cf%85%ce%b1%ce%bb%ce%bf%ce%bd%ce%b7%ce%bc%ce%b1/%cf%80%ce%ad%ce%b4%ce%b9%ce%bb%ce%b1-carbon-meister-x/",
    "stiffness": [
      "S",
      "MS",
      "M",
      "MH",
      "H"
    ],
    "sizes": null
  },
  {
    "id": "x-long",
    "name": {
      "en": "Meister Carbon X Long",
      "el": "Λεπίδες Carbon Meister X Long"
    },
    "family": "x",
    "material": "carbon-fiber",
    "angle": null,
    "long": true,
    "price": [
      390,
      518
    ],
    "stock": "listed",
    "description": {
      "en": "Long version of the X carbon blade, carrying the line’s relaxed-feeling performance positioning.",
      "el": "Μακριά έκδοση της carbon λεπίδας X, με την πιο ξεκούραστη αίσθηση επιδόσεων της σειράς."
    },
    "url": "https://dive-meister.com/shop/pedila/pterygia/%cf%80%cf%84%ce%b5%cf%81%cf%8d%ce%b3%ce%b9%ce%b1-carbon-%cf%85%ce%b1%ce%bb%ce%bf%ce%bd%ce%b7%ce%bc%ce%b1/%cf%80%ce%ad%ce%b4%ce%b9%ce%bb%ce%b1-carbon-meister-x-long/",
    "stiffness": [
      "S",
      "MS",
      "M",
      "MH",
      "H"
    ],
    "sizes": null
  },
  {
    "id": "plastic-long",
    "name": {
      "en": "Meister Plastic Long Fins",
      "el": "Πέδιλα Meister Πλαστικά Μακρυά"
    },
    "family": "plastic",
    "material": "plastic",
    "angle": null,
    "long": true,
    "price": [
      80,
      80
    ],
    "stock": "listed",
    "description": {
      "en": "Long black plastic fin. The shop currently lists EU sizes 39–40, 41–42, 43–44 and 45–46.",
      "el": "Μακρύ μαύρο πλαστικό πέδιλο. Το κατάστημα εμφανίζει αυτή τη στιγμή μεγέθη EU 39–40, 41–42, 43–44 και 45–46."
    },
    "url": "https://dive-meister.com/shop/pedila/pterygia/%cf%80%cf%84%ce%b5%cf%81%cf%8d%ce%b3%ce%b9%ce%b1-carbon-%cf%85%ce%b1%ce%bb%ce%bf%ce%bd%ce%b7%ce%bc%ce%b1/%cf%80%ce%ad%ce%b4%ce%b9%ce%bb%ce%b1-meister-%cf%80%ce%bb%ce%b1%cf%83%cf%84%ce%b9%ce%ba%ce%ac-%ce%bc%ce%b1%ce%ba%cf%81%cf%85%ce%ac/",
    "stiffness": [],
    "sizes": [
      "39-40",
      "41-42",
      "43-44",
      "45-46"
    ]
  }
]

export const FIN_QUESTIONS: Question[] = [
  {
    "id": "use",
    "short": {
      "en": "Your diving",
      "el": "Η κατάδυσή σου"
    },
    "title": {
      "en": "What kind of diving do you do most?",
      "el": "Τι είδους καταδύσεις κάνεις συχνότερα;"
    },
    "hint": {
      "en": "Choose your main use. These are freediving and spearfishing fins.",
      "el": "Διάλεξε την κύρια χρήση. Ο οδηγός αφορά πέδιλα ελεύθερης κατάδυσης και ψαροτούφεκου."
    },
    "options": [
      [
        "mixed",
        "wave",
        {
          "en": "A bit of everything",
          "el": "Λίγο απ’ όλα"
        },
        {
          "en": "Shallow and deeper dives, swimming and spearfishing.",
          "el": "Ρηχά και βαθύτερα, κολύμπι και ψαροτούφεκο."
        }
      ],
      [
        "depth",
        "wave",
        {
          "en": "Depth freediving",
          "el": "Ελεύθερη κατάδυση βάθους"
        },
        {
          "en": "Line diving and a consistent technique.",
          "el": "Κατάδυση σε σχοινί με σταθερή τεχνική."
        }
      ],
      [
        "weighted",
        "fish",
        {
          "en": "Spearfishing at depth",
          "el": "Ψαροτούφεκο στο βάθος"
        },
        {
          "en": "Regular deeper spearfishing sessions.",
          "el": "Συχνές εξορμήσεις σε μεγαλύτερα βάθη."
        }
      ],
      [
        "easy",
        "feather",
        {
          "en": "Relaxed sea sessions",
          "el": "Ξεκούραστες εξορμήσεις"
        },
        {
          "en": "Comfort and a less demanding kick come first.",
          "el": "Προέχει η άνεση και το πιο ήπιο λάκτισμα."
        }
      ],
      [
        "pool",
        "pool",
        {
          "en": "Pool & surface training",
          "el": "Πισίνα & προπόνηση επιφανείας"
        },
        {
          "en": "Show a starting point to discuss with my instructor.",
          "el": "Ένα σημείο εκκίνησης για συζήτηση με εκπαιδευτή."
        }
      ]
    ]
  },
  {
    "id": "depth",
    "short": {
      "en": "Usual depth",
      "el": "Συνηθισμένο βάθος"
    },
    "title": {
      "en": "How deep are your usual dives?",
      "el": "Σε τι βάθος βουτάς συνήθως;"
    },
    "hint": {
      "en": "Use your normal depth, not a personal best. For pool or surface sessions, choose mostly shallow.",
      "el": "Σκέψου το συνηθισμένο σου βάθος, όχι το ρεκόρ σου. Για πισίνα ή επιφάνεια διάλεξε κυρίως ρηχά."
    },
    "options": [
      [
        "shallow",
        "wave",
        {
          "en": "Mostly shallow",
          "el": "Κυρίως ρηχά"
        },
        {
          "en": "Up to about 10 m / 33 ft.",
          "el": "Έως περίπου 10 μ."
        }
      ],
      [
        "mid",
        "wave",
        {
          "en": "Around 10–20 m",
          "el": "Περίπου 10–20 μ."
        },
        {
          "en": "A mix of shallower and moderate dives.",
          "el": "Συνδυασμός ρηχότερων και μεσαίων βουτιών."
        }
      ],
      [
        "deep",
        "wave",
        {
          "en": "Beyond 20 m",
          "el": "Πάνω από 20 μ."
        },
        {
          "en": "Depth is a regular part of my diving.",
          "el": "Το βάθος είναι τακτικό μέρος των καταδύσεών μου."
        }
      ]
    ]
  },
  {
    "id": "experience",
    "short": {
      "en": "Your experience",
      "el": "Η εμπειρία σου"
    },
    "title": {
      "en": "Where are you in your freediving journey?",
      "el": "Σε ποιο στάδιο είναι η ελεύθερη κατάδυσή σου;"
    },
    "hint": {
      "en": "This helps with a blade-stiffness starting point. Experience alone does not decide the model.",
      "el": "Βοηθά σε ένα αρχικό εύρος σκληρότητας. Η εμπειρία από μόνη της δεν καθορίζει το μοντέλο."
    },
    "options": [
      [
        "new",
        "feather",
        {
          "en": "New or rebuilding technique",
          "el": "Αρχάριος ή ξαναχτίζω τεχνική"
        },
        {
          "en": "I want a forgiving starting point.",
          "el": "Θέλω μια πιο συγχωρητική αρχική επιλογή."
        }
      ],
      [
        "regular",
        "wave",
        {
          "en": "Regular recreational diver",
          "el": "Τακτικός ερασιτέχνης"
        },
        {
          "en": "I dive often and know what feels comfortable.",
          "el": "Βουτάω συχνά και ξέρω τι μου είναι άνετο."
        }
      ],
      [
        "advanced",
        "spark",
        {
          "en": "Experienced depth diver or spearfisher",
          "el": "Έμπειρος δύτης βάθους ή ψαροκυνηγός"
        },
        {
          "en": "I have a consistent kick and a clear performance preference.",
          "el": "Έχω σταθερό λάκτισμα και ξεκάθαρη προτίμηση στην απόδοση."
        }
      ]
    ]
  },
  {
    "id": "power",
    "short": {
      "en": "Kick preference",
      "el": "Προτίμηση λακτίσματος"
    },
    "title": {
      "en": "How much leg drive do you want to use?",
      "el": "Πόση δύναμη θέλεις να βάζεις στο λάκτισμα;"
    },
    "hint": {
      "en": "Think about leg strength, body build, extra gear, and how your legs feel after a long session.",
      "el": "Σκέψου τη δύναμη των ποδιών, τη σωματοδομή, τον επιπλέον εξοπλισμό και πώς νιώθουν τα πόδια μετά από πολλή ώρα."
    },
    "options": [
      [
        "light",
        "feather",
        {
          "en": "Low effort",
          "el": "Μικρή προσπάθεια"
        },
        {
          "en": "I am lighter / less powerful, or want the easiest kick.",
          "el": "Έχω πιο ελαφριά σωματοδομή ή λιγότερη δύναμη, ή θέλω το πιο ξεκούραστο λάκτισμα."
        }
      ],
      [
        "average",
        "wave",
        {
          "en": "Balanced",
          "el": "Ισορροπημένη επιλογή"
        },
        {
          "en": "A middle-ground blade feels right.",
          "el": "Μου ταιριάζει μια μέση επιλογή λεπίδας."
        }
      ],
      [
        "strong",
        "shield",
        {
          "en": "Strong, loaded kick",
          "el": "Δυνατό λάκτισμα με φορτίο"
        },
        {
          "en": "I have strong legs, carry gear, or want a firmer push.",
          "el": "Έχω δυνατά πόδια, κουβαλώ εξοπλισμό ή θέλω πιο σκληρή ώθηση."
        }
      ]
    ]
  },
  {
    "id": "socks",
    "short": {
      "en": "Socks & fit",
      "el": "Κάλτσες & εφαρμογή"
    },
    "title": {
      "en": "What do you wear inside the foot pocket?",
      "el": "Τι φοράς μέσα στο πέλμα;"
    },
    "hint": {
      "en": "Try the foot pocket with the socks you actually wear. Sock thickness changes fit, not the recommended blade model.",
      "el": "Δοκίμασε το πέλμα με τις κάλτσες που φοράς. Το πάχος της κάλτσας επηρεάζει την εφαρμογή, όχι το μοντέλο λεπίδας."
    },
    "options": [
      [
        "bare",
        "sun",
        {
          "en": "Barefoot or very warm water",
          "el": "Ξυπόλυτος ή πολύ ζεστά νερά"
        },
        {
          "en": "No sock or a very thin sock.",
          "el": "Χωρίς κάλτσα ή με πολύ λεπτή κάλτσα."
        }
      ],
      [
        "thin",
        "wave",
        {
          "en": "Thin neoprene socks",
          "el": "Λεπτές νεοπρενικές κάλτσες"
        },
        {
          "en": "A light sock for comfort or mild chill.",
          "el": "Λεπτή κάλτσα για άνεση ή ήπιο κρύο."
        }
      ],
      [
        "thick",
        "snow",
        {
          "en": "Thicker socks / colder water",
          "el": "Πιο χοντρές κάλτσες / κρύα νερά"
        },
        {
          "en": "I need more insulation.",
          "el": "Χρειάζομαι περισσότερη θερμομόνωση."
        }
      ]
    ]
  },
  {
    "id": "travel",
    "short": {
      "en": "Travel & length",
      "el": "Μεταφορά & μήκος"
    },
    "title": {
      "en": "What fits your travel and fin-bag setup?",
      "el": "Τι ταιριάζει στη μεταφορά και στη θήκη σου;"
    },
    "hint": {
      "en": "Meister labels some models “Long” but gives no exact blade lengths. We use this as a preference, never a bag-fit guarantee.",
      "el": "Η Meister ονομάζει ορισμένα μοντέλα «Long», χωρίς ακριβές μήκος λεπίδας. Είναι προτίμηση επιλογής, όχι εγγύηση ότι χωρούν στη θήκη."
    },
    "options": [
      [
        "standard",
        "shield",
        {
          "en": "Prefer a standard-name model",
          "el": "Προτιμώ μοντέλο χωρίς «Long»"
        },
        {
          "en": "For flights or less bag space; I’ll check dimensions.",
          "el": "Για ταξίδια ή μικρότερη θήκη· θα ελέγξω τις διαστάσεις."
        }
      ],
      [
        "long",
        "wave",
        {
          "en": "Prefer the Long version",
          "el": "Προτιμώ τη μακριά έκδοση"
        },
        {
          "en": "I’ll confirm the actual length fits my bag.",
          "el": "Θα επιβεβαιώσω ότι το πραγματικό μήκος χωρά στη θήκη."
        }
      ],
      [
        "local",
        "help",
        {
          "en": "Mostly local; no preference",
          "el": "Κυρίως τοπικά· χωρίς προτίμηση"
        },
        {
          "en": "Transport size is not a deciding factor.",
          "el": "Το μέγεθος μεταφοράς δεν είναι καθοριστικό."
        }
      ]
    ]
  },
  {
    "id": "budget",
    "short": {
      "en": "Your budget",
      "el": "Ο προϋπολογισμός σου"
    },
    "title": {
      "en": "What starting price suits your budget?",
      "el": "Ποια αρχική τιμή ταιριάζει στον προϋπολογισμό σου;"
    },
    "hint": {
      "en": "Carbon listings offer blades without foot pockets too. We filter by starting price; the complete setup can cost more.",
      "el": "Τα carbon προσφέρονται και χωρίς πέλματα. Φιλτράρουμε με την αρχική τιμή· το πλήρες σετ μπορεί να κοστίζει περισσότερο."
    },
    "options": [
      [
        "150",
        "coin",
        {
          "en": "Up to €150 to start",
          "el": "Έως €150 αρχική τιμή"
        },
        {
          "en": "The accessible plastic-fin option.",
          "el": "Η οικονομική επιλογή πλαστικών πεδίλων."
        }
      ],
      [
        "400",
        "coin",
        {
          "en": "Up to €400 to start",
          "el": "Έως €400 αρχική τιμή"
        },
        {
          "en": "Include the lower starting-price carbon models.",
          "el": "Μαζί με τα carbon χαμηλότερης αρχικής τιμής."
        }
      ],
      [
        "500",
        "coin",
        {
          "en": "Up to €500 to start",
          "el": "Έως €500 αρχική τιμή"
        },
        {
          "en": "Consider the F1 30° range as well.",
          "el": "Εξέτασε και τη σειρά F1 30°."
        }
      ],
      [
        "any",
        "spark",
        {
          "en": "Flexible — focus on suitability",
          "el": "Ευέλικτος — προέχει η καταλληλότητα"
        },
        {
          "en": "Compare the range without a starting-price cap.",
          "el": "Σύγκρινε τη σειρά χωρίς όριο αρχικής τιμής."
        }
      ]
    ]
  }
]

export const FIN_UI: Record<string, Bilingual> = {
  "guide": {
    "en": "FIN FINDER",
    "el": "ΕΠΙΛΟΓΕΑΣ ΠΕΔΙΛΩΝ"
  },
  "hero": {
    "en": "Your kick.<br><em>Your kind of fins.</em>",
    "el": "Το λάκτισμά σου.<br><em>Τα δικά σου πέδιλα.</em>"
  },
  "intro": {
    "en": "An easy kick starts with the right choice. Tell us how you dive and we’ll help you navigate Meister’s fin families, stiffness options, and fit.",
    "el": "Το άνετο λάκτισμα ξεκινά από τη σωστή επιλογή. Πες μας πώς βουτάς και θα σε βοηθήσουμε με τις σειρές πεδίλων Meister, τη σκληρότητα και την εφαρμογή."
  },
  "questions": {
    "en": "7 simple questions",
    "el": "7 απλές ερωτήσεις"
  },
  "finish": {
    "en": "Find my fins",
    "el": "Βρες τα πέδιλά μου"
  },
  "railNote": {
    "en": "Start with your diving, not a carbon specification. We’ll explain the useful differences.",
    "el": "Ξεκίνα από τη χρήση σου, όχι από τεχνικές προδιαγραφές. Θα εξηγήσουμε τις χρήσιμες διαφορές."
  },
  "quizNote": {
    "en": "A buying guide, not a fit guarantee. Confirm pocket fit, stiffness and the complete setup price with Meister.",
    "el": "Οδηγός αγοράς, όχι εγγύηση εφαρμογής. Επιβεβαίωσε πέλμα, σκληρότητα και κόστος πλήρους σετ με τη Meister."
  },
  "view": {
    "en": "View fins at Meister ↗",
    "el": "Δες τα πέδιλα στη Meister ↗"
  },
  "learn": {
    "en": "A little fin knowledge",
    "el": "Λίγα λόγια για τα πέδιλα"
  },
  "linedTitle": {
    "en": "Carbon or plastic?",
    "el": "Carbon ή πλαστικό;"
  },
  "linedText": {
    "en": "Plastic is the lower-cost, durable starting point. Carbon gives a light, responsive blade but costs more and needs protection from impacts. Good technique and a comfortable pocket matter at every price.",
    "el": "Το πλαστικό είναι οικονομικό και ανθεκτικό για αρχή. Το carbon δίνει ελαφριά λεπίδα με επαναφορά, αλλά κοστίζει περισσότερο και θέλει προστασία από χτυπήματα. Η τεχνική και το άνετο πέλμα μετρούν σε κάθε τιμή."
  },
  "openTitle": {
    "en": "Does stiffer mean better?",
    "el": "Πιο σκληρό σημαίνει καλύτερο;"
  },
  "openText": {
    "en": "Only if the blade suits your technique and leg drive. A blade that is too demanding can tire you. Start softer while learning; discuss the final stiffness with Meister. Sock thickness does not choose blade stiffness.",
    "el": "Μόνο αν ταιριάζει στην τεχνική και τη δύναμή σου. Μια απαιτητική λεπίδα μπορεί να σε κουράσει. Ξεκίνα πιο μαλακά όσο μαθαίνεις και συζήτησε την τελική σκληρότητα με τη Meister. Το πάχος κάλτσας δεν επιλέγει σκληρότητα λεπίδας."
  },
  "smoothTitle": {
    "en": "What is a foot pocket?",
    "el": "Τι είναι το πέλμα;"
  },
  "smoothText": {
    "en": "The rubber part holding your foot transfers your kick to the blade. It should feel secure without pressure points or numbness. Try it with your actual socks; size numbers and compatible pockets vary by model.",
    "el": "Το ελαστικό μέρος που κρατά το πόδι μεταφέρει το λάκτισμα στη λεπίδα. Πρέπει να εφαρμόζει σταθερά χωρίς πίεση ή μούδιασμα. Δοκίμασέ το με τις κάλτσες σου· μεγέθη και συμβατά πέλματα διαφέρουν ανά μοντέλο."
  },
  "priceNote": {
    "en": "Listed range · pocket choice can change the total",
    "el": "Εύρος τιμής · το πέλμα μπορεί να αλλάξει το σύνολο"
  },
  "all": {
    "en": "Browse all 9 fin models",
    "el": "Δες και τα 9 μοντέλα πεδίλων"
  },
  "allNotice": {
    "en": "Full fin range · includes models outside your budget and unavailable listings.",
    "el": "Πλήρης σειρά · περιλαμβάνει μοντέλα εκτός προϋπολογισμού και μη διαθέσιμες καταχωρίσεις."
  },
  "noAlt": {
    "en": "Your starting-price limit leaves one model in this guide.",
    "el": "Το όριο αρχικής τιμής αφήνει ένα μοντέλο στον οδηγό."
  },
  "disclosure": {
    "en": "Prices and stock are snapshots checked 26 October 2026. Carbon pages include blade-only options; confirm the pocket, complete setup price, compatibility and delivery before ordering. Product photos belong to Meister.",
    "el": "Τιμές και διαθεσιμότητα ελέγχθηκαν στις 26 Οκτωβρίου 2026. Τα carbon προσφέρονται και χωρίς πέλματα· επιβεβαίωσε πέλμα, κόστος πλήρους σετ, συμβατότητα και παράδοση πριν παραγγείλεις. Οι φωτογραφίες ανήκουν στη Meister."
  },
  "noMatch": {
    "en": "No currently orderable model in this guide meets your starting-price limit. Edit your budget or ask Meister for a suitable setup.",
    "el": "Κανένα μοντέλο με δυνατότητα παραγγελίας δεν καλύπτει το όριο αρχικής τιμής σου. Άλλαξε προϋπολογισμό ή ρώτησε τη Meister για κατάλληλο σετ."
  }
}

export const FIN_REASONS: Record<string, Bilingual> = {
  "mixed": {
    "en": "Meister describes EVO for mixed shallow/deep diving, swimming and varied spearfishing.",
    "el": "Η Meister περιγράφει το EVO για μικτή χρήση σε ρηχά/βαθιά, κολύμπι και διαφορετικά είδη ψαρέματος."
  },
  "depth": {
    "en": "Meister positions the F1 family for deep freediving and fixed-weight spearfishing.",
    "el": "Η Meister τοποθετεί τη σειρά F1 για βαθιά ελεύθερη κατάδυση και ψάρεμα με σταθερά βάρη."
  },
  "spear": {
    "en": "The F1 30° combines the maker’s spearfishing positioning with its stated 30° blade angle.",
    "el": "Το F1 30° συνδυάζει τη χρήση για ψαροτούφεκο που αναφέρει ο κατασκευαστής με δηλωμένη γωνία 30°."
  },
  "relaxed": {
    "en": "Meister describes the X family as its more relaxed-feeling performance option.",
    "el": "Η Meister περιγράφει τη σειρά X ως πιο ξεκούραστη επιλογή επιδόσεων."
  },
  "pool": {
    "en": "EVO/X are an editorial starting point for training; Meister does not publish a pool-specific rating.",
    "el": "Τα EVO/X είναι ενδεικτική αρχή για προπόνηση· η Meister δεν δημοσιεύει ειδική ένδειξη χρήσης πισίνας."
  },
  "drive": {
    "en": "Your preference for a stronger kick gives the F1 family a small ranking advantage.",
    "el": "Η προτίμησή σου για δυνατότερο λάκτισμα δίνει μικρό προβάδισμα στη σειρά F1."
  },
  "standard": {
    "en": "You prefer a model without “Long” in its name. Actual bag fit still needs checking.",
    "el": "Προτιμάς μοντέλο χωρίς «Long» στην ονομασία. Η εφαρμογή στη θήκη χρειάζεται έλεγχο."
  },
  "long": {
    "en": "This is a Long version, matching your length preference. Confirm the dimensions before ordering.",
    "el": "Είναι μακριά έκδοση, όπως προτιμάς. Επιβεβαίωσε διαστάσεις πριν παραγγείλεις."
  },
  "budget": {
    "en": "The plastic model is the only current listing under your €150 starting-price limit.",
    "el": "Το πλαστικό είναι το μόνο τρέχον μοντέλο κάτω από το όριο αρχικής τιμής των €150."
  }
}

export const EXTRA: Record<string, Bilingual> = {
  "GEAR FINDER": {
    "en": "GEAR FINDER",
    "el": "ΟΔΗΓΟΣ ΕΞΟΠΛΙΣΜΟΥ"
  },
  "Choose a finder": {
    "en": "Choose a finder",
    "el": "Επίλεξε οδηγό"
  },
  "WHAT ARE WE FINDING?": {
    "en": "WHAT ARE WE FINDING?",
    "el": "ΤΙ ΘΕΛΕΙΣ ΝΑ ΒΡΕΙΣ;"
  },
  "Wetsuits": {
    "en": "Wetsuits",
    "el": "Στολές"
  },
  "Warmth & fit": {
    "en": "Warmth & fit",
    "el": "Ζεστασιά & εφαρμογή"
  },
  "Fins": {
    "en": "Fins",
    "el": "Πέδιλα"
  },
  "Kick & comfort": {
    "en": "Kick & comfort",
    "el": "Λάκτισμα & άνεση"
  },
  "A fabric interior meets your preference for dressing without lubricant.": {
    "en": "A fabric interior meets your preference for dressing without lubricant.",
    "el": "Η εσωτερική φόδρα καλύπτει την προτίμησή σου για φόρεμα χωρίς λιπαντικό."
  },
  "The fabric exterior matches your preference for everyday durability.": {
    "en": "The fabric exterior matches your preference for everyday durability.",
    "el": "Η εξωτερική φόδρα ταιριάζει στην προτίμησή σου για καθημερινή αντοχή."
  },
  "The smooth exterior matches your preference for glide.": {
    "en": "The smooth exterior matches your preference for glide.",
    "el": "Το λείο εξωτερικό ταιριάζει στην προτίμησή σου για υδρολίσθηση."
  },
  "This choice needs lubricant inside; choose “Easy to put on” if you prefer to avoid that.": {
    "en": "This choice needs lubricant inside; choose “Easy to put on” if you prefer to avoid that.",
    "el": "Αυτή η επιλογή χρειάζεται λιπαντικό μέσα· διάλεξε «Εύκολο φόρεμα» αν θέλεις να το αποφύγεις."
  },
  "Temperature bands are our conservative guide: 24°C+ → 3–3.5mm; 19–23°C → 5–5.5mm; 15–18°C → 7–7.5mm. Long sessions or feeling cold moves up one level, once, with 8–9mm as the upper discussion range. These are not validated Meister thermal ratings.": {
    "en": "Temperature bands are our conservative guide: 24°C+ → 3–3.5mm; 19–23°C → 5–5.5mm; 15–18°C → 7–7.5mm. Long sessions or feeling cold moves up one level, once, with 8–9mm as the upper discussion range. These are not validated Meister thermal ratings.",
    "el": "Ενδεικτικές, συντηρητικές ζώνες του οδηγού: 24°C+ → 3–3,5mm· 19–23°C → 5–5,5mm· 15–18°C → 7–7,5mm. Η μεγάλη διάρκεια ή η ευαισθησία στο κρύο αυξάνει ένα επίπεδο, μία φορά, με ανώτερο εύρος συζήτησης 8–9mm. Δεν αποτελούν επικυρωμένες θερμικές προδιαγραφές Meister."
  },
  "PADI · choosing a freediving wetsuit": {
    "en": "PADI · choosing a freediving wetsuit",
    "el": "PADI · επιλογή στολής ελεύθερης κατάδυσης"
  },
  "Your scuba setup": {
    "en": "Your scuba setup",
    "el": "Η διαμόρφωση για αυτόνομη"
  },
  "This Fire Camo edition lists S, M, L, XL and XXL. Confirm measurements and availability with Meister. The quiz does not assign a size.": {
    "en": "This Fire Camo edition lists S, M, L, XL and XXL. Confirm measurements and availability with Meister. The quiz does not assign a size.",
    "el": "Η έκδοση Fire Camo αναφέρει S, M, L, XL και XXL. Επιβεβαίωσε μετρήσεις και διαθεσιμότητα με τη Meister. Ο οδηγός δεν ορίζει μέγεθος."
  },
  "Meister · Find your fins": {
    "en": "Meister · Find your fins",
    "el": "Meister · Βρες τα πέδιλά σου"
  },
  "Meister · Find your wetsuit": {
    "en": "Meister · Find your wetsuit",
    "el": "Meister · Βρες τη στολή σου"
  },
  "FIN FINDER": {
    "en": "FIN FINDER",
    "el": "ΕΠΙΛΟΓΕΑΣ ΠΕΔΙΛΩΝ"
  },
  "Your kick.<br><em>Your kind of fins.</em>": {
    "en": "Your kick.<br><em>Your kind of fins.</em>",
    "el": "Το λάκτισμά σου.<br><em>Τα δικά σου πέδιλα.</em>"
  },
  "An easy kick starts with the right choice. Tell us how you dive and we’ll help you navigate Meister’s fin families, stiffness options, and fit.": {
    "en": "An easy kick starts with the right choice. Tell us how you dive and we’ll help you navigate Meister’s fin families, stiffness options, and fit.",
    "el": "Το άνετο λάκτισμα ξεκινά από τη σωστή επιλογή. Πες μας πώς βουτάς και θα σε βοηθήσουμε με τις σειρές πεδίλων Meister, τη σκληρότητα και την εφαρμογή."
  },
  "7 simple questions": {
    "en": "7 simple questions",
    "el": "7 απλές ερωτήσεις"
  },
  "Find my fins": {
    "en": "Find my fins",
    "el": "Βρες τα πέδιλά μου"
  },
  "Start with your diving, not a carbon specification. We’ll explain the useful differences.": {
    "en": "Start with your diving, not a carbon specification. We’ll explain the useful differences.",
    "el": "Ξεκίνα από τη χρήση σου, όχι από τεχνικές προδιαγραφές. Θα εξηγήσουμε τις χρήσιμες διαφορές."
  },
  "A buying guide, not a fit guarantee. Confirm pocket fit, stiffness and the complete setup price with Meister.": {
    "en": "A buying guide, not a fit guarantee. Confirm pocket fit, stiffness and the complete setup price with Meister.",
    "el": "Οδηγός αγοράς, όχι εγγύηση εφαρμογής. Επιβεβαίωσε πέλμα, σκληρότητα και κόστος πλήρους σετ με τη Meister."
  },
  "View fins at Meister ↗": {
    "en": "View fins at Meister ↗",
    "el": "Δες τα πέδιλα στη Meister ↗"
  },
  "A little fin knowledge": {
    "en": "A little fin knowledge",
    "el": "Λίγα λόγια για τα πέδιλα"
  },
  "Carbon or plastic?": {
    "en": "Carbon or plastic?",
    "el": "Carbon ή πλαστικό;"
  },
  "Plastic is the lower-cost, durable starting point. Carbon gives a light, responsive blade but costs more and needs protection from impacts. Good technique and a comfortable pocket matter at every price.": {
    "en": "Plastic is the lower-cost, durable starting point. Carbon gives a light, responsive blade but costs more and needs protection from impacts. Good technique and a comfortable pocket matter at every price.",
    "el": "Το πλαστικό είναι οικονομικό και ανθεκτικό για αρχή. Το carbon δίνει ελαφριά λεπίδα με επαναφορά, αλλά κοστίζει περισσότερο και θέλει προστασία από χτυπήματα. Η τεχνική και το άνετο πέλμα μετρούν σε κάθε τιμή."
  },
  "Does stiffer mean better?": {
    "en": "Does stiffer mean better?",
    "el": "Πιο σκληρό σημαίνει καλύτερο;"
  },
  "Only if the blade suits your technique and leg drive. A blade that is too demanding can tire you. Start softer while learning; discuss the final stiffness with Meister. Sock thickness does not choose blade stiffness.": {
    "en": "Only if the blade suits your technique and leg drive. A blade that is too demanding can tire you. Start softer while learning; discuss the final stiffness with Meister. Sock thickness does not choose blade stiffness.",
    "el": "Μόνο αν ταιριάζει στην τεχνική και τη δύναμή σου. Μια απαιτητική λεπίδα μπορεί να σε κουράσει. Ξεκίνα πιο μαλακά όσο μαθαίνεις και συζήτησε την τελική σκληρότητα με τη Meister. Το πάχος κάλτσας δεν επιλέγει σκληρότητα λεπίδας."
  },
  "What is a foot pocket?": {
    "en": "What is a foot pocket?",
    "el": "Τι είναι το πέλμα;"
  },
  "The rubber part holding your foot transfers your kick to the blade. It should feel secure without pressure points or numbness. Try it with your actual socks; size numbers and compatible pockets vary by model.": {
    "en": "The rubber part holding your foot transfers your kick to the blade. It should feel secure without pressure points or numbness. Try it with your actual socks; size numbers and compatible pockets vary by model.",
    "el": "Το ελαστικό μέρος που κρατά το πόδι μεταφέρει το λάκτισμα στη λεπίδα. Πρέπει να εφαρμόζει σταθερά χωρίς πίεση ή μούδιασμα. Δοκίμασέ το με τις κάλτσες σου· μεγέθη και συμβατά πέλματα διαφέρουν ανά μοντέλο."
  },
  "Listed range · pocket choice can change the total": {
    "en": "Listed range · pocket choice can change the total",
    "el": "Εύρος τιμής · το πέλμα μπορεί να αλλάξει το σύνολο"
  },
  "Browse all 9 fin models": {
    "en": "Browse all 9 fin models",
    "el": "Δες και τα 9 μοντέλα πεδίλων"
  },
  "Full fin range · includes models outside your budget and unavailable listings.": {
    "en": "Full fin range · includes models outside your budget and unavailable listings.",
    "el": "Πλήρης σειρά · περιλαμβάνει μοντέλα εκτός προϋπολογισμού και μη διαθέσιμες καταχωρίσεις."
  },
  "Your starting-price limit leaves one model in this guide.": {
    "en": "Your starting-price limit leaves one model in this guide.",
    "el": "Το όριο αρχικής τιμής αφήνει ένα μοντέλο στον οδηγό."
  },
  "Prices and stock are snapshots checked 26 October 2026. Carbon pages include blade-only options; confirm the pocket, complete setup price, compatibility and delivery before ordering. Product photos belong to Meister.": {
    "en": "Prices and stock are snapshots checked 26 October 2026. Carbon pages include blade-only options; confirm the pocket, complete setup price, compatibility and delivery before ordering. Product photos belong to Meister.",
    "el": "Τιμές και διαθεσιμότητα ελέγχθηκαν στις 26 Οκτωβρίου 2026. Τα carbon προσφέρονται και χωρίς πέλματα· επιβεβαίωσε πέλμα, κόστος πλήρους σετ, συμβατότητα και παράδοση πριν παραγγείλεις. Οι φωτογραφίες ανήκουν στη Meister."
  },
  "No currently orderable model in this guide meets your starting-price limit. Edit your budget or ask Meister for a suitable setup.": {
    "en": "No currently orderable model in this guide meets your starting-price limit. Edit your budget or ask Meister for a suitable setup.",
    "el": "Κανένα μοντέλο με δυνατότητα παραγγελίας δεν καλύπτει το όριο αρχικής τιμής σου. Άλλαξε προϋπολογισμό ή ρώτησε τη Meister για κατάλληλο σετ."
  },
  "Meister describes EVO for mixed shallow/deep diving, swimming and varied spearfishing.": {
    "en": "Meister describes EVO for mixed shallow/deep diving, swimming and varied spearfishing.",
    "el": "Η Meister περιγράφει το EVO για μικτή χρήση σε ρηχά/βαθιά, κολύμπι και διαφορετικά είδη ψαρέματος."
  },
  "Meister positions the F1 family for deep freediving and fixed-weight spearfishing.": {
    "en": "Meister positions the F1 family for deep freediving and fixed-weight spearfishing.",
    "el": "Η Meister τοποθετεί τη σειρά F1 για βαθιά ελεύθερη κατάδυση και ψάρεμα με σταθερά βάρη."
  },
  "The F1 30° combines the maker’s spearfishing positioning with its stated 30° blade angle.": {
    "en": "The F1 30° combines the maker’s spearfishing positioning with its stated 30° blade angle.",
    "el": "Το F1 30° συνδυάζει τη χρήση για ψαροτούφεκο που αναφέρει ο κατασκευαστής με δηλωμένη γωνία 30°."
  },
  "Meister describes the X family as its more relaxed-feeling performance option.": {
    "en": "Meister describes the X family as its more relaxed-feeling performance option.",
    "el": "Η Meister περιγράφει τη σειρά X ως πιο ξεκούραστη επιλογή επιδόσεων."
  },
  "EVO/X are an editorial starting point for training; Meister does not publish a pool-specific rating.": {
    "en": "EVO/X are an editorial starting point for training; Meister does not publish a pool-specific rating.",
    "el": "Τα EVO/X είναι ενδεικτική αρχή για προπόνηση· η Meister δεν δημοσιεύει ειδική ένδειξη χρήσης πισίνας."
  },
  "Your preference for a stronger kick gives the F1 family a small ranking advantage.": {
    "en": "Your preference for a stronger kick gives the F1 family a small ranking advantage.",
    "el": "Η προτίμησή σου για δυνατότερο λάκτισμα δίνει μικρό προβάδισμα στη σειρά F1."
  },
  "You prefer a model without “Long” in its name. Actual bag fit still needs checking.": {
    "en": "You prefer a model without “Long” in its name. Actual bag fit still needs checking.",
    "el": "Προτιμάς μοντέλο χωρίς «Long» στην ονομασία. Η εφαρμογή στη θήκη χρειάζεται έλεγχο."
  },
  "This is a Long version, matching your length preference. Confirm the dimensions before ordering.": {
    "en": "This is a Long version, matching your length preference. Confirm the dimensions before ordering.",
    "el": "Είναι μακριά έκδοση, όπως προτιμάς. Επιβεβαίωσε διαστάσεις πριν παραγγείλεις."
  },
  "The plastic model is the only current listing under your €150 starting-price limit.": {
    "en": "The plastic model is the only current listing under your €150 starting-price limit.",
    "el": "Το πλαστικό είναι το μόνο τρέχον μοντέλο κάτω από το όριο αρχικής τιμής των €150."
  },
  "Sold out · check with Meister": {
    "en": "Sold out · check with Meister",
    "el": "Εξαντλημένο · ρώτησε τη Meister"
  },
  "On backorder · confirm delivery": {
    "en": "On backorder · confirm delivery",
    "el": "Κατόπιν παραγγελίας · επιβεβαίωσε παράδοση"
  },
  "Listed as orderable · verify your options": {
    "en": "Listed as orderable · verify your options",
    "el": "Εμφανίζεται διαθέσιμο · επιβεβαίωσε τις επιλογές σου"
  },
  "Plastic": {
    "en": "Plastic",
    "el": "Πλαστικό"
  },
  "Carbon fibre": {
    "en": "Carbon fibre",
    "el": "Ανθρακονήματα"
  },
  "Long version": {
    "en": "Long version",
    "el": "Μακριά έκδοση"
  },
  "Standard-name version": {
    "en": "Standard-name version",
    "el": "Έκδοση χωρίς «Long»"
  },
  "30° blade angle": {
    "en": "30° blade angle",
    "el": "Γωνία λεπίδας 30°"
  },
  "Listed price · confirm size and availability": {
    "en": "Listed price · confirm size and availability",
    "el": "Αναγραφόμενη τιμή · επιβεβαίωσε μέγεθος και διαθεσιμότητα"
  },
  "We reviewed the supplied fin finder and rechecked the nine official shop pages. We first exclude sold-out models and starting prices above your cap, then rank by diving style, usual depth, kick preference and standard/Long preference. Experience has a small model effect and helps the stiffness discussion; socks affect only the fit advice. Backorder models carry a delivery warning. Rankings are editorial, not manufacturer approval or performance-test scores.": {
    "en": "We reviewed the supplied fin finder and rechecked the nine official shop pages. We first exclude sold-out models and starting prices above your cap, then rank by diving style, usual depth, kick preference and standard/Long preference. Experience has a small model effect and helps the stiffness discussion; socks affect only the fit advice. Backorder models carry a delivery warning. Rankings are editorial, not manufacturer approval or performance-test scores.",
    "el": "Μελετήσαμε τον αρχικό επιλογέα και ελέγξαμε ξανά τις εννέα επίσημες σελίδες. Εξαιρούμε εξαντλημένα μοντέλα και αρχικές τιμές πάνω από το όριο, μετά ταξινομούμε με βάση χρήση, βάθος, λάκτισμα και προτίμηση έκδοσης. Η εμπειρία επηρεάζει λίγο το μοντέλο και βοηθά στη συζήτηση σκληρότητας· οι κάλτσες επηρεάζουν μόνο την εφαρμογή. Οι προτάσεις είναι συντακτικές, όχι έγκριση κατασκευαστή ή βαθμολογίες δοκιμών."
  },
  "Only F1 30° listings state an angle. Exact blade lengths, an official weight-to-stiffness chart, and a pool-use rating were not found. We do not infer other angles, promise a bag fit, or recommend a fin size.": {
    "en": "Only F1 30° listings state an angle. Exact blade lengths, an official weight-to-stiffness chart, and a pool-use rating were not found. We do not infer other angles, promise a bag fit, or recommend a fin size.",
    "el": "Μόνο τα F1 30° δηλώνουν γωνία. Δεν βρέθηκαν ακριβή μήκη, επίσημος πίνακας βάρους/σκληρότητας ή ένδειξη χρήσης πισίνας. Δεν συμπεραίνουμε άλλες γωνίες, δεν εγγυόμαστε εφαρμογή θήκης και δεν ορίζουμε μέγεθος πέλματος."
  },
  "PADI · choosing fins for freediving": {
    "en": "PADI · choosing fins for freediving",
    "el": "PADI · επιλογή πεδίλων ελεύθερης κατάδυσης"
  },
  "Blade stiffness to discuss": {
    "en": "Blade stiffness to discuss",
    "el": "Σκληρότητα για συζήτηση"
  },
  "Factory blade": {
    "en": "Factory blade",
    "el": "Εργοστασιακή λεπίδα"
  },
  "The plastic listing has no selectable stiffness. The carbon S–H scale does not apply to this product.": {
    "en": "The plastic listing has no selectable stiffness. The carbon S–H scale does not apply to this product.",
    "el": "Το πλαστικό δεν προσφέρει επιλογή σκληρότητας. Η κλίμακα S–H των carbon δεν εφαρμόζεται σε αυτό το προϊόν."
  },
  "An editorial starting range, not a Meister prescription. The carbon listings offer S, MS, M, MH and H, but no official body-weight chart. Try the blade or discuss your technique and leg strength with Meister.": {
    "en": "An editorial starting range, not a Meister prescription. The carbon listings offer S, MS, M, MH and H, but no official body-weight chart. Try the blade or discuss your technique and leg strength with Meister.",
    "el": "Ενδεικτικό αρχικό εύρος, όχι επίσημη οδηγία Meister. Τα carbon προσφέρονται σε S, MS, M, MH και H, χωρίς επίσημο πίνακα σωματικού βάρους. Δοκίμασε τη λεπίδα ή συζήτησε τεχνική και δύναμη με τη Meister."
  },
  "Foot-pocket fit": {
    "en": "Foot-pocket fit",
    "el": "Εφαρμογή πέλματος"
  },
  "Try with these socks. The pocket should hold your foot without numbness or painful pressure. Confirm the size with Meister.": {
    "en": "Try with these socks. The pocket should hold your foot without numbness or painful pressure. Confirm the size with Meister.",
    "el": "Δοκίμασε με αυτές τις κάλτσες. Το πέλμα πρέπει να κρατά το πόδι χωρίς μούδιασμα ή επώδυνη πίεση. Επιβεβαίωσε το μέγεθος με τη Meister."
  },
  "Listed sizes:": {
    "en": "Listed sizes:",
    "el": "Αναγραφόμενα μεγέθη:"
  },
  "For pool training": {
    "en": "For pool training",
    "el": "Για προπόνηση πισίνας"
  },
  "This is a closest-match suggestion from the Meister sea-fin range. The product pages do not state pool-specific suitability. Confirm with Meister and your instructor before buying for pool use.": {
    "en": "This is a closest-match suggestion from the Meister sea-fin range. The product pages do not state pool-specific suitability. Confirm with Meister and your instructor before buying for pool use.",
    "el": "Πρόκειται για ενδεικτική κοντινότερη επιλογή από τη σειρά θαλάσσης. Οι σελίδες δεν αναφέρουν ειδική καταλληλότητα πισίνας. Επιβεβαίωσε με τη Meister και τον εκπαιδευτή σου πριν αγοράσεις για πισίνα."
  },
  "Before you order": {
    "en": "Before you order",
    "el": "Πριν παραγγείλεις"
  },
  "“Long” is a model label, not a published length. Check blade dimensions against your bag. Carbon starting prices may be for blades without pockets; confirm the complete setup and current stock.": {
    "en": "“Long” is a model label, not a published length. Check blade dimensions against your bag. Carbon starting prices may be for blades without pockets; confirm the complete setup and current stock.",
    "el": "Το «Long» είναι ονομασία, όχι δημοσιευμένη διάσταση. Έλεγξε το μήκος σε σχέση με τη θήκη σου. Η αρχική τιμή carbon μπορεί να αφορά λεπίδες χωρίς πέλματα· επιβεβαίωσε πλήρες σετ και διαθεσιμότητα."
  },
  "Your price cap leads to a Long model despite your standard-version preference.": {
    "en": "Your price cap leads to a Long model despite your standard-version preference.",
    "el": "Το όριο τιμής οδηγεί σε μακριά έκδοση παρά την προτίμησή σου για μοντέλο χωρίς «Long»."
  }
}
