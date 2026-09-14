<script setup>
import { ref, onUnmounted } from 'vue'
const copied = ref('')
const feedback = ref('')
const message = ref('')
const previewed = ref(false)
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
onUnmounted(() => clearTimeout(timer))
const submit = () => { previewed.value = true }
</script>
<template>
<section id="contact" class="contact wrap reveal" aria-labelledby="contact-title">
    <span class="contact-orbit orbit-one" aria-hidden="true"/><span class="contact-orbit orbit-two" aria-hidden="true"/>
    <div>
      <div class="label">03 / CONTACT</div>
      <h2 id="contact-title">保持联系。</h2>
      <dl class="contact-details">
        <div><dt>QQ</dt><dd><button class="copy" type="button" @click="copy('3129830832','qq')">3129830832 <span>{{ copied === 'qq' ? '已复制' : '复制' }}</span></button></dd></div>
        <div><dt>微信</dt><dd><button class="copy" type="button" @click="copy('a15707473356','wechat')">a15707473356 <span>{{ copied === 'wechat' ? '已复制' : '复制' }}</span></button></dd></div>
        <div><dt>邮箱</dt><dd><a href="mailto:3129830832@qq.com">3129830832@qq.com</a></dd></div>
        <div><dt>博客</dt><dd><a href="https://blog.csdn.net/qq_62541773?type=lately" target="_blank" rel="noopener noreferrer">CSDN 博客 ↗</a></dd></div>
      </dl>
      <p class="copy-feedback" role="status">{{ feedback }}</p>
    </div>
    <form class="contact-form" @submit.prevent="submit">
      <h3>给我留言</h3>
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
.contact h2{font-size:48px;line-height:1.2;letter-spacing:0;color:var(--orange)}
.contact-details{margin:40px 0 0}
.contact-details>div{display:grid;grid-template-columns:56px minmax(0,1fr);gap:16px;padding:16px 0;border-bottom:1px solid var(--line)}
dt{color:#a5a89f}dd{margin:0;overflow-wrap:anywhere}a{color:var(--ink);text-underline-offset:5px}a:hover{color:var(--acid)}
.contact-form{display:flex;flex-direction:column;min-width:0;gap:12px}
.contact-form h3{font-size:22px;margin:0 0 16px}
.contact-form label{color:#b5bbae}
input,textarea{box-sizing:border-box;width:100%;min-width:0;background:#11150f;border:1px solid #46543a;border-radius:3px;color:var(--ink);padding:15px 16px;font:inherit;line-height:1.6;margin-bottom:12px;transition:border-color .25s,box-shadow .25s,background-color .25s;outline:none}
input::placeholder,textarea::placeholder{color:#687262;transition:color .25s}input:hover,textarea:hover{border-color:#626f59;background:#141812}input:focus,textarea:focus{border-color:#93a486;background:#151a14;box-shadow:0 0 0 2px #93a48614,0 4px 14px #0003}input:focus::placeholder,textarea:focus::placeholder{color:#899580}
textarea{resize:vertical;min-height:150px}input:focus-visible,textarea:focus-visible{outline:none}a:focus-visible{outline:2px solid var(--acid);outline-offset:3px}
button{align-self:flex-start;padding:12px 24px;background:#24291e;border:1px solid #54603d;color:var(--acid);font:inherit;border-radius:4px;cursor:pointer;transition:.25s}button:hover{background:var(--acid);color:#10120d;transform:translateY(-2px)}
.copy{padding:0;background:none;border:0;color:var(--ink);font:inherit}.copy span{margin-left:12px;color:var(--acid);font-size:10px;opacity:.7}.copy:hover{background:none;color:var(--acid);transform:none}.form-note{color:#687262;font-size:11px;margin:0}
@media(max-width:700px){.contact{grid-template-columns:minmax(0,1fr);gap:48px}.contact h2{font-size:36px}}
.contact-details>div{transition:background-color .2s,border-color .2s}
.contact-details>div:hover,.contact-details>div:focus-within{background:#171d15;border-color:var(--acid)}
.copy-feedback{min-height:24px;color:var(--acid);line-height:1.6}
.copy{width:100%;text-align:left;min-height:28px;display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap}
.copy span{min-width:40px;margin:0}
.message-count{align-self:flex-end;color:#a5a89f;font-size:11px;margin-top:-12px}
.form-note{color:#a5a89f;line-height:1.8;min-height:40px}
button:focus-visible{outline:2px solid var(--acid);outline-offset:4px}
.contact{position:relative;overflow:hidden}
.contact-orbit{position:absolute;border:1px solid #31422d;border-radius:50%;pointer-events:none;opacity:.5}.orbit-one{width:180px;height:180px;right:8%;top:8%;animation:orbit 16s linear infinite}.orbit-two{width:90px;height:90px;right:18%;top:22%;border-color:#546d2d;animation:orbit 10s linear reverse infinite}.orbit-two:after{content:"";position:absolute;width:6px;height:6px;background:var(--acid);border-radius:50%;top:-3px;left:50%;box-shadow:0 0 14px var(--acid)}
@keyframes orbit{to{transform:rotate(360deg)}}
@media(prefers-reduced-motion:reduce){.contact-orbit{animation:none}}
@media(prefers-reduced-motion:reduce){button,.contact-details>div{transition:none}button:hover{transform:none}}
</style>
