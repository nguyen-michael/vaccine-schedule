<template>
  <v-app>
    <p>blank</p>
    <date-of-birth-entry />
    <vaccine-entry />
    <vaccine-panel />
  </v-app>
</template>

<script>
import DateOfBirthEntry from "./components/DateOfBirthEntry.vue";
import VaccineEntry from "./components/VaccineEntry.vue";
import VaccinePanel from "./components/VaccinePanel.vue";

export default {
  name: 'App',

  components: {
    DateOfBirthEntry,
    VaccineEntry,
    VaccinePanel
  },

  data: () => ({
    //
  }),
};
</script>
