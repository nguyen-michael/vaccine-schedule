<template>
  <div id="app" class="container">
    <h2>Vax Check</h2>
    <data-entry />
  </div>
</template>

<script>
import DataEntry from "./components/DataEntry.vue";

export default {
  name: "App",
  components: {
    DataEntry
  }
};
</script>

<style>
</style>
