<template>
  <div style="padding: 24px;">
    <h1>Your Answer</h1>

    <textarea v-model="answer" placeholder="Type your answer here..." style="width:100%;height:120px;"></textarea>

    <br/><br/>
    <button @click="submitAnswer" style="padding:10px 18px;font-size:16px;">
      Submit Answer
    </button>

    <p v-if="submitted" style="margin-top:20px;color:#66ff99;">
      Answer submitted ✔
    </p>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import Airtable from "airtable"

// reused credentials 🚀
const token = "YOUR_TOKEN_HERE"
const baseID = "appJruOxLGdiwKrRw"

const base = new Airtable({ apiKey: token }).base(baseID)

const answer = ref("")
const submitted = ref(false)

function submitAnswer(){
  base("UserAnswers").create({
    AnswerText: answer.value
  }, () => { submitted.value = true })
}
</script>
