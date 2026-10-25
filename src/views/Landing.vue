<script setup>
import { useRouter } from 'vue-router'
import { WPSI_CATEGORIES } from '../utils/wpsi'
import Nav from '../components/Nav.vue'
import CoastPanel from '../components/ui/CoastPanel.vue'
import Icon from '../components/ui/Icon.vue'

const router = useRouter()
// Logged-out visitors are sent to login/register by the route guard and then continue to the assessment.
const start = () => router.push({ name: 'consent' })
const how = () => router.push({ name: 'landing', hash: '#how-it-works' })

const steps = [
  { icon: 'clipboard', t: 'Answer privacy scenarios', d: 'Short, realistic situations about apps, websites and personal data, presented one question at a time. Review your answers before you submit.' },
  { icon: 'sparkle', t: 'Get your classification', d: 'Your saved answers are analysed by the project’s approved classification workflow and placed into one of three privacy perspectives.' },
  { icon: 'eye', t: 'Explore your profile', d: 'Open your personal result page, read what the category means, and revisit past results from your dashboard.' },
]
const faqs = [
  ['Do I need an account?', 'Yes. You create a free account so your answers and results are saved to your own private dashboard. Staff cannot be created through the public sign-up.'],
  ['Is this a personality test?', 'No. It is about how you think about personal data and digital services. The three categories describe different approaches, not better or worse ones.'],
  ['Who can see my answers?', 'Researchers work with aggregated or pseudonymised results. Identifiable account details are limited to authorised administrators. Final data-handling wording is pending approval by the project team and supervisor.'],
  ['Is the result scientifically validated?', 'This is a student research prototype based on the Westin framework. It has not been presented as a validated clinical or professional assessment, so treat results as an informative starting point.'],
  ['Can I take it again?', 'Yes. Each submission is kept in your history so you can compare results over time.'],
]
</script>

<template>
  <div class="land">
    <div class="hero">
      <aside class="photo" aria-label="Illustration of a coastal clifftop at sunset">
        <CoastPanel />
        <div class="cards">
          <article class="c coral rise" style="--d: .55s">
            <p class="k">YOUR PRIVACY PROFILE</p>
            <p class="t">Discover where you stand.</p>
            <span class="chip">Personalised insights</span>
          </article>
          <article class="c glass rise" style="--d: .7s">
            <p class="k">ASSESSMENT JOURNEY</p>
            <ul><li><Icon name="check" :size="14" /> Understand your privacy attitudes</li><li><Icon name="check" :size="14" /> Complete the assessment</li><li><Icon name="check" :size="14" /> Explore your results</li></ul>
          </article>
          <article class="c dark rise" style="--d: .85s">
            <p class="t2">Privacy Perspectives</p>
            <p class="k">Fundamentalist / Pragmatist / Unconcerned</p>
          </article>
        </div>
        <h2 class="over rise" style="--d: 1s">Your privacy.<br /><span class="serif-i">Your perspective.</span></h2>
      </aside>

      <section class="main">
        <div class="rise"><Nav embedded /></div>
        <div class="copy">
          <h1 class="rise" style="--d: .15s">Understand your<br />digital privacy<br /><span class="serif-i">perspective.</span></h1>
          <p class="lede rise" style="--d: .3s">Explore your privacy attitudes through a research-based assessment and gain a clearer understanding of your privacy preferences.</p>
          <div class="cta rise" style="--d: .4s">
            <button class="wp-btn wp-btn-primary big" @click="start">Start Assessment <span class="arrow"><Icon name="arrow" :size="14" /></span></button>
            <button class="wp-btn big" @click="how">Learn How It Works</button>
          </div>
        </div>
        <p class="fact rise" style="--d: .5s">Based on the Westin Privacy Segmentation framework.</p>
      </section>
    </div>

    <div class="below">
      <section id="how-it-works" class="sec">
        <p class="wp-eyebrow">HOW IT WORKS</p>
        <h2>Three simple <span class="serif-i">steps.</span></h2>
        <div class="grid3">
          <article v-for="(s, i) in steps" :key="s.t" class="wp-card step">
            <span class="ic"><Icon :name="s.icon" :size="20" /></span>
            <p class="num">0{{ i + 1 }}</p>
            <h3>{{ s.t }}</h3>
            <p class="wp-text">{{ s.d }}</p>
          </article>
        </div>
      </section>

      <section id="about" class="sec split">
        <div class="forest">
          <p class="wp-eyebrow" style="color: #CBD3C0;">ABOUT THE FRAMEWORK</p>
          <h2 style="color: white;">Three privacy <span class="serif-i">perspectives.</span></h2>
          <p style="color: #DDE3D3; line-height: 1.7;">
            The Westin Privacy Segmentation Index groups people by their general attitude to personal information. The groups are descriptions of
            approach. None is better or worse than another.
          </p>
        </div>
        <div class="cats">
          <article v-for="(c, name) in WPSI_CATEGORIES" :key="name" class="cat" :style="{ background: c.bg }">
            <span class="ic" :style="{ color: c.color, background: 'white' }"><Icon :name="c.icon" :size="20" /></span>
            <div><h3 :style="{ color: c.color }">{{ name }}</h3><p class="wp-text">{{ c.desc }}</p></div>
          </article>
        </div>
      </section>

      <section id="research" class="sec two">
        <div>
          <p class="wp-eyebrow">RESEARCH PURPOSE</p>
          <h2>Why this <span class="serif-i">exists.</span></h2>
          <p class="wp-text">
            This is a Taylor's University Capstone Project (Group 19) exploring privacy attitudes among Malaysian adult digital service users.
            Responses support academic research for the Cybersecurity Hub and the project supervisor, and are analysed with machine learning
            to understand how attitudes vary.
          </p>
        </div>
        <div id="privacy" class="wp-card">
          <p class="wp-eyebrow">PRIVACY AND DATA HANDLING</p>
          <ul class="list">
            <li>Participation is voluntary, and you can stop before submitting.</li>
            <li>Only information needed for the research is requested.</li>
            <li>Your results live in your own account; other respondents cannot see them.</li>
            <li>Researchers use aggregated or pseudonymised data.</li>
          </ul>
          <button class="wp-btn wp-btn-primary" @click="start">Start Assessment</button>
        </div>
      </section>

      <section class="sec">
        <p class="wp-eyebrow">FAQ</p>
        <h2>Good <span class="serif-i">questions.</span></h2>
        <div class="faq">
          <details v-for="[q, a] in faqs" :key="q"><summary>{{ q }}</summary><p class="wp-text">{{ a }}</p></details>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.land { background: var(--background); }
.hero { display: grid; grid-template-columns: 46% 1fr; gap: 8px; padding: 8px; min-height: 100vh; }
.photo { position: relative; border-radius: 28px; overflow: hidden; background: var(--forest); min-height: 640px; }
.cards { position: absolute; top: 5%; left: 6%; right: 6%; height: 58%; }
.c { position: absolute; border-radius: 20px; padding: 16px 18px; box-shadow: 0 18px 40px rgba(21, 22, 21, .18); max-width: 270px; }
.c .k { margin: 0 0 6px; font-size: 11px; letter-spacing: 1.2px; font-weight: 600; }
.c .t { margin: 0 0 12px; font-size: 20px; font-weight: 500; letter-spacing: -0.02em; line-height: 1.2; }
.coral { background: var(--accent-light); color: var(--ink); top: 0; left: 0; transform: rotate(-2deg); }
.glass { background: rgba(255, 255, 255, 0.34); backdrop-filter: blur(16px); border: 1px solid rgba(255, 255, 255, .5); color: var(--ink); top: 30%; right: 0; }
.glass ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; font-size: 13px; font-weight: 500; }
.glass li { display: flex; gap: 8px; align-items: center; }
.dark { background: var(--forest); color: white; top: 62%; left: 6%; }
.dark .t2 { margin: 0 0 4px; font-size: 22px; font-family: var(--font-serif); font-style: italic; }
.dark .k { color: #CBD3C0; letter-spacing: 0.2px; font-size: 12px; font-weight: 500; }
.over { position: absolute; left: 28px; bottom: 28px; margin: 0; color: white; font-size: clamp(36px, 4.4vw, 62px); line-height: 1.02; font-weight: 500; letter-spacing: -0.035em; text-shadow: 0 2px 18px rgba(21, 22, 21, .35); }
.over .serif-i { font-size: 1.08em; }
.main { background: var(--surface); border-radius: 28px; padding: 22px clamp(20px, 3vw, 40px) 26px; display: flex; flex-direction: column; justify-content: space-between; }
.copy { max-width: 640px; margin: 0 auto; padding: 40px 0; text-align: center; }
h1 { font-size: clamp(38px, 5.2vw, 70px); font-weight: 500; line-height: 1.02; letter-spacing: -0.04em; margin: 0 0 22px; }
h1 .serif-i { font-size: 1.08em; }
.lede { color: var(--ink-soft); font-size: 17px; line-height: 1.65; max-width: 480px; margin: 0 auto 28px; }
.cta { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
.big { padding: 14px 24px; font-size: 15px; border-radius: 99px; display: inline-flex; align-items: center; gap: 12px; }
.arrow { width: 26px; height: 26px; border-radius: 8px; background: var(--ink); color: white; display: inline-flex; align-items: center; justify-content: center; }
.fact { text-align: center; color: #8B8E86; font-size: 13px; margin: 0; }
.below { padding: 24px clamp(16px, 4vw, 56px) 40px; max-width: 1240px; margin: 0 auto; }
.sec { padding: 44px 0; scroll-margin-top: 20px; }
.sec h2 { font-size: clamp(28px, 3.6vw, 44px); font-weight: 500; letter-spacing: -0.03em; margin: 6px 0 22px; line-height: 1.05; }
.sec h2 .serif-i { font-size: 1.08em; }
.grid3 { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; }
.step { border-radius: 24px; padding: 26px; }
.step .num { font-family: var(--font-serif); font-style: italic; font-size: 38px; margin: 14px 0 0; color: var(--accent-ink); }
h3 { font-size: 19px; font-weight: 600; letter-spacing: -0.02em; margin: 4px 0 8px; }
.ic { width: 42px; height: 42px; border-radius: 13px; background: var(--chip); color: var(--forest); display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
.split { display: grid; grid-template-columns: 0.9fr 1.1fr; gap: 16px; align-items: stretch; }
.forest { background: var(--forest); border-radius: 28px; padding: clamp(24px, 3vw, 40px); }
.forest h2 { margin-bottom: 14px; }
.cats { display: grid; gap: 12px; }
.cat { display: flex; gap: 16px; align-items: flex-start; border-radius: 22px; padding: 20px 22px; }
.cat h3 { margin-top: 0; }
.cat p { margin: 0; }
.two { display: grid; grid-template-columns: 1fr 1fr; gap: 28px; align-items: start; }
.list { padding-left: 18px; line-height: 1.8; color: var(--ink-soft); margin: 10px 0 18px; }
.faq details { background: white; border: 1.5px solid var(--border); border-radius: 18px; padding: 16px 20px; margin-bottom: 10px; }
.faq summary { font-weight: 600; cursor: pointer; letter-spacing: -0.01em; }
.faq summary:focus-visible { outline: 3px solid var(--accent); outline-offset: 4px; border-radius: 6px; }
.faq p { margin: 10px 0 0; }
@media (max-width: 900px) {
  .hero { grid-template-columns: 1fr; padding: 0; min-height: 0; }
  .main { order: -1; border-radius: 0 0 28px 28px; }
  .copy { padding: 28px 0 20px; }
  .photo { border-radius: 28px; margin: 8px; min-height: 0; padding: 18px 18px 150px; display: flex; flex-direction: column; gap: 12px; }
  .cards { position: relative; inset: auto; height: auto; display: flex; flex-direction: column; gap: 10px; z-index: 2; }
  .c { position: static; max-width: none; transform: none; }
  .over { left: 22px; bottom: 22px; z-index: 2; }
  .split, .two { grid-template-columns: 1fr; }
}
</style>
