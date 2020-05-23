<template>
  <v-expansion-panel>
    <v-expansion-panel-header>
      Dose #{{ this.index + 1 }}: {{ this.dose.date }}
    </v-expansion-panel-header>
    <v-expansion-panel-content>
      Notes: {{ this.dose.notes }}
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
