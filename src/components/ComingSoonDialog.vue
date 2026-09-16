<script setup>
import { computed, nextTick, onBeforeUnmount, ref } from 'vue'
import { Sparkles, X } from 'lucide-vue-next'

const dialog = ref(null)
const closeButton = ref(null)
let trigger
let previousOverflow
const kind = ref('archive')
const messages = {
  temple: { title: '湖心圣殿还在构想中', body: '这座湖上的圣殿正在等待成形。3D 建模作品暂未开放，等准备好了，再邀请你来探索。' },
  archive: { title: '档案馆还在悄悄布置', body: '想象力已经就位，代码还在努力追赶！这份脑洞暂时保密，等准备好了，再请你来拆惊喜。' },
  more: { title: '灵感正在路上', body: '这里暂时住着一颗会发光的小点子。它还在努力变成作品，请过一阵子再来看看吧。' },
}
const message = computed(() => messages[kind.value])
async function open(nextKind) {
  if (dialog.value.open) return
  kind.value = nextKind
  trigger = document.activeElement
  previousOverflow = document.body.style.overflow
  await nextTick()
  if (!dialog.value) return
  dialog.value.showModal()
  document.body.style.overflow = 'hidden'
  closeButton.value.focus({ preventScroll: true })
}
function restore() {
  if (previousOverflow === undefined) return
  document.body.style.overflow = previousOverflow
  previousOverflow = undefined
  trigger?.focus({ preventScroll: true })
}
function close() { dialog.value.close() }
function closeOutside(event) {
  if (event.target !== dialog.value) return
  const rect = dialog.value.getBoundingClientRect()
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) close()
}
onBeforeUnmount(restore)
defineExpose({ open, close })
</script>

<template>
  <Teleport to="body">
    <dialog ref="dialog" class="coming-box" aria-labelledby="coming-title" aria-describedby="coming-description" @click="closeOutside" @close="restore">
        <button ref="closeButton" class="coming-close" type="button" aria-label="关闭弹窗" title="关闭弹窗" @click="close"><X :size="20" /></button>
        <Sparkles class="coming-mark" :size="32" aria-hidden="true" />
        <div class="label">/ WORK IN PROGRESS</div>
        <h3 id="coming-title">{{ message.title }}</h3>
        <p id="coming-description">{{ message.body }}</p>
        <button class="coming-ok" type="button" @click="close">好哒，先去逛逛</button>
    </dialog>
  </Teleport>
</template>

<style scoped>
.coming-box::backdrop { background: #080a08cc; }
.coming-box { width: min(500px, calc(100% - 40px)); max-height: calc(100dvh - 40px); padding: 38px; border: 1px solid var(--acid); border-radius: 8px; background: #171a14; color: var(--ink); box-shadow: 8px 8px 0 #25301d; letter-spacing: 0; overflow-wrap: anywhere; }
.coming-close { position: absolute; top: 8px; right: 8px; width: 40px; height: 40px; display: grid; place-items: center; border: 0; background: none; color: var(--acid); cursor: pointer; }
.coming-mark { color: var(--orange); font-size: 30px; margin-bottom: 18px; }
.coming-box .label { margin: 0; letter-spacing: 0; }
.coming-box h3 { margin: 22px 0 14px; color: var(--ink); font: bold 28px/1.4 Arial; letter-spacing: 0; }
.coming-box p { max-width: 390px; color: #a8ae9e; line-height: 2; }
.coming-ok { margin-top: 14px; padding: 11px 16px; border: 1px solid var(--acid); background: var(--acid); color: #11150d; cursor: pointer; }
.coming-box button:focus-visible { outline: 2px solid var(--orange); outline-offset: 3px; }
@media (max-width: 480px) { .coming-box { padding: 30px 24px; } .coming-box h3 { font-size: 24px; } }
</style>
