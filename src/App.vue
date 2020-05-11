<template>
  <div id="app">
    <p>my app</p>
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
