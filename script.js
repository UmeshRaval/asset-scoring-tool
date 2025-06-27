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
function calculateScore() {
  console.log("Model selected:", document.getElementById("model").value);
  console.log("Granularity selected:", document.getElementById("granularity").value);
  const installed = new Date(document.getElementById("installedDate").value);
  const current = new Date(document.getElementById("currentDate").value);
  const granularity = document.getElementById("granularity").value;
  const model = document.getElementById("model").value;
  const k = parseFloat(document.getElementById("decayK").value) || 0.15;
  const baseline = parseFloat(document.getElementById("baseline").value) || 0;

  if (isNaN(installed) || isNaN(current)) {
    document.getElementById("manualScore").innerText = "Please enter valid dates.";
    return;
  }

  const ageYears = computeAge(installed, current); // Always in years

  const score = computeAgeScore(ageYears, {
    model: model,
    baseline: baseline,
    k: k,
    slope: 5,
    sigmoidParams: { growthRate: 1, midAge: 5, maxScore: 100 },
    piecewiseTiers: [
      { maxAge: 2, score: 90 },
      { maxAge: 5, score: 70 },
      { maxAge: 8, score: 50 },
      { maxAge: Infinity, score: baseline }
    ]
  });

  let displayAge = ageYears;
  switch (granularity) {
    case "days": displayAge = ageYears * 365; break;
    case "months": displayAge = ageYears * 12; break;
    case "weeks": displayAge = ageYears * 52; break;
  }

  document.getElementById("manualScore").innerText = `Asset Age: ${displayAge.toFixed(2)} ${granularity}, Score: ${score}`;
}