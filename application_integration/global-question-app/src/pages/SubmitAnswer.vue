<template>
  <div style="padding: 24px">
    <h1>Your Answer</h1>

    <textarea
      v-model="answer"
      placeholder="Type your answer here..."
      style="width: 100%; height: 120px"
    ></textarea>

    <br /><br />
    <button @click="submitAnswer" style="padding: 10px 18px; font-size: 16px">Submit Answer</button>

    <p v-if="submitted" style="margin-top: 20px; color: #66ff99">Answer submitted ✔</p>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import Airtable from 'airtable'

// reused credentials 🚀
const token = 'pat6N4vuWuCScUcFH.8be9e6fa54c2cdbd4a83e7844993861a431b48d8fb4b4c6f3d503101386905bb'
const baseID = 'appJruOxLGdiwKrRw'

const base = new Airtable({ apiKey: token }).base(baseID)

const answer = ref('')
const submitted = ref(false)

// Replace the Airtable import and logic with this:
async function submitAnswer() {
  try {
    const response = await fetch('/api/save-answer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        answerText: answer.value,
        userId: localStorage.getItem('user_id'), // Strategy for tracking
      }),
    })

    if (response.ok) {
      submitted.value = true
    }
  } catch (err) {
    console.error('Submission failed', err)
  }
}
</script>
