<template>
  <div class="analytics-shell">
    <div class="analytics-inner">
      <h1>Daily Analytics</h1>
      <p class="sub">
        Here’s how today’s thinkers approached the challenge.
      </p>

      <section class="panel">
        <h2>Speed & Completion</h2>
        <p class="placeholder">
          ⌛ You answered faster than …% of users.
        </p>
      </section>

      <section class="panel">
        <h2>Answer Distribution</h2>
        <p class="placeholder">
          📊 Bar / pie chart for which answers were most common.
        </p>
      </section>

      <section class="panel">
        <h2>Global Perspective</h2>
        <p class="placeholder">
          🌍 “Most aligned with … country” style insight here.
        </p>
      </section>
    </div>
  </div>
</template>

<script setup>
</script>

<style scoped>
.analytics-shell {
  min-height: 100vh;
  background: #050609;
  color: #f5f5f5;
  padding: 40px 24px;
  display: flex;
  justify-content: center;
}

.analytics-inner {
  max-width: 960px;
  width: 100%;
}

h1 {
  font-size: 28px;
  margin-bottom: 4px;
}

.sub {
  opacity: 0.8;
  margin-bottom: 24px;
}

.panel {
  background: #111318;
  border-radius: 20px;
  padding: 20px 22px;
  margin-bottom: 18px;
}

.panel h2 {
  font-size: 18px;
  margin-bottom: 8px;
}

.placeholder {
  opacity: 0.8;
}
</style>
