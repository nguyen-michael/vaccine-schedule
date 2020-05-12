<template>
  <div class="panel">
    <h3>HiB Schedule</h3>
    <p>
      <em>late dose!</em>
    </p>
    <dose-panel />
    <dose-panel />
  </div>
</template>

<script>
import DosePanel from "./DosePanel.vue";
export default {
  name: "VaccinePanel",
  components: {
    DosePanel
  }
};
</script>

<style>
</style>