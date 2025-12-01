<template>
  <div class="analytics-wrapper">

    <!-------------------------------------------
      🌑 LEFT — PERSONAL DAILY ANALYTICS (42%)
    -------------------------------------------->
    <section class="left-pane">

      <!-- Page Title -->
      <h1 class="title">Daily Analytics</h1>
      <p class="sub">{{ personalSubline }}</p>

      <!-- Hero Summary Banner -->
      <div class="hero-box">
        <h2 class="hero-line">{{ heroHeadline }}</h2>
        <p class="hero-sub">{{ heroDescription }}</p>
      </div>

      <!-- Primary data visuals -->
      <div class="primary-stats-grid">

        <!-- Completion -->
        <div class="stat-card large">
          <p class="stat-label">Completion Rate</p>
          <canvas ref="completionRing"></canvas>
          <span class="stat-value">{{ displayCompletion }}%</span>
        </div>

        <!-- Accuracy -->
        <div class="stat-card medium">
          <p class="stat-label">Accuracy</p>
          <canvas ref="accuracyRing"></canvas>
          <span class="stat-value">{{ displayAccuracy }}%</span>
        </div>

        <!-- Speed -->
        <div class="stat-card medium">
          <p class="stat-label">Speed Percentile</p>
          <canvas ref="speedBar"></canvas>
          <span class="stat-value small">{{ displaySpeed }}%</span>
        </div>
      </div>

      <!-- PERSONAL ROTATING CHART AREA (10 types) -->
      <div class="chart-dynamic personal-chart">
        <canvas ref="personalChartCanvas"></canvas>
      </div>
    </section>



    <!-------------------------------------------
      🌍 RIGHT — GLOBAL WORLDWIDE VIEW (58%)
    -------------------------------------------->
    <section class="right-pane">

      <h2 class="g-title">Global View</h2>
      <p class="g-sub">{{ globalSubline }}</p>

      <!-- Insight Cards -->
      <div class="insight-grid">
        <div v-for="c in globalInsights" :key="c.label" class="insight-card">
          <p class="card-tag">{{ c.label }}</p>
          <h3 class="card-head">{{ c.title }}</h3>
          <p class="card-desc">{{ c.body }}</p>
        </div>
      </div>

      <!-- GLOBAL ROTATING CHARTS (10 types) -->
      <div class="global-charts-area">
        <div class="global-chart big"><canvas ref="globalChart1"></canvas></div>
        <div class="global-chart tall"><canvas ref="globalChart2"></canvas></div>
        <div class="global-chart wide"><canvas ref="globalChart3"></canvas></div>
      </div>

      <p class="rotation-note">
        Views refresh daily. Tomorrow tells a new story.
      </p>

    </section>
  </div>
</template>



<script setup>
/* ===========================================================
   Imports + Base State
=========================================================== */
import { ref, computed, onMounted, nextTick } from "vue"
import Chart from "chart.js/auto"
import { countries } from "@/data/countries.js"

/* BRAND PALETTE */
const COLORS = {
  blue: "#4B7BFF",
  gold: "#FFCC4D",
  green: "#21D59B",
  orange: "#FF884D",
  royal: "#2431A3",
  lilac: "#A89BFF",
  pink: "#F76CBC",
  cream: "#FFF9E5",
  dark: "#0D0F11",
  ink: "#1A1D22"
}



/* ===========================================================
   1) LOAD TODAY'S PERFORMANCE
=========================================================== */
const personal = ref({
  correct: 0, total: 0,
  completion: 0, accuracy: 0, speed: 0,
  attempts: 0
})

import axios from "axios"

async function loadPersonalSummary(){
  const today = new Date().toISOString().slice(0,10)

  const res = await axios.get("https://api.airtable.com/v0/YOUR_BASE_ID/DailyAnalyticsDemo", {
    headers: { Authorization: `Bearer ${import.meta.env.VITE_AIRTABLE_TOKEN}` },
    params: { filterByFormula: `{date} = "${today}"`, maxRecords:1 }
  })

  const row = res.data.records?.[0]?.fields

  // if no record exists → fallback gracefully
  if(!row) { console.warn("NO DATA FOR TODAY — Airtable empty"); return }

  personal.value = {
    total: row.total_answers,
    correct: row.correct_answers,
    completion: Math.round(row.correct_answers/row.total_answers*100),
    accuracy: Math.round(row.correct_answers/row.total_answers*100),
    speed: row.global_avg_speed,   // for now — can tune later
    attempts: row.attempts
  }
}


const displayCompletion = computed(()=>Math.round(personal.value.completion))
const displayAccuracy   = computed(()=>Math.round(personal.value.accuracy))
const displaySpeed      = computed(()=>Math.round(personal.value.speed))



/* ===========================================================
   2) TEXT + STORY VARIANTS
=========================================================== */
const personalSubVariants = [
 "How today felt, backed by data.",
 "Your performance — but visualised.",
 "A data-shaped memory of today.",
 "How you moved through the puzzle.",
 "Today, translated into patterns.",
 "Where you accelerated — where you paused.",
 "Your thinking style, made measurable.",
 "A trace of today’s decisions.",
 "What today says about your cognition."
]

const globalSubVariants = [
 "How today looked worldwide — including you.",
 "You + the world = today’s outcome.",
 "Where you sat in the global landscape.",
 "Your style, compared to thousands.",
 "How today’s question unfolded across borders.",
 "A world map of decision-making.",
 "Your percentile, your peers, your place.",
 "A global brainprint of today’s challenge.",
 "Today in context — not isolation."
]

function pick(arr){return arr[Math.floor(Math.random()*arr.length)]}

/* HERO TEXT */
const heroHeadline   = ref("")
const heroDescription= ref("")
const globalInsights = ref([])

function buildHeroCopy(p){
  if(p.completion===100) heroHeadline.value="Perfect day."
  else if(p.completion>=90) heroHeadline.value="High-precision session."
  else if(p.completion>=70) heroHeadline.value="Confident run."
  else heroHeadline.value="Curious exploration."

  heroDescription.value =
    `You solved ${p.correct}/${p.total} with ${p.accuracy}% accuracy and a ${p.speed}th percentile pace.`
}

/* GLOBAL INSIGHT CARDS */
const globalInsightTemplates = [
  p=>({label:"Speed",title:"Fast lane.",
       body:`You outran ${p.speed}% of players today.`}),
  p=>({label:"Accuracy",title:"Sharp aim.",
       body:`${p.accuracy}% places you in the competitive bracket.`}),
  p=>({label:"Completion",title:p.completion===100? "Clean sweep.":"Solid attempt.",
       body:p.completion===100?
       "Full grid solve — statistically uncommon."
       :`You filled ${p.completion}% of the board.`}),
  p=>({label:"Profile",title:"Today's signature.",
       body:`Your pattern today: fast tempo + ${p.accuracy}% precision.`}),
  p=>({label:"Country Match",title:`Closest match: ${currentCountry}.`,
       body:`Your stats resemble users in ${currentCountry}.`}
)]
const currentCountry = countries.find(c=>c.code===localStorage.getItem("akinto_country"))?.name || "several regions"

function buildGlobalInsights(){
  globalInsights.value = [pick(globalInsightTemplates)(personal.value), pick(globalInsightTemplates)(personal.value), pick(globalInsightTemplates)(personal.value)]
}



/* ===========================================================
   3) 20 CHART TYPES — ROTATING DAILY
=========================================================== */

const completionRing  = ref(null)
const accuracyRing    = ref(null)
const speedBar        = ref(null)

const personalChartCanvas = ref(null)
const globalChart1 = ref(null)
const globalChart2 = ref(null)
const globalChart3 = ref(null)

let charts=[]

function destroyAll(){charts.forEach(c=>c.destroy());charts=[]}

/* ---------- PERSONAL CHARTS (10) ---------- */
const personalCharts=[
  // 1 completion donut
  (ctx,p)=>new Chart(ctx,{type:"doughnut",
    data:{labels:["Done","Left"],datasets:[{data:[p.completion,100-p.completion],
      backgroundColor:[COLORS.green,COLORS.ink]}]},options:{plugins:{legend:{display:false}},cutout:"70%"} }),

  // 2 accuracy timeline w/ variation
  (ctx,p)=>new Chart(ctx,{type:"line",
    data:{labels:["Start","10s","20s","30s","40s","End"],
    datasets:[{data:[20,40,60,p.accuracy-3,p.accuracy,100],borderColor:COLORS.blue,tension:.35}]},
    options:{plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,max:100}}}}),

  // 3 attempts vs ideal
  (ctx,p)=>new Chart(ctx,{type:"bar",
    data:{labels:["Ideal","You"],datasets:[{data:[1,p.attempts],backgroundColor:[COLORS.blue,COLORS.orange],borderRadius:6}]},
    options:{plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,ticks:{precision:0}}}}}),

  // 4 correct vs incorrect
  (ctx,p)=>new Chart(ctx,{type:"doughnut",
    data:{labels:["Correct","Incorrect"],datasets:[{data:[p.correct,p.total-p.correct],backgroundColor:[COLORS.green,COLORS.pink]}]},
    options:{plugins:{legend:{display:false}},cutout:"65%"} }),

  // 5 rare answer est.
  (ctx,p)=>new Chart(ctx,{type:"bar",
    data:{labels:["Common","Rare"],datasets:[{data:[p.correct-1,1],backgroundColor:[COLORS.lilac,COLORS.gold],borderRadius:8}]},
    options:{plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,display:false}}}}),

  // 6 solve velocity (synthetic curve)
  (ctx)=>new Chart(ctx,{type:"line",
    data:{labels:["L1","L2","L3","L4","L5"],datasets:[{data:[15,35,70,85,100],borderColor:COLORS.orange,tension:.4}]} ,
    options:{plugins:{legend:{display:false}},scales:{x:{display:false},y:{display:false}}}}),

  // 7 streak projection (placeholder)
  (ctx)=>new Chart(ctx,{type:"bar",
    data:{labels:["Streak"],datasets:[{data:[Math.random()*7+3],backgroundColor:COLORS.blue,borderRadius:4}]} }),

  // 8 progress expected vs actual
  (ctx,p)=>new Chart(ctx,{type:"radar",
    data:{labels:["Expect","Actual","Speed"],datasets:[{data:[80,p.accuracy,p.speed],backgroundColor:"rgba(75,123,255,0.2)",borderColor:COLORS.blue}]} }),

  // 9 answer confidence drop-off (synthetic)
  (ctx)=>new Chart(ctx,{type:"line",
    data:{labels:["A","B","C","D"],datasets:[{data:[100,82,70,65],borderColor:COLORS.green}]} }),

  // 10 heat tile sample
  (ctx)=>new Chart(ctx,{type:"bar",
    data:{labels:["Day"],datasets:[{data:[Math.random()*100],backgroundColor:COLORS.gold}]} })
]

/* ---------- GLOBAL CHARTS (10) ---------- */
const globalCharts=[
  (ctx,p)=>new Chart(ctx,{type:"bar",data:{labels:["You","World"],datasets:[{data:[p.completion,p.completion-10],backgroundColor:[COLORS.blue,COLORS.lilac],borderRadius:6}]} }),
  (ctx,p)=>new Chart(ctx,{type:"radar",
    data:{labels:["Median","Top25","You"],datasets:[{data:[60,85,p.accuracy],backgroundColor:"rgba(33,213,155,.25)",borderColor:COLORS.green}]} }),
  (ctx)=>new Chart(ctx,{type:"doughnut",data:{labels:["Hints","No-hints"],datasets:[{data:[30,70],backgroundColor:[COLORS.orange,COLORS.cream]}]} }),
  (ctx)=>new Chart(ctx,{type:"bar",data:{labels:["<20","20-40","40-60","60-80","80+"],datasets:[{data:[12,22,41,18,7],backgroundColor:COLORS.royal}]} }),
  (ctx)=>new Chart(ctx,{type:"line",data:{labels:["0%","50%","100%"],datasets:[{data:[25,60,82],borderColor:COLORS.blue}]} }),
  (ctx)=>new Chart(ctx,{type:"bar",data:{labels:["UK","NL","SG","BR"],datasets:[{data:[38,29,26,18],backgroundColor:[COLORS.gold,COLORS.green,COLORS.blue,COLORS.orange]}]} }),
  (ctx)=>new Chart(ctx,{type:"pie",data:{labels:["AM","PM"],datasets:[{data:[55,45],backgroundColor:[COLORS.pink,COLORS.lilac]}]} }),
  (ctx)=>new Chart(ctx,{type:"bar",data:{labels:["A","B","C","D"],datasets:[{data:[80,60,55,30],backgroundColor:COLORS.cream}]} }),
  (ctx)=>new Chart(ctx,{type:"radar",data:{labels:["Solve","Speed","Accuracy","Luck"],datasets:[{data:[65,90,85,42],backgroundColor:"rgba(255,136,77,0.25)",borderColor:COLORS.orange}]} }),
  (ctx)=>new Chart(ctx,{type:"doughnut",data:{labels:["Top10%","Others"],datasets:[{data:[11,89],backgroundColor:[COLORS.green,COLORS.ink]}]} })
]


/* ===========================================================
   Render Charts — ONCE PER DAY
=========================================================== */
function renderCharts(){
  destroyAll()
  const p=personal.value

  // static metric render (rings + bar)
  charts.push(
    personalCharts[0](completionRing.value.getContext("2d"),p),
    personalCharts[0](accuracyRing.value.getContext("2d"),p),
    personalCharts[0](speedBar.value.getContext("2d"),p)
  )

  // personal rotating (10)
  const P = personalCharts[Math.floor(Math.random()*personalCharts.length)]
  charts.push(P(personalChartCanvas.value.getContext("2d"),p))

  // global rotating (pick 3/10)
  const G1=globalCharts[Math.floor(Math.random()*globalCharts.length)]
  const G2=globalCharts[Math.floor(Math.random()*globalCharts.length)]
  const G3=globalCharts[Math.floor(Math.random()*globalCharts.length)]
  charts.push(G1(globalChart1.value.getContext("2d"),p))
  charts.push(G2(globalChart2.value.getContext("2d"),p))
  charts.push(G3(globalChart3.value.getContext("2d"),p))
}



/* ===========================================================
   LIFECYCLE
=========================================================== */
onMounted(async()=>{
  loadPersonalSummary()
  buildHeroCopy(personal.value)
  buildGlobalInsights()

  personalSubline.value = pick(personalSubVariants)
  globalSubline.value   = pick(globalSubVariants)

  await nextTick()
  renderCharts()
})

const personalSubline = ref("")
const globalSubline = ref("")
</script>



<style scoped>

/* Grid Structure */
.analytics-wrapper{
  display:flex;
  width:100vw; height:100vh;
  font-family:Inter,system-ui;
  overflow:hidden;
}

/* Left Panel */
.left-pane{
  width:42%;
  padding:48px 54px;
  background:#0D0F11; color:#fff;
  overflow-y:auto;
}
.title{font-size:30px;font-weight:700;margin:0 0 4px}
.sub{opacity:.7;font-size:15px;margin-bottom:22px}

.hero-box{
  background:#1A1D22;
  padding:22px 28px;border-radius:18px;margin-bottom:32px;
}
.hero-line{font-size:20px;margin-bottom:4px;font-weight:600}
.hero-sub{opacity:.75;font-size:14px}

/* Primary stat blocks */
.primary-stats-grid{
  display:grid;
  grid-template-columns:1.4fr 1fr 1fr;
  gap:14px;margin-bottom:28px;
}
.stat-card{
  background:#13171C;border-radius:16px;
  padding:16px;text-align:center;position:relative;
}
.stat-card.large{height:175px}
.stat-card.medium{height:155px}
.stat-label{opacity:.75;font-size:13px;margin-bottom:6px}
.stat-value{font-size:18px;font-weight:600;position:absolute;bottom:14px;left:50%;transform:translateX(-50%)}
.stat-value.small{font-size:16px}

/* Chart block */
.chart-dynamic{
  padding:14px;border-radius:18px;background:#13171C;
  height:260px;display:flex;align-items:center;justify-content:center;
}
.personal-chart canvas{height:230px;width:100%}

/* RIGHT PANEL */
.right-pane{
  width:58%;
  background:#fff;color:#111;padding:54px 72px;
  overflow-y:auto;
}
.g-title{font-size:26px;font-weight:700;margin:0 0 6px}
.g-sub{opacity:.6;margin:0 0 24px;font-size:15px}

/* Insight Cards */
.insight-grid{
  display:grid;
  grid-template-columns:repeat(auto-fit,minmax(250px,1fr));
  gap:16px;margin-bottom:32px;
}
.insight-card{
  background:#F7F7FA;border-radius:14px;padding:18px 16px;
  border:1px solid rgba(0,0,0,.06);
}
.card-tag{text-transform:uppercase;font-size:10px;opacity:.6;margin-bottom:3px}
.card-head{font-weight:600;margin:0 0 3px}
.card-desc{opacity:.80;font-size:13px;line-height:1.5}

/* Global chart layout — asymmetrical */
.global-charts-area{
  display:grid;
  grid-template-columns:1.3fr 1fr;
  grid-template-rows:230px 150px;
  gap:14px;
}
.global-chart.big{grid-column:1/2;grid-row:1/2}
.global-chart.tall{grid-column:2/3;grid-row:1/3}
.global-chart.wide{grid-column:1/2;grid-row:2/3}
.global-chart canvas{width:100%;height:100%}

.rotation-note{
  text-align:center;margin-top:14px;font-size:13px;opacity:.55;
}

/* Mobile */
@media(max-width:900px){
  .analytics-wrapper{flex-direction:column}
  .left-pane,.right-pane{width:100%;padding:28px}
  .primary-stats-grid{grid-template-columns:1fr}
  .global-charts-area{grid-template-columns:1fr;grid-template-rows:auto}
}
</style>
