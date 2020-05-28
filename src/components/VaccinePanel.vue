<template>
  <v-expansion-panel>
    <v-expansion-panel-header>{{ vaccine.name }}</v-expansion-panel-header>
    <v-expansion-panel-content>
      Notes: {{ vaccine.notes }}
      <v-expansion-panels accordion tile multiple>
        <dose-panel v-for="(dose, i) in vaccine.schedule" :key="i" :dose="dose" :index="i" />
      </v-expansion-panels>
    </v-expansion-panel-content>
  </v-expansion-panel>
</template>

<script>
import DosePanel from "./DosePanel.vue";
export default {
  name: "VaccinePanel",

  components: {
    DosePanel
  },

  props: {
    vaccine: Object
  }
};
</script>

<style>
</style>