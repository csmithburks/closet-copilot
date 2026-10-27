# Closet Copilot

> A personal AI stylist that costs $0 to run. Photograph your clothes, and it suggests outfits for the occasion and today's weather, then learns your taste from what you wear, save or skip. Everything runs and is stored on your phone: no account, no cloud, no subscription.

**Built with:** Expo / React Native (≈3,600 lines of JavaScript) · optional Google Gemini (free tier) for photo auto-tagging · runs as an iPhone home-screen web app

---

## The product bet

AI-stylist apps are a great idea that usually comes with a subscription and your wardrobe photos on someone else's server. I wanted to know how much of the value I could deliver for **free and on-device**, so the core recommendation engine is **rules, not an LLM**, and AI is used only where it clearly saves effort: tagging clothing photos.

| Problem | My answer |
|---|---|
| Recommendations need taste, not just matching | A scoring engine for color theory, formality, pattern mixing, weather and variety, plus feedback that learns your preferences |
| Cataloging a closet is tedious | Optional Gemini auto-fill for type, color, pattern, dressiness, warmth, logos and vibe from a front/back photo |
| AI APIs cost money | Users bring their own **free** Gemini key. If one model's daily quota runs out, the app falls back through a list of models automatically. |
| Privacy | Photos and data stay on the phone. The API key is never backed up. AI output is validated against the app's catalog, and anything unknown is dropped. |

## How the stylist decides (`src/stylist.js`)

The stylist scores every possible outfit from your closet on:

- **Formality fit** for the occasion
- **Color theory:** neutrals plus accents, classic and awkward pairings, contrast, tonal looks
- **Pattern mixing** rules
- **Weather:** temperature and rain from your location (`src/weather.js`)
- **Variety:** recently worn pieces rank lower
- **Learned taste:** *Wear / Save / Not for me* adjust pair and color preferences over time

## Style vibes grounded in sources (`src/aesthetics.js`)

There are eight vibes: old money, preppy, minimalist, streetwear, workwear, coastal, dark academia and athleisure. Each defines liked and disliked pieces, a palette, patterns, materials, fits and details, drawn from:

- **[Aesthetics Wiki](https://aesthetics.fandom.com)** (CC BY-SA): which pieces, colors, fabrics and patterns define each look. Each vibe links its source page.
- **[Fashionpedia](https://fashionpedia.github.io)** (ontology, CC BY 4.0): the vocabulary for patterns, fit, materials and details

Source-listed attributes (`like`) carry full weight. Common conventions I added (`also`) carry less, so the vibes stay traceable to their sources.

## Project structure

```
src/stylist.js      # outfit scoring engine
src/aesthetics.js   # style vibes + sources
src/catalog.js      # clothing types, colors, patterns
src/color.js        # color theory helpers
src/ai.js           # Gemini auto-fill with model fallback + output validation
src/weather.js      # local weather for outfit fit
src/screens/        # Closet, Item editor, Style, Looks, Profile
```

## Run it

```bash
npm install
npx expo start                 # open in Expo Go
npx expo export -p web
npx eas-cli@latest deploy --prod
```

Open the deployed URL in Safari → Share → **Add to Home Screen**. For AI auto-fill, paste a free key from [aistudio.google.com/apikey](https://aistudio.google.com/apikey) under Profile.

<!-- TODO Chris: add screenshots (closet grid, an outfit card with its "why", the vibe picker) in docs/ and link them here -->

---

*Built by [Chris Smith-Burks](https://www.linkedin.com/in/christophersmith-burks) with Claude as a pair programmer. Code: MIT. Vibe definitions derived from Aesthetics Wiki are CC BY-SA 4.0.*
