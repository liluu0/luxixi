<template>
  <RouterView v-slot="{ Component }">
    <KeepAlive include="HomePage">
      <component :is="Component" />
    </KeepAlive>
  </RouterView>
</template>
