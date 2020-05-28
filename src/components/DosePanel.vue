<template>
  <v-expansion-panel>
    <v-expansion-panel-header>
      <v-row no-gutters>
        <v-col cols="2">Dose #{{ this.index + 1 }}:</v-col>
        <v-col
          cols="5"
        >Earliest: {{ this.dose.earliestPossibleDate ? this.dose.earliestPossibleDate : null }}</v-col>
        <v-col
          cols="5"
        >Latest: {{ this.dose.latestRecommendedDate ? this.dose.latestRecommendedDate : null }}</v-col>
      </v-row>
    </v-expansion-panel-header>
    <v-expansion-panel-content>
      <p class="mb-1">Date Given: {{ this.dose.date ? this.dose.date : "Dose not given" }}</p>
      <p
        class="mb-1"
        v-if="this.dose.received"
      >Time since last dose: {{this.dose.intervalSinceLastDose.months}} months, {{this.dose.intervalSinceLastDose.weeks}} weeks, {{this.dose.intervalSinceLastDose.days}} days ago.</p>
      <p
        class="mb-1"
        v-if="this.dose.received"
      >Age received: {{this.dose.ageReceived.months}} months, {{this.dose.ageReceived.weeks}} weeks, {{this.dose.ageReceived.days}} days</p>
      <p
        class="mb-1"
        v-if="this.dose.minInterval"
      >Minimum interval from last dose: {{this.dose.minInterval.months}} months, {{this.dose.minInterval.weeks}} weeks, {{this.dose.minInterval.days}} days</p>
      <p class="mb-1">Required?: {{ this.dose.required ? "Yes" : "No" }}</p>
      <p class="mb-1">Notes: {{ this.dose.notes }}</p>
    </v-expansion-panel-content>
  </v-expansion-panel>
</template>

<script>
export default {
  name: "DosePanel",

  props: {
    dose: Object,
    index: Number
  }
};
</script>
