const fs = require('fs');
const path = require('path');
// Import logic from asset-scorer.js
const {
  getDecayFunction,
  computeAgeScore,
  evaluateEventScoreFromRules,
  combineScores
} = require('./asset-scorer');
// Load config JSON (weight.json)
const configPath = path.join(__dirname, 'weight.json');
const scoringRules = JSON.parse(fs.readFileSync(configPath, 'utf8'));
// Example input: eventDetail (sensor data or logs)
const events = [
  {
    name: "low_water_pressure_alert",
    data: {
      water_pressure_bar: 1.8
    }
  },
  {
    name: "inspect_valves",
    data: {
      inspection_time_minutes: 10
    }
  },
  {
    name: "check_oil_level",
    data: {
      oil_level_percent: 40
    }
  },
  {
    name: "temperature_alert",
    data: {
      temperature_celsius: 120
    }
  },
  {
    name: "relay_check",
    data: {
      contact_resistance_ohms: 2.2
    }
  }
];
// Example asset age in years
const assetAge = 2;
// Step 1: Create decay function
const decayFn = getDecayFunction(
  scoringRules.decay_formula,
  scoringRules.decay_params || {}
);
// Step 2: Compute baseline + age decay score
const ageScore = computeAgeScore(
  assetAge,
  decayFn,
  scoringRules.baseline_score
);
// Step 3: Compute event-based contribution
const eventScore = evaluateEventScoreFromRules(events, scoringRules);
// Step 4: Combine and clamp
const finalScore = combineScores(ageScore, eventScore);
// Output result
console.log(`Asset age: ${assetAge} years`);
console.log(`Age-based score: ${ageScore.toFixed(2)}`);
console.log(`Event-based adjustment: ${eventScore.toFixed(2)}`);
console.log(`\n Final asset score: ${finalScore.toFixed(2)}`);