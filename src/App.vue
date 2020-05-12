<template>
  <div id="app" class="small-container">
    <h1 class="vertical-center">Vax Check</h1>
    <div id="information-entry" class="panel">
      <h2 class="vertical-center">Info entry</h2>
      <date-of-birth-entry />
      <vaccine-entry />
      <vaccine-entry />
      <vaccine-entry />
      <vaccine-entry />
    </div>
    <div id="schedule-display" class="panel">
      <h2 class="vertical-center">Schedule display</h2>
      <vaccine-panel />
      <vaccine-panel />
    </div>
  </div>
</template>

<script>
import DateOfBirthEntry from "./components/DateOfBirthEntry.vue";
import VaccineEntry from "./components/VaccineEntry.vue";
import VaccinePanel from "./components/VaccinePanel.vue";

export default {
  name: "App",
  components: {
    DateOfBirthEntry,
    VaccineEntry,
    VaccinePanel
  }
};
</script>

<style>
</style>
