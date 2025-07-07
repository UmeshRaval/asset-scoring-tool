// Utility: Parse decay formula dynamically using k and age
function getDecayFunction(formula, params) {
  const paramKeys = Object.keys(params);
  const paramValues = Object.values(params);

  // Create a function like: new Function("age", "k", "return 100 / (1 + Math.exp(k * (age - 5)))")
  const decayFn = new Function("age", ...paramKeys, `return ${formula};`);

  // Return a function where you pass only age
  return function(age) {
    return decayFn(age, ...paramValues);
  };
}
// Step 1: Compute age score using decay formula
function computeAgeScore(age, decayFn, baseline = 0) {
  return Math.max(baseline, Math.min(100, decayFn(age)));
}
// Step 2: Evaluate event score using logic in JSON
function evaluateEventScoreFromRules(events, scoringRules) {
  let totalScore = 0;

  for (const event of events) {
    const eventName = event.name;
    const eventData = event.data;
    
    // Check if this event type exists in scoring rules
    if (!scoringRules.events[eventName]) continue;
    
    const eventRule = scoringRules.events[eventName];
    const conditions = eventRule.conditions || [];
    const operators = eventRule.operators || {};

    for (const condition of conditions) {
      const value = eventData[condition.metric];
      if (value === undefined) continue;

      const operator = operators[condition.op];
      if (!operator || !operator.logic) continue;

      const ruleMatchFn = new Function("value", "rule", `return ${operator.logic};`);
      if (!ruleMatchFn(value, condition)) continue;

      const action = condition.action;
      if (!action || !action.logic) continue;

      const applyFn = new Function("totalScore", "value", "score", "factor", "rule", `return ${action.logic};`);
      totalScore = applyFn(totalScore, value, action.score ?? 0, action.factor ?? 1, condition);
    }
  }
  return totalScore;
}
// Step 4. Compute final score
function combineScores(ageScore, eventScore, min = 0, max = 100, decimals = 2) {
  const raw = Math.max(min, Math.min(max, ageScore + eventScore));
  return parseFloat(raw.toFixed(decimals));
}
// Export functions for use in other modules
module.exports = {
  getDecayFunction,
  computeAgeScore,
  evaluateEventScoreFromRules,
  combineScores
};