<script setup>
defineProps({ kind: { type: String, required: true } })
</script>

<template>
  <div class="work-cover" :class="`cover-${kind}`" aria-hidden="true">
    <img v-if="['temple','anatomy','city','castle','brain','archive','werewolf','more'].includes(kind)" class="card-render" :src="`/assets/stickers/${kind}-card.webp`" alt="" loading="lazy"><svg v-else viewBox="0 0 700 440" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g class="cover-guides" stroke="currentColor" stroke-width=".6" opacity=".15">
        <path v-for="n in 12" :key="`v${n}`" :d="`M${n * 60} 0V440`" />
        <path v-for="n in 7" :key="`h${n}`" :d="`M0 ${n * 60}H700`" />
        <circle cx="430" cy="185" r="150" /><circle cx="430" cy="185" r="120" />
      </g>

      <!-- Original atlas-inspired illustration, not clinical geometry. -->
      <g v-if="kind === 'anatomy'" transform="translate(310 22)" stroke="#dce7d8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M99 100C48 101 38 124 27 160L-4 254 10 262 52 176 59 235 45 281 76 300 112 286 143 300 173 281 157 235 163 176 204 262 219 254 190 160C179 122 165 103 125 100" fill="#b7d3b4" fill-opacity=".06" stroke-opacity=".35" />
        <path d="M91 76C70 55 81 17 112 17S154 55 133 76L128 89H98Z" fill="#dce7d8" fill-opacity=".12" stroke-width="2" />
        <path d="M94 54Q100 48 105 56M120 56Q128 48 134 54M112 62L108 70H116M101 80H125" stroke-width="3" />
        <path d="M112 92V248M64 116L109 125 156 116M76 266L112 279 148 266M81 294L73 360M143 294L151 360" stroke-width="5" />
        <g v-for="n in 7" :key="n" :transform="`translate(0 ${n * 13})`" stroke-width="2.5">
          <path d="M106 116Q48 90 61 120Q78 143 106 130M118 116Q176 90 163 120Q146 143 118 130" />
        </g>
        <path d="M111 238C90 225 69 235 63 254L82 278 103 260M115 238C136 225 157 235 163 254L144 278 123 260" stroke-width="4" />
        <path d="M126 163C117 143 95 152 104 175L125 195 140 174C148 159 133 151 126 163" fill="#ff694f" stroke="#ffad92" />
        <g stroke="#b5daab" stroke-width="1" opacity=".7"><path d="M135 170H218L240 148H290M92 53H-15L-44 35H-120M72 257H-30L-60 277H-150" /><circle cx="135" cy="170" r="4" /><circle cx="92" cy="53" r="4" /></g>
        <g fill="#9ab19b" stroke="none" font-family="monospace" font-size="9" letter-spacing="2"><text x="-120" y="27">01 / CRANIUM</text><text x="222" y="140">HEART</text><text x="-150" y="293">BODY / ATLAS</text></g>
      </g>

      <g v-else-if="kind === 'city'" transform="translate(230 50)">
        <g stroke="#4e9d91" stroke-width="1.2" fill="#153a3b">
          <path d="M10 93 38 80 53 40 87 30 107 58 149 60 166 85 197 67 224 84 259 61 275 32 309 13 339 27 360 77 340 105 310 112 300 143 321 163 304 199 278 218 260 249 225 270 198 245 169 258 151 230 109 231 90 206 47 198 34 169 9 153Z" />
          <path d="m53 40 20 83 60 24 33-62m-132 84 72-8 3 70m24-84 35 46 56-17 0-92m-115 147 59-38 30 52m26-69 54 42m-54-42 76-33m-41-82 6 58 45-7M278 218l-18 31m51-11-8 30" />
        </g>
        <g stroke="#d8ff36" stroke-width="1" opacity=".35"><path d="M125 157Q179 31 266 134M125 157Q233 123 280 194M266 134Q298 152 280 194M125 157Q179 270 222 229" /></g>
        <g v-for="(point, i) in [[266,134],[280,194],[222,229],[125,157],[188,170],[312,80],[175,216]]" :key="i">
          <circle :cx="point[0]" :cy="point[1]" :r="i < 3 ? 27 : 16" fill="#d8ff36" opacity=".06" />
          <circle :cx="point[0]" :cy="point[1]" :r="i < 3 ? 14 : 8" fill="#d8ff36" opacity=".16" />
          <circle :cx="point[0]" :cy="point[1]" r="3.5" fill="#e3ff88" />
          <path :d="`M${point[0]} ${point[1]}v-${24 + i * 4}`" stroke="#d8ff36" stroke-width="2" />
        </g>
        <g fill="#86b7ae" font-family="monospace" font-size="9" letter-spacing="2"><text x="10" y="300">URBAN SIGNALS / DEMO</text><text x="273" y="123">BEIJING</text><text x="285" y="213">SHANGHAI</text></g>
      </g>

      <g v-else-if="kind === 'castle'" transform="translate(235 25)">
        <circle cx="238" cy="90" r="64" fill="#d1b893" opacity=".11" />
        <path d="M-60 345 5 265 46 278 68 223 304 233 356 286 408 327 450 440H-70Z" fill="#212733" />
        <g fill="#37404b" stroke="#667075" stroke-width="1">
          <path d="M60 251V138H108V251M277 255V117H325V272M127 251V120H257V256" />
          <path d="M51 138 83 65 117 138ZM269 117 301 36 333 117ZM133 120 191 59 251 120Z" fill="#55616b" />
          <path d="M160 250V149H221V254M153 149 190 98 229 149Z" />
        </g>
        <path d="M177 257V198Q191 166 205 198V257" fill="#91c9d0" /><path d="M186 253V202Q192 184 196 202V253" fill="#e6fcf4" />
        <g fill="#d6a765"><path d="M78 167h9v23h-9zM297 150h9v23h-9zM145 147h8v16h-8zM232 147h8v16h-8z" /></g>
        <path d="M176 267 207 267 266 362H107Z" fill="#53616a" /><path d="M149 308H233M135 330H247M164 286H220" stroke="#91a0a1" opacity=".4" />
        <g fill="#ff9464"><circle cx="50" cy="213" r="2" /><circle cx="331" cy="208" r="2" /><circle cx="253" cy="80" r="1.5" /><circle cx="131" cy="52" r="1" /></g>
        <text x="31" y="33" fill="#a7aaa5" font-family="monospace" font-size="9" letter-spacing="4">THE ASHEN COURT</text>
      </g>

      <g v-else-if="kind === 'brain'" transform="translate(315 60) rotate(-10 120 140)">
        <rect x="-20" y="-5" width="257" height="257" rx="22" fill="#1e252d" stroke="#4b565e" />
        <g v-for="n in 9" :key="n" :transform="`translate(${((n - 1) % 3) * 74} ${Math.floor((n - 1) / 3) * 74 + 15})`">
          <rect width="62" height="62" rx="9" :fill="[2,4,9].includes(n) ? '#d8ff36' : n === 6 ? '#6057ff' : '#303a43'" />
          <circle v-if="[2,4,9].includes(n)" cx="31" cy="31" r="10" fill="none" stroke="#4c6117" />
          <path v-else-if="n === 6" d="M17 31H45M34 21 45 31 34 41" stroke="#f2efdf" stroke-width="3" />
        </g>
        <g transform="translate(174 192) rotate(20)"><rect width="109" height="61" rx="8" fill="#ff694f" /><text x="54" y="39" text-anchor="middle" fill="#231b1b" font-family="monospace" font-weight="bold" font-size="25">PLAY!</text></g>
        <path d="M-51 39-75 20M-56 64H-85M248 77l26-18" stroke="#d8ff36" stroke-width="3" />
      </g>

      <g v-else-if="kind === 'archive'" transform="translate(315 30)">
        <rect x="-30" y="20" width="265" height="280" rx="3" fill="#a2997f" fill-opacity=".09" stroke="#9c9c73" stroke-opacity=".3" transform="rotate(7 100 150)" />
        <g stroke="#cfcd9b" stroke-width="1.2">
          <path d="M100 97C59 7-57 23-26 127 0 188 49 179 93 163 33 190 11 256 68 249L103 184M107 97C148 7 264 23 233 127 207 188 158 179 114 163 174 190 196 256 139 249L104 184" fill="#b8b47e" fill-opacity=".13" />
          <path d="M101 111 4 67 61 134 14 150 94 157M110 111 207 67 150 134 193 150 114 157M99 177 60 225M110 177 147 225" opacity=".55" />
          <path d="M104 92V213M102 102 87 78 85 63M107 102 120 78 123 63" stroke-width="4" />
        </g>
        <g fill="none" stroke="#9eaa88" opacity=".5"><circle cx="104" cy="150" r="138" stroke-dasharray="2 8" /><path d="M-46 150H-20M228 150H254M104 0V23" /></g>
        <text x="0" y="282" fill="#bec39c" font-family="monospace" font-size="9" letter-spacing="3">SPECIMEN / UNKNOWN</text>
      </g>

      <g v-else transform="translate(365 55)" stroke="#b7c1a2">
        <ellipse cx="90" cy="140" rx="172" ry="62" transform="rotate(-24 90 140)" opacity=".3" />
        <ellipse cx="90" cy="140" rx="172" ry="62" transform="rotate(24 90 140)" opacity=".3" />
        <circle cx="90" cy="140" r="75" stroke-dasharray="2 7" opacity=".5" />
        <path d="M90 79 105 124 150 140 105 155 90 201 75 155 30 140 75 124Z" fill="#d8ff36" stroke="none" />
        <circle cx="243" cy="78" r="8" fill="#6057ff" stroke="none" />
        <text x="15" y="258" fill="#a2ac92" stroke="none" font-family="monospace" font-size="9" letter-spacing="4">IDEAS IN ORBIT</text>
      </g>
    </svg>
  </div>
</template>

<style scoped>
.work-cover{position:absolute;inset:0;overflow:hidden;pointer-events:none;color:#b7cdcb;background:radial-gradient(ellipse at 72% 35%,#31473d,#121c18 65%)}
.work-cover svg{width:100%;height:100%;object-fit:cover;transition:transform .65s cubic-bezier(.2,.7,.2,1)}
.cover-city{background:radial-gradient(ellipse at 65% 30%,#183f42,#0d1a21 70%)}
.temple-render,.card-render{width:100%;height:100%;object-fit:cover;object-position:50% 45%;transition:transform .65s}.cover-temple::after,.cover-werewolf::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,#07131b35 20%,#07131be0 100%)}:global(.card:hover) .temple-render,:global(.card:hover) .card-render{transform:scale(1.035)}
.cover-temple{background:radial-gradient(ellipse at 66% 32%,#324f65,#111d2b 70%)}
.cover-castle{background:radial-gradient(ellipse at 67% 20%,#41404c,#161820 70%)}
.cover-brain{background:radial-gradient(ellipse at 65% 30%,#333e46,#151c21 70%)}
.cover-archive{background:radial-gradient(ellipse at 65% 30%,#444333,#1a211b 70%)}
.cover-more{background:radial-gradient(ellipse at 65% 40%,#283427,#121a15 70%)}
.cover-werewolf{background:#171936}
:global(.card:hover) .work-cover svg{transform:scale(1.035)}
@media(prefers-reduced-motion:reduce){.work-cover svg{transition:none}:global(.card:hover) .work-cover svg{transform:none}}
</style>
