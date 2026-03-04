// PantryPal - Smart Pantry Management System
// Core Logic & AI Engine

// ================================================
// DATABASE & STATE
// ================================================
let pantry = JSON.parse(localStorage.getItem('pantry')) || [];
let wasteLog = JSON.parse(localStorage.getItem('wasteLog')) || [];

function savePantry(data) {
  localStorage.setItem('pantry', JSON.stringify(data));
}

function saveWaste(data) {
  localStorage.setItem('wasteLog', JSON.stringify(data));
}

// Global Ingredient Database (Expansion in progress)
const INGREDIENT_DB = {
  'milk': { defaultStorage: 'fridge', shelfLife: 7, category: 'dairy', unit: 'ml', defaultPrice: 2.50 },
  'eggs': { defaultStorage: 'fridge', shelfLife: 21, category: 'dairy', unit: 'pcs', defaultPrice: 4.00 },
  'cheese': { defaultStorage: 'fridge', shelfLife: 15, category: 'dairy', unit: 'g', defaultPrice: 5.50 },
  'yogurt': { defaultStorage: 'fridge', shelfLife: 14, category: 'dairy', unit: 'ml', defaultPrice: 3.00 },
  'butter': { defaultStorage: 'fridge', shelfLife: 30, category: 'dairy', unit: 'g', defaultPrice: 4.50 },
  'chicken': { defaultStorage: 'fridge', shelfLife: 3, category: 'protein', unit: 'kg', defaultPrice: 12.00 },
  'beef': { defaultStorage: 'fridge', shelfLife: 4, category: 'protein', unit: 'kg', defaultPrice: 18.00 },
  'pork': { defaultStorage: 'fridge', shelfLife: 4, category: 'protein', unit: 'kg', defaultPrice: 10.00 },
  'salmon': { defaultStorage: 'fridge', shelfLife: 2, category: 'protein', unit: 'kg', defaultPrice: 25.00 },
  'tofu': { defaultStorage: 'fridge', shelfLife: 7, category: 'protein', unit: 'g', defaultPrice: 3.50 },
  'spinach': { defaultStorage: 'fridge', shelfLife: 5, category: 'produce', unit: 'g', defaultPrice: 2.00 },
  'tomato': { defaultStorage: 'pantry', shelfLife: 7, category: 'produce', unit: 'pcs', defaultPrice: 0.80 },
  'onion': { defaultStorage: 'pantry', shelfLife: 30, category: 'produce', unit: 'pcs', defaultPrice: 0.50 },
  'potato': { defaultStorage: 'pantry', shelfLife: 60, category: 'produce', unit: 'pcs', defaultPrice: 0.60 },
  'apple': { defaultStorage: 'pantry', shelfLife: 21, category: 'produce', unit: 'pcs', defaultPrice: 1.00 },
  'banana': { defaultStorage: 'pantry', shelfLife: 5, category: 'produce', unit: 'pcs', defaultPrice: 0.40 },
  'strawberry': { defaultStorage: 'fridge', shelfLife: 4, category: 'produce', unit: 'g', defaultPrice: 4.00 },
  'bread': { defaultStorage: 'pantry', shelfLife: 6, category: 'grains', unit: 'pcs', defaultPrice: 3.00 },
  'rice': { defaultStorage: 'pantry', shelfLife: 365, category: 'grains', unit: 'kg', defaultPrice: 2.00 },
  'pasta': { defaultStorage: 'pantry', shelfLife: 365, category: 'grains', unit: 'kg', defaultPrice: 1.50 },
  'flour': { defaultStorage: 'pantry', shelfLife: 180, category: 'grains', unit: 'kg', defaultPrice: 1.20 },
  'cereal': { defaultStorage: 'pantry', shelfLife: 90, category: 'grains', unit: 'g', defaultPrice: 5.00 },
  'salt': { defaultStorage: 'pantry', shelfLife: 999, category: 'spices', unit: 'g', defaultPrice: 1.00 },
  'pepper': { defaultStorage: 'pantry', shelfLife: 999, category: 'spices', unit: 'g', defaultPrice: 3.50 },
  'cinnamon': { defaultStorage: 'pantry', shelfLife: 700, category: 'spices', unit: 'g', defaultPrice: 4.00 },
  'garlic': { defaultStorage: 'pantry', shelfLife: 30, category: 'spices', unit: 'pcs', defaultPrice: 0.75 },
  'soy sauce': { defaultStorage: 'pantry', shelfLife: 365, category: 'other', unit: 'ml', defaultPrice: 4.50 },
  'olive oil': { defaultStorage: 'pantry', shelfLife: 365, category: 'other', unit: 'ml', defaultPrice: 12.00 },
  'ketchup': { defaultStorage: 'fridge', shelfLife: 180, category: 'other', unit: 'ml', defaultPrice: 3.50 },
  'mayo': { defaultStorage: 'fridge', shelfLife: 60, category: 'other', unit: 'ml', defaultPrice: 4.00 },
};

// ================================================
// AI ENGINE: Core Knowledge
// ================================================

function estimateShelfLife(name, storage) {
  const lower = name.toLowerCase().trim();
  let baseDays = 7;
  let confidence = 0.5;

  // Search DB
  let dbMatch = null;
  if (INGREDIENT_DB[lower]) {
    dbMatch = INGREDIENT_DB[lower];
    confidence = 0.95;
  } else {
    for (const key of Object.keys(INGREDIENT_DB)) {
      if (lower.includes(key) || key.includes(lower)) {
        dbMatch = INGREDIENT_DB[key];
        confidence = 0.75;
        break;
      }
    }
  }

  if (dbMatch) {
    baseDays = dbMatch.shelfLife;
    // Adjust for storage deviation
    if (storage !== dbMatch.defaultStorage) {
      if (storage === 'freezer') baseDays *= 12; // Freezing extends life significantly
      else if (storage === 'fridge' && dbMatch.defaultStorage === 'pantry') baseDays *= 1.5;
      else if (storage === 'pantry' && dbMatch.defaultStorage === 'fridge') baseDays *= 0.3;
      confidence *= 0.8; // Lower confidence when stored in non-default location
    }
  } else {
    // General category rules if no DB match
    if (/\b(milk|cheese|yogurt|dairy)\b/i.test(lower)) { baseDays = 10; confidence = 0.6; }
    else if (/\b(chicken|beef|meat|fish|salmon|shrimp|protein)\b/i.test(lower)) { baseDays = 3; confidence = 0.7; }
    else if (/\b(lettuce|berry|berries|spinach|produce)\b/i.test(lower)) { baseDays = 5; confidence = 0.6; }
    else if (/\b(rice|pasta|flour|bean|grain)\b/i.test(lower)) { baseDays = 365; confidence = 0.6; }
  }

  return { estimated_expiry_days: Math.round(baseDays), confidence, storage };
}

function generatePantryRecipes(count = 2) {
  const RECIPES = [
    {
      recipe_name: "Quick Pantry Stir-Fry",
      emoji: "🥢",
      ingredients: ["rice", "soy sauce", "chicken", "onion"],
      need: ["vegetables (any)"],
      steps: [
        "Cook rice according to package instructions.",
        "Sauté chicken and onions in a hot pan until browned.",
        "Add any available vegetables and stir-fry for 3-5 minutes.",
        "Toss with soy sauce and serve over the warm rice.",
        "Garnish with pepper or seeds if available."
      ],
      estimated_time: "20 mins"
    },
    {
      recipe_name: "Protein Omelette",
      emoji: "🍳",
      ingredients: ["eggs", "cheese", "protein"],
      need: ["butter or oil"],
      steps: [
        "Whisk 2-3 eggs in a bowl with a pinch of salt and pepper.",
        "Heat a skillet with butter or oil over medium heat.",
        "Pour eggs into skillet and cook until edges are set.",
        "Add shredded cheese and pre-cooked protein (chicken/beef/tofu) to one half.",
        "Fold over and cook for another minute until cheese is melted."
      ],
      estimated_time: "10 mins"
    },
    {
      recipe_name: "Pantry Creamy Pasta",
      emoji: "🍝",
      ingredients: ["pasta", "butter", "cheese", "milk"],
      need: ["garlic"],
      steps: [
        "Boil pasta in salted water until al dente.",
        "In a separate pan, melt butter and sauté minced garlic.",
        "Lower heat, add a splash of milk and shredded cheese, stirring until smooth.",
        "Toss the cooked pasta in the sauce.",
        "Thin with a little pasta water if the sauce is too thick."
      ],
      estimated_time: "15 mins"
    }
  ];

  const pantryNames = pantry.map(i => i.name.toLowerCase());

  // Score recipes based on pantry match
  const scored = RECIPES.map(r => {
    const matchCount = r.ingredients.filter(ing =>
      pantryNames.some(pn => pn.includes(ing))
    ).length;
    return { ...r, score: matchCount / r.ingredients.length };
  });

  return scored.sort((a, b) => b.score - a.score).slice(0, count).map(r => ({
    recipe_name: r.recipe_name,
    emoji: r.emoji,
    ingredients: r.ingredients,
    missing: r.need,
    steps: r.steps.slice(0, 6),
    estimated_time: r.estimated_time,
    match_score: r.score
  }));
}

// ================================================
// AI ENGINE: Intent Classification
// ================================================
function classifyIntent(input) {
  const lower = input.toLowerCase().trim();

  if (/\b(add|put|buy|got|stock|bought|store|bring|into|to|added|refill|have)\b/i.test(lower)) return 'ADD';
  if (/\b(remove|delete|discard|thrown?|toss|take out|gone|finish|used)\b/i.test(lower)) return 'REMOVE';
  if (/\b(update|change|set|modify|adjust|edit|quantity|instead)\b/i.test(lower)) return 'UPDATE';
  if (/\b(cook|recipe|meal|lunch|dinner|breakfast|suggestion|eat|make|hungry|what can i)\b/i.test(lower)) return 'COOK';
  if (/\b(expiry|expire|soon|old|check|bad|spoil|shelf|date)\b/i.test(lower)) return 'EXPIRY_CHECK';
  if (/\b(grocery|list|shop|restock|plan|buy list|buy plan)\b/i.test(lower)) return 'GROCERY_PLAN';
  if (/\b(waste|pattern|insight|report|habit|statistic|analysis)\b/i.test(lower)) return 'WASTE_ANALYSIS';

  return 'ADD';
}

// ================================================
// AI ENGINE: Structured Ingredient Extraction
// ================================================
function extractIngredient(input) {
  const lower = input.toLowerCase().trim();

  // 1. Detect storage_location
  let storage_location = 'pantry';
  const storageMatch = lower.match(/\b(fridge|freezer|pantry|refrigerator)\b/i);
  if (storageMatch) {
    const raw = storageMatch[1].toLowerCase();
    if (raw === 'fridge' || raw === 'refrigerator') storage_location = 'fridge';
    else if (raw === 'freezer') storage_location = 'freezer';
    else storage_location = 'pantry';
  }

  // 2. Detect purchase_date
  let purchase_date = null;
  const today = new Date();

  if (/\byesterday\b/i.test(lower)) {
    const d = new Date(today);
    d.setDate(d.getDate() - 1);
    purchase_date = d.toISOString().split('T')[0];
  } else if (/\btoday\b/i.test(lower)) {
    purchase_date = today.toISOString().split('T')[0];
  } else {
    const dateMatch = lower.match(/\b(\d{4}-\d{2}-\d{2})\b/);
    if (dateMatch) purchase_date = dateMatch[1];
  }

  // 3. Extract quantity, unit, name
  const cleaned = lower
    .replace(/^(add|put|store|stock|i have|got|bought|just got|picked up|bring|refill)\s+/i, '')
    .replace(/\s+(to|in|into)\s+(the\s+)?(my\s+)?(pantry|fridge|freezer|refrigerator|kitchen|shelf|stock)\s*$/i, '')
    .trim();

  const patterns = [
    /^(\d+\.?\d*)\s*(kg|g|ml|l|lbs|oz|cups?|tbsp|tsp|dozen|pcs|pieces?|liters?|litres?)\s+(.+)$/i,
    /^(\d+\.?\d*)(kg|g|ml|l|lbs|oz)\s*(.+)$/i,
    /^(\d+\.?\d*)\s+(.+)$/i,
    /^a\s+(dozen)\s+(.+)$/i,
    /^(.+)$/i,
  ];

  let quantity = "1";
  let unit = "pcs";
  let name = cleaned;

  for (const pattern of patterns) {
    const match = cleaned.match(pattern);
    if (match) {
      if (pattern === patterns[0] || pattern === patterns[1]) {
        quantity = match[1];
        unit = normalizeUnit(match[2]);
        name = match[3].trim();
      } else if (pattern === patterns[2]) {
        quantity = match[1];
        name = match[2].trim();
        const dbEntry = lookupIngredient(name);
        unit = dbEntry ? dbEntry.unit : 'pcs';
      } else if (pattern === patterns[3]) {
        quantity = "12";
        unit = 'pcs';
        name = match[2].trim();
      } else {
        name = match[1].trim();
        const dbEntry = lookupIngredient(name);
        quantity = "1";
        unit = dbEntry ? dbEntry.unit : 'pcs';
      }
      break;
    }
  }

  return {
    name: name.replace(/\s+/g, ' ').trim(),
    quantity: String(quantity),
    unit: normalizeUnit(unit),
    storage_location: storage_location,
    purchase_date: purchase_date
  };
}

function normalizeUnit(rawUnit) {
  const u = rawUnit.toLowerCase().replace(/s$/, '');
  const map = {
    'g': 'g', 'gram': 'g', 'gm': 'g',
    'kg': 'kg', 'kilogram': 'kg',
    'ml': 'ml', 'milliliter': 'ml', 'millilitre': 'ml',
    'l': 'L', 'liter': 'L', 'litre': 'L',
    'lb': 'lbs', 'pound': 'lbs',
    'oz': 'oz', 'ounce': 'oz',
    'cup': 'cups', 'tbsp': 'tbsp', 'tablespoon': 'tbsp',
    'tsp': 'tsp', 'teaspoon': 'tsp',
    'dozen': 'dozen',
    'pc': 'pcs', 'piece': 'pcs', 'pcs': 'pcs',
  };
  return map[u] || rawUnit;
}

function lookupIngredient(name) {
  const lower = name.toLowerCase().trim();
  if (INGREDIENT_DB[lower]) return INGREDIENT_DB[lower];
  for (const key of Object.keys(INGREDIENT_DB)) {
    if (lower.includes(key) || key.includes(lower)) return INGREDIENT_DB[key];
  }
  return null;
}

// ================================================
// AI ENGINE: Response Handlers
// ================================================
function handleIntent(intent, input) {
  switch (intent) {
    case 'ADD':
      return handleAdd(input);
    case 'REMOVE':
      return handleRemove(input);
    case 'UPDATE':
      return handleUpdate(input);
    case 'COOK':
      return handleCookSuggestion();
    case 'EXPIRY_CHECK':
      return handleExpiryCheck();
    case 'GROCERY_PLAN':
      return handleGroceryPlan();
    case 'WASTE_ANALYSIS':
      return handleWasteAnalysis();
    default:
      return {
        intentTag: 'unknown',
        html: `<p>I'm not sure how to help with that. Try adding an item or asking for a recipe!</p>`
      };
  }
}

function handleAdd(input) {
  const extracted = extractIngredient(input);
  const dbEntry = lookupIngredient(extracted.name);
  const shelfEst = estimateShelfLife(extracted.name, extracted.storage_location);
  const category = dbEntry ? dbEntry.category : 'other';

  const existingIdx = pantry.findIndex(
    item => item.name.toLowerCase() === extracted.name.toLowerCase()
  );

  if (existingIdx !== -1) {
    pantry[existingIdx].quantity += parseFloat(extracted.quantity);
    pantry[existingIdx].updatedAt = Date.now();
    savePantry(pantry);
    refreshUI();
    return {
      intentTag: 'add',
      html: `
        <div class="ai-intent-tag add">ADD</div>
        <p>Updated <strong>${capitalize(extracted.name)}</strong> quantity! 📈</p>
        <div class="ai-json"><pre>${JSON.stringify(extracted, null, 2)}</pre></div>
      `
    };
  }

  const newItem = {
    id: generateId(),
    name: extracted.name,
    quantity: parseFloat(extracted.quantity),
    unit: extracted.unit,
    category: category,
    storage: extracted.storage_location,
    estimated_expiry_days: shelfEst.estimated_expiry_days,
    confidence: shelfEst.confidence,
    purchaseDate: extracted.purchase_date || new Date().toISOString().split('T')[0],
    addedAt: Date.now(),
    updatedAt: Date.now(),
    expiresAt: Date.now() + shelfEst.estimated_expiry_days * 86400000,
  };

  pantry.push(newItem);
  savePantry(pantry);
  refreshUI();
  return {
    intentTag: 'add',
    html: `
      <div class="ai-intent-tag add">ADD</div>
      <p>Added <strong>${capitalize(extracted.name)}</strong>! 🎉</p>
      <div class="ai-json"><pre>${JSON.stringify(extracted, null, 2)}</pre></div>
    `
  };
}

function handleRemove(input) {
  const extracted = extractIngredient(input);
  const idx = pantry.findIndex(
    item => item.name.toLowerCase() === extracted.name.toLowerCase()
  );

  if (idx === -1) {
    return {
      intentTag: 'remove',
      html: `
        <div class="ai-intent-tag remove">REMOVE</div>
        <p>Could not find <strong>${capitalize(extracted.name)}</strong>. 🤔</p>
        <div class="ai-json"><pre>${JSON.stringify(extracted, null, 2)}</pre></div>
      `
    };
  }

  const removed = pantry.splice(idx, 1)[0];
  const daysLeft = getDaysUntilExpiry(removed);
  wasteLog.push({
    name: removed.name,
    category: removed.category || 'other',
    quantity: removed.quantity,
    unit: removed.unit,
    reason: daysLeft <= 0 ? 'expired' : 'discarded',
    daysLeftWhenRemoved: daysLeft,
    wastedAt: Date.now()
  });
  saveWaste(wasteLog);
  savePantry(pantry);
  refreshUI();
  return {
    intentTag: 'remove',
    html: `
      <div class="ai-intent-tag remove">REMOVE</div>
      <p>Removed <strong>${capitalize(removed.name)}</strong>. ✅</p>
      <div class="ai-json"><pre>${JSON.stringify(extracted, null, 2)}</pre></div>
    `
  };
}

function handleUpdate(input) {
  const extracted = extractIngredient(input);
  const idx = pantry.findIndex(
    item => item.name.toLowerCase() === extracted.name.toLowerCase()
  );

  if (idx === -1) {
    return {
      intentTag: 'update',
      html: `
        <div class="ai-intent-tag update">UPDATE</div>
        <p>Could not find <strong>${capitalize(extracted.name)}</strong>. Try adding it? ➕</p>
        <div class="ai-json"><pre>${JSON.stringify(extracted, null, 2)}</pre></div>
      `
    };
  }

  const oldQty = pantry[idx].quantity;
  pantry[idx].quantity = parseFloat(extracted.quantity);
  pantry[idx].unit = extracted.unit;
  pantry[idx].updatedAt = Date.now();
  savePantry(pantry);
  refreshUI();

  return {
    intentTag: 'update',
    html: `
      <div class="ai-intent-tag update">UPDATE</div>
      <p>Updated <strong>${capitalize(extracted.name)}</strong>: ${oldQty} → <strong>${extracted.quantity} ${extracted.unit}</strong> ✅</p>
      <div class="ai-json"><pre>${JSON.stringify(extracted, null, 2)}</pre></div>
    `
  };
}

function handleCookSuggestion() {
  const pantryNames = pantry.map(i => i.name.toLowerCase());

  if (pantryNames.length === 0) {
    return {
      intentTag: 'cook',
      html: `
        <div class="ai-intent-tag cook">COOK</div>
        <p>Your pantry is empty! Add some ingredients first, then I can suggest recipes. 🛒</p>
      `
    };
  }

  const generated = generatePantryRecipes(2);

  if (generated.length === 0) {
    return {
      intentTag: 'cook',
      html: `
        <div class="ai-intent-tag cook">COOK</div>
        <p>Hmm, I couldn't find a great recipe match. Try adding more items! 🤔</p>
      `
    };
  }

  const recipeCards = generated.map((r, idx) => `
    <div class="recipe-card-full">
      <div class="recipe-card-header">
        <div class="recipe-card-title">
          <span class="recipe-emoji">${r.emoji}</span>
          <h3>${r.recipe_name}</h3>
        </div>
        <div class="recipe-meta-badges">
          <span class="recipe-time-badge">⏱️ ${r.estimated_time}</span>
          <span class="recipe-match-badge ${r.match_score === 1 ? 'perfect' : 'partial'}">
            ${r.match_score === 1 ? '✅ All ingredients available' : `⚠️ ${r.missing.length} missing`}
          </span>
        </div>
      </div>
      <div class="recipe-card-body">
        <div class="recipe-ingredients-section">
          <h4>Ingredients</h4>
          <div class="recipe-ingredients">
            ${r.ingredients.map(i => `<span class="recipe-ing-tag have">✓ ${i}</span>`).join('')}
            ${r.missing.map(i => `<span class="recipe-ing-tag need">✗ ${i}</span>`).join('')}
          </div>
        </div>
        <div class="recipe-steps-section">
          <h4>Steps</h4>
          <ol class="recipe-steps-list">
            ${r.steps.map(s => `<li>${s}</li>`).join('')}
          </ol>
        </div>
      </div>
    </div>
  `).join('');

  const structuredOutput = generated.map(r => ({
    recipe_name: r.recipe_name,
    ingredients: r.ingredients,
    steps: r.steps,
    estimated_time: r.estimated_time
  }));

  switchView('cook');
  document.getElementById('recipe-suggestions').innerHTML = recipeCards;

  return {
    intentTag: 'cook',
    html: `
      <div class="ai-intent-tag cook">COOK</div>
      <p>Generated <strong>${generated.length} recipes</strong> using only your pantry ingredients! 🍳</p>
      <p>Top pick: <strong>${generated[0].emoji} ${generated[0].recipe_name}</strong> — ready in ${generated[0].estimated_time}!</p>
      <div class="ai-recipe-json">
        <span class="ai-recipe-json-label">📦 Structured Output:</span>
        <div class="ai-json"><pre>${JSON.stringify(structuredOutput, null, 2)}</pre></div>
      </div>
    `
  };
}

function handleExpiryCheck() {
  if (pantry.length === 0) {
    return {
      intentTag: 'expiry',
      html: `
        <div class="ai-intent-tag expiry">EXPIRY_CHECK</div>
        <p>Your pantry is empty — nothing to check! 📦</p>
      `
    };
  }

  const expiring = pantry
    .map(item => ({ ...item, daysLeft: getDaysUntilExpiry(item) }))
    .sort((a, b) => a.daysLeft - b.daysLeft);

  const expired = expiring.filter(i => i.daysLeft <= 0);
  const soon = expiring.filter(i => i.daysLeft > 0 && i.daysLeft <= 3);
  const warning = expiring.filter(i => i.daysLeft > 3 && i.daysLeft <= 7);

  const expiringSoonNames = getExpiringSoon(3);

  let html = `<div class="ai-intent-tag expiry">EXPIRY_CHECK</div>`;

  if (expired.length > 0) {
    html += `<p>🚫 <strong>${expired.length} item(s) expired:</strong> ${expired.map(i => capitalize(i.name)).join(', ')}</p>`;
  }
  if (soon.length > 0) {
    html += `<p>⚠️ <strong>${soon.length} item(s) expiring within 3 days:</strong> ${soon.map(i => `${capitalize(i.name)} (${i.daysLeft}d)`).join(', ')}</p>`;
  }
  if (warning.length > 0) {
    html += `<p>📅 <strong>${warning.length} item(s) expiring within a week:</strong> ${warning.map(i => `${capitalize(i.name)} (${i.daysLeft}d)`).join(', ')}</p>`;
  }
  if (expired.length === 0 && soon.length === 0 && warning.length === 0) {
    html += `<p>✅ All items are fresh! Your oldest item expires in <strong>${expiring[0].daysLeft} days</strong> (${capitalize(expiring[0].name)}).</p>`;
  }

  html += `
    <div class="ai-expiry-array">
      <span class="ai-expiry-array-label">⏰ Expiring within 3 days:</span>
      <div class="ai-json"><pre>${JSON.stringify(expiringSoonNames, null, 2)}</pre></div>
    </div>
  `;

  return { intentTag: 'expiry', html };
}

function handleGroceryPlan() {
  const pantryNames = pantry.map(i => i.name.toLowerCase());
  const wasteAnalysis = analyzeWaste();
  const topWasted = wasteAnalysis ? wasteAnalysis.top_3_wasted.map(w => w.item.toLowerCase()) : [];

  const COMPLEMENTS = {
    'pasta': 'tomato sauce',
    'eggs': 'bread',
    'chicken': 'rice',
    'rice': 'soy sauce',
    'bread': 'butter',
    'milk': 'cereal',
    'mushrooms': 'garlic',
    'potato': 'onion',
    'lettuce': 'dressing'
  };

  const expiringSoon = pantry.filter(i => {
    const days = getDaysUntilExpiry(i);
    return days > 0 && days <= 2;
  });

  const expired = pantry.filter(i => getDaysUntilExpiry(i) <= 0);

  let suggestions = [];

  // 1. Replacements
  expiringSoon.forEach(i => suggestions.push({ name: i.name, reason: 'Replacement - expiring soon', priority: 'high' }));
  expired.forEach(i => suggestions.push({ name: i.name, reason: 'Replacement - currently expired', priority: 'high' }));

  // 2. Complements
  pantryNames.forEach(name => {
    for (const [key, complement] of Object.entries(COMPLEMENTS)) {
      if (name.includes(key) && !pantryNames.some(pn => pn.includes(complement))) {
        if (!topWasted.includes(complement)) {
          suggestions.push({ name: complement, reason: `Complements your ${name}`, priority: 'medium' });
        }
      }
    }
  });

  // 3. Basics
  ['milk', 'eggs', 'bread', 'oil'].forEach(b => {
    if (!pantryNames.some(pn => pn.includes(b)) && !suggestions.some(s => s.name.includes(b))) {
      if (!topWasted.includes(b)) {
        suggestions.push({ name: b, reason: 'Essential basic - missing', priority: 'low' });
      }
    }
  });

  const frequentlyWasted = topWasted;
  const typicalMeals = ["stir-fry", "omelette", "pasta", "salad"]; // Typical meal profiles

  const optimizedList = optimizeGroceryPlanning(pantry, frequentlyWasted, typicalMeals);

  switchView('grocery');

  // Transform optimized string array back to detailed objects for UI
  const uniqueList = optimizedList.map(name => {
    const isReplacing = expiringSoon.some(i => i.name.toLowerCase().includes(name)) ||
      expired.some(i => i.name.toLowerCase().includes(name));
    return {
      name: name,
      reason: isReplacing ? 'Replacement for expiring item' : 'Complements inventory',
      priority: isReplacing ? 'high' : 'medium'
    };
  });

  document.getElementById('grocery-list').innerHTML = uniqueList.map(item => `
    <div class="grocery-item" onclick="this.classList.toggle('checked')">
      <div class="grocery-check"></div>
      <div class="grocery-item-details">
        <span class="grocery-item-name">${capitalize(item.name)}</span>
        <span class="grocery-item-tag ${item.priority}">${item.priority}</span>
      </div>
      <span class="grocery-item-note">${item.reason}</span>
    </div>
  `).join('') || `<div class="empty-state"><span class="empty-icon">✅</span><p>No immediate purchases needed.</p></div>`;

  const structured = uniqueList.map(i => ({ item: i.name, reason: i.reason, priority: i.priority }));

  return {
    intentTag: 'grocery',
    html: `
      <div class="ai-intent-tag grocery">GROCERY_PLAN</div>
      <p>I've generated a <strong>minimal grocery list</strong> based on your pantry and waste habits. 🛒</p>
      <div class="ai-recipe-json">
        <span class="ai-recipe-json-label">📦 Structured List:</span>
        <div class="ai-json"><pre>${JSON.stringify(structured, null, 2)}</pre></div>
      </div>
    `
  };
}

function analyzeWaste() {
  if (wasteLog.length === 0) return null;

  const freq = {};
  wasteLog.forEach(entry => {
    const name = entry.name.toLowerCase();
    if (!freq[name]) freq[name] = { count: 0, totalQty: 0, unit: entry.unit || '', category: entry.category || 'other' };
    freq[name].count++;
    freq[name].totalQty += entry.quantity || 0;
  });

  const sorted = Object.entries(freq).map(([name, data]) => ({ name, ...data })).sort((a, b) => b.count - a.count);
  const top3 = sorted.slice(0, 3).map(item => ({ item: item.name, times_wasted: item.count, total_quantity: `${item.totalQty} ${item.unit}`.trim() }));

  const categoryWaste = {};
  let expiredCount = 0;
  wasteLog.forEach(entry => {
    categoryWaste[entry.category] = (categoryWaste[entry.category] || 0) + 1;
    if (entry.reason === 'expired') expiredCount++;
  });

  const topCategory = Object.entries(categoryWaste).sort((a, b) => b[1] - a[1])[0];
  const behavioralInsight = `${Math.round(expiredCount / wasteLog.length * 100)}% of your waste is from expired items. Most waste is in ${topCategory[0]}.`;
  const suggestion = expiredCount > 2 ? 'Check your expiry dates more often.' : 'Plan your meals better to reduce manual discards.';

  return {
    top_3_wasted: top3,
    behavioral_insight: behavioralInsight,
    improvement_suggestion: suggestion,
    stats: {
      total_discards: wasteLog.length,
      expired: expiredCount,
      manual_discards: wasteLog.length - expiredCount,
      waste_rate: Math.round((wasteLog.length / (pantry.length + wasteLog.length)) * 100) + '%'
    }
  };
}

function handleWasteAnalysis() {
  const analysis = analyzeWaste();
  switchView('insights');

  if (!analysis) {
    return {
      intentTag: 'waste',
      html: `<div class="ai-intent-tag waste">WASTE_ANALYSIS</div><p>🏆 Zero waste logged so far! Keep it up!</p>`
    };
  }

  document.getElementById('waste-count').textContent = analysis.stats.total_discards;
  document.getElementById('waste-percent').textContent = analysis.stats.waste_rate;

  const structuredOutput = {
    top_3_wasted: analysis.top_3_wasted,
    behavioral_insight: analysis.behavioral_insight,
    improvement_suggestion: analysis.improvement_suggestion
  };

  const costAnalysis = estimateWasteCost(wasteLog);

  return {
    intentTag: 'waste',
    html: `
      <div class="ai-intent-tag waste">WASTE_ANALYSIS</div>
      <p>📉 <strong>Waste Intelligence Report</strong></p>
      <div class="waste-section"><span class="waste-section-label">🧠 Insight:</span><p>${analysis.behavioral_insight}</p></div>
      <div class="waste-section"><span class="waste-section-label">💰 Financial Impact:</span><p>${costAnalysis.insight}</p></div>
      <div class="waste-section"><span class="waste-section-label">💡 Suggestion:</span><p>${analysis.improvement_suggestion}</p></div>
      <div class="ai-recipe-json">
        <span class="ai-recipe-json-label">📦 Structured Analysis:</span>
        <div class="ai-json"><pre>${JSON.stringify({ ...structuredOutput, ...costAnalysis }, null, 2)}</pre></div>
      </div>
    `
  };
}

// ================================================
// UI FRAMEWORK
// ================================================

document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => switchView(btn.dataset.view));
});

function switchView(viewName) {
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  const navBtn = document.querySelector(`.nav-btn[data-view="${viewName}"]`);
  const viewEl = document.getElementById(`view-${viewName}`);
  if (navBtn) navBtn.classList.add('active');
  if (viewEl) viewEl.classList.add('active');
}

const commandInput = document.getElementById('command-input');
const commandSend = document.getElementById('command-send');
const commandHint = document.getElementById('command-hint');
const aiResponseArea = document.getElementById('ai-response-area');
const aiResponseBody = document.getElementById('ai-response-body');

commandInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && commandInput.value.trim()) processCommand(commandInput.value.trim());
});

commandInput.addEventListener('input', () => {
  if (commandInput.value.trim()) {
    const intent = classifyIntent(commandInput.value);
    const labels = { ADD: '→ Add', REMOVE: '→ Remove', UPDATE: '→ Update', COOK: '→ Cook', EXPIRY_CHECK: '→ Expiry Check', WASTE_ANALYSIS: '→ Waste Report' };
    commandHint.textContent = labels[intent] || '';
  } else {
    commandHint.textContent = '';
  }
});

commandSend.addEventListener('click', () => {
  if (commandInput.value.trim()) processCommand(commandInput.value.trim());
});

document.getElementById('ai-close').addEventListener('click', () => {
  aiResponseArea.style.display = 'none';
});

// AI Command Tags & Quick Actions (Consolidated)
document.querySelectorAll('.tag, .quick-action-btn, #btn-suggest-recipes, #btn-plan-grocery').forEach(btn => {
  btn.addEventListener('click', (e) => {
    // Special case for manual Add button to open modal
    if (btn.id === 'qa-add') {
      e.stopPropagation();
      openModal();
      return;
    }
    const input = btn.dataset.input;
    if (input) {
      commandInput.value = input;
      processCommand(input);
    }
  });
});

// Modal Logic
const modalOverlay = document.getElementById('modal-overlay');
const modalClose = document.getElementById('modal-close');
const ingredientForm = document.getElementById('ingredient-form');

function openModal(item = null) {
  modalOverlay.style.display = 'flex';
  if (item) {
    document.getElementById('modal-title').textContent = 'Edit Ingredient';
    document.getElementById('ing-name').value = item.name;
    document.getElementById('ing-quantity').value = item.quantity;
    document.getElementById('ing-unit').value = item.unit;
    ingredientForm.dataset.editId = item.id;
  } else {
    document.getElementById('modal-title').textContent = 'Add Ingredient';
    ingredientForm.reset();
    delete ingredientForm.dataset.editId;
  }
}

function closeModal() {
  modalOverlay.style.display = 'none';
}

modalClose.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) closeModal(); });

ingredientForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = document.getElementById('ing-name').value;
  const quantity = parseFloat(document.getElementById('ing-quantity').value);
  const unit = document.getElementById('ing-unit').value;
  const editId = ingredientForm.dataset.editId;

  if (editId) {
    const idx = pantry.findIndex(i => i.id === editId);
    if (idx !== -1) {
      pantry[idx] = { ...pantry[idx], name, quantity, unit, updatedAt: Date.now() };
    }
  } else {
    const dbEntry = lookupIngredient(name);
    const shelfEst = estimateShelfLife(name, 'pantry');
    pantry.push({
      id: generateId(),
      name, quantity, unit,
      category: dbEntry ? dbEntry.category : 'other',
      storage: 'pantry',
      estimated_expiry_days: shelfEst.estimated_expiry_days,
      confidence: shelfEst.confidence,
      addedAt: Date.now(),
      purchaseDate: new Date().toISOString().split('T')[0],
      expiresAt: Date.now() + (shelfEst.estimated_expiry_days * 86400000)
    });
  }

  savePantry(pantry);
  refreshUI();
  closeModal();
});

// Pantry View Interactions
const pSearch = document.getElementById('pantry-search');
if (pSearch) {
  pSearch.addEventListener('input', () => renderPantryGrid());
}

document.querySelectorAll('.pill').forEach(pill => {
  pill.addEventListener('click', () => {
    document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    renderPantryGrid();
  });
});

function processCommand(input) {
  aiResponseArea.style.display = 'block';
  aiResponseBody.innerHTML = `<div class="ai-loading"><div class="ai-loading-dots"><span></span><span></span><span></span></div><span>Thinking...</span></div>`;
  const intent = classifyIntent(input);
  setTimeout(() => {
    const result = handleIntent(intent, input);
    aiResponseBody.innerHTML = result.html;
    commandInput.value = '';
    commandHint.textContent = '';
  }, 500);
}

// ================================================
// UI RENDERING
// ================================================

function refreshUI() {
  updateStats();
  renderExpiryAlerts();
  renderRecentItems();
  renderPantryGrid();
  renderCategoryBreakdown();
  renderFreshnessGauge();
}

function updateStats() {
  const expiring = pantry.filter(i => { const d = getDaysUntilExpiry(i); return d > 0 && d <= 3; }).length;
  const expired = pantry.filter(i => getDaysUntilExpiry(i) <= 0).length;
  document.getElementById('stat-total').textContent = pantry.length;
  document.getElementById('stat-expiring').textContent = expiring;
  document.getElementById('stat-expired').textContent = expired;
  document.getElementById('stat-categories').textContent = new Set(pantry.map(i => i.category)).size;
  document.getElementById('expiry-badge').textContent = expiring + expired;
}

function renderExpiryAlerts() {
  const container = document.getElementById('expiry-alerts-list');
  const items = pantry.map(item => ({ ...item, daysLeft: getDaysUntilExpiry(item) })).filter(i => i.daysLeft <= 7).sort((a, b) => a.daysLeft - b.daysLeft).slice(0, 5);
  container.innerHTML = items.map(i => `
    <div class="expiry-item">
      <div class="expiry-item-left"><div class="expiry-dot ${i.daysLeft <= 0 ? 'critical' : 'warning'}"></div><span>${capitalize(i.name)}</span></div>
      <span class="expiry-item-days ${i.daysLeft <= 0 ? 'critical' : 'warning'}">${i.daysLeft <= 0 ? 'Expired' : i.daysLeft + 'd'}</span>
    </div>
  `).join('') || `<p class="empty-state">All fresh!</p>`;
}

function renderRecentItems() {
  const container = document.getElementById('recent-items-list');
  const recent = [...pantry].sort((a, b) => b.addedAt - a.addedAt).slice(0, 5);
  container.innerHTML = recent.map(i => `<div class="recent-item"><span>${capitalize(i.name)}</span><span>${i.quantity} ${i.unit}</span></div>`).join('') || `<p class="empty-state">No items</p>`;
}

function renderPantryGrid() {
  const container = document.getElementById('pantry-grid');
  const searchVal = (document.getElementById('pantry-search')?.value || '').toLowerCase();
  const activeFilter = document.querySelector('.pill.active')?.dataset.filter || 'all';

  let items = pantry.filter(i => (activeFilter === 'all' || i.category === activeFilter) && i.name.toLowerCase().includes(searchVal));

  // Sort by freshness score (Ascending - most urgent first)
  items.sort((a, b) => calculateFreshness(a) - calculateFreshness(b));

  container.innerHTML = '';
  items.forEach(item => {
    const days = getDaysUntilExpiry(item);
    const score = calculateFreshness(item);
    const status = getFreshnessStatusLabel(score);
    const riskEval = evaluateWasteRisk(item);

    // Determine CSS class based on status
    let statusClass = 'fresh';
    if (status === 'Expiring') statusClass = 'expired';
    else if (status === 'High Risk') statusClass = 'warning';
    else if (status === 'Use Soon') statusClass = 'soon';

    const card = document.createElement('div');
    card.className = `pantry-item ${statusClass}`;
    card.innerHTML = `
      <div class="pantry-item-header">
        <span>${capitalize(item.name)}</span>
        <span class="pantry-item-category">${item.category}</span>
      </div>
      <div class="pantry-item-details">
        <span>${item.quantity}</span>
        <span>${item.unit}</span>
      </div>
      <div class="pantry-item-status-row">
        <span class="status-badge ${statusClass}">${status} (${score}%)</span>
        <span class="expiry-text">📅 ${days <= 0 ? 'Expired' : days + 'd left'}</span>
      </div>
      <div class="pantry-risk-row">
        <div class="risk-label">Waste Risk: ${riskEval.waste_risk_score}%</div>
        <div class="risk-reason">${riskEval.reason}</div>
      </div>
      <div class="pantry-item-actions">
        <button class="btn-item-action edit" onclick="editItem('${item.id}')">✏️ Edit</button>
        <button class="btn-item-action remove" onclick="removeItem('${item.id}')">🗑️ Remove</button>
      </div>
    `;
    container.appendChild(card);
  });
}

function renderCategoryBreakdown() {
  const container = document.getElementById('category-breakdown');
  const counts = {};
  pantry.forEach(i => counts[i.category] = (counts[i.category] || 0) + 1);
  const max = Math.max(...Object.values(counts), 1);
  container.innerHTML = Object.entries(counts).map(([cat, count]) => `
    <div class="category-bar-item">
      <span>${cat}</span>
      <div class="category-bar-track"><div class="category-bar-fill ${cat}" style="width: ${(count / max) * 100}%"></div></div>
      <span>${count}</span>
    </div>
  `).join('') || `<p>No data</p>`;
}

function renderFreshnessGauge() {
  const circle = document.getElementById('gauge-circle');
  const value = document.getElementById('gauge-value');
  const label = document.getElementById('gauge-label');

  if (pantry.length === 0) {
    value.textContent = '--';
    label.textContent = 'Add items to calculate';
    circle.style.borderColor = 'var(--border-subtle)';
    return;
  }

  // Calculate average freshness across all items using the new formula
  const totalFreshness = pantry.reduce((sum, item) => sum + calculateFreshness(item), 0);
  const score = Math.round(totalFreshness / pantry.length);

  // Map numerical score to the new status labels
  const status = getFreshnessStatusLabel(score);
  label.textContent = status; // Set the large gauge label to the classified status
  circle.style.transition = 'border-color 0.5s ease';

  // Add proactive tip update
  const urgent = getUrgentIngredients().slice(0, 3);
  const highRisk = pantry.filter(i => evaluateWasteRisk(i).waste_risk_score > 60).map(i => i.name);
  const tipContainer = document.getElementById('gauge-label'); // Re-using label area for status
  const suggestion = generateProactiveSuggestion(urgent, highRisk);

  // Optionally, if we had a dedicated tip location:
  // document.getElementById('pantry-tip').textContent = suggestion;

  if (score >= 80) {
    circle.style.borderColor = 'var(--accent-primary)';
    value.style.color = 'var(--accent-primary)';
  } else if (score >= 50) {
    circle.style.borderColor = 'var(--accent-secondary)';
    value.style.color = 'var(--accent-secondary)';
  } else if (score >= 20) {
    circle.style.borderColor = 'var(--accent-warning)';
    value.style.color = 'var(--accent-warning)';
  } else {
    circle.style.borderColor = 'var(--accent-danger)';
    value.style.color = 'var(--accent-danger)';
  }
}

function removeItem(id) {
  const idx = pantry.findIndex(i => i.id === id);
  if (idx === -1) return;
  const removed = pantry.splice(idx, 1)[0];
  const days = getDaysUntilExpiry(removed);
  wasteLog.push({ name: removed.name, category: removed.category, quantity: removed.quantity, unit: removed.unit, reason: days <= 0 ? 'expired' : 'discarded', wastedAt: Date.now() });
  saveWaste(wasteLog);
  savePantry(pantry);
  refreshUI();
}

function editItem(id) {
  const item = pantry.find(i => i.id === id);
  if (item) openModal(item);
}

// Utilities
function capitalize(str) { return str.replace(/\b\w/g, c => c.toUpperCase()); }
function getDaysUntilExpiry(item) { return Math.ceil((item.expiresAt - Date.now()) / 86400000); }

/**
 * Calculates freshness score based on purchase date and estimated shelf life.
 * Formula: freshness = 100 - (days_since_purchase / estimated_expiry_days) * 100
 */
function calculateFreshness(item) {
  const purchaseTime = new Date(item.purchaseDate || item.addedAt).getTime();
  const daysSincePurchase = Math.max(0, (Date.now() - purchaseTime) / 86400000);
  const estimatedDays = item.estimated_expiry_days || 7;

  let freshness = 100 - (daysSincePurchase / estimatedDays) * 100;

  // Rules: clamped 0-100, rounded
  freshness = Math.max(0, Math.min(100, freshness));
  return Math.round(freshness);
}

/**
 * Classifies a freshness score into a human-readable status label.
 * Rules:
 * 80-100 -> "Fresh"
 * 50-79  -> "Use Soon"
 * 20-49  -> "High Risk"
 * 0-19   -> "Expiring"
 */
function getFreshnessStatusLabel(score) {
  if (score >= 80) return "Fresh";
  if (score >= 50) return "Use Soon";
  if (score >= 20) return "High Risk";
  return "Expiring";
}

/**
 * Evaluates waste risk for a specific item.
 * Combines real-time freshness with historical waste frequency.
 * Returns { waste_risk_score: 0-100, reason: string }
 */
function evaluateWasteRisk(item) {
  const freshness = calculateFreshness(item);

  // Calculate historical waste frequency (0-1)
  const itemName = item.name.toLowerCase();
  const wastedCount = wasteLog.filter(w => w.name.toLowerCase().includes(itemName)).length;
  // Frequency relative to total waste log or simple cap for risk weighting
  const historyWeight = Math.min(1, wastedCount / 3);

  // Risk Formula: Freshness (inverse) + Historical Waste
  // Lower freshness = Higher risk. Higher historical waste = Higher risk.
  let riskScore = (100 - freshness) * 0.7 + (historyWeight * 100) * 0.3;

  riskScore = Math.round(Math.max(0, Math.min(100, riskScore)));

  let reason = "Safe to keep.";
  if (riskScore > 80) reason = `Critical! You've wasted ${capitalize(item.name)} ${wastedCount}x before.`;
  else if (riskScore > 60) reason = `High risk. ${item.name} is losing freshness rapidly.`;
  else if (riskScore > 40) reason = "Moderate risk. Use within the next 48h.";
  else if (historyWeight > 0.5) reason = "History suggests high waste probability.";

  return { waste_risk_score: riskScore, reason: reason };
}

/**
 * Predicts probability of waste based on a 3-day projection and history.
 * Rules: Increased risk if projected freshness < 25.
 * Returns { waste_probability: 0-100, risk_level: string }
 */
function predictWasteProbability(projectedFreshnessDay3, historicalWasteFrequency) {
  // Score: high freshness = low probability of waste
  // Inverse of freshness (100 - score) becomes base probability
  const freshnessRisk = 100 - projectedFreshnessDay3;

  // Weights: Freshness risk (60%) + Historical Frequency (40%)
  let probability = (freshnessRisk * 0.6) + (historicalWasteFrequency * 100 * 0.4);

  // Risk boost if projected to be critical soon
  if (projectedFreshnessDay3 < 25) {
    probability += 10;
  }

  const finalProb = Math.round(Math.max(0, Math.min(100, probability)));

  let riskLevel = "Low";
  if (finalProb > 70) riskLevel = "High";
  else if (finalProb > 30) riskLevel = "Moderate";

  return { waste_probability: finalProb, risk_level: riskLevel };
}

/**
 * Analyzes user pantry behavior patterns.
 * Returns { most_wasted_category, behavior_pattern_summary, actionable_suggestion }
 */
function analyzePantryBehavior(discardLog = [], purchaseLog = [], cookFreq = 3) {
  const catFreq = {};
  discardLog.forEach(item => {
    const cat = item.category || 'other';
    catFreq[cat] = (catFreq[cat] || 0) + 1;
  });

  const sortedCats = Object.entries(catFreq).sort((a, b) => b[1] - a[1]);
  const mostWasted = sortedCats.length > 0 ? sortedCats[0][0] : 'none';

  const totalDiscards = discardLog.length;
  const expiredCount = discardLog.filter(i => i.reason === 'expired').length;

  let pattern = "Balanced inventory with minor leakage.";
  if (totalDiscards === 0) {
    pattern = "Perfect utilization! No significant waste patterns detected.";
  } else if (expiredCount / totalDiscards > 0.7) {
    pattern = "Reactive over-stocking of perishables leading to scheduled expiry.";
  } else if (cookFreq < 3 && totalDiscards > 4) {
    pattern = "Aspirational purchasing logic – buying ingredients without matching cook frequency.";
  }

  let suggestion = "Conduct a weekly 'pantry-first' meal plan to use existing stock.";
  if (mostWasted === 'produce') {
    suggestion = "Buy produce in half-proportions or switch to frozen alternatives for stir-fry staples.";
  } else if (cookFreq < 3) {
    suggestion = "Focus on purchasing longer shelf-life proteins and grains until cooking frequency increases.";
  }

  return {
    most_wasted_category: mostWasted,
    behavior_pattern_summary: pattern,
    actionable_suggestion: suggestion
  };
}
function generateId() { return Math.random().toString(36).substr(2, 9); }
function getExpiringSoon(days = 3) { return pantry.filter(i => { const d = getDaysUntilExpiry(i); return d > 0 && d <= days; }).map(i => i.name); }

/**
 * Ranks all pantry items by urgency.
 * Returns an array of ingredient names sorted from most urgent (lowest score) to least urgent.
 */
function getUrgentIngredients() {
  return [...pantry]
    .map(item => ({ name: item.name, score: calculateFreshness(item) }))
    .sort((a, b) => a.score - b.score)
    .map(item => item.name);
}

/**
 * Projects freshness decay over the next 5 days.
 * Returns ONLY JSON-like object: { day_1: n, ..., day_5: n }
 */
function projectFreshnessDecay(item) {
  const currentFreshness = calculateFreshness(item);
  const daysRemaining = getDaysUntilExpiry(item);

  // Linear decay based on remaining days
  const dailyDrop = daysRemaining > 0 ? (currentFreshness / daysRemaining) : currentFreshness;

  const projection = {};
  for (let i = 1; i <= 5; i++) {
    const projected = currentFreshness - (dailyDrop * i);
    projection[`day_${i}`] = Math.max(0, Math.round(projected));
  }
  return projection;
}

/**
 * Generates a short, proactive suggestion based on urgent/risk state.
 * Rules: Max 2 sentences, action-oriented, practical.
 */
function generateProactiveSuggestion(urgentItems = [], highRiskItems = []) {
  if (urgentItems.length === 0 && highRiskItems.length === 0) {
    return "Your pantry looks great! Consider adding some basics to your grocery list.";
  }

  const primary = urgentItems[0] || highRiskItems[0];
  const count = urgentItems.length + highRiskItems.length;

  if (count === 1) {
    return `Your ${primary} is the top priority for tonight's meal to avoid waste.`;
  }

  return `You have ${count} items like ${primary} reaching critical waste risk soon. Incorporate these into a recipe tonight to maximize freshness.`;
}

/**
 * Optimizes grocery planning to reduce waste.
 * Rules:
 * - Avoid suggesting high-waste items.
 * - Complement existing pantry.
 * - Keep list minimal.
 * Returns ONLY an array of recommended grocery items.
 */
function optimizeGroceryPlanning(currentPantry, frequentlyWasted, typicalMeals) {
  const pantryNames = currentPantry.map(i => i.name.toLowerCase());
  const suggestions = new Set();

  const COMPLEMENTS = {
    'pasta': 'tomato sauce', 'eggs': 'bread', 'chicken': 'rice', 'rice': 'soy sauce',
    'bread': 'butter', 'milk': 'cereal', 'lettuce': 'dressing', 'potato': 'onion'
  };

  // 1. Critical Replacements (Items expiring in <= 2 days or already expired)
  currentPantry.forEach(item => {
    const d = Math.ceil((item.expiresAt - Date.now()) / 86400000);
    if (d <= 2) {
      const name = item.name.toLowerCase();
      // Only replace if not frequently wasted
      if (!frequentlyWasted.some(fw => fw.includes(name))) {
        suggestions.add(name);
      }
    }
  });

  // 2. Complements (Suggest if we have the primary but not the match)
  pantryNames.forEach(name => {
    for (const [key, complement] of Object.entries(COMPLEMENTS)) {
      if (name.includes(key) && !pantryNames.some(pn => pn.includes(complement))) {
        if (!frequentlyWasted.some(fw => fw.includes(complement))) {
          suggestions.add(complement);
        }
      }
    }
  });

  // 3. Basics (If missing and not high-waste)
  const basics = ['milk', 'bread', 'eggs', 'oil'];
  basics.forEach(b => {
    if (!pantryNames.some(pn => pn.includes(b)) && !frequentlyWasted.some(fw => fw.includes(b)) && !suggestions.has(b)) {
      suggestions.add(b);
    }
  });

  return Array.from(suggestions);
}

/**
 * Estimates financial waste cost based on wasted items.
 * Returns { total_waste_cost: number, insight: string }
 */
function estimateWasteCost(wastedItems = []) {
  let totalCost = 0;
  const categoryLosses = {};

  wastedItems.forEach(item => {
    const lower = item.name.toLowerCase().trim();
    const dbEntry = INGREDIENT_DB[lower] ||
      Object.values(INGREDIENT_DB).find(v => lower.includes(v.name) || (v.name && v.name.includes(lower)));

    // Default to average if not in DB
    const price = dbEntry ? dbEntry.defaultPrice : 2.50;
    const itemCost = price * (item.quantity > 0 ? item.quantity : 1);

    totalCost += itemCost;
    const cat = item.category || 'other';
    categoryLosses[cat] = (categoryLosses[cat] || 0) + itemCost;
  });

  // Generate financial insight
  let insight = `Total financial loss is $${totalCost.toFixed(2)}.`;
  const topCatLoss = Object.entries(categoryLosses).sort((a, b) => b[1] - a[1])[0];

  if (topCatLoss) {
    insight += ` Your biggest financial drain is ${topCatLoss[0]} ($${topCatLoss[1].toFixed(2)}).`;
  }

  return {
    total_waste_cost: parseFloat(totalCost.toFixed(2)),
    insight: insight
  };
}
/**
 * Calculates ingredient utility (prioritizes items that NEED using).
 * Higher if: freshness is low, waste_risk is high.
 * Returns score 0-100.
 */
function calculateIngredientUtility(item) {
  const freshness = calculateFreshness(item);
  const riskOfWaste = evaluateWasteRisk(item).waste_risk_score;
  const qty = parseFloat(item.quantity) || 1;

  // Rule: High utility if freshness low, risk high
  // Scaled 0-100
  let utility = ((100 - freshness) + riskOfWaste) / 2;

  return Math.round(Math.max(0, Math.min(100, utility)));
}

/**
 * Scores a recipe’s impact based on ingredient utilities.
 * Rules: Sum utility scores, normalize to 0-100.
 * Returns ONLY JSON-like object: { impact_score: n }
 */
function calculateRecipeImpactScore(recipeIngredients = [], utilitiesMap = {}) {
  if (recipeIngredients.length === 0) return { impact_score: 0 };

  let totalUtility = 0;
  let count = 0;

  recipeIngredients.forEach(name => {
    const lower = name.toLowerCase().trim();
    // Match against utility map (might be partial name matches)
    const score = utilitiesMap[lower] || 0;
    totalUtility += score;
    count++;
  });

  // Normalize: Average utility per ingredient used (scaled 0-100)
  const score = count > 0 ? (totalUtility / count) : 0;

  return {
    impact_score: Math.round(Math.max(0, Math.min(100, score)))
  };
}

/**
 * Selects the optimal recipe from a list based on highest impact score.
 * Rules: Highest impact_score wins.
 * Returns ONLY the recipe_name.
 */
function selectOptimalRecipe(recipes = []) {
  if (recipes.length === 0) return null;
  const sorted = [...recipes].sort((a, b) => b.impact_score - a.impact_score);
  return sorted[0].recipe_name;
}

/**
 * Explains why a recipe is optimal based on urgency.
 * Rules: Max 2 sentences, focus on waste reduction, clear/confident.
 */
function explainOptimalRecipe(selectedRecipe, highUrgencyIngredients = []) {
  if (highUrgencyIngredients.length === 0) {
    return `${selectedRecipe} is the most balanced choice for your current inventory and cooking habits.`;
  }
  const items = highUrgencyIngredients.slice(0, 2).join(' and ');
  return `${selectedRecipe} is the optimal choice because it effectively utilizes your most at-risk ingredients like ${items}. This targeted approach prevents imminent waste by converting your highest urgency stock into a prepared meal right now.`;
}

/**
 * Calculates current pantry health score (macro-metric).
 * Input: average_freshness, waste_last_7_days, high_risk_count.
 * Returns { pantry_health_score, status: 'Stable|At Risk|Critical' }
 */
function calculatePantryHealthScore(avgFreshness, wasteLast7, highRiskCount) {
  // Base score is avg freshness
  // Penalize for waste (max -20) and high risk counts (max -30)
  let score = avgFreshness - (wasteLast7 * 4) - (highRiskCount * 6);

  const finalScore = Math.round(Math.max(0, Math.min(100, score)));

  let status = "Stable";
  if (finalScore < 40) status = "Critical"; // Changed from 50 to 40 for better buffer
  else if (finalScore < 75) status = "At Risk"; // Changed from 80 to 75

  return {
    pantry_health_score: finalScore,
    status: status
  };
}

/**
 * Filters usable pantry items (freshness > 0).
 * Returns array of ingredient names.
 */
function getUsableIngredients(items = pantry) {
  return items
    .filter(item => calculateFreshness(item) > 0)
    .map(item => item.name);
}

/**
 * Practical Home Cook Recipe Engine.
 * Generates a single recipe based on exactly the provided ingredients.
 * Rules: ONLY use supplied ingredients, max 6 steps, under 30 mins.
 */
function practicalHomeCookRecipeEngine(ingredientList = []) {
  const low = ingredientList.map(i => i.toLowerCase());

  let recipe = {
    recipe_name: "Simple Pantry Staple",
    ingredients_used: [],
    steps: ["Prepare your ingredients.", "Combine in a pan over medium heat.", "Cook until heated through.", "Season to taste and serve."],
    estimated_time: "15 mins"
  };

  // Logic: Match staples
  const hasChicken = low.includes('chicken');
  const hasRice = low.includes('rice');
  const hasSoy = low.includes('soy sauce');
  const hasEggs = low.includes('eggs');
  const hasBread = low.includes('bread');
  const hasMilk = low.includes('milk');
  const hasCheese = low.includes('cheese');

  if (hasChicken && hasRice && hasSoy) {
    recipe = {
      recipe_name: "Quick Chicken Rice Bowl",
      ingredients_used: ["chicken", "rice", "soy sauce"],
      steps: [
        "Cook the rice in boiling water until tender.",
        "Sauté chicken in a pan until fully cooked.",
        "Combine chicken and rice in the pan.",
        "Stir in soy sauce and mix well.",
        "Heat for 2 more minutes.",
        "Serve hot in a bowl."
      ],
      estimated_time: "25 mins"
    };
  } else if (hasEggs && hasCheese && hasBread) {
    recipe = {
      recipe_name: "Eggy Cheese Toast",
      ingredients_used: ["eggs", "cheese", "bread"],
      steps: [
        "Toast the bread slices.",
        "Whisk eggs in a bowl.",
        "Cook eggs in a pan until scrambled.",
        "Top toast with scrambled eggs.",
        "Sprinkle cheese over the top.",
        "Melt cheese under a broiler for 1 min."
      ],
      estimated_time: "10 mins"
    };
  } else if (hasMilk && hasCheese && low.includes('pasta')) {
    recipe = {
      recipe_name: "Simple Mac & Cheese",
      ingredients_used: ["pasta", "milk", "cheese"],
      steps: [
        "Boil pasta until soft.",
        "Drain pasta and return to pot.",
        "Add a splash of milk and shredded cheese.",
        "Stir over low heat until sauce is creamy.",
        "Serve immediately while hot."
      ],
      estimated_time: "15 mins"
    };
  } else if (low.length > 0) {
    // Fallback for limited ingredients
    recipe.recipe_name = `Basic ${capitalize(low[0])} Preparation`;
    recipe.ingredients_used = [low[0]];
    recipe.steps = [
      `Clean and prepare the ${low[0]}.`,
      "Heat a pan with any available fat.",
      `Cook the ${low[0]} until ready.`,
      "Serve as a simple meal."
    ];
  }

  return recipe;
}

/**
 * Creative Minimal-Ingredient Cook Engine.
 * Creates the simplest possible dish with max 4 steps.
 */
function creativeMinimalCookEngine(ingredientList = []) {
  const low = ingredientList.map(i => i.toLowerCase().trim());

  // Rule: Pick the best single-ingredient or simple duo
  let dish = {
    recipe_name: "Quick Snack",
    ingredients_used: [],
    steps: ["Heat and serve."],
    estimated_time: "5 mins"
  };

  if (low.includes('egg') || low.includes('eggs')) {
    dish = {
      recipe_name: "Simple Scrambled Eggs",
      ingredients_used: ["eggs"],
      steps: [
        "Whisk eggs with a pinch of salt.",
        "Heat a small amount of oil or butter in a pan.",
        "Cook eggs until just set, stirring gently.",
        "Serve immediately."
      ],
      estimated_time: "5 mins"
    };
  } else if (low.includes('potato') || low.includes('potatoes')) {
    dish = {
      recipe_name: "Smashed Roasted Potato",
      ingredients_used: ["potato"],
      steps: [
        "Boil or microwave potato until soft.",
        "Smash flat on a baking sheet or pan.",
        "Sear in oil until crispy on both sides.",
        "Season with salt and enjoy."
      ],
      estimated_time: "15 mins"
    };
  } else if (low.includes('bread') && low.includes('cheese')) {
    dish = {
      recipe_name: "Minimalist Cheesy Toast",
      ingredients_used: ["bread", "cheese"],
      steps: [
        "Place cheese on top of the bread.",
        "Toast until bread is golden and cheese melts.",
        "Cut into triangles.",
        "Serve warm."
      ],
      estimated_time: "5 mins"
    };
  } else if (low.length > 0) {
    const main = low[0];
    dish = {
      recipe_name: `Seared ${capitalize(main)}`,
      ingredients_used: [main],
      steps: [
        `Prepare the ${main} for cooking.`,
        "Heat a pan with a drop of oil.",
        `Cook the ${main} until tender.`,
        "Finish with a pinch of salt."
      ],
      estimated_time: "10 mins"
    };
  }

  return dish;
}

/**
 * Improves recipe names to sound appealing but realistic.
 * Rules: Realistic adjectives, no fluff.
 */
function improveRecipeName(recipeName = "") {
  const lower = recipeName.toLowerCase().trim();

  // Mapping of common keywords to appealing but realistic names
  const mapping = {
    "scrambled eggs": "Farm-Style Scrambled Eggs",
    "chicken rice": "Pan-Seared Chicken & Fluffy Rice",
    "mac & cheese": "Creamy Three-Cheese Mac",
    "stir-fry": "Zesty Garden Stir-Fry",
    "toast": "Golden Crispy Toast",
    "pasta": "Savory Al Dente Pasta",
    "stew": "Slow-Simmered Homestyle Stew",
    "omelette": "Fluffy Cafe-Style Omelette",
    "salad": "Crisp Seasonal Garden Salad",
    "chicken": "Tender Pan-Seared Chicken",
    "rice": "Fluffy Steamed Rice",
    "potato": "Crispy Herb-Roasted Potatoes"
  };

  for (const [key, improved] of Object.entries(mapping)) {
    if (lower.includes(key)) return improved;
  }

  // Fallback: Use a realistic prefix if no specific mapping exists
  if (lower.length > 0) {
    return `Homestyle ${capitalize(recipeName)}`;
  }

  return "Pantry Surprise";
}

/**
 * Pure Indian Recipe Engine.
 * Rules: ONLY Indian cuisine, NO foreign dishes.
 * Assumes: Turmeric, Chili, Jeera, Salt available.
 * Returns ONLY JSON.
 */
function indianHomeCookRecipeEngine(ingredientList = []) {
  const low = ingredientList.map(i => i.toLowerCase().trim());

  let recipe = {
    recipe_name: "Desi Pantry Mashup",
    ingredients_used: [],
    steps: ["Heat oil or ghee in a pan.", "Add jeera and allow to splutter.", "Sauté your ingredients with turmeric and chili.", "Cook until tender and serve with rice or bread."],
    estimated_time: "20 mins"
  };

  const hasChicken = low.includes('chicken');
  const hasRice = low.includes('rice');
  const hasPotato = low.includes('potato') || low.includes('potatoes');
  const hasOnion = low.includes('onion') || low.includes('onions');
  const hasEggs = low.includes('eggs') || low.includes('egg');
  const hasSpinach = low.includes('spinach');
  const hasTomato = low.includes('tomato') || low.includes('tomatoes');

  // 1. Meat/Protein Priorities
  if (hasChicken && hasOnion && hasTomato) {
    recipe = {
      recipe_name: "Homestyle Chicken Curry",
      ingredients_used: ["chicken", "onion", "tomato"],
      steps: [
        "Sauté onions until golden brown.",
        "Add tomatoes and cook until soft and oil separates.",
        "Add chicken pieces with turmeric, chili, and salt.",
        "Cover and cook in its own juices for 15 mins.",
        "Add a splash of water for gravy and simmer for 5 mins.",
        "Serve hot with rice or roti."
      ],
      estimated_time: "30 mins"
    };
  } else if (hasEggs && hasPotato) {
    recipe = {
      recipe_name: "Ande-Aloo Masala",
      ingredients_used: ["eggs", "potato"],
      steps: [
        "Boil eggs and potatoes separately until firm.",
        "Peel and lightly sear them in a pan with turmeric.",
        "Make a quick tadhka with jeera and chili powder.",
        "Toss the eggs and potatoes in the tadhka.",
        "Add salt and a squeeze of lemon if available.",
        "Serve as a dry, spicy side dish."
      ],
      estimated_time: "20 mins"
    };
  } else if (hasSpinach && hasPotato) {
    recipe = {
      recipe_name: "Aloo Palak (Potato Spinach)",
      ingredients_used: ["potato", "spinach"],
      steps: [
        "Sauté cubed potatoes in oil until half-cooked.",
        "Add chopped spinach and cover for 5 minutes.",
        "Add turmeric, chili, and jeera powder.",
        "Stir until water from spinach evaporates.",
        "Adjust salt and cook until potatoes are soft.",
        "Serve with rice or bread."
      ],
      estimated_time: "20 mins"
    };
  } else if (hasRice && hasPotato && hasOnion) {
    recipe = {
      recipe_name: "Veggie Tehri (Spicy Potato Rice)",
      ingredients_used: ["rice", "potato", "onion"],
      steps: [
        "Sauté onions and potatoes in a pot with jeera.",
        "Add turmeric and chili powder for a bright yellow color.",
        "Mix in washed rice and double water.",
        "Pressure cook or simmer until rice is fluffy.",
        "Garnish with a dollop of ghee or butter.",
        "Serve hot with yogurt or pickles."
      ],
      estimated_time: "25 mins"
    };
  }

  return recipe;
}

/**
 * Quick Indian Snack Engine.
 * Rules: 15 mins max, simple household cooking, NO new ingredients.
 * Returns ONLY JSON.
 */
function quickIndianSnackEngine(ingredientList = []) {
  const low = ingredientList.map(i => i.toLowerCase().trim());

  let snack = {
    recipe_name: "Quick Masala Bit",
    ingredients_used: [],
    steps: ["Heat a pan with oil and jeera.", "Sauté your ingredient until crisp.", "Add a pinch of salt and chili powder.", "Serve immediately."],
    estimated_time: "10 mins"
  };

  const hasBread = low.includes('bread');
  const hasOnion = low.includes('onion') || low.includes('onions');
  const hasEggs = low.includes('eggs') || low.includes('egg');
  const hasPotato = low.includes('potato') || low.includes('potatoes');

  if (hasBread && hasOnion) {
    snack = {
      recipe_name: "Masala Bread Bites",
      ingredients_used: ["bread", "onion"],
      steps: [
        "Cube the bread slices into small squares.",
        "Sauté chopped onions in oil until light brown.",
        "Add turmeric and chili powder to the oil.",
        "Toss the bread cubes in the spiced onion mix until crispy.",
        "Add salt to taste and remove from heat.",
        "Enjoy as a crunchy tea-time snack."
      ],
      estimated_time: "10 mins"
    };
  } else if (hasEggs) {
    snack = {
      recipe_name: "Spicy Fried Eggs (Sunny-Side Indian)",
      ingredients_used: ["eggs"],
      steps: [
        "Heat oil in a flat pan.",
        "Crack eggs directly onto the pan.",
        "Sprinkle chili powder and jeera immediately over the yolks.",
        "Cook until edges are crispy and white is set.",
        "Season with salt.",
        "Serve with a toast or alone as a high-protein snack."
      ],
      estimated_time: "8 mins"
    };
  } else if (hasPotato) {
    snack = {
      recipe_name: "Sautéed Chili Potatoes",
      ingredients_used: ["potato"],
      steps: [
        "Finely slice potatoes (chips-style) for fast cooking.",
        "Heat oil and sauté the slices on high heat.",
        "Once they start browning, add turmeric and chili powder.",
        "Stir-fry for 2-3 more minutes until fully cooked.",
        "Add salt and toss one last time.",
        "Serve hot and crispy."
      ],
      estimated_time: "12 mins"
    };
  } else if (low.length > 0) {
    const main = low[0];
    snack.recipe_name = `Spicy ${capitalize(main)} Tadhka`;
    snack.ingredients_used = [main];
    snack.steps = [
      `Quickly chop or prepare the ${main}.`,
      "Heat a spoon of oil with jeera (cumin).",
      `Sauté the ${main} with chili for 5 minutes.`,
      "Finish with salt and serve hot."
    ];
  }

  return snack;
}

/**
 * Indian Household Grocery Planner.
 * Rules: Avoid wasted items, suggest staples, minimal list.
 * Returns array of strings only.
 */
function indianGroceryPlanner({ current_pantry = [], low_stock_items = [], frequently_wasted_items = [] }) {
  const pantryNames = current_pantry.map(i => i.name.toLowerCase());
  const wasted = frequently_wasted_items.map(i => i.toLowerCase());
  const suggestions = new Set();

  // 1. Common Indian Staples to check
  const staples = ['atta', 'dal', 'rice', 'onion', 'potato', 'mustard oil', 'ghee', 'ginger', 'garlic'];

  // 2. Process low stock items (if not high waste)
  low_stock_items.forEach(item => {
    const name = item.toLowerCase();
    if (!wasted.includes(name)) {
      suggestions.add(name);
    }
  });

  // 3. Ensure staples are present (if not high waste)
  staples.forEach(s => {
    if (!pantryNames.some(pn => pn.includes(s)) && !wasted.includes(s)) {
      // Limit list size - don't overwhelm
      if (suggestions.size < 8) {
        suggestions.add(s);
      }
    }
  });

  return Array.from(suggestions);
}

/**
 * Filters and returns ingredients with a freshness score under 35.
 * Returns ONLY an array of ingredient names.
 */
function getCriticalIngredients(pantryData = pantry) {
  return pantryData
    .filter(item => calculateFreshness(item) < 35)
    .map(item => item.name);
}

refreshUI();
