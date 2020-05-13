<template>
  <div id="app">
    <h1>Vax Check</h1>
    <div id="information-entry">
      <h2>Info entry</h2>
      <date-of-birth-entry />
      <vaccine-entry />
      <vaccine-entry />
      <vaccine-entry />
      <vaccine-entry />
    </div>
    <div id="schedule-display">
      <h2>Schedule display</h2>
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
