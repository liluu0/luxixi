<script setup>
import { ref, computed, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { createActor, createMachine } from 'xstate'
import { ArrowLeft, ArrowRight, ArrowUp, ArrowDown, RotateCcw, Trophy, Play, X, Brain, Palette, Grid3X3, Shuffle } from 'lucide-vue-next'
import '../brain.css'
defineProps({ onBack: Function })
const games=[{id:'stroop',title:'颜色别骗人',desc:'选择文字真正的颜色，不要读字。',color:'#ff806b'},{id:'memory',title:'记忆闪回',desc:'记住亮起的顺序，然后复原它。',color:'#55d6ff'},{id:'reverse',title:'规则反转',desc:'箭头会改变规则，保持注意力。',color:'#d8ff36'}]
const colors=[['红','#ff806b'],['绿','#d8ff36'],['蓝','#55d6ff'],['黄','#ffcf4a']]
const flow = createMachine({ initial:'ready', states:{
  ready:{on:{START:'playing'}}, playing:{on:{FINISH:'result', INTERRUPT:'interrupted', EXIT:'ready'}},
  result:{on:{START:'playing',EXIT:'ready'}}, interrupted:{on:{START:'playing',EXIT:'ready'}},
} })
const actor=createActor(flow), phase=ref('ready')
const subscription=actor.subscribe(state=>{phase.value=state.value}); actor.start()
const selected=ref(null),mode=ref('pointer'),practice=ref(false),round=ref(0),score=ref(0),word=ref(0),ink=ref(0),direction=ref(0),reversed=ref(false)
const seq=ref([]),position=ref(0),lit=ref(-1),showing=ref(false),accepting=ref(false),message=ref(''),remaining=ref(0),level=ref(0),times=ref([]),records=ref({}),storageOk=ref(true),stage=ref(null)
const arrows=[ArrowUp,ArrowRight,ArrowDown,ArrowLeft], directions=['上','右','下','左'], icons=[Palette,Grid3X3,Shuffle]
const current=computed(()=>games.find(g=>g.id===selected.value)), total=computed(()=>practice.value?3:12)
const average=computed(()=>times.value.length?Math.round(times.value.reduce((a,b)=>a+b,0)/times.value.length):null)
const recordKey=computed(()=>`${selected.value}:${mode.value}`), best=computed(()=>records.value[recordKey.value])
let epoch=0,trialAt=0,deadline=0
const timers=new Set()
// Every stage change invalidates pending callbacks, including repeated sequence flashes.
function later(fn,ms){const token=epoch;const id=setTimeout(()=>{timers.delete(id);if(token===epoch)fn()},ms);timers.add(id)}
function cancel(){epoch++;timers.forEach(clearTimeout);timers.clear();accepting.value=false;lit.value=-1}
const random=n=>Math.floor(Math.random()*n)
function pick(g){cancel();actor.send({type:'EXIT'});selected.value=g.id;message.value='';nextTick(()=>stage.value?.focus())}
function leave(){cancel();actor.send({type:'EXIT'});selected.value=null}
function start(p=false){cancel();practice.value=p;round.value=0;score.value=0;level.value=0;times.value=[];seq.value=[];message.value='';showing.value=false;actor.send({type:'START'});nextTick(()=>stage.value?.focus());later(next,400)}
function openInput(seconds){const token=epoch;nextTick(()=>{if(token!==epoch||phase.value!=='playing'||document.hidden)return;trialAt=performance.now();deadline=trialAt+seconds*1000;accepting.value=true;countdown()})}
function countdown(){remaining.value=Math.max(0,Math.ceil((deadline-performance.now())/1000));if(performance.now()>=deadline){selected.value==='memory'?finish('本轮超时'):answer(-1)}else later(countdown,80)}
function next(){
  cancel();message.value='';round.value++
  if(selected.value==='memory'){
    seq.value=seq.value.length?[...seq.value,random(9)]:[random(9),random(9),random(9)];position.value=0;showing.value=true
    seq.value.forEach((cell,i)=>{later(()=>{lit.value=cell},500+i*750);later(()=>{lit.value=-1},1000+i*750)})
    later(()=>{showing.value=false;openInput(20)},500+seq.value.length*750)
  }else{word.value=random(4);ink.value=random(4);direction.value=random(4);reversed.value=Math.random()<0.5;openInput(5)}
}
function answer(value){
  if(phase.value!=='playing'||!accepting.value)return
  if(performance.now()>=deadline)value=-1
  const duration=performance.now()-trialAt
  const expected=selected.value==='stroop'?ink.value:(direction.value+(reversed.value?2:0))%4
  cancel()
  if(value===expected){score.value++;times.value.push(duration);message.value='正确'}
  else message.value=value===-1?'超时':`答案：${selected.value==='stroop'?colors[expected][0]:directions[expected]}`
  later(()=>round.value>=total.value?finish('挑战完成'):next(),550)
}
function memoryAnswer(cell){
  if(phase.value!=='playing'||!accepting.value)return
  if(performance.now()>=deadline)return finish('本轮超时')
  if(cell!==seq.value[position.value])return finish('顺序中断')
  position.value++;lit.value=cell;later(()=>{lit.value=-1},130)
  if(position.value===seq.value.length){level.value=seq.value.length;score.value++;cancel();message.value='顺序正确';later(()=>seq.value.length>=(practice.value?4:10)?finish('全部序列完成'):next(),600)}
}
function finish(msg){
  cancel();message.value=msg;actor.send({type:'FINISH'});if(practice.value)return
  const value={score:selected.value==='memory'?level.value:score.value,average:average.value},old=best.value
  if(!old||value.score>old.score||(value.score===old.score&&value.average!==null&&(old.average===null||value.average<old.average))){
    records.value={...records.value,[recordKey.value]:value}
    try{localStorage.setItem('luxixi-brain-v1',JSON.stringify(records.value))}catch{storageOk.value=false}
  }
}
function key(e){
  if(e.repeat||e.ctrlKey||e.metaKey||e.altKey||phase.value!=='playing'||mode.value!=='keyboard')return
  const d=['ArrowUp','ArrowRight','ArrowDown','ArrowLeft'].indexOf(e.key)
  if(selected.value==='reverse'&&d!==-1){e.preventDefault();answer(d)}
  if(selected.value==='stroop'&&/^[1-4]$/.test(e.key)){e.preventDefault();answer(Number(e.key)-1)}
  if(selected.value==='memory'&&/^[1-9]$/.test(e.key)){e.preventDefault();memoryAnswer(Number(e.key)-1)}
}
function visibility(){if(document.hidden&&phase.value==='playing'){cancel();actor.send({type:'INTERRUPT'})}}
onMounted(()=>{
  try{const data=JSON.parse(localStorage.getItem('luxixi-brain-v1')||'{}');if(data&&typeof data==='object'&&!Array.isArray(data))records.value=Object.fromEntries(Object.entries(data).filter(([,v])=>v&&Number.isFinite(v.score)&&v.score>=0&&(v.average===null||Number.isFinite(v.average))))}catch{storageOk.value=false}
  document.addEventListener('keydown',key);document.addEventListener('visibilitychange',visibility)
})
onBeforeUnmount(()=>{cancel();subscription.unsubscribe();actor.stop();document.removeEventListener('keydown',key);document.removeEventListener('visibilitychange',visibility)})
</script>
<template>
  <div class="brain" :style="{'--signal':current?.color||'#d8ff36'}">
    <header class="brain-nav">
      <button class="brain-icon" title="返回作品集" aria-label="返回作品集" @click="onBack"><ArrowLeft/></button>
      <a href="/" @click.prevent="onBack">LUXI<span>XI</span></a><span class="brain-nav-label">PLAY / THE MIND LAB</span><small>实验室开放中</small>
    </header>
    <main class="brain-main">
      <div class="brain-heading" :class="{'brain-heading-compact':selected}"><div><p class="brain-eyebrow">LUXIXI LAB / 005</p><h1>给大脑<br><em>找点麻烦。</em></h1></div><div class="brain-heading-note"><Brain :size="42"/><p>直觉偶尔也会走神。<br>今天，你能接住几次？</p><span>03 CHALLENGES / JUST FOR FUN</span></div></div>
      <template v-if="!selected">
        <div class="brain-section-label"><span>选择一个挑战</span><span>01 — 03</span></div>
        <div class="brain-picker">
          <button v-for="(g,index) in games" :key="g.id" class="brain-tile" :style="{'--signal':g.color}" @click="pick(g)">
            <span class="brain-tile-top">0{{index+1}} / {{g.id.toUpperCase()}}<component :is="icons[index]" :size="20"/></span>
            <div class="brain-art" aria-hidden="true"><template v-if="g.id==='stroop'"><b style="color:#55d6ff">红</b><b style="color:#ff806b">绿</b><b style="color:#d8ff36">蓝</b></template><div v-else-if="g.id==='memory'" class="brain-art-grid"><i v-for="n in 9" :key="n" :class="{on:[2,4,8].includes(n)}"/></div><template v-else><ArrowRight :size="68"/><ArrowLeft :size="68"/></template></div>
            <span class="brain-category">{{['注意力','顺序记忆','反应切换'][index]}}</span><h2>{{g.title}}</h2><span class="brain-tile-bottom">{{g.id==='memory'?'3 → 10 格序列':'12 轮挑战'}}<ArrowRight :size="21"/></span>
          </button>
        </div>
      </template>
      <div v-else ref="stage" class="brain-console" tabindex="-1">
        <header class="brain-console-head"><h2>{{current.title}}</h2><span>{{selected.toUpperCase()}} / CHALLENGE</span><button class="brain-icon" title="返回挑战列表" aria-label="返回挑战列表" @click="leave"><X/></button></header>
        <div v-if="phase!=='playing'" class="brain-setup">
          <template v-if="phase==='ready'"><p class="brain-eyebrow">准备好了吗？</p><div class="brain-demo" aria-hidden="true"><span v-if="selected==='stroop'" style="color:#55d6ff">红</span><Grid3X3 v-else-if="selected==='memory'" :size="82"/><Shuffle v-else :size="82"/></div><h3>{{selected==='stroop'?'字色优先':selected==='memory'?'留住那道闪光':'顺向，还是反向？'}}</h3></template>
          <template v-else-if="phase==='result'"><Trophy class="brain-trophy" :size="38"/><p class="brain-eyebrow">{{practice?'练习完成':'本次成绩'}}</p><div class="brain-result-number">{{selected==='memory'?level:score}}<small>/ {{selected==='memory'?'最长序列':total+' 轮'}}</small></div><div class="brain-result-stats"><template v-if="selected!=='memory'"><span>正确率 <b>{{Math.round(score/round*100)}}%</b></span><span>正确作答平均 <b>{{average===null?'—':average+' ms'}}</b></span></template><span v-else>{{message}}</span></div></template>
          <template v-else><p class="brain-eyebrow">本局已中断</p><h3>回来，再来一局。</h3><p>页面离开期间的成绩未保存。</p></template>
          <div class="brain-mode" role="group" aria-label="输入方式"><button :aria-pressed="mode==='pointer'" @click="mode='pointer'">鼠标 / 触屏</button><button :aria-pressed="mode==='keyboard'" @click="mode='keyboard'">键盘</button></div>
          <p class="brain-best">{{storageOk?'本机最佳':'本地保存不可用'}} · {{mode==='pointer'?'鼠标 / 触屏':'键盘'}} <b>{{best?best.score+(selected==='memory'?' 格':' / 12'):'暂无记录'}}</b></p>
          <div class="brain-actions"><button class="brain-primary" @click="start(false)"><Play :size="16"/>{{phase==='result'&&!practice?'再来一次':'正式挑战'}}</button><button class="brain-secondary" @click="start(true)"><RotateCcw :size="16"/>练习</button></div>
        </div>
        <div v-else class="brain-play">
          <div class="brain-metrics"><span>{{practice?'练习':'正式'}} · {{mode==='keyboard'?'键盘':'鼠标 / 触屏'}}</span><span>{{selected==='memory'?seq.length+' 格':round+' / '+total}}</span><b>{{accepting?remaining+' s':showing?'观察中':'准备'}}</b></div>
          <div class="brain-stimulus">
            <template v-if="selected==='stroop'"><p>字的颜色</p><div class="brain-word" :style="{color:colors[ink][1]}">{{colors[word][0]}}</div></template>
            <template v-else-if="selected==='reverse'"><p class="brain-rule" :class="{reversed}">{{reversed?'反向':'同向'}}</p><component :is="arrows[direction]" class="brain-direction" :size="110"/></template>
            <template v-else><p>{{showing?'观察序列':accepting?'复原序列':message||'准备序列'}}</p><div class="brain-memory"><button v-for="n in 9" :key="n" :aria-label="'方格 '+n" :class="{lit:lit===n-1}" :disabled="!accepting||mode!=='pointer'" @click="memoryAnswer(n-1)">{{mode==='keyboard'?n:''}}</button></div><small>{{showing?' ':position+' / '+seq.length}}</small></template>
          </div>
          <div v-if="selected!=='memory'" class="brain-answers">
            <template v-if="selected==='stroop'"><button v-for="(c,index) in colors" :key="c[0]" :disabled="!accepting||mode!=='pointer'" @click="answer(index)"><i :style="{background:c[1]}"/>{{c[0]}}<kbd v-if="mode==='keyboard'">{{index+1}}</kbd></button></template>
            <template v-else><button v-for="(arrow,index) in arrows" :key="index" :disabled="!accepting||mode!=='pointer'" :aria-label="directions[index]" @click="answer(index)"><component :is="arrow" :size="24"/><kbd v-if="mode==='keyboard'">{{['↑','→','↓','←'][index]}}</kbd></button></template>
          </div>
          <p class="brain-feedback" role="status">{{message||'\u00a0'}}</p>
        </div>
      </div>
      <footer class="brain-footer"><span>LUXIXI / MADE WITH CURIOSITY</span><span>趣味挑战 · 非专业认知评估</span></footer>
    </main>
  </div>
</template>
