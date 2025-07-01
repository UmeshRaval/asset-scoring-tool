function computeAge(installed, current, granularity = "years") {
  const msPerDay = 1000 * 60 * 60 * 24;
  const ageMs = current - installed;
  const ageDays = ageMs / msPerDay;
  return ageDays / 365; // Always return in years
}

function computeAgeScore(age, options = {}) {
  const {
    model = "exponential",   // "exponential", "linear", "piecewise", or "sigmoid"
    k = 0.15,                 // For exponential decay
    slope = 5,               // For linear decay
    baseline = 35,           // Minimum score
    granularity = "years",   // Age unit
    piecewiseTiers = [       // For piecewise scoring
      { maxAge: 2, score: 90 },
      { maxAge: 5, score: 70 },
      { maxAge: 8, score: 50 },
      { maxAge: Infinity, score: baseline }
    ],
    sigmoidParams = {        // For sigmoid decay
      growthRate: 1,
      midAge: 5,
      maxScore: 100
    }
  } = options;

  // Adjust k or slope for granularity
  let adjustedK = k;
  let adjustedSlope = slope;
  switch (granularity) {
    case "days":
      adjustedK = k / 365;
      adjustedSlope = slope / 365;
      break;
    case "weeks":
      adjustedK = k / 52;
      adjustedSlope = slope / 52;
      break;
    case "months":
      adjustedK = k / 12;
      adjustedSlope = slope / 12;
      break;
    case "years":
    default:
      adjustedK = k;
      adjustedSlope = slope;
  }

  // Scoring model switch
  let score = 0;
  switch (model) {
    case "linear":
      score = 100 - adjustedSlope * age;
      break;

    case "piecewise":
      for (let tier of piecewiseTiers) {
        if (age <= tier.maxAge) {
          score = tier.score;
          break;
        }
      }
      break;

    case "sigmoid":
      const { growthRate, midAge, maxScore } = sigmoidParams;
      score = baseline + (maxScore - baseline) / (1 + Math.exp(growthRate * (age - midAge)));
      break;

    case "exponential":
    default:
      score = 100 * Math.exp(-adjustedK * age);
  }

  return Math.round(Math.max(score, baseline));
}


function generateAges(dist = "normal", count = 1000) {
  const ages = [];
  for (let i = 0; i < count; i++) {
    let age;
    if (dist === "normal") {
      let u1 = Math.random(), u2 = Math.random();
      age = Math.abs((Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)) * 3 + 5);
    } else if (dist === "uniform") {
      age = Math.random() * 10;
    } else if (dist === "exponential") {
      let lambda = 0.3;
      age = Math.min(-Math.log(1 - Math.random()) / lambda, 10);
    }
    ages.push(parseFloat(age.toFixed(2)));
  }
  return ages;
}
function computeHistogramBins(data, binCount = 10) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const binSize = (max - min) / binCount;
  const bins = Array(binCount).fill(0);
  const labels = [];

  for (let i = 0; i < binCount; i++) {
    labels.push(`${(min + i * binSize).toFixed(1)}–${(min + (i + 1) * binSize).toFixed(1)}`);
  }

  data.forEach(age => {
    let binIndex = Math.floor((age - min) / binSize);
    if (binIndex >= binCount) binIndex = binCount - 1;
    bins[binIndex]++;
  });

  return { labels, bins };
}
function generateAndPlot() {
  const dist = document.getElementById("distribution").value;
  const model = document.getElementById("plotModel").value;
  const baseline = parseFloat(document.getElementById("plotBaseline").value) || 0;

  const ages = generateAges(dist);
  const scores = ages.map(age =>
    computeAgeScore(age, {
      model: model,
      baseline: baseline,
      k: 0.15,
      slope: 5,
      sigmoidParams: { growthRate: 1, midAge: 5, maxScore: 100 },
      piecewiseTiers: [
        { maxAge: 2, score: 90 },
        { maxAge: 5, score: 70 },
        { maxAge: 8, score: 50 },
        { maxAge: Infinity, score: baseline }
      ]
    })
  );

  // Destroy previous scatter chart if exists
  if (window.assetChart) window.assetChart.destroy();
  const ctx = document.getElementById("scoreChart").getContext("2d");
  window.assetChart = new Chart(ctx, {
    type: "scatter",
    data: {
      datasets: [{
        label: "Assets",
        data: ages.map((a, i) => ({ x: a, y: scores[i] })),
        backgroundColor: "rgba(54, 162, 235, 0.6)",
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { title: { display: true, text: "Asset Age (Years)" }, min: 0, max: 10 },
        y: { title: { display: true, text: "Asset Score" }, min: 0, max: 100 }
      }
    }
  });

  const hist = computeHistogramBins(ages, 10);
  const histCtx = document.getElementById("ageHistogram").getContext("2d");
  if (window.histChart) window.histChart.destroy();

  window.histChart = new Chart(histCtx, {
    type: "bar",
    data: {
      labels: hist.labels,
      datasets: [{
        label: "Age Distribution",
        data: hist.bins,
        backgroundColor: "rgba(255, 159, 64, 0.7)"
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { title: { display: true, text: "Age Ranges (Years)" } },
        y: { title: { display: true, text: "Asset Count" }, beginAtZero: true }
      }
    }
  });
}
function getAge(installedDateStr, granularity) {
  const now = new Date();
  const [year, month, day] = installedDateStr.split("-").map(Number);
  const installedDate = new Date(Date.UTC(year, month - 1, day));
  const diff = now - installedDate;

  switch (granularity) {
    case "days": return diff / (1000 * 60 * 60 * 24);
    case "weeks": return diff / (1000 * 60 * 60 * 24 * 7);
    case "months": return diff / (1000 * 60 * 60 * 24 * 30);
    case "years": return diff / (1000 * 60 * 60 * 24 * 365);
    default: console.warn("Unknown granularity:", granularity);
      return diff / (1000 * 60 * 60 * 24 * 365);
  }
}
function computeScore(age, k, minScore, delta = 0) {
  const ageScore = minScore + (100 - minScore) * Math.exp(-k * age);
  const finalScore = Math.max(0, Math.min(100, ageScore + delta));
  return finalScore;
}
function computeEventDelta(events) {
  let delta = 0;

  events.forEach(event => {
    const { event_type, status, subtype, event_detail } = event;

    if (!event_detail || typeof event_detail !== 'object') return;

    // Sample logic based on known keys and subtype relevance
    if (event_detail.oil_level_percent !== undefined && event_detail.oil_level_percent < 50) delta -= 5;
    if (event_detail.water_pressure_bar !== undefined && event_detail.water_pressure_bar < 2) delta -= 5;
    if (event_detail.filter_condition === 'Dirty') delta -= 3;
    if (event_detail.inspection_time_minutes && event_detail.inspection_time_minutes > 20) delta += 2;
    if (event_detail.temperature_celsius !== undefined && event_detail.temperature_celsius > 100) delta -= 5;
    if (event_detail.contact_resistance_ohms !== undefined && event_detail.contact_resistance_ohms > 1) delta -= 4;
    if (event_detail.relay_closed === true && event_detail.relay_open === false) delta += 2;

    // Alerts marked resolved (via maintenance) increase score
    if (event_type === "alert" && status === "completed") delta += 3;
  });

  return delta;
}
function calculateAssetScore() {
  const installedDate = document.getElementById("installedDate").value;
  const granularity = document.getElementById("granularity").value;
  const k = parseFloat(document.getElementById("decayRate").value);
  const baseline = parseFloat(document.getElementById("baseline").value);
  const eventInput = document.getElementById("eventData").value;

  if (!installedDate) {
    alert("Please enter a valid installation date.");
    return;
  }

  let events = [];
  try {
    events = JSON.parse(eventInput);
    if (!Array.isArray(events)) throw new Error();
  } catch {
    alert("Invalid event JSON. Must be an array of events.");
    return;
  }

  const age = getAge(installedDate, granularity);
  const delta = computeEventDelta(events);
  const score = computeScore(age, k, baseline, delta);

  document.getElementById("output").textContent = `Asset age: ${age.toFixed(2)} ${granularity}, Score: ${score.toFixed(2)}`;
  console.log("Granularity selected:", granularity);
  drawChart(age, score, k, baseline);
}
function drawChart(age, score, k, minScore) {
  const ages = Array.from({ length: 100 }, (_, i) => i / 2);
  const scores = ages.map(a => computeScore(a, k, minScore));

  const ctx = document.getElementById("scoreChart").getContext("2d");
  if (window.assetChart) window.assetChart.destroy();
  const roundedAge = parseFloat(age.toFixed(2));
  window.assetChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: ages,
      datasets: [
        {
          label: 'Age vs Score (No Events)',
          data: scores,
          fill: false,
          borderColor: 'blue'
        },
        {
          label: 'Current Asset',
          data: [{ x: roundedAge, y: score }],
          pointBackgroundColor: 'red',
          pointRadius: 6,
          type: 'scatter'
        }
      ]
    },
    options: {
      responsive: true,
      plugins: { legend: { position: 'top' } },
      scales: {
        x: { title: { display: true, text: 'Age' } },
        y: { title: { display: true, text: 'Score' }, min: 0, max: 100 }
      }
    }
  });
}