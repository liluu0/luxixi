<template>
  <RouterView v-slot="{ Component, route }">
    <KeepAlive include="HomePage">
      <component :is="Component" :key="route.name" />
    </KeepAlive>
  </RouterView>
</template>
