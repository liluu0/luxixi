<script setup>
import { ref, onUnmounted } from 'vue'
const copied = ref('')
const feedback = ref('')
const message = ref('')
const previewed = ref(false)
const contactMode = ref(0)
const contactModes = ['SIGNAL OPEN', 'READY TO CHAT', 'SEND A WAVE']
const runnerPlaying = ref(false)
let runnerTimer
const greet = () => {
  clearTimeout(runnerTimer)
  runnerPlaying.value = true
  runnerTimer = setTimeout(() => { runnerPlaying.value = false }, 800)
}
let timer
const copy = async (value, key) => {
  clearTimeout(timer)
  try {
    await navigator.clipboard.writeText(value)
    copied.value = key
    feedback.value = '已复制到剪贴板'
    timer = setTimeout(() => { copied.value = ''; feedback.value = '' }, 1800)
  } catch { copied.value = ''; feedback.value = '复制失败，请选中号码手动复制' }
}
onUnmounted(() => { clearTimeout(timer); clearTimeout(runnerTimer) })
const submit = () => { previewed.value = true }

</script>
<template>
<section id="contact" class="contact wrap reveal" :class="{ 'contact-ping': contactMode > 0 }" aria-labelledby="contact-title">
    <span class="contact-orbit orbit-one" aria-hidden="true"/><span class="contact-orbit orbit-two" aria-hidden="true"/>
    <div>
      <div class="label">04 / CONTACT</div>
      <div class="contact-title-row"><h2 id="contact-title"><button type="button" class="contact-title-trigger" :class="{ greeting: runnerPlaying }" aria-label="保持联系，和小怪打个招呼" @click="greet"><span class="contact-word">保持</span><span class="contact-word contact-word-note">联系<span class="contact-dot">。</span></span></button></h2><span :key="contactMode" class="contact-badge" aria-hidden="true">{{ contactModes[contactMode].split(' ')[0] }}<br>{{ contactModes[contactMode].split(' ').slice(1).join(' ') }}</span><button type="button" class="runner-button" :class="{ playing: runnerPlaying }" aria-label="和独眼小怪打招呼" @click="greet"><img class="contact-runner" src="/assets/stickers/01-one-eyed-runner.svg" alt=""><span aria-hidden="true">HEY!</span></button></div>
      <p :key="contactMode" class="contact-status" role="status">{{ contactModes[contactMode] }} <span>· 点一下，打个招呼</span></p>
      <dl class="contact-details">
        <div><dt>QQ</dt><dd><span>3129830832</span><button class="copy" type="button" @click="copy('3129830832','qq')">{{ copied === 'qq' ? '已复制' : '复制' }}</button></dd></div>
        <div><dt>微信</dt><dd><span>a15707473356</span><button class="copy" type="button" @click="copy('a15707473356','wechat')">{{ copied === 'wechat' ? '已复制' : '复制' }}</button></dd></div>
        <div><dt>邮箱</dt><dd><a href="mailto:3129830832@qq.com">3129830832@qq.com</a></dd></div>
        <div><dt>博客</dt><dd><a href="https://blog.csdn.net/qq_62541773?type=lately" target="_blank" rel="noopener noreferrer">CSDN 博客 ↗</a></dd></div>
      </dl>
      <p class="copy-feedback" role="status">{{ feedback }}</p>
    </div>
    <form class="contact-form" @submit.prevent="submit">
      <div class="form-heading"><h3>给我留言</h3><span aria-hidden="true">// DROP A NOTE ✦</span></div>
      <label for="visitor-name">留言人</label>
      <input id="visitor-name" name="visitorName" autocomplete="name" maxlength="80" placeholder="你的名字">
      <label for="visitor-message">留言内容</label>
      <textarea id="visitor-message" v-model="message" name="message" rows="6" maxlength="2000" placeholder="想聊的项目或想法"></textarea>
      <span class="message-count">{{ message.length }} / 2000</span>
      <button type="submit">查看留言状态 ↗</button>
      <p class="form-note" role="status">{{ previewed ? '留言未发送，也未保存。欢迎通过 QQ、微信或邮箱联系我。' : '留言暂未开放' }}</p>
    </form>
  </section>
</template>

<style scoped>
.contact{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:64px;scroll-margin-top:24px;letter-spacing:0}
.contact h2{font-size:48px;line-height:1.2;letter-spacing:0;color:var(--orange)}.contact-title-trigger{display:inline-flex;align-items:center;gap:10px;padding:0;background:transparent;border:0;color:var(--orange);font:inherit;cursor:pointer;transition:transform .3s,color .25s}.contact-title-trigger i{font-style:normal;font-size:18px;color:var(--acid);opacity:0;transform:translate(-8px,8px) rotate(-20deg);transition:opacity .25s,transform .3s}.contact-title-trigger:hover,.contact-title-trigger.active{color:var(--acid);transform:translate(5px,-3px) rotate(-2deg)}.contact-title-trigger:hover i,.contact-title-trigger.active i{opacity:1;transform:translate(0,0) rotate(0)}.contact-status{min-height:18px;margin:7px 0 0;color:var(--acid);font-size:9px;letter-spacing:.08em;opacity:.8}.contact-status span{color:#687262}.contact-ping .contact-status{animation:contact-status-pop .45s cubic-bezier(.2,.9,.25,1.4)}
.contact-title-row{display:flex;align-items:flex-start;gap:18px}.contact-badge{display:inline-grid;place-items:center;width:54px;height:54px;border:1px solid var(--acid);border-radius:50%;color:var(--acid);font-size:8px;line-height:1.2;text-align:center;transform:rotate(9deg);animation:contact-badge-pulse 2.8s ease-in-out infinite}.contact-ping .contact-badge{animation:contact-badge-ping .6s cubic-bezier(.2,.9,.25,1.4),contact-badge-pulse 2.8s ease-in-out .6s infinite}.form-heading{display:flex;align-items:baseline;justify-content:space-between;gap:12px}.form-heading>span{color:var(--pink);font-size:9px;transform:rotate(-4deg)}
.contact-details{margin:40px 0 0}
.contact-details>div{display:grid;grid-template-columns:56px minmax(0,1fr);gap:16px;align-items:center;min-height:60px;padding:10px 0;border-bottom:1px solid var(--line)}
dt{color:#a5a89f}dd{margin:0;overflow-wrap:anywhere}a{color:var(--ink);text-underline-offset:5px}a:hover{color:var(--acid)}
.contact-form{display:flex;flex-direction:column;min-width:0;gap:12px}
.contact-form h3{font-size:22px;margin:0 0 16px}
.contact-form label{color:#b5bbae}
input,textarea{box-sizing:border-box;width:100%;min-width:0;background:#11150f;border:1px solid #46543a;border-radius:3px;color:var(--ink);padding:15px 16px;font:inherit;line-height:1.6;margin-bottom:12px;transition:border-color .25s,box-shadow .25s,background-color .25s;outline:none}
input::placeholder,textarea::placeholder{color:#687262;transition:color .25s}input:hover,textarea:hover{border-color:#626f59;background:#141812}input:focus,textarea:focus{border-color:#93a486;background:#151a14;box-shadow:0 0 0 2px #93a48614,0 4px 14px #0003}input:focus::placeholder,textarea:focus::placeholder{color:#899580}
textarea{resize:vertical;min-height:150px}input:focus-visible,textarea:focus-visible{outline:none}a:focus-visible{outline:2px solid var(--acid);outline-offset:3px}
button{align-self:flex-start;padding:12px 24px;background:#24291e;border:1px solid #54603d;color:var(--acid);font:inherit;border-radius:4px;cursor:pointer;transition:.25s}button:hover{background:var(--acid);color:#10120d;transform:translateY(-2px)}
.copy{padding:5px 8px;background:transparent;border:1px solid transparent;color:var(--acid);font:10px inherit;min-width:48px}.copy:hover{background:#d8ff3618;border-color:#54603d;color:var(--acid);transform:none}.form-note{color:#687262;font-size:11px;margin:0}
@media(max-width:700px){.contact{grid-template-columns:minmax(0,1fr);gap:48px}.contact h2{font-size:36px}}
.contact-details>div{position:relative;transition:background-color .2s,border-color .2s,transform .25s}.contact-details>div:before{content:"";position:absolute;left:0;bottom:-1px;width:0;height:2px;background:var(--acid);box-shadow:0 0 12px var(--acid);transition:width .45s cubic-bezier(.2,.8,.2,1)}.contact-details>div:after{content:"";position:absolute;right:0;bottom:-2px;width:5px;height:5px;border-radius:50%;background:var(--pink);opacity:0;transform:translateX(-30px);transition:opacity .2s,transform .45s cubic-bezier(.2,.8,.2,1)}.contact-details>div:hover,.contact-details>div:focus-within{background:#171d15;border-color:var(--acid);transform:translateX(5px)}.contact-details>div:hover:before,.contact-details>div:focus-within:before{width:100%}.contact-details>div:hover:after,.contact-details>div:focus-within:after{opacity:1;transform:translateX(0)}
.copy-feedback{min-height:24px;color:var(--acid);line-height:1.6}
.copy{width:auto;text-align:center;min-height:28px;display:inline-grid;place-items:center;flex:0 0 auto}
.message-count{align-self:flex-end;color:#a5a89f;font-size:11px;margin-top:-12px}
.contact-form > button[type="submit"]{align-self:center}
.form-note{color:#a5a89f;line-height:1.8;min-height:40px;text-align:center}
button:focus-visible{outline:2px solid var(--acid);outline-offset:4px}
.contact-title-trigger:hover,.contact-title-trigger:focus-visible,.contact-title-trigger.active{background:transparent;color:var(--acid);transform:translate(5px,-3px) rotate(-2deg)}
.contact-title-trigger:focus-visible{outline:2px solid var(--acid);outline-offset:7px}
.contact{position:relative;overflow:hidden}
.contact-orbit{position:absolute;border:1px solid #31422d;border-radius:50%;pointer-events:none;opacity:.5}.orbit-one{width:180px;height:180px;right:8%;top:8%;animation:orbit 16s linear infinite}.orbit-two{width:90px;height:90px;right:18%;top:22%;border-color:#546d2d;animation:orbit 10s linear reverse infinite}.orbit-two:after{content:"";position:absolute;width:6px;height:6px;background:var(--acid);border-radius:50%;top:-3px;left:50%;box-shadow:0 0 14px var(--acid)}
@keyframes orbit{to{transform:rotate(360deg)}}
@keyframes contact-badge-pulse{50%{box-shadow:0 0 0 7px #d8ff3610,0 0 20px #d8ff3630;transform:rotate(-4deg) scale(1.04)}}
@keyframes contact-badge-ping{0%{transform:scale(.82) rotate(-12deg);box-shadow:0 0 0 0 #d8ff3680}70%{transform:scale(1.18) rotate(8deg);box-shadow:0 0 0 18px #d8ff3600}100%{transform:scale(1) rotate(0)}}@keyframes contact-status-pop{0%{opacity:0;transform:translateY(-6px)}100%{opacity:.8;transform:none}}
@media(prefers-reduced-motion:reduce){.contact-orbit,.contact-badge{animation:none}}
@media(prefers-reduced-motion:reduce){button,.contact-details>div{transition:none}button:hover{transform:none}}

.contact .contact-title-trigger{display:inline-flex;gap:7px;align-items:center;position:relative;padding:8px 0 12px;border:0;background:none;color:#f1efe7;transform:none;white-space:nowrap}
.contact .contact-title-trigger:hover,.contact .contact-title-trigger:focus-visible,.contact .contact-title-trigger.greeting{background:none;color:#f1efe7;transform:none}
.contact-word{display:inline-block;transition:transform .35s cubic-bezier(.2,.9,.25,1.4);transform:rotate(-3deg)}
.contact-word-note{background:#bdb5ff;color:#171320;padding:2px 6px 5px;transform:rotate(4deg);box-shadow:4px 5px 0 #6057ff55;position:relative}
.contact-word-note:before{content:'';position:absolute;left:25%;top:-6px;width:26px;height:11px;background:#f1efe788;transform:rotate(-12deg)}
.contact-dot{color:#6551cf}
.contact-title-trigger:hover .contact-word,.contact-title-trigger:focus-visible .contact-word,.contact-title-trigger.greeting .contact-word{transform:translateY(-4px) rotate(2deg)}
.contact-title-trigger:hover .contact-word-note,.contact-title-trigger:focus-visible .contact-word-note,.contact-title-trigger.greeting .contact-word-note{transform:translateY(-7px) rotate(-5deg)}
.contact-title-row .contact-badge{flex-shrink:0;margin-right:0}
.runner-button{position:absolute;right:0;top:45px;width:118px;height:110px;padding:0;border:0;background:none;z-index:2;overflow:visible}
.runner-button:hover,.runner-button:focus-visible{background:none;transform:none}
.runner-button .contact-runner{inset:0;width:100%;height:100%;pointer-events:none}
.runner-button>span{position:absolute;top:-12px;left:0;padding:5px 8px;background:#bdb5ff;color:#171320;font:bold 12px monospace;transform:rotate(-12deg) scale(.5);opacity:0;transition:opacity .2s,transform .25s;pointer-events:none}
.runner-button:hover .contact-runner,.runner-button:focus-visible .contact-runner,.runner-button.playing .contact-runner{animation:runner-hello .7s ease-in-out infinite;filter:drop-shadow(9px 12px 0 #6057ff66)}
.runner-button:hover>span,.runner-button:focus-visible>span,.runner-button.playing>span{opacity:1;transform:rotate(-12deg) scale(1)}
@keyframes runner-hello{0%,100%{transform:translateY(0) rotate(-7deg)}35%{transform:translate(-5px,-15px) rotate(8deg)}70%{transform:translate(3px,-5px) rotate(-12deg)}}
@media(max-width:700px){.contact h2{font-size:clamp(27px,7.2vw,36px)}.contact-title-row{gap:14px}.runner-button{width:82px;height:78px;top:50px}.contact-details{margin-top:65px}}
@media(prefers-reduced-motion:reduce){.contact-word,.runner-button>span{transition:none}.runner-button .contact-runner,.runner-button:hover .contact-runner,.runner-button:focus-visible .contact-runner,.runner-button.playing .contact-runner{animation:none}.contact-title-trigger:hover .contact-word,.contact-title-trigger:focus-visible .contact-word,.contact-title-trigger.greeting .contact-word{transform:none}}
@media (max-width: 700px) {
  .contact-title-row .contact-badge {
    display: none;
  }
}
</style>
